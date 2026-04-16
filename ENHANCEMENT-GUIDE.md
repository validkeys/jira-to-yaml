# jira-to-yaml Enhancement Guide

## Overview

The enhanced version (`index-enhanced.js` and `cli-enhanced.js`) extends the original jira-to-yaml package to support **multi-ticket RSS feed exports** from JIRA, while maintaining backward compatibility with single-ticket XML files.

## What's New

### 1. **Multi-Ticket RSS Support**
- Parse JIRA RSS feeds with multiple `<item>` elements
- Automatic format detection (single vs multi-ticket)
- Batch processing with automatic file naming

### 2. **Enhanced Issue Link Parsing**
- Extracts both inward and outward issue links
- Preserves link types, descriptions, and relationships
- Handles nested `issuelink` structures

### 3. **Advanced CLI Options**
```bash
# Split multi-ticket RSS into separate files (default)
jira-to-yaml export.xml --split

# Custom output directory
jira-to-yaml export.xml --split --output-dir ./tickets

# Combined output (all tickets in one YAML array)
jira-to-yaml export.xml all-tickets.yaml --combined

# Show RSS feed metadata
jira-to-yaml export.xml --metadata
```

### 4. **Automatic Index Generation**
- Creates `_INDEX.md` with ticket catalog
- Organized by type (Story, Task, etc.)
- Shows ticket relationships
- Links to individual YAML files

### 5. **RSS Metadata Extraction**
- Feed title, description, link
- Total issue count and range
- JIRA version and build info

## File Structure

```
jira-to-yaml/
├── index.js              # Original (single-ticket)
├── index-enhanced.js     # Enhanced (multi-ticket) ⭐
├── cli.js                # Original CLI
├── cli-enhanced.js       # Enhanced CLI ⭐
├── example.js            # Single-ticket example
├── example-multi.js      # Multi-ticket example ⭐
├── package.json
└── README.md
```

## API Reference

### Enhanced Functions

#### `parseJiraRssXml(xmlContent)`
Parses multi-ticket RSS feed and returns array of ticket objects.

```javascript
import { parseJiraRssXmlFile } from './index-enhanced.js';

const tickets = parseJiraRssXmlFile('jira-export.xml');
console.log(`Found ${tickets.length} tickets`);
```

#### `detectXmlFormat(xmlContent)`
Detects if XML is single or multi-ticket format.

```javascript
import { detectXmlFormat } from './index-enhanced.js';

const format = detectXmlFormat(xmlContent);
// {
//   isMultiTicket: true,
//   count: 17,
//   hasIssueInfo: true
// }
```

#### `getRssFeedMetadata(xmlContent)`
Extracts RSS feed metadata.

```javascript
import { getRssFeedMetadata } from './index-enhanced.js';

const metadata = getRssFeedMetadata(xmlContent);
// {
//   title: "CI JIRA",
//   link: "https://jira.../",
//   totalIssues: { start: 0, end: 17, total: 17 },
//   buildInfo: { version: "10.3.9", ... }
// }
```

#### `parseJiraXmlFile(filePath)`
Auto-detects format and parses accordingly. Returns single object or array.

```javascript
import { parseJiraXmlFile } from './index-enhanced.js';

// Works with both single and multi-ticket files
const result = parseJiraXmlFile('file.xml');

if (Array.isArray(result)) {
  console.log(`Multi-ticket: ${result.length} tickets`);
} else {
  console.log(`Single ticket: ${result.key}`);
}
```

## Enhanced Ticket Object Structure

```yaml
key: CWP-8520
summary: "Ticket title"
description: "Plain text description (HTML stripped)"
descriptionHtml: "<p>Original HTML description</p>"
type: Story
priority: Medium
status: Open
resolution: Unresolved
assignee: John Doe
reporter: Jane Smith
created: Mon, 6 Apr 2026 09:55:22 -0400
updated: Wed, 15 Apr 2026 13:32:56 -0400
due: null

project:
  id: 14606
  key: CWP
  name: Canadian Wealth Platform

link: https://jira.../browse/CWP-8520

# Optional sections (only included if present)
labels:
  - RESP
  - Phase2

attachments:
  - id: 348377
    name: diagram.png
    size: 57370
    author: jdoe
    created: Wed, 8 Apr 2026 11:07:52 -0400

links:                           # ⭐ NEW
  - type: Relates
    direction: outward
    description: relates to
    key: CWP-8690
    id: 269743
  - type: Blocks
    direction: inward
    description: is blocked by
    key: CWP-8519
    id: 268820

customFields:
  gh-epic-link: CWP-8516
  gh-lexo-rank: '1|i0zry8:'
```

## CLI Usage Examples

### Single Ticket (Backward Compatible)
```bash
# Original behavior - works exactly the same
node cli-enhanced.js single-ticket.xml
# Creates: single-ticket.yaml

node cli-enhanced.js single-ticket.xml output.yaml
# Creates: output.yaml
```

