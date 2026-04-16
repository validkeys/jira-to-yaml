# What's New: Multi-Ticket RSS Support

## Summary

Extended `jira-to-yaml` to automatically handle **multi-ticket JIRA RSS feed exports** while maintaining 100% backward compatibility with single-ticket files.

## The Problem

The original `jira-to-yaml` tool was designed for single-ticket XML exports (one `<item>` per file). When JIRA exports multiple tickets via RSS feed (e.g., all tickets in an Epic), the tool would fail because it expected only one `<item>` element.

Example multi-ticket RSS structure:
```xml
<rss>
  <channel>
    <item><!-- Ticket 1 --></item>
    <item><!-- Ticket 2 --></item>
    <item><!-- Ticket 3 --></item>
    ...
  </channel>
</rss>
```

## The Solution

### New Files
- **`index-enhanced.js`** - Library with multi-ticket support
- **`cli-enhanced.js`** - CLI with batch processing
- **`example-multi.js`** - Multi-ticket example

### Key Features

#### 1. Auto-Detection
Automatically detects if XML contains single or multiple tickets:
```javascript
const format = detectXmlFormat(xmlContent);
// { isMultiTicket: true, count: 17, hasIssueInfo: true }
```

#### 2. Split Output (Default)
Converts multi-ticket RSS into individual YAML files:
```bash
jira-to-yaml jira-export.xml --split
```

Output:
```
tickets/
├── CWP-8519.yaml
├── CWP-8520.yaml
├── ...
└── _INDEX.md  # Auto-generated catalog
```

#### 3. Combined Output (Optional)
All tickets in one YAML array:
```bash
jira-to-yaml jira-export.xml all.yaml --combined
```

#### 4. Issue Links
Parses and includes ticket relationships:
```yaml
links:
  - type: Relates
    direction: outward
    key: CWP-8690
  - type: Blocks
    direction: inward
    key: CWP-8519
```

#### 5. RSS Metadata
Shows feed information:
```bash
jira-to-yaml jira-export.xml --metadata
```

Output:
```
RSS Feed Metadata:
==================
Title: CI JIRA
Link: https://jira.../issues/?jql=...
Issues: 0-17 of 17
JIRA Version: 10.3.9
```

### Parser Improvements

Fixed "Entity expansion limit exceeded" error for large exports:
```javascript
const parser = new XMLParser({
  processEntities: false,  // Disable to avoid limits
  htmlEntities: false,
});
```

## Comparison

| Scenario | Original | Enhanced |
|----------|----------|----------|
| Single ticket XML | ✅ Works | ✅ Works (compatible) |
| Multi-ticket RSS | ❌ Fails | ✅ Works |
| Large exports (1000s of entities) | ❌ Entity limit error | ✅ Works |
| Issue links | ❌ Not extracted | ✅ Extracted |
| Batch output | ❌ Not supported | ✅ Supported |
| Index generation | ❌ Manual | ✅ Automatic |

## Real Example

Given JIRA export with 17 tickets from Epic CWP-8516:

### Before (Original)
```bash
$ node cli.js jira-tickets.xml
Error: Multiple items found in XML
```

### After (Enhanced)
```bash
$ node cli-enhanced.js jira-tickets.xml --split

📄 Input: jira-tickets.xml
📊 Format: Multi-ticket RSS
🎫 Tickets: 17

📁 Output directory: tickets/

✓ CWP-8748.yaml - Process Transaction Processing File - 911
✓ CWP-8697.yaml - Process Transaction Processing File - 900
✓ CWP-8693.yaml - Process Contract Registration Report - 950
... (14 more)

Complete: 17 successful, 0 errors
📋 Index generated: tickets/_INDEX.md
```

Result:
- 17 YAML files (one per ticket)
- All issue links preserved
- Automatic index with relationships
- Ready for version control

## Usage Patterns

### 1. Epic/Project Documentation
Export all tickets from an Epic to document in a repo:
```bash
# In JIRA: Export Epic CWP-8516 as XML
# Save as jira-export.xml

jira-to-yaml jira-export.xml --split --output-dir ./docs/tickets
```

