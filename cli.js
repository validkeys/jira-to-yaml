#!/usr/bin/env node

import { parseJiraXmlToYaml } from './index.js';
import { writeFileSync } from 'fs';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Usage: jira-to-yaml <input.xml> [output.yaml]');
  console.log('');
  console.log('If output file is not specified, automatically creates <input.yaml>');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || inputFile.replace(/\.xml$/i, '.yaml');

try {
  const yamlOutput = parseJiraXmlToYaml(inputFile);

  writeFileSync(outputFile, yamlOutput, 'utf-8');
  console.log(`✓ Converted ${inputFile} to ${outputFile}`);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
