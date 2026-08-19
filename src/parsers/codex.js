const fs = require('fs');
const path = require('path');

/**
 * Parse Codex session logs
 * Codex stores sessions in ~/.codex/sessions/<year>/<month>/<day>/ as .jsonl files
 * Entry types: session_meta, event_msg, response_item, world_state, turn_context
 * Message types in event_msg: user_message, agent_message, token_count
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
            const files = fs.readdirSync(dayPath).filter(f => f.endsWith('.jsonl'));
            for (const file of files) {
              const filePath = path.join(dayPath, file);
              try {
                const content = fs.readFileSync(filePath, 'utf-8').trim();
                const hasContent = content.length > 0 && content.split('\n').length > 1;
                sessions.push({
                  file: filePath,
                  id: file.replace('.jsonl', ''),
                  date: `${year}-${month}-${day}`,
                  hasContent,
                });
              } catch (e) {
                // Skip
              }
            }
          }
        }
      }
    }
    sessions.sort((a, b) => {
      try {
        return fs.statSync(b.file).mtimeMs - fs.statSync(a.file).mtimeMs;
      } catch (e) {
        return 0;
      }
    });
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

    // Codex token_count events are cumulative, track the last one
    let lastTokenUsage = null;

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const timestamp = entry.timestamp ? new Date(entry.timestamp) : null;
          const type = entry.type;
          const payload = entry.payload || {};

          // Track timing
          if (timestamp) {
            if (!parsed.startTime || timestamp < parsed.startTime) parsed.startTime = timestamp;
            if (!parsed.endTime || timestamp > parsed.endTime) parsed.endTime = timestamp;
          }

          // event_msg type
          if (type === 'event_msg') {
            // User messages
            if (payload.type === 'user_message' && payload.message) {
              parsed.messages.push({
                role: 'user',
                content: String(payload.message).substring(0, 200),
                timestamp,
              });
            }

            // Agent messages
            if (payload.type === 'agent_message' && payload.message) {
              parsed.messages.push({
                role: 'assistant',
                content: String(payload.message).substring(0, 200),
                timestamp,
              });
            }

            // Token counts (cumulative - only keep the last one)
            if (payload.type === 'token_count' && payload.info) {
              const usage = payload.info.total_token_usage || payload.info.last_token_usage;
              if (usage) {
                lastTokenUsage = usage;
              }
            }
          }

          // response_item type
          if (type === 'response_item') {
            // Messages
            if (payload.type === 'message') {
              const role = payload.role;
              let textContent = '';

              if (Array.isArray(payload.content)) {
                for (const block of payload.content) {
                  if (block.type === 'input_text' || block.type === 'output_text' || block.type === 'text') {
                    textContent += block.text || '';
                  }
                }
              } else if (typeof payload.content === 'string') {
                textContent = payload.content;
              }

              if (textContent.trim()) {
                parsed.messages.push({
                  role: role === 'user' ? 'user' : 'assistant',
                  content: textContent.substring(0, 200),
                  timestamp,
                });
              }
            }

            // Tool calls
            if (payload.type === 'custom_tool_call' || payload.type === 'function_call') {
              parsed.toolCalls.push({
                name: payload.name || 'unknown',
                timestamp,
                duration: null,
                success: true,
                error: null,
                input: payload.arguments ? String(payload.arguments).substring(0, 80) : null,
              });
            }

            // Tool results
            if (payload.type === 'custom_tool_call_output' || payload.type === 'function_call_output') {
              if (parsed.toolCalls.length > 0) {
                const lastTool = parsed.toolCalls[parsed.toolCalls.length - 1];
                if (payload.error || payload.is_error) {
                  lastTool.success = false;
                  lastTool.error = String(payload.error || 'Tool error').substring(0, 100);
                }
              }
            }
          }

          // Errors
          if (type === 'error' || (payload.error && typeof payload.error === 'string')) {
            parsed.errors.push({
              message: String(payload.error || payload.message || 'Unknown error').substring(0, 100),
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

    // Use the last cumulative token count (not sum)
    if (lastTokenUsage) {
      parsed.totalTokens.input = lastTokenUsage.input_tokens || 0;
      parsed.totalTokens.output = lastTokenUsage.output_tokens || 0;
    }

    // Calculate duration
    if (parsed.startTime && parsed.endTime) {
      parsed.duration = (parsed.endTime - parsed.startTime) / 1000;
    }

    // Estimate cost (GPT pricing estimate)
    parsed.cost = (parsed.totalTokens.input * 2.5 + parsed.totalTokens.output * 10) / 1000000;

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