### 2. Ticket Analysis
Process tickets programmatically:
```javascript
import { parseJiraRssXmlFile } from './index-enhanced.js';

const tickets = parseJiraRssXmlFile('export.xml');

// Analyze
const stories = tickets.filter(t => t.type === 'Story');
const unassigned = tickets.filter(t => t.assignee === 'Unassigned');
const blockedTickets = tickets.filter(t =>
  t.links?.some(l => l.type === 'Blocks' && l.direction === 'inward')
);
```

### 3. Migration & Archival
Archive closed sprint tickets:
```bash
jira-to-yaml sprint-21-export.xml --split --output-dir ./archive/sprint-21
```

### 4. Dependency Mapping
Visualize ticket relationships:
```javascript
const tickets = parseJiraRssXmlFile('export.xml');

tickets.forEach(ticket => {
  console.log(`${ticket.key}:`);
  ticket.links?.forEach(link => {
    console.log(`  ${link.direction} ${link.type} ${link.key}`);
  });
});
```

## Migration Guide

### For Existing Users

**Option 1: Drop-in Replacement**
```bash
# Backup
mv index.js index-v1.js
mv cli.js cli-v1.js

# Replace
mv index-enhanced.js index.js
mv cli-enhanced.js cli.js

# Reinstall globally
npm unlink -g jira-to-yaml
npm link
```

**Option 2: Use Both**
Keep both versions and choose based on use case:
```bash
# Single ticket - use original
node cli.js single-ticket.xml

# Multi-ticket - use enhanced
node cli-enhanced.js epic-export.xml --split
```

**Option 3: Update package.json**
```json
{
  "main": "index-enhanced.js",
  "bin": {
    "jira-to-yaml": "./cli-enhanced.js"
  }
}
```

### Backward Compatibility

The enhanced version is **fully compatible**:
- Single-ticket files work identically
- Same output format for single tickets
- No breaking API changes
- Original functions still available

## Implementation Details

### Multi-Item Detection
```javascript
function detectXmlFormat(xmlContent) {
  const parser = new XMLParser({...});
  const result = parser.parse(xmlContent);
  const items = result.rss?.channel?.item;

  return {
    isMultiTicket: Array.isArray(items),
    count: Array.isArray(items) ? items.length : 1,
  };
}
```

### Issue Links Extraction
Handles the nested structure:
```
issuelinks
  └── issuelinktype
      ├── inwardlinks (description as attribute)
      │   └── issuelink (wrapper)
      │       └── issuekey (with @_id)
      └── outwardlinks (description as attribute)
          └── issuelink (wrapper)
              └── issuekey (with @_id)
```

### Index Generation
Automatically creates `_INDEX.md`:
```markdown
# Jira Tickets Index

Total Tickets: 17

## By Type
- **Story**: 6
- **Task**: 11

## All Tickets
### Story (6)
#### CWP-8520: Ingest ESDC reports
- **Status**: Open
- **File**: [CWP-8520.yaml](./CWP-8520.yaml)
- **Related**: CWP-8690, CWP-8691, CWP-8692, ...
```

## Testing

Tested with:
- ✅ Single-ticket XML files
- ✅ Multi-ticket RSS feeds (17 tickets)
- ✅ Large exports (1000+ HTML entities)
- ✅ Tickets with/without links
- ✅ Tickets with/without attachments
- ✅ All ticket types (Story, Task, Bug, etc.)

## Next Steps

Potential enhancements:
1. **Subtasks** - Parse parent/subtask relationships
2. **Comments** - Extract ticket comments and discussion
3. **Worklogs** - Time tracking information
4. **Custom filters** - Filter tickets by criteria during export
5. **Templates** - Customizable output formats
6. **Markdown conversion** - Convert descriptions to Markdown
7. **Dependency graphs** - Generate relationship diagrams

## Resources

- **ENHANCEMENT-GUIDE.md** - Complete API reference and examples
- **example-multi.js** - Working example with multi-ticket file
- **cli-enhanced.js** - Full CLI implementation

## Questions?

Check the ENHANCEMENT-GUIDE.md for detailed documentation, API reference, and troubleshooting.
