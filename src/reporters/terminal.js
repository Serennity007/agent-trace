let chalk;
try {
  chalk = require('chalk');
} catch {
  chalk = { green: s => s, red: s => s, yellow: s => s, gray: s => s, bold: s => s, cyan: s => s, magenta: s => s, blue: s => s, dim: s => s, white: s => s };
}
let figures;
try {
  figures = require('figures');
} catch {
  figures = { tick: '✓', cross: '✗', arrow: '→' };
}

/**
 * Display session trace report with chat-style timeline
 */
class Reporter {
  static display(parsed, stats, costBreakdown, toolUsage, anomalies, timeline) {
    const TERM_WIDTH = 80;
    const DIVIDER = chalk.gray('  ' + '─'.repeat(TERM_WIDTH - 4));

    console.log('');
    console.log(chalk.bold.cyan('  🔍 Agent Trace Report'));
    console.log(DIVIDER);
    console.log('');

    // Session Overview
    this.section('📊 Session Overview', [
      `Duration: ${chalk.bold(this.formatDuration(parsed.duration))}`,
      `Messages: ${chalk.bold(stats.totalMessages)} (User: ${chalk.cyan(stats.userMessages)}, AI: ${chalk.green(stats.assistantMessages)}, Tool: ${chalk.yellow(stats.toolMessages)})`,
      `Tool Calls: ${chalk.bold(stats.totalToolCalls)} (${stats.uniqueTools.length} unique tools)`,
      `Errors: ${stats.errors > 0 ? chalk.red(stats.errors) : chalk.green(stats.errors)}`,
      `Retries: ${stats.retries > 0 ? chalk.yellow(stats.retries) : chalk.green(stats.retries)}`,
    ]);

    // Cost Analysis
    this.section('💰 Cost Analysis', [
      `Input Tokens:  ${chalk.bold(costBreakdown.input.tokens.toLocaleString())}  ${chalk.gray(`($${costBreakdown.input.cost.toFixed(4)})`)}`,
      `Output Tokens: ${chalk.bold(costBreakdown.output.tokens.toLocaleString())}  ${chalk.gray(`($${costBreakdown.output.cost.toFixed(4)})`)}`,
      `Total Tokens:  ${chalk.bold(costBreakdown.total.tokens.toLocaleString())}`,
      `Estimated Cost: ${chalk.bold.green(`$${costBreakdown.total.cost.toFixed(4)}`)}`,
    ]);

    // Tool Health
    if (Object.keys(toolUsage).length > 0) {
      console.log(chalk.bold('  🔧 Tool Health'));
      console.log(DIVIDER);
      for (const [name, data] of Object.entries(toolUsage)) {
        const rate = data.successRate;
        const icon = rate >= 90 ? chalk.green('✓') : rate >= 70 ? chalk.yellow('⚠') : chalk.red('✗');
        const rateStr = rate >= 90 ? chalk.green(`${rate.toFixed(0)}%`) : rate >= 70 ? chalk.yellow(`${rate.toFixed(0)}%`) : chalk.red(`${rate.toFixed(0)}%`);
        const bar = this.progressBar(rate, 20);
        console.log(`  ${icon} ${chalk.bold(name.padEnd(15))} ${bar} ${rateStr}  ${chalk.gray(`(${data.count} calls, avg ${this.formatDurationShort(data.avgDuration / 1000)})`)}`);
      }
      console.log('');
    }

    // Anomalies
    if (anomalies.length > 0) {
      console.log(chalk.bold.yellow('  ⚠️  Anomalies'));
      console.log(DIVIDER);
      for (const a of anomalies) {
        console.log(chalk.yellow(`  ${figures.arrow} ${a.message}`));
      }
      console.log('');
    }

    // Active Periods
    const periods = this.getActivePeriodsFromTimeline(timeline);
    if (periods.length > 0) {
      console.log(chalk.bold('  ⏱️  Active Periods'));
      console.log(DIVIDER);
      for (const period of periods.slice(0, 5)) {
        const start = period.start ? this.formatTime(period.start) : '?';
        const end = period.end ? this.formatTime(period.end) : '?';
        const duration = period.start && period.end ? this.formatDuration((period.end - period.start) / 1000) : '?';
        console.log(`  ${chalk.cyan(start)} → ${chalk.cyan(end)}  ${chalk.gray(`(${duration}, ${period.count} messages)`)}`);
      }
      console.log('');
    }

    // Chat-style Timeline with timestamps on right
    if (timeline.length > 0) {
      console.log(chalk.bold('  💬 Conversation'));
      console.log(DIVIDER);

      for (const entry of timeline.slice(-25)) {
        const time = entry.timestamp ? this.formatTime(entry.timestamp) : '??:??:??';
        const duration = entry.duration !== null && entry.duration !== undefined
          ? `+${this.formatDurationShort(entry.duration)}`
          : '';
        const preview = entry.contentPreview
          .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI escape sequences
          .replace(/[\t\r]/g, ' ')          // Replace tabs/CR with space
          .replace(/\n/g, ' ')              // Replace newlines
          .substring(0, 55)
          .trim();

        // Role styling
        let roleIcon, roleColor;
        if (entry.role === 'user') {
          roleIcon = chalk.cyan('YOU');
          roleColor = chalk.white;
        } else if (entry.role === 'assistant') {
          roleIcon = chalk.green('AI ');
          roleColor = chalk.white;
        } else {
          roleIcon = chalk.yellow('TL ');
          roleColor = chalk.gray;
        }

        // Build the line: [ROLE] content ... timestamp (duration)
        const contentText = preview || '(empty)';
        const roleTag = `[${roleIcon}]`;

        // Calculate right-side info
        const rightInfo = duration
          ? chalk.gray(`${time} (${chalk.yellow(duration)})`)
          : chalk.gray(time);

        // Calculate padding to right-align the time info
        const leftPart = `  ${roleTag} ${contentText}`;
        // Approximate visible length (strip chalk for length calc)
        const visibleLen = contentText.length + 6; // "[XX ] " + content
        const rightLen = duration ? time.length + duration.length + 4 : time.length;
        const padding = Math.max(2, TERM_WIDTH - 4 - visibleLen - rightLen);

        // Truncate content if too long
        if (visibleLen + rightLen + 2 > TERM_WIDTH - 4) {
          const maxContent = TERM_WIDTH - 4 - rightLen - 10;
          const truncated = contentText.substring(0, maxContent) + '...';
          console.log(`  ${roleTag} ${roleColor(truncated)}  ${rightInfo}`);
        } else {
          console.log(`  ${roleTag} ${roleColor(contentText)}${' '.repeat(padding)}${rightInfo}`);
        }
      }

      if (timeline.length > 25) {
        console.log(chalk.gray(`  ... and ${timeline.length - 25} more messages`));
      }
      console.log('');
    }

    console.log(DIVIDER);
    console.log(chalk.dim('  agent-trace | Read-only, local analysis | github.com/liangzhengtao/agent-trace'));
    console.log('');
  }

