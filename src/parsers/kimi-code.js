const fs = require('fs');
const path = require('path');

/**
 * Parse Kimi Code session logs
 * Sessions: ~/.kimi-code/sessions/<workspace>/<session>/
 * Conversation: agents/main/wire.jsonl
 */
class KimiCodeParser {
  constructor() {
    this.name = 'Kimi Code';
    this.sessionPaths = [
      path.join(process.env.HOME || process.env.USERPROFILE, '.kimi-code', 'sessions'),
    ];
  }

  findSessions() {
    const sessions = [];
    for (const basePath of this.sessionPaths) {
      if (!fs.existsSync(basePath)) continue;
      const workspaces = fs.readdirSync(basePath);
      for (const workspace of workspaces) {
        const workspacePath = path.join(basePath, workspace);
        if (!fs.statSync(workspacePath).isDirectory()) continue;
        const sessionDirs = fs.readdirSync(workspacePath);
        for (const sessionDir of sessionDirs) {
          const sessionPath = path.join(workspacePath, sessionDir);
          const stateFile = path.join(sessionPath, 'state.json');
          if (fs.existsSync(stateFile)) {
            try {
              const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
              sessions.push({ path: sessionPath, id: sessionDir, state, workspace });
            } catch (e) { /* skip */ }
          }
        }
      }
    }
    return sessions;
  }

  parseSession(session) {
    const parsed = {
      id: session.id,
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

    // Parse state.json for timing
    if (session.state) {
      parsed.startTime = session.state.createdAt ? new Date(session.state.createdAt) : null;
      parsed.endTime = session.state.updatedAt ? new Date(session.state.updatedAt) : null;
      if (parsed.startTime && parsed.endTime) {
        parsed.duration = (parsed.endTime - parsed.startTime) / 1000;
      }
    }

    // Parse wire.jsonl for conversation data
    const wireFile = path.join(session.path, 'agents', 'main', 'wire.jsonl');
    if (!fs.existsSync(wireFile)) return parsed;

    try {
      const content = fs.readFileSync(wireFile, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const timestamp = entry.time ? new Date(entry.time) : null;

          if (timestamp) {
            if (!parsed.startTime || timestamp < parsed.startTime) parsed.startTime = timestamp;
            if (!parsed.endTime || timestamp > parsed.endTime) parsed.endTime = timestamp;
          }

          // User messages: turn.prompt
          if (entry.type === 'turn.prompt' && entry.input) {
            const text = Array.isArray(entry.input)
              ? entry.input.filter(i => i.type === 'text').map(i => i.text).join(' ')
              : String(entry.input);
            parsed.messages.push({ role: 'user', content: text.substring(0, 200), timestamp });
          }

          // Tool calls: nested in context.append_loop_event
          if (entry.type === 'context.append_loop_event' && entry.event) {
            const event = entry.event;

            // Tool call
            if (event.type === 'tool.call') {
              parsed.toolCalls.push({
                name: event.name || 'unknown',
                timestamp,
                duration: null,
                success: true,
                error: null,
                input: event.description || event.args?.command?.substring(0, 50) || null,
              });
            }

            // Tool result (check for errors)
            if (event.type === 'tool.result' && parsed.toolCalls.length > 0) {
              const lastTool = parsed.toolCalls[parsed.toolCalls.length - 1];
              if (event.error || event.isError) {
                lastTool.success = false;
                lastTool.error = String(event.error || 'Tool error').substring(0, 100);
              }
            }

            // Assistant text output
            if (event.type === 'content.part' && event.part) {
              if (event.part.type === 'text' && event.part.text) {
                parsed.messages.push({
                  role: 'assistant',
                  content: event.part.text.substring(0, 200),
                  timestamp,
                });
              }
            }
          }

          // Token usage: usage.record
          if (entry.type === 'usage.record' && entry.usage) {
            parsed.totalTokens.input += entry.usage.inputOther || 0;
            parsed.totalTokens.input += entry.usage.inputCacheRead || 0;
            parsed.totalTokens.output += entry.usage.output || 0;
          }

          // Errors
          if (entry.type === 'tool.result' && entry.event?.error) {
            parsed.errors.push({
              message: String(entry.event.error).substring(0, 100),
              timestamp,
            });
          }
        } catch (e) { /* skip malformed */ }
      }
    } catch (e) { /* file read error */ }

    // Recalculate duration
    if (parsed.startTime && parsed.endTime) {
      parsed.duration = (parsed.endTime - parsed.startTime) / 1000;
    }

    // Estimate cost (Kimi/mimo pricing estimate)
    parsed.cost = (parsed.totalTokens.input * 2 + parsed.totalTokens.output * 10) / 1000000;

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

module.exports = { KimiCodeParser };
