const fs = require('fs');
const path = require('path');

/**
 * Parse Kimi Code session logs
 * Kimi Code stores sessions in ~/.kimi-code/sessions/<workspace>/<session>/
 * Each session has state.json and logs/kimi-code.log
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
      // Walk workspace directories
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
              sessions.push({
                path: sessionPath,
                id: sessionDir,
                state,
                workspace,
              });
            } catch (e) {
              // Skip malformed
            }
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

    // Parse state.json
    if (session.state) {
      parsed.startTime = session.state.createdAt ? new Date(session.state.createdAt) : null;
      parsed.endTime = session.state.updatedAt ? new Date(session.state.updatedAt) : null;
      if (parsed.startTime && parsed.endTime) {
        parsed.duration = (parsed.endTime - parsed.startTime) / 1000;
      }
    }

    // Parse log file
    const logFile = path.join(session.path, 'logs', 'kimi-code.log');
    if (fs.existsSync(logFile)) {
      try {
        const content = fs.readFileSync(logFile, 'utf-8');
        const lines = content.split('\n').filter(Boolean);

        for (const line of lines) {
          // Parse log entries like: [2026-07-17T01:55:00.810Z] INFO message
          const match = line.match(/^\[([^\]]+)\]\s+(\w+)\s+(.*)$/);
          if (match) {
            const [, timestamp, level, message] = match;
            const ts = new Date(timestamp);

            if (level === 'ERROR') {
              parsed.errors.push({ message, timestamp: ts });
            }

            // Detect tool calls from log patterns
            if (message.includes('tool_call') || message.includes('executing tool')) {
              const toolMatch = message.match(/tool[_\s]?call[:\s]+(\w+)/i);
              if (toolMatch) {
                parsed.toolCalls.push({
                  name: toolMatch[1],
                  timestamp: ts,
                  duration: null,
                  success: !message.includes('error'),
                  error: message.includes('error') ? message : null,
                });
              }
            }

            // Detect retries
            if (message.toLowerCase().includes('retry')) {
              parsed.retries++;
            }
          }
        }
      } catch (e) {
        // File read error
      }
    }

    // Parse agent state files for token usage
    const agentsDir = path.join(session.path, 'agents');
    if (fs.existsSync(agentsDir)) {
      try {
        const agents = fs.readdirSync(agentsDir);
        for (const agent of agents) {
          const agentStateFile = path.join(agentsDir, agent, 'state.json');
          if (fs.existsSync(agentStateFile)) {
            try {
              const agentState = JSON.parse(fs.readFileSync(agentStateFile, 'utf-8'));
              if (agentState.tokenUsage) {
                parsed.totalTokens.input += agentState.tokenUsage.input || 0;
                parsed.totalTokens.output += agentState.tokenUsage.output || 0;
              }
            } catch (e) {
              // Skip
            }
          }
        }
      } catch (e) {
        // Skip
      }
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

module.exports = { KimiCodeParser };