### Multi-Ticket RSS

#### Split Mode (Default)
```bash
# Basic - auto-detects and splits
node cli-enhanced.js jira-export.xml --split
# Creates: tickets/CWP-8520.yaml, tickets/CWP-8521.yaml, ...

# Custom output directory
node cli-enhanced.js jira-export.xml --split --output-dir ./my-tickets
# Creates: my-tickets/CWP-*.yaml

# Metadata preview
node cli-enhanced.js jira-export.xml --metadata
# Shows feed info without converting
```

#### Combined Mode
```bash
# Single YAML file with array of all tickets
node cli-enhanced.js jira-export.xml all-tickets.yaml --combined
# Creates: all-tickets.yaml (YAML array)
```

## Migration from Original

### Backward Compatibility
The enhanced version is **100% backward compatible**:
- Single-ticket files work exactly as before
- Original API functions still available
- No breaking changes to output format

### Adopting Enhancements

#### Option 1: Replace Files
```bash
# Backup originals
mv index.js index-original.js
mv cli.js cli-original.js

# Use enhanced versions
mv index-enhanced.js index.js
mv cli-enhanced.js cli.js
```

#### Option 2: Use Enhanced Files Directly
```bash
# Import from enhanced module
import { parseJiraRssXmlFile } from './index-enhanced.js';

# Or run enhanced CLI
node cli-enhanced.js file.xml --split
```

#### Option 3: Package.json Configuration
```json
{
  "bin": {
    "jira-to-yaml": "./cli-enhanced.js"
  },
  "main": "index-enhanced.js"
}
```

Then reinstall:
```bash
npm unlink -g jira-to-yaml
npm link
```

## Parser Configuration

### Entity Processing
The enhanced parser disables HTML entity processing to handle large JIRA exports with many HTML entities (like `&#160;`, `&nbsp;`):

```javascript
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  processEntities: false,  // Disabled for large exports
  htmlEntities: false,
});
```

This prevents "Entity expansion limit exceeded" errors on large files.

## Testing

```bash
# Test single-ticket (original)
node example.js

# Test multi-ticket (enhanced)
node example-multi.js

# Integration test with real file
node cli-enhanced.js /path/to/jira-export.xml --split --metadata
```

## Comparison: Original vs Enhanced

| Feature | Original | Enhanced |
|---------|----------|----------|
| Single ticket parsing | ✅ | ✅ |
| Multi-ticket RSS parsing | ❌ | ✅ |
| Issue links extraction | ❌ | ✅ |
| Format auto-detection | ❌ | ✅ |
| RSS metadata extraction | ❌ | ✅ |
| Batch file output | ❌ | ✅ |
| Combined array output | ❌ | ✅ |
| Index generation | ❌ | ✅ |
| Large file handling | ⚠️  | ✅ |

## Real-World Example

Given a JIRA RSS export with 17 tickets:

```bash
$ node cli-enhanced.js jira-tickets.xml --split --metadata

📄 Input: jira-tickets.xml
📊 Format: Multi-ticket RSS
🎫 Tickets: 17

RSS Feed Metadata:
==================
Title: CI JIRA
Link: https://jira.../issues/?jql=...
Issues: 0-17 of 17
JIRA Version: 10.3.9 (build 10030009)

📁 Output directory: tickets/

✓ CWP-8748.yaml - Process Transaction Processing File - 911
✓ CWP-8697.yaml - Process Transaction Processing File - 900
...
✓ CWP-8519.yaml - RESP - Generate Monthly file

Complete: 17 successful, 0 errors
📋 Index generated: tickets/_INDEX.md
```

Results in:
```
tickets/
├── CWP-8519.yaml
├── CWP-8520.yaml
├── ...
├── CWP-8748.yaml
└── _INDEX.md  (auto-generated catalog)
```

## Troubleshooting

### "Entity expansion limit exceeded"
**Fixed** in enhanced version by disabling entity processing. Original version may fail on large exports.

### Links not parsing
Ensure you're using `index-enhanced.js` with the fixed `extractIssueLinks()` function that handles the `issuelink` wrapper element.

### Format not detected
Check that your XML is valid JIRA RSS format with `<rss><channel><item>` structure.

## Future Enhancements

Potential additions:
- [ ] Subtask parsing
- [ ] Comment extraction
- [ ] Worklog parsing
- [ ] Sprint/Epic hierarchy
- [ ] Custom output templates
- [ ] JSON output option
- [ ] Filtering by status/type/etc
- [ ] Markdown description conversion

## Contributing

When adding features:
1. Maintain backward compatibility with `index.js`
2. Add corresponding CLI options to `cli-enhanced.js`
3. Update this guide with examples
4. Test with both single and multi-ticket files
