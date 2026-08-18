const fs = require('fs');
const path = require('path');

/**
 * Parse Claude Code session logs
 * Claude Code stores sessions as .jsonl files in ~/.claude/projects/<project>/
 */
class ClaudeCodeParser {
  constructor() {
    this.name = 'Claude Code';
    this.sessionPaths = [
      path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'projects'),
    ];
  }

  findSessions() {
    const sessions = [];
    for (const basePath of this.sessionPaths) {
      if (!fs.existsSync(basePath)) continue;
      // Walk project directories
      const projects = fs.readdirSync(basePath);
      for (const project of projects) {
        const projectPath = path.join(basePath, project);
        if (!fs.statSync(projectPath).isDirectory()) continue;
        const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));
        for (const file of files) {
          const filePath = path.join(projectPath, file);
          sessions.push({
            file: filePath,
            id: file.replace('.jsonl', ''),
            project,
          });
        }
      }
    }
    return sessions;
  }

  parseSession(filePath) {
    const parsed = {
      id: path.basename(filePath, '.jsonl'),
      startTime: null,
      endTime: null,
      duration: 0,
      messages: [],
      toolCalls: [],
      totalTokens: { input: 0, output: 0 },
      cost: 0,
      errors: [],
      retries: 0,
    };

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;

          // Track timing
          if (timestamp) {
            if (!parsed.startTime || timestamp < parsed.startTime) parsed.startTime = timestamp;
            if (!parsed.endTime || timestamp > parsed.endTime) parsed.endTime = timestamp;
          }

          // Process user/assistant messages
          if (entry.type === 'user' || entry.type === 'assistant') {
            const msg = entry.message || {};
            parsed.messages.push({
              role: entry.type,
              content: typeof msg.content === 'string' ? msg.content.substring(0, 200) : '',
              timestamp,
              tokens: null,
            });
          }

          // Process tool calls
          if (entry.type === 'tool_use' || entry.type === 'tool_call') {
            parsed.toolCalls.push({
              name: entry.name || entry.tool_name || 'unknown',
              timestamp,
              duration: null,
              success: !entry.error,
              error: entry.error || null,
            });
          }

          // Track errors
          if (entry.type === 'error' || entry.error) {
            parsed.errors.push({
              message: entry.error || entry.message || 'Unknown error',
              timestamp,
            });
          }

          // Track tokens from usage
          if (entry.usage) {
            parsed.totalTokens.input += entry.usage.input_tokens || 0;
            parsed.totalTokens.output += entry.usage.output_tokens || 0;
          }
        } catch (e) {
          // Skip malformed lines
        }
      }
    } catch (e) {
      // File read error
    }

    // Calculate duration
    if (parsed.startTime && parsed.endTime) {
      parsed.duration = (parsed.endTime - parsed.startTime) / 1000;
    }

    // Estimate cost
    parsed.cost = (parsed.totalTokens.input * 3 + parsed.totalTokens.output * 15) / 1000000;

    return parsed;
  }

  getTimeline(messages) {
    const timeline = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const nextMsg = messages[i + 1];
      const duration = nextMsg && msg.timestamp && nextMsg.timestamp
        ? (nextMsg.timestamp - msg.timestamp) / 1000
        : null;
      timeline.push({
        index: i,
        role: msg.role,
        timestamp: msg.timestamp,
        duration,
        contentPreview: msg.content.substring(0, 100),
      });
    }
    return timeline;
  }
}

module.exports = { ClaudeCodeParser };
