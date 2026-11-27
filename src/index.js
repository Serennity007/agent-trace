/**
 * Public library entry point for agent-trace.
 *
 * The CLI (bin/cli.js) is a thin wrapper around these classes; requiring the
 * package resolves this file via package.json "main".
 */
const { OpenCodeParser } = require('./parsers/opencode');
const { ClaudeCodeParser } = require('./parsers/claude-code');
const { KimiCodeParser } = require('./parsers/kimi-code');
const { CodexParser } = require('./parsers/codex');
const { SessionAnalyzer } = require('./analyzers/session');
const { Reporter } = require('./reporters/terminal');

module.exports = {
  OpenCodeParser,
  ClaudeCodeParser,
  KimiCodeParser,
  CodexParser,
  SessionAnalyzer,
  Reporter,
};
