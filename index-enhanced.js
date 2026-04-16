import { XMLParser } from 'fast-xml-parser';
import yaml from 'js-yaml';
import { readFileSync } from 'fs';

/**
 * Extracts text content from HTML-encoded description
 */
function extractTextFromHtml(html) {
  if (!html) return '';

  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#160;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts issue links from the item
 */
function extractIssueLinks(item) {
  const links = [];

  if (!item.issuelinks?.issuelinktype) {
    return links;
  }

  const linkTypes = Array.isArray(item.issuelinks.issuelinktype)
    ? item.issuelinks.issuelinktype
    : [item.issuelinks.issuelinktype];

  linkTypes.forEach((linkType) => {
    const typeName = linkType.name?.['#text'] || linkType.name;

    // Handle outward links
    if (linkType.outwardlinks) {
      const outward = linkType.outwardlinks;
      const description = outward['@_description'] || '';

      // Check for issuelink wrapper
      if (outward.issuelink) {
        const issuelinks = Array.isArray(outward.issuelink)
          ? outward.issuelink
          : [outward.issuelink];

        issuelinks.forEach((issuelink) => {
          const issuekey = issuelink.issuekey;
          if (issuekey) {
            links.push({
              type: typeName,
              direction: 'outward',
              description: description,
              key: issuekey['#text'] || issuekey,
              id: issuekey['@_id'],
            });
          }
        });
      }
    }

    // Handle inward links
    if (linkType.inwardlinks) {
      const inward = linkType.inwardlinks;
      const description = inward['@_description'] || '';

      // Check for issuelink wrapper
      if (inward.issuelink) {
        const issuelinks = Array.isArray(inward.issuelink)
          ? inward.issuelink
          : [inward.issuelink];

        issuelinks.forEach((issuelink) => {
          const issuekey = issuelink.issuekey;
          if (issuekey) {
            links.push({
              type: typeName,
              direction: 'inward',
              description: description,
              key: issuekey['#text'] || issuekey,
              id: issuekey['@_id'],
            });
          }
        });
      }
    }
  });

  return links;
}

/**
 * Parses a single Jira item into a structured object
 */
function parseJiraItem(item) {
  // Extract custom fields
  const customFields = {};
  if (item.customfields?.customfield) {
    const fields = Array.isArray(item.customfields.customfield)
      ? item.customfields.customfield
      : [item.customfields.customfield];

    fields.forEach((field) => {
      const name = field.customfieldname;
      const key = field['@_key'];
      const values = field.customfieldvalues?.customfieldvalue;

      if (values) {
        const fieldKey = key || name;
        if (Array.isArray(values)) {
          customFields[fieldKey] = values.map(v => v['#text'] || v);
        } else {
          customFields[fieldKey] = values['#text'] || values;
        }
      }
    });
  }

  // Extract attachments
  const attachments = [];
  if (item.attachments?.attachment) {
    const attList = Array.isArray(item.attachments.attachment)
      ? item.attachments.attachment
      : [item.attachments.attachment];

    attList.forEach((att) => {
      attachments.push({
        id: att['@_id'],
        name: att['@_name'],
        size: att['@_size'],
        author: att['@_author'],
        created: att['@_created'],
      });
    });
  }

  // Extract labels
  const labels = [];
  if (item.labels?.label) {
    const labelList = Array.isArray(item.labels.label)
      ? item.labels.label
      : [item.labels.label];
    labels.push(...labelList);
  }

  // Extract issue links
  const links = extractIssueLinks(item);

  // Build structured ticket object
  const ticket = {
    key: item.key?.['#text'] || item.key,
    summary: item.summary,
    description: extractTextFromHtml(item.description),
    descriptionHtml: item.description,
    type: item.type?.['#text'] || item.type,
    priority: item.priority?.['#text'] || item.priority,
    status: item.status?.['#text'] || item.status,
    resolution: item.resolution?.['#text'] || item.resolution,
    assignee: item.assignee?.['#text'] || item.assignee,
    reporter: item.reporter?.['#text'] || item.reporter,
    created: item.created,
    updated: item.updated,
    due: item.due || null,
    project: {
      id: item.project?.['@_id'],
      key: item.project?.['@_key'],
      name: item.project?.['#text'] || item.project,
    },
    link: item.link,
  };

  // Add optional fields only if they have content
  if (labels.length > 0) ticket.labels = labels;
  if (attachments.length > 0) ticket.attachments = attachments;
  if (links.length > 0) ticket.links = links;
  if (Object.keys(customFields).length > 0) ticket.customFields = customFields;

  return ticket;
}

/**
 * Parses Jira XML and converts to structured object (single ticket)
 */
export function parseJiraXml(xmlContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    processEntities: false, // Disable to avoid entity expansion limits for large JIRA exports
    htmlEntities: false,
  });

  const result = parser.parse(xmlContent);
  const item = result.rss?.channel?.item;

  if (!item) {
    throw new Error('No item found in XML');
  }

  // Check if it's a multi-ticket RSS feed
  if (Array.isArray(item)) {
    throw new Error('Multiple items found. Use parseJiraRssXml() for multi-ticket feeds.');
  }

  return parseJiraItem(item);
}

