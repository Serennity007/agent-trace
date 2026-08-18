const fs = require('fs');
const path = require('path');

/**
 * Parse Claude Code session logs
 * Sessions are .jsonl files in ~/.claude/projects/<project>/
 * Each line is a JSON object with type, timestamp, message, etc.
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
      const projects = fs.readdirSync(basePath);
      for (const project of projects) {
        const projectPath = path.join(basePath, project);
        if (!fs.statSync(projectPath).isDirectory()) continue;
        const files = fs.readdirSync(projectPath).filter(f => f.endsWith('.jsonl'));
        for (const file of files) {
          sessions.push({
            file: path.join(projectPath, file),
            id: file.replace('.jsonl', ''),
            project,
          });
        }
      }
    }
    return sessions;
  }

  parseSession(sessionData) {
    const filePath = typeof sessionData === 'string' ? sessionData : sessionData.file;
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

          // Process user messages
          if (entry.type === 'user' && entry.message) {
            const msg = entry.message;
            const content = typeof msg.content === 'string'
              ? msg.content
              : Array.isArray(msg.content)
                ? msg.content.filter(c => c.type === 'text').map(c => c.text).join(' ')
                : '';
            parsed.messages.push({
              role: 'user',
              content: content.substring(0, 200),
              timestamp,
            });
          }

          // Process assistant messages (may contain tool_use blocks)
          if (entry.type === 'assistant' && entry.message) {
            const msg = entry.message;
            let textContent = '';
            let hasToolUse = false;

            if (typeof msg.content === 'string') {
              textContent = msg.content;
            } else if (Array.isArray(msg.content)) {
              for (const block of msg.content) {
                if (block.type === 'text') {
                  textContent += block.text;
                } else if (block.type === 'tool_use') {
                  hasToolUse = true;
                  parsed.toolCalls.push({
                    name: block.name || 'unknown',
                    timestamp,
                    duration: null,
                    success: true, // Will be updated if we see tool_result with error
                    error: null,
                    input: block.input ? JSON.stringify(block.input).substring(0, 100) : null,
                  });
                }
              }
            }

            // Track tokens from message.usage
            if (msg.usage) {
              parsed.totalTokens.input += msg.usage.input_tokens || 0;
              parsed.totalTokens.output += msg.usage.output_tokens || 0;
            }

            parsed.messages.push({
              role: 'assistant',
              content: textContent.substring(0, 200),
              timestamp,
              hasToolUse,
            });
          }

          // Process tool results (errors)
          if (entry.type === 'tool_result' && entry.message) {
            const isError = entry.message.is_error || false;
            if (isError && parsed.toolCalls.length > 0) {
              // Mark the last tool call as failed
              const lastTool = parsed.toolCalls[parsed.toolCalls.length - 1];
              lastTool.success = false;
              lastTool.error = typeof entry.message.content === 'string'
                ? entry.message.content.substring(0, 100)
                : 'Tool error';
            }
          }

          // Track errors
          if (entry.type === 'error' || (entry.message && entry.message.is_error)) {
            parsed.errors.push({
              message: entry.message?.content || 'Unknown error',
              timestamp,
            });
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

    // Estimate cost (Claude 3.5 Sonnet pricing)
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
