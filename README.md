# jira-to-yaml

Minimal JavaScript package to parse Jira XML tickets and output structured YAML.

## Installation

```bash
npm install
```

### Link for Global Usage

To use `jira-to-yaml` as a global command from anywhere on your system:

```bash
npm link
```

Now you can run the command globally:

```bash
jira-to-yaml /path/to/file.xml
```

To unlink later:

```bash
npm unlink -g jira-to-yaml
```

## Usage

### As a global CLI command (after linking)

```bash
# Automatically creates ticket.yaml from ticket.xml
jira-to-yaml /path/to/ticket.xml

# Or specify a custom output file
jira-to-yaml /path/to/ticket.xml /path/to/output.yaml
```

### As a local CLI tool

```bash
# Automatically creates ticket.yaml from ticket.xml
node cli.js path/to/ticket.xml

# Or specify a custom output file
node cli.js path/to/ticket.xml custom-output.yaml
```

### As a library

```javascript
import { parseJiraXmlFile, toYaml, parseJiraXmlToYaml } from './index.js';

// Parse and get JavaScript object
const ticket = parseJiraXmlFile('ticket.xml');
console.log(ticket.key, ticket.summary);

// Convert to YAML string
const yamlString = toYaml(ticket);

// Or do both in one step
const yaml = parseJiraXmlToYaml('ticket.xml');
```

## Output Structure

The parsed ticket includes:

- `key` - Issue key (e.g., CWP-7241)
- `summary` - Issue summary
- `description` - Plain text description
- `descriptionHtml` - Original HTML description
- `type` - Issue type
- `priority` - Priority level
- `status` - Current status
- `resolution` - Resolution status
- `assignee` - Assigned user
- `reporter` - Reporter user
- `created` - Creation date
- `updated` - Last update date
- `due` - Due date
- `labels` - Array of labels
- `attachments` - Array of attachment objects
- `customFields` - Object with custom field values
- `project` - Project information (id, key, name)
- `link` - URL to the issue

## Example

```bash
npm test
```

Runs the example script that parses a sample Jira ticket.
