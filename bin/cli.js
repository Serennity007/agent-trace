#!/usr/bin/env node

'use strict';

const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const { OpenCodeParser } = require('../src/parsers/opencode');
const { ClaudeCodeParser } = require('../src/parsers/claude-code');
const { KimiCodeParser } = require('../src/parsers/kimi-code');
const { CodexParser } = require('../src/parsers/codex');
const { SessionAnalyzer } = require('../src/analyzers/session');
const { Reporter } = require('../src/reporters/terminal');

const pkg = require(path.join(__dirname, '..', 'package.json'));

const AGENTS = {
  'opencode': { parser: OpenCodeParser, status: 'supported' },
  'claude-code': { parser: ClaudeCodeParser, status: 'supported' },
  'kimi-code': { parser: KimiCodeParser, status: 'supported' },
  'codex': { parser: CodexParser, status: 'supported' },
  'cursor': { parser: null, status: 'coming soon' },
  'windsurf': { parser: null, status: 'coming soon' },
  'cline': { parser: null, status: 'coming soon' },
  'continue': { parser: null, status: 'coming soon' },
};

program
  .name('agent-trace')
  .description('Trace your AI coding agent - costs, tokens, tool health, session timeline')
  .version(pkg.version)
  .argument('[directory]', 'Session directory to analyze', '.')
  .option('-s, --session <id>', 'Analyze specific session ID')
  .option('-j, --json', 'Output as JSON')
  .option('-v, --verbose', 'Show detailed timeline')
  .option('-a, --agent <type>', 'Agent type (opencode, claude-code, kimi-code, codex)', 'auto')
  .option('--list-agents', 'List supported agents')
  .addHelpText('after', `
${chalk.bold('Examples:')}
  $ ${chalk.cyan('agent-trace')}                        # Auto-detect agent
  $ ${chalk.cyan('agent-trace -a claude-code')}         # Analyze Claude Code sessions
  $ ${chalk.cyan('agent-trace -a kimi-code')}           # Analyze Kimi Code sessions
  $ ${chalk.cyan('agent-trace -a opencode')}             # Analyze OpenCode sessions
  $ ${chalk.cyan('agent-trace -a codex')}                # Analyze Codex sessions
  $ ${chalk.cyan('agent-trace --json')}                  # Output as JSON
  $ ${chalk.cyan('agent-trace -s session-id')}           # Analyze specific session

${chalk.bold('Supported Agents:')}
  ${chalk.green('opencode')}      - OpenCode ✅
  ${chalk.green('claude-code')}  - Claude Code ✅
  ${chalk.green('kimi-code')}    - Kimi Code ✅
  ${chalk.green('codex')}        - Codex ✅
  ${chalk.yellow('cursor')}       - Cursor (coming soon)
  ${chalk.yellow('windsurf')}     - Windsurf (coming soon)
  ${chalk.yellow('cline')}        - Cline (coming soon)
  ${chalk.yellow('continue')}     - Continue (coming soon)
`)
  .parse(process.argv);

const opts = program.opts();

if (opts.listAgents) {
  console.log('\nSupported agents:\n');
  for (const [name, info] of Object.entries(AGENTS)) {
    const status = info.status === 'supported' ? chalk.green('✅') : chalk.yellow('🔜');
    console.log(`  ${status} ${name}`);
  }
  console.log('');
  process.exit(0);
}

async function main() {
  console.log('');
  console.log(chalk.bold.cyan('  🔍 agent-trace — AI Agent Trajectory Analyzer'));
  console.log(chalk.gray('  ─────────────────────────────────────────────────'));
  console.log('');

  // Determine which parsers to use
  let parsers = [];
  if (opts.agent === 'auto') {
    // Try all supported parsers
    for (const [name, info] of Object.entries(AGENTS)) {
      if (info.parser) {
        parsers.push({ name, parser: new info.parser() });
      }
    }
  } else {
    const agentConfig = AGENTS[opts.agent];
    if (!agentConfig) {
      console.log(chalk.red(`  ✗ Unknown agent: ${opts.agent}`));
      console.log(chalk.gray(`  Available: ${Object.keys(AGENTS).join(', ')}`));
      process.exit(1);
    }
    if (!agentConfig.parser) {
      console.log(chalk.yellow(`  ⚠️  ${opts.agent} support coming soon.`));
      process.exit(0);
    }
    parsers.push({ name: opts.agent, parser: new agentConfig.parser() });
  }

  // Find sessions from all parsers
  let allSessions = [];
  for (const { name, parser } of parsers) {
    const sessions = parser.findSessions();
    for (const session of sessions) {
      allSessions.push({ ...session, agentName: name, parser });
    }
  }

  if (allSessions.length === 0) {
    console.log(chalk.yellow('  No sessions found.'));
    console.log(chalk.gray('  Make sure your AI agent has run at least once.'));
    process.exit(0);
  }

  console.log(chalk.green(`  ✓ Found ${allSessions.length} session(s) from ${new Set(allSessions.map(s => s.agentName)).size} agent(s)`));
  console.log('');

  // Filter by session ID if specified
  if (opts.session) {
    allSessions = allSessions.filter(s => s.id === opts.session);
    if (allSessions.length === 0) {
      console.log(chalk.red(`  ✗ Session not found: ${opts.session}`));
      process.exit(1);
    }
  }

  // Analyze each session
  for (const session of allSessions) {
    let parsed;
    if (session.parser.parseSession.length > 1) {
      parsed = session.parser.parseSession(session.data || session);
    } else {
      parsed = session.parser.parseSession(session.file || session);
    }

    const stats = SessionAnalyzer.getStats(parsed);
    const costBreakdown = SessionAnalyzer.getCostBreakdown(parsed);
    const toolUsage = SessionAnalyzer.getToolUsage(parsed.toolCalls);
    const anomalies = SessionAnalyzer.detectAnomalies(parsed);
    const timeline = session.parser.getTimeline ? session.parser.getTimeline(parsed.messages) : [];

    if (opts.json) {
      console.log(JSON.stringify({
        agent: session.agentName,
        session: parsed.id,
        stats,
        costBreakdown,
        toolUsage,
        anomalies,
        timeline: opts.verbose ? timeline : undefined,
      }, null, 2));
    } else {
      console.log(chalk.bold(`  Agent: ${session.agentName}`));
      Reporter.display(parsed, stats, costBreakdown, toolUsage, anomalies, timeline);
    }
  }
}

main().catch(err => {
  console.error(chalk.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
