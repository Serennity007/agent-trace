# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email the maintainer privately or use GitHub's private vulnerability reporting
3. Include a description of the vulnerability and steps to reproduce
4. We will respond within 48 hours

## Security Design

- **Read-only**: agent-trace never modifies session files
- **Local only**: No network requests, no data leaves your machine
- **No API keys**: No external service dependencies
- **No telemetry**: No analytics or tracking
