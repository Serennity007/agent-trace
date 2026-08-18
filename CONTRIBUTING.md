# Contributing to Agent Trace

Thank you for your interest in contributing!

## How to Contribute

### Add Support for a New Agent

1. Create a new parser in `src/parsers/`
2. Implement the `findSessions()` and `parseSession()` methods
3. Register the parser in `bin/cli.js`
4. Add tests in `test/test.js`

### Report Bugs

Open an issue with:
- Agent type and version
- Session file example (anonymized)
- Expected vs actual behavior

### Suggest Features

Open an issue with your idea.

## Development

```bash
git clone https://github.com/liangzhengtao/agent-trace.git
cd agent-trace
npm install
npm test
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
