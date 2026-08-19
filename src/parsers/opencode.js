const fs = require('fs');
const path = require('path');

/**
 * Parse OpenCode session logs
 * OpenCode stores sessions in ~/.opencode/sessions/ as JSON files
 * Or in ~/.opencode/ as opencode.json
 */
class OpenCodeParser {
  constructor() {
    this.name = 'OpenCode';
    this.sessionPaths = [
      path.join(process.env.HOME || process.env.USERPROFILE, '.opencode', 'sessions'),
      path.join(process.env.HOME || process.env.USERPROFILE, '.opencode'),
    ];
  }

  /**
   * Find all session files
   */
  findSessions() {
    const sessions = [];
    for (const basePath of this.sessionPaths) {
      if (!fs.existsSync(basePath)) continue;
      // Check for JSON files
      const files = fs.readdirSync(basePath).filter(f => f.endsWith('.json') && f !== 'package.json' && f !== 'package-lock.json');
      for (const file of files) {
        const filePath = path.join(basePath, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          const hasContent = (content.messages && content.messages.length > 0) ||
                            (content.turns && content.turns.length > 0);
          sessions.push({
            file: filePath,
            id: content.id || file.replace('.json', ''),
            data: content,
            hasContent,
          });
        } catch (e) {
          // Skip malformed files
        }
      }
    }
    // Sort by modification time descending
    sessions.sort((a, b) => {
      try {
        const statA = fs.statSync(a.file);
        const statB = fs.statSync(b.file);
        return statB.mtimeMs - statA.mtimeMs;
      } catch (e) {
        return 0;
      }
    });
    return sessions;
  }

  /**
   * Parse a single session into structured data
   */
  parseSession(sessionData) {
    const messages = sessionData.messages || sessionData.turns || [];
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

    for (const msg of messages) {
      const timestamp = msg.timestamp || msg.created_at || msg.time;
      const role = msg.role || msg.type || 'unknown';
      const content = msg.content || msg.text || '';

      // Track timing
      if (timestamp) {
        const ts = new Date(timestamp);
        if (!parsed.startTime || ts < parsed.startTime) parsed.startTime = ts;
        if (!parsed.endTime || ts > parsed.endTime) parsed.endTime = ts;
      }

      // Track tokens
      if (msg.usage) {
        parsed.totalTokens.input += msg.usage.input_tokens || msg.usage.prompt_tokens || 0;
        parsed.totalTokens.output += msg.usage.output_tokens || msg.usage.completion_tokens || 0;
      }

      // Track tool calls
      if (msg.tool_calls || msg.toolCalls) {
        const tools = msg.tool_calls || msg.toolCalls;
        for (const tool of tools) {
          parsed.toolCalls.push({
            name: tool.name || tool.function?.name || 'unknown',
            timestamp: timestamp ? new Date(timestamp) : null,
            duration: tool.duration || null,
            success: !tool.error,
            error: tool.error || null,
          });
        }
      }

      // Track errors
      if (msg.error || role === 'error') {
        parsed.errors.push({
          message: msg.error || content,
          timestamp: timestamp ? new Date(timestamp) : null,
        });
      }

      // Track retries
      if (msg.retry || (typeof content === 'string' && content.toLowerCase().includes('retry'))) {
        parsed.retries++;
      }

      parsed.messages.push({
        role,
        content: typeof content === 'string' ? content.substring(0, 200) : '',
        timestamp: timestamp ? new Date(timestamp) : null,
        tokens: msg.usage || null,
      });
    }

    // Calculate duration
    if (parsed.startTime && parsed.endTime) {
      parsed.duration = (parsed.endTime - parsed.startTime) / 1000; // seconds
    }

    // Estimate cost (rough: $3/1M input, $15/1M output for Claude)
    parsed.cost = (parsed.totalTokens.input * 3 + parsed.totalTokens.output * 15) / 1000000;

    return parsed;
  }

  /**
   * Analyze tool health
   */
  analyzeToolHealth(toolCalls) {
    const health = {};
    for (const call of toolCalls) {
      if (!health[call.name]) {
        health[call.name] = { total: 0, success: 0, failed: 0, errors: [] };
      }
      health[call.name].total++;
      if (call.success) {
        health[call.name].success++;
      } else {
        health[call.name].failed++;
        if (call.error) health[call.name].errors.push(call.error);
      }
    }
    return health;
  }

  /**
   * Get session timeline
   */
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

module.exports = { OpenCodeParser };
