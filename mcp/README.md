# MCP Server Configuration

This directory contains Model Context Protocol (MCP) server configurations for the AJOB4AGENT autonomous job application system.

## Overview

MCP servers provide standardized interfaces for AI agents to interact with various services and tools. This configuration enables job searching, resume tailoring, browser automation, and more.

## Available MCP Servers

### JobSpy (`jobspy`)
Multi-platform job aggregation server that searches across:
- Indeed
- LinkedIn
- Glassdoor
- ZipRecruiter

**Configuration:**
```json
{
  "command": "uvx",
  "args": ["mcp-server-jobspy"],
  "env": {
    "JOBSPY_COUNTRY": "USA",
    "JOBSPY_RESULTS_WANTED": "50"
  }
}
```

**Usage Example:**
```
Search for "Senior Software Engineer" jobs in "San Francisco" on Indeed and LinkedIn
```

### OpenAI (`openai`)
GPT-4 integration for resume tailoring and cover letter generation.

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-openai"],
  "env": {
    "OPENAI_API_KEY": "${OPENAI_API_KEY}"
  }
}
```

**Usage Example:**
```
Tailor this resume for a Backend Engineer position at Google
```

### GitHub (`github`)
Repository and issue management for tracking applications and managing code.

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

**Usage Example:**
```
Create an issue to track the application to Company X
```

### Playwright (`playwright`)
Browser automation for form filling and application submission.

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-playwright"]
}
```

**Usage Example:**
```
Fill out the job application form on the company website
```

### Fetch (`fetch`)
HTTP requests to external APIs for data retrieval.

**Configuration:**
```json
{
  "command": "npx",
  "args": ["-y", "@anthropic/mcp-server-fetch"]
}
```

**Usage Example:**
```
Fetch company information from their public API
```

## Setup Instructions

### Prerequisites

1. **Node.js 18+**: Required for npx-based servers
2. **Python 3.9+ with uv**: Required for uvx-based servers
3. **Environment Variables**: Set required API keys

### Installation

1. Install uv (Python package manager):
   ```bash
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. Install Node.js dependencies:
   ```bash
   npm install -g npx
   ```

3. Set environment variables:
   ```bash
   export OPENAI_API_KEY="your-api-key"
   export GITHUB_TOKEN="your-github-token"
   ```

### Using the Configuration

The `mcp-config.json` file can be used with MCP-compatible clients:

```bash
# Claude Desktop
cp mcp/mcp-config.json ~/.config/claude/claude_desktop_config.json

# Custom integration
cat mcp/mcp-config.json | jq '.mcpServers'
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 | Yes (for openai server) |
| `GITHUB_TOKEN` | GitHub Personal Access Token | Yes (for github server) |
| `JOBSPY_COUNTRY` | Country for job searches | No (default: USA) |
| `JOBSPY_RESULTS_WANTED` | Number of results per search | No (default: 50) |

## Integration with AJOB4AGENT

### Workflow Example

1. **Job Search**: Use `jobspy` to find matching positions
2. **Resume Tailoring**: Use `openai` to customize resume for each position
3. **Application Submission**: Use `playwright` to fill and submit forms
4. **Tracking**: Use `github` to create issues for application tracking

### API Integration

```python
import json

# Load MCP configuration
with open('mcp/mcp-config.json') as f:
    config = json.load(f)

# Access server configurations
jobspy_config = config['mcpServers']['jobspy']
```

## Troubleshooting

### Common Issues

1. **"uvx not found"**: Install uv with the installation script above
2. **"OPENAI_API_KEY not set"**: Export the environment variable
3. **"Permission denied"**: Ensure npx has execute permissions

### Logs

Enable debug logging:
```bash
export MCP_DEBUG=1
```

## Security Notes

- Never commit API keys to version control
- Use environment variables or secret management
- Rotate tokens regularly
- See `scripts/generate-secrets.sh` for secure secret generation

## Related Documentation

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [JobSpy MCP Server](https://github.com/modelcontextprotocol/servers)
- [Anthropic MCP Servers](https://github.com/anthropics/mcp-servers)
