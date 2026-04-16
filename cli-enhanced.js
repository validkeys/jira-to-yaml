#!/usr/bin/env node

import {
  parseJiraXmlFile,
  parseJiraRssXmlFile,
  detectXmlFormat,
  getRssFeedMetadata,
  toYaml
} from './index-enhanced.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { dirname, join, basename } from 'path';

const args = process.argv.slice(2);

// Parse CLI flags
const flags = {
  split: args.includes('--split'),
  outputDir: null,
  combined: args.includes('--combined'),
  metadata: args.includes('--metadata'),
  help: args.includes('--help') || args.includes('-h'),
};

// Get output directory if specified
const outputDirIndex = args.indexOf('--output-dir');
if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
  flags.outputDir = args[outputDirIndex + 1];
}

// Filter out flags to get file arguments
const fileArgs = args.filter(arg =>
  !arg.startsWith('--') &&
  arg !== flags.outputDir
);

const inputFile = fileArgs[0];
const outputFile = fileArgs[1];

// Show help
if (flags.help || !inputFile) {
  console.log(`
jira-to-yaml - Convert Jira XML tickets to YAML

USAGE:
  jira-to-yaml <input.xml> [output.yaml] [options]

OPTIONS:
  --split              Split multi-ticket RSS into separate files
  --output-dir <dir>   Directory for split files (default: ./tickets)
  --combined           Output all tickets to single YAML file (array)
  --metadata           Show RSS feed metadata
  -h, --help           Show this help

EXAMPLES:
  # Single ticket - auto-generates output.yaml
  jira-to-yaml ticket.xml

  # Single ticket - custom output
  jira-to-yaml ticket.xml custom.yaml

  # Multi-ticket RSS - split into separate files
  jira-to-yaml jira-export.xml --split
  jira-to-yaml jira-export.xml --split --output-dir ./output

  # Multi-ticket RSS - combined array in single file
  jira-to-yaml jira-export.xml tickets.yaml --combined

  # Show metadata about RSS feed
  jira-to-yaml jira-export.xml --metadata

NOTES:
  - Auto-detects single vs multi-ticket XML format
  - Default behavior for multi-ticket: splits into separate files
  - Split files are named by ticket key (e.g., CWP-8520.yaml)
  `);
  process.exit(flags.help ? 0 : 1);
}

try {
  // Read and detect format
  const xmlContent = readFileSync(inputFile, 'utf-8');
  const format = detectXmlFormat(xmlContent);

  console.log(`📄 Input: ${inputFile}`);
  console.log(`📊 Format: ${format.isMultiTicket ? 'Multi-ticket RSS' : 'Single ticket'}`);
  console.log(`🎫 Tickets: ${format.count}`);
  console.log('');

  // Show metadata if requested
  if (flags.metadata) {
    try {
      const metadata = getRssFeedMetadata(xmlContent);
      console.log('RSS Feed Metadata:');
      console.log('==================');
      console.log(`Title: ${metadata.title}`);
      console.log(`Link: ${metadata.link}`);
      console.log(`Description: ${metadata.description}`);
      if (metadata.totalIssues.total) {
        console.log(`Issues: ${metadata.totalIssues.start}-${metadata.totalIssues.end} of ${metadata.totalIssues.total}`);
      }
      if (metadata.buildInfo) {
        console.log(`JIRA Version: ${metadata.buildInfo.version} (build ${metadata.buildInfo.buildNumber})`);
      }
      console.log('');
    } catch (err) {
      console.warn('⚠️  Could not extract metadata:', err.message);
      console.log('');
    }
  }

  // Handle single ticket
  if (!format.isMultiTicket) {
    const ticket = parseJiraXmlFile(inputFile);
    const yamlOutput = toYaml(ticket);
    const output = outputFile || inputFile.replace(/\.xml$/i, '.yaml');

    writeFileSync(output, yamlOutput, 'utf-8');
    console.log(`✓ Converted to ${output}`);
    console.log(`  Key: ${ticket.key}`);
    console.log(`  Summary: ${ticket.summary}`);
    process.exit(0);
  }

  // Handle multi-ticket RSS
  const tickets = parseJiraRssXmlFile(inputFile);

  // Combined output mode
  if (flags.combined) {
    const yamlOutput = toYaml(tickets);
    const output = outputFile || inputFile.replace(/\.xml$/i, '.yaml');
    writeFileSync(output, yamlOutput, 'utf-8');
    console.log(`✓ Combined ${tickets.length} tickets to ${output}`);
    tickets.forEach(ticket => {
      console.log(`  - ${ticket.key}: ${ticket.summary}`);
    });
    process.exit(0);
  }

  // Split output mode (default for multi-ticket)
  const outputDir = flags.outputDir || outputFile || 'tickets';

  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📁 Output directory: ${outputDir}/`);
  console.log('');

  // Write each ticket to separate file
  let successCount = 0;
  let errorCount = 0;

  for (const ticket of tickets) {
    try {
      const filename = `${ticket.key}.yaml`;
      const filepath = join(outputDir, filename);
      const yamlOutput = toYaml(ticket);

      writeFileSync(filepath, yamlOutput, 'utf-8');
      console.log(`✓ ${filename} - ${ticket.summary}`);
      successCount++;
    } catch (error) {
      console.error(`✗ Error processing ${ticket.key}: ${error.message}`);
      errorCount++;
    }
  }

  console.log('');
  console.log(`Complete: ${successCount} successful, ${errorCount} errors`);

  // Generate index file
  const indexPath = join(outputDir, '_INDEX.md');
  const indexContent = generateIndex(tickets);
  writeFileSync(indexPath, indexContent, 'utf-8');
  console.log(`📋 Index generated: ${indexPath}`);

} catch (error) {
  console.error('Error:', error.message);
  if (process.env.DEBUG) {
    console.error(error.stack);
  }
  process.exit(1);
}

/**
 * Generates an index markdown file for the tickets
 */
function generateIndex(tickets) {
  const lines = ['# Jira Tickets Index', ''];

  // Group by type
  const byType = {};
  tickets.forEach(ticket => {
    const type = ticket.type || 'Unknown';
    if (!byType[type]) byType[type] = [];
    byType[type].push(ticket);
  });

  // Summary
  lines.push(`Total Tickets: ${tickets.length}`);
  lines.push('');
  lines.push('## By Type');
  lines.push('');
  Object.entries(byType).forEach(([type, items]) => {
    lines.push(`- **${type}**: ${items.length}`);
  });
  lines.push('');

  // List all tickets
  lines.push('## All Tickets');
  lines.push('');

  Object.entries(byType).forEach(([type, items]) => {
    lines.push(`### ${type} (${items.length})`);
    lines.push('');
    items.forEach(ticket => {
      lines.push(`#### ${ticket.key}: ${ticket.summary}`);
      lines.push(`- **Status**: ${ticket.status}`);
      lines.push(`- **Priority**: ${ticket.priority}`);
      lines.push(`- **Assignee**: ${ticket.assignee || 'Unassigned'}`);
      lines.push(`- **File**: [${ticket.key}.yaml](./${ticket.key}.yaml)`);
      if (ticket.link) {
        lines.push(`- **Link**: ${ticket.link}`);
      }
      if (ticket.links && ticket.links.length > 0) {
        lines.push(`- **Related**: ${ticket.links.map(l => l.key).join(', ')}`);
      }
      lines.push('');
    });
  });

  return lines.join('\n');
}