  static section(title, lines) {
    console.log(chalk.bold(`  ${title}`));
    console.log(chalk.gray('  ' + '─'.repeat(76)));
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    console.log('');
  }

  static progressBar(percent, width) {
    const filled = Math.round((percent / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    if (percent >= 90) return chalk.green(bar);
    if (percent >= 70) return chalk.yellow(bar);
    return chalk.red(bar);
  }

  static formatTime(date) {
    if (!date) return '??:??:??';
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  static formatDuration(seconds) {
    if (!seconds || seconds < 0) return '?';
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  static formatDurationShort(seconds) {
    if (!seconds || seconds < 0) return '?';
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(0)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m${Math.floor(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
  }

  static getActivePeriodsFromTimeline(timeline) {
    if (timeline.length < 2) return [];
    const periods = [];
    let current = { start: timeline[0].timestamp, end: timeline[0].timestamp, count: 1 };

    for (let i = 1; i < timeline.length; i++) {
      const entry = timeline[i];
      if (!entry.timestamp) continue;
      const gap = (entry.timestamp - current.end) / 1000 / 60;

      if (gap > 10) {
        periods.push(current);
        current = { start: entry.timestamp, end: entry.timestamp, count: 1 };
      } else {
        current.end = entry.timestamp;
        current.count++;
      }
    }
    periods.push(current);
    return periods;
  }
}

module.exports = { Reporter };
