import {
  parseJiraRssXmlFile,
  detectXmlFormat,
  getRssFeedMetadata,
  toYaml
} from './index-enhanced.js';
import { readFileSync } from 'fs';

// Example: Parse a multi-ticket RSS XML file
const exampleFile = '/Users/kydavis/Sites/lumen/specifications/features/resp-management/plan/001-phase-2/jira-tickets/jira-tickets.xml';

try {
  console.log('Analyzing Jira RSS XML file...\n');

  // Detect format
  const xmlContent = readFileSync(exampleFile, 'utf-8');
  const format = detectXmlFormat(xmlContent);

  console.log('Format Detection:');
  console.log('='.repeat(60));
  console.log('Is Multi-ticket:', format.isMultiTicket);
  console.log('Ticket Count:', format.count);
  console.log('Has Issue Info:', format.hasIssueInfo);
  console.log('');

  // Get metadata
  const metadata = getRssFeedMetadata(xmlContent);
  console.log('RSS Metadata:');
  console.log('='.repeat(60));
  console.log('Title:', metadata.title);
  console.log('Link:', metadata.link);
  console.log('Total Issues:', metadata.totalIssues.total);
  console.log('Issue Range:', `${metadata.totalIssues.start}-${metadata.totalIssues.end}`);
  if (metadata.buildInfo) {
    console.log('JIRA Version:', metadata.buildInfo.version);
  }
  console.log('');

  // Parse all tickets
  const tickets = parseJiraRssXmlFile(exampleFile);

  console.log('Parsed Tickets:');
  console.log('='.repeat(60));
  tickets.forEach((ticket, idx) => {
    console.log(`${idx + 1}. ${ticket.key}: ${ticket.summary}`);
    console.log(`   Type: ${ticket.type} | Status: ${ticket.status} | Priority: ${ticket.priority}`);
    console.log(`   Assignee: ${ticket.assignee || 'Unassigned'}`);
    if (ticket.links && ticket.links.length > 0) {
      console.log(`   Links: ${ticket.links.length} (${ticket.links.map(l => l.key).join(', ')})`);
    }
  });
  console.log('');

  // Show sample YAML for first ticket
  console.log('Sample YAML (first ticket):');
  console.log('='.repeat(60));
  const sampleYaml = toYaml(tickets[0]);
  const lines = sampleYaml.split('\n');
  console.log(lines.slice(0, 30).join('\n'));
  if (lines.length > 30) {
    console.log('... (truncated)');
  }

} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
}
