#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk') || { green: s => s, red: s => s, yellow: s => s, gray: s => s, bold: s => s, cyan: s => s };
const { OpenCodeParser } = require('../src/parsers/opencode');
const { SessionAnalyzer } = require('../src/analyzers/session');
const { Reporter } = require('../src/reporters/terminal');

const pkg = require(path.join(__dirname, '..', 'package.json'));

program
  .name('agent-trace')
  .description('Trace your AI coding agent - costs, tokens, tool health, session timeline')
  .version(pkg.version)
  .argument('[directory]', 'Session directory to analyze', '.')
  .option('-s, --session <id>', 'Analyze specific session ID')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Show detailed timeline')
  .option('--agent <type>', 'Agent type (opencode, kimi-code, claude-code, codex)', 'opencode')
  .addHelpText('after', `
${chalk.bold('Examples:')}
  $ ${chalk.cyan('agent-trace')}                        # Analyze current directory
  $ ${chalk.cyan('agent-trace ~/.opencode/sessions')}    # Analyze OpenCode sessions
  $ ${chalk.cyan('agent-trace --agent opencode')}        # Force OpenCode parser
  $ ${chalk.cyan('agent-trace --json')}                  # Output as JSON
  $ ${chalk.cyan('agent-trace -s session-id')}           # Analyze specific session

${chalk.bold('Supported Agents:')}
  ${chalk.yellow('opencode')}     - OpenCode (default)
  ${chalk.yellow('kimi-code')}    - Kimi Code (coming soon)
  ${chalk.yellow('claude-code')}  - Claude Code (coming soon)
  ${chalk.yellow('codex')}        - Codex (coming soon)
`)
  .parse(process.argv);

const opts = program.opts();
const directory = program.args[0] || '.';

async function main() {
  console.log('');
  console.log(chalk.bold.cyan('  🔍 agent-trace — AI Agent Trajectory Analyzer'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────'));
  console.log('');

  // Select parser based on agent type
  let parser;
  switch (opts.agent) {
    case 'opencode':
      parser = new OpenCodeParser();
      break;
    case 'kimi-code':
    case 'claude-code':
    case 'codex':
      console.log(chalk.yellow(`  ⚠️  ${opts.agent} parser coming soon. Using OpenCode parser.`));
      parser = new OpenCodeParser();
      break;
    default:
      console.log(chalk.red(`  ✗ Unknown agent: ${opts.agent}`));
      process.exit(1);
  }

  // Find sessions
  const sessions = parser.findSessions();
  if (sessions.length === 0) {
    console.log(chalk.yellow('  No sessions found.'));
    console.log(chalk.gray(`  Looked in: ${parser.sessionPaths.join(', ')}`));
    console.log(chalk.gray('  Make sure your AI agent has run at least once.'));
    process.exit(0);
  }

  console.log(chalk.green(`  ✓ Found ${sessions.length} session(s)`));
  console.log('');

  // Filter by session ID if specified
  let targetSessions = sessions;
  if (opts.session) {
    targetSessions = sessions.filter(s => s.id === opts.session);
    if (targetSessions.length === 0) {
      console.log(chalk.red(`  ✗ Session not found: ${opts.session}`));
      process.exit(1);
    }
  }

  // Analyze each session
  for (const session of targetSessions) {
    const parsed = parser.parseSession(session.data);
    const stats = SessionAnalyzer.getStats(parsed);
    const costBreakdown = SessionAnalyzer.getCostBreakdown(parsed);
    const toolUsage = SessionAnalyzer.getToolUsage(parsed.toolCalls);
    const anomalies = SessionAnalyzer.detectAnomalies(parsed);
    const timeline = parser.getTimeline(parsed.messages);

    if (opts.json) {
      console.log(JSON.stringify({
        session: parsed.id,
        stats,
        costBreakdown,
        toolUsage,
        anomalies,
        timeline: opts.verbose ? timeline : undefined,
      }, null, 2));
    } else {
      Reporter.display(parsed, stats, costBreakdown, toolUsage, anomalies, timeline);
    }
  }
}

main().catch(err => {
  console.error(chalk.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
