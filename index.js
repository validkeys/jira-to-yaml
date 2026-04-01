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
 * Parses Jira XML and converts to structured object
 */
export function parseJiraXml(xmlContent) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true,
  });

  const result = parser.parse(xmlContent);
  const item = result.rss?.channel?.item;

  if (!item) {
    throw new Error('No item found in XML');
  }

  // Extract custom fields
  const customFields = {};
  if (item.customfields?.customfield) {
    const fields = Array.isArray(item.customfields.customfield)
      ? item.customfields.customfield
      : [item.customfields.customfield];

    fields.forEach((field) => {
      const name = field.customfieldname;
      const values = field.customfieldvalues?.customfieldvalue;

      if (values) {
        if (Array.isArray(values)) {
          customFields[name] = values.map(v => v['#text'] || v);
        } else {
          customFields[name] = values['#text'] || values;
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

  // Build structured ticket object
  return {
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
    labels,
    attachments,
    customFields,
    project: {
      id: item.project?.['@_id'],
      key: item.project?.['@_key'],
      name: item.project?.['#text'] || item.project,
    },
    link: item.link,
  };
}

/**
 * Parses Jira XML file and converts to YAML
 */
export function parseJiraXmlFile(filePath) {
  const xmlContent = readFileSync(filePath, 'utf-8');
  return parseJiraXml(xmlContent);
}

/**
 * Converts parsed Jira ticket to YAML string
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