/**
 * Parses Jira RSS XML with multiple tickets
 */
export function parseJiraRssXml(xmlContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    processEntities: false, // Disable to avoid entity expansion limits for large JIRA exports
    htmlEntities: false,
  });

  const result = parser.parse(xmlContent);
  const items = result.rss?.channel?.item;

  if (!items) {
    throw new Error('No items found in XML');
  }

  // Handle both single and multiple items
  const itemList = Array.isArray(items) ? items : [items];

  return itemList.map(item => parseJiraItem(item));
}

/**
 * Detects if XML contains single or multiple tickets
 */
export function detectXmlFormat(xmlContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    processEntities: false, // Disable to avoid entity expansion limits for large JIRA exports
    htmlEntities: false,
  });

  const result = parser.parse(xmlContent);
  const items = result.rss?.channel?.item;

  if (!items) {
    throw new Error('No items found in XML');
  }

  return {
    isMultiTicket: Array.isArray(items),
    count: Array.isArray(items) ? items.length : 1,
    hasIssueInfo: !!result.rss?.channel?.issue,
  };
}

/**
 * Parses Jira XML file (auto-detects single or multi-ticket)
 */
export function parseJiraXmlFile(filePath) {
  const xmlContent = readFileSync(filePath, 'utf-8');
  const format = detectXmlFormat(xmlContent);

  if (format.isMultiTicket) {
    return parseJiraRssXml(xmlContent);
  } else {
    return parseJiraXml(xmlContent);
  }
}

/**
 * Parses Jira RSS XML file with multiple tickets
 */
export function parseJiraRssXmlFile(filePath) {
  const xmlContent = readFileSync(filePath, 'utf-8');
  return parseJiraRssXml(xmlContent);
}

/**
 * Converts parsed Jira ticket(s) to YAML string
 */
export function toYaml(ticket) {
  return yaml.dump(ticket, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
  });
}

/**
 * Parses Jira XML file and returns YAML string
 */
export function parseJiraXmlToYaml(filePath) {
  const ticket = parseJiraXmlFile(filePath);
  return toYaml(ticket);
}

/**
 * Gets metadata about the RSS feed
 */
export function getRssFeedMetadata(xmlContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
    processEntities: false, // Disable to avoid entity expansion limits for large JIRA exports
    htmlEntities: false,
  });

  const result = parser.parse(xmlContent);
  const channel = result.rss?.channel;

  if (!channel) {
    throw new Error('No channel found in RSS XML');
  }

  return {
    title: channel.title,
    link: channel.link,
    description: channel.description,
    language: channel.language,
    totalIssues: {
      start: channel.issue?.['@_start'],
      end: channel.issue?.['@_end'],
      total: channel.issue?.['@_total'],
    },
    buildInfo: channel['build-info'] ? {
      version: channel['build-info'].version,
      buildNumber: channel['build-info']['build-number'],
      buildDate: channel['build-info']['build-date'],
    } : null,
  };
}
