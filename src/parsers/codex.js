const fs = require('fs');
const path = require('path');

/**
 * Parse Codex session logs
 * Codex stores sessions in ~/.codex/sessions/<year>/<month>/<day>/
 */
class CodexParser {
  constructor() {
    this.name = 'Codex';
    this.sessionPaths = [
      path.join(process.env.HOME || process.env.USERPROFILE, '.codex', 'sessions'),
    ];
  }

  findSessions() {
    const sessions = [];
    for (const basePath of this.sessionPaths) {
      if (!fs.existsSync(basePath)) continue;
      // Walk date directories
      const years = fs.readdirSync(basePath);
      for (const year of years) {
        const yearPath = path.join(basePath, year);
        if (!fs.statSync(yearPath).isDirectory()) continue;
        const months = fs.readdirSync(yearPath);
        for (const month of months) {
          const monthPath = path.join(yearPath, month);
          if (!fs.statSync(monthPath).isDirectory()) continue;
          const days = fs.readdirSync(monthPath);
          for (const day of days) {
            const dayPath = path.join(monthPath, day);
            if (!fs.statSync(dayPath).isDirectory()) continue;
            const files = fs.readdirSync(dayPath).filter(f => f.endsWith('.json'));
            for (const file of files) {
              const filePath = path.join(dayPath, file);
              try {
                const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                sessions.push({
                  file: filePath,
                  id: file.replace('.json', ''),
                  data: content,
                  date: `${year}-${month}-${day}`,
                });
              } catch (e) {
                // Skip
              }
            }
          }
        }
      }
    }
    return sessions;
  }

  parseSession(sessionData) {
    const parsed = {
      id: sessionData.id || 'unknown',
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

    const data = sessionData.data || {};
    const messages = data.messages || data.turns || [];

    for (const msg of messages) {
      const timestamp = msg.timestamp || msg.created_at;
      const role = msg.role || msg.type || 'unknown';
      const content = msg.content || msg.text || '';

      if (timestamp) {
        const ts = new Date(timestamp);
        if (!parsed.startTime || ts < parsed.startTime) parsed.startTime = ts;
        if (!parsed.endTime || ts > parsed.endTime) parsed.endTime = ts;
      }

      if (msg.usage) {
        parsed.totalTokens.input += msg.usage.input_tokens || msg.usage.prompt_tokens || 0;
        parsed.totalTokens.output += msg.usage.output_tokens || msg.usage.completion_tokens || 0;
      }

      if (msg.tool_calls) {
        for (const tool of msg.tool_calls) {
          parsed.toolCalls.push({
            name: tool.name || tool.function?.name || 'unknown',
            timestamp: timestamp ? new Date(timestamp) : null,
            duration: tool.duration || null,
            success: !tool.error,
            error: tool.error || null,
          });
        }
      }

      if (msg.error) {
        parsed.errors.push({ message: msg.error, timestamp: timestamp ? new Date(timestamp) : null });
      }

      parsed.messages.push({
        role,
        content: typeof content === 'string' ? content.substring(0, 200) : '',
        timestamp: timestamp ? new Date(timestamp) : null,
      });
    }

    if (parsed.startTime && parsed.endTime) {
      parsed.duration = (parsed.endTime - parsed.startTime) / 1000;
    }
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

module.exports = { CodexParser };
