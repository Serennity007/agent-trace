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
  .option('-n, --top <count>', 'Show top N sessions by cost', '5')
  .option('--all', 'Show all sessions (including empty)')
  .addHelpText('after', `
${chalk.bold('Examples:')}
  $ ${chalk.cyan('agent-trace')}                        # Auto-detect agent
  $ ${chalk.cyan('agent-trace -a claude-code')}         # Analyze Claude Code sessions
  $ ${chalk.cyan('agent-trace -a kimi-code')}           # Analyze Kimi Code sessions
  $ ${chalk.cyan('agent-trace -a opencode')}             # Analyze OpenCode sessions
  $ ${chalk.cyan('agent-trace -a codex')}                # Analyze Codex sessions
  $ ${chalk.cyan('agent-trace --json')}                  # Output as JSON
  $ ${chalk.cyan('agent-trace -s session-id')}           # Analyze specific session
  $ ${chalk.cyan('agent-trace -n 10')}                   # Show top 10 sessions

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

  // Filter out empty sessions unless --all is specified
  const totalFound = allSessions.length;
  if (!opts.all) {
    allSessions = allSessions.filter(s => s.hasContent !== false);
  }

  if (allSessions.length === 0) {
    console.log(chalk.yellow(`  No sessions with content found (${totalFound} empty sessions filtered).`));
    console.log(chalk.gray('  Use --all to show all sessions.'));
    process.exit(0);
  }

  console.log(chalk.green(`  ✓ Found ${allSessions.length} session(s) with content (${totalFound} total)`));
  console.log('');

  // Filter by session ID if specified
  if (opts.session) {
    allSessions = allSessions.filter(s => s.id === opts.session);
    if (allSessions.length === 0) {
      console.log(chalk.red(`  ✗ Session not found: ${opts.session}`));
      process.exit(1);
    }
  }

  // Parse all sessions first
  const parsedSessions = [];
  for (const session of allSessions) {
    try {
      let parsed;
      if (session.data) {
        parsed = session.parser.parseSession(session.data);
      } else {
        parsed = session.parser.parseSession(session);
      }
      parsed.agentName = session.agentName;
      parsedSessions.push(parsed);
    } catch (err) {
      console.log(chalk.yellow(`  ⚠️  Error parsing session ${session.id}: ${err.message}`));
    }
  }

  // Sort by cost descending
  parsedSessions.sort((a, b) => b.cost - a.cost);

  // Summary view for multiple sessions
  if (parsedSessions.length > 1 && !opts.session) {
    const TERM_WIDTH = 80;
    const DIVIDER = chalk.gray('  ' + '─'.repeat(TERM_WIDTH - 4));

    console.log(chalk.bold.cyan('  📊 Summary'));
    console.log(DIVIDER);

    // Calculate totals
    let totalCost = 0;
    let totalTokens = { input: 0, output: 0 };
    let totalMessages = 0;
    let totalToolCalls = 0;
    let totalDuration = 0;

    for (const parsed of parsedSessions) {
      totalCost += parsed.cost;
      totalTokens.input += parsed.totalTokens.input;
      totalTokens.output += parsed.totalTokens.output;
      totalMessages += parsed.messages.length;
      totalToolCalls += parsed.toolCalls.length;
      totalDuration += parsed.duration;
    }

    console.log(`  Sessions:      ${chalk.bold(parsedSessions.length)}`);
    console.log(`  Total Cost:    ${chalk.bold.green(`$${totalCost.toFixed(4)}`)}`);
    console.log(`  Total Tokens:  ${chalk.bold((totalTokens.input + totalTokens.output).toLocaleString())}`);
    console.log(`  Total Messages: ${chalk.bold(totalMessages)}`);
    console.log(`  Total Tools:   ${chalk.bold(totalToolCalls)}`);
    console.log(`  Total Time:    ${chalk.bold(Reporter.formatDuration(totalDuration))}`);
    console.log('');

    // Top sessions table
    const topN = parseInt(opts.top) || 5;
    const topSessions = parsedSessions.slice(0, topN);

    console.log(chalk.bold(`  💰 Top ${topN} Most Expensive Sessions`));
    console.log(DIVIDER);
    console.log(chalk.gray('  Rank  Session ID                         Cost      Tokens    Messages'));
    console.log(chalk.gray('  ────  ─────────────────────────────────  ────────  ────────  ────────'));

    for (let i = 0; i < topSessions.length; i++) {
      const p = topSessions[i];
      const rank = String(i + 1).padStart(4);
      const id = p.id.substring(0, 36).padEnd(36);
      const cost = `$${p.cost.toFixed(4)}`.padStart(8);
      const tokens = (p.totalTokens.input + p.totalTokens.output).toLocaleString().padStart(8);
      const msgs = String(p.messages.length).padStart(8);
      console.log(`  ${rank}  ${chalk.cyan(id)}  ${chalk.green(cost)}  ${tokens}  ${msgs}`);
    }
    console.log('');

    // Show detailed view for top session
    if (topSessions.length > 0) {
      const top = topSessions[0];
      console.log(chalk.bold(`  🔎 Most Expensive Session Detail`));
      console.log(DIVIDER);
      const stats = SessionAnalyzer.getStats(top);
      const costBreakdown = SessionAnalyzer.getCostBreakdown(top);
      const toolUsage = SessionAnalyzer.getToolUsage(top.toolCalls);
      const anomalies = SessionAnalyzer.detectAnomalies(top);
      const timeline = top.agentName === 'kimi-code'
        ? new KimiCodeParser().getTimeline(top.messages)
        : [];
      Reporter.display(top, stats, costBreakdown, toolUsage, anomalies, timeline);
    }

    // Show latest session
    const latestSession = parsedSessions.reduce((latest, p) => {
      if (!latest || !latest.endTime) return p;
      if (!p.endTime) return latest;
      return p.endTime > latest.endTime ? p : latest;
    }, null);

    if (latestSession && latestSession.id !== topSessions[0]?.id) {
      console.log(chalk.bold(`  🕐 Latest Session`));
      console.log(DIVIDER);
      const stats = SessionAnalyzer.getStats(latestSession);
      const costBreakdown = SessionAnalyzer.getCostBreakdown(latestSession);
      const toolUsage = SessionAnalyzer.getToolUsage(latestSession.toolCalls);
      const anomalies = SessionAnalyzer.detectAnomalies(latestSession);
      const timeline = latestSession.agentName === 'kimi-code'
        ? new KimiCodeParser().getTimeline(latestSession.messages)
        : [];
      Reporter.display(latestSession, stats, costBreakdown, toolUsage, anomalies, timeline);
    }

    console.log(DIVIDER);
    console.log(chalk.dim('  agent-trace | Read-only, local analysis | github.com/liangzhengtao/agent-trace'));
    console.log('');
  } else {
    // Single session or specific session requested
    for (const parsed of parsedSessions) {
      try {
        if (opts.json) {
          const stats = SessionAnalyzer.getStats(parsed);
          const costBreakdown = SessionAnalyzer.getCostBreakdown(parsed);
          const toolUsage = SessionAnalyzer.getToolUsage(parsed.toolCalls);
          const anomalies = SessionAnalyzer.detectAnomalies(parsed);
          const timeline = [];
          console.log(JSON.stringify({
            agent: parsed.agentName,
            session: parsed.id,
            stats,
            costBreakdown,
            toolUsage,
            anomalies,
            timeline: opts.verbose ? timeline : undefined,
          }, null, 2));
        } else {
          console.log(chalk.bold(`  Agent: ${parsed.agentName}`));
          const stats = SessionAnalyzer.getStats(parsed);
          const costBreakdown = SessionAnalyzer.getCostBreakdown(parsed);
          const toolUsage = SessionAnalyzer.getToolUsage(parsed.toolCalls);
          const anomalies = SessionAnalyzer.detectAnomalies(parsed);
          const timeline = parsed.agentName === 'kimi-code'
            ? new KimiCodeParser().getTimeline(parsed.messages)
            : [];
          Reporter.display(parsed, stats, costBreakdown, toolUsage, anomalies, timeline);
        }
      } catch (err) {
        console.log(chalk.yellow(`  ⚠️  Error displaying session ${parsed.id}: ${err.message}`));
      }
    }
  }
}

main().catch(err => {
  console.error(chalk.red(`\n  Error: ${err.message}\n`));
  process.exit(1);
});
