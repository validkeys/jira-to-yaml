import { parseJiraXmlFile, toYaml } from './index.js';

// Example: Parse a single Jira XML file
const exampleFile = '/Users/kydavis/Sites/lumen/specifications/features/gics/planning/001-initial-building/jira-tickets/CWP-7241.xml';

try {
  console.log('Parsing Jira XML file...\n');

  const ticket = parseJiraXmlFile(exampleFile);
  const yamlOutput = toYaml(ticket);

  console.log('Parsed Ticket:');
  console.log('='.repeat(60));
  console.log(yamlOutput);

  console.log('\nKey fields:');
  console.log('- Key:', ticket.key);
  console.log('- Summary:', ticket.summary);
  console.log('- Status:', ticket.status);
  console.log('- Assignee:', ticket.assignee);
  console.log('- Labels:', ticket.labels);

} catch (error) {
  console.error('Error:', error.message);
}
