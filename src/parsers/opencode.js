const fs = require('fs');
const os = require('os');
const path = require('path');
const { estimateCost } = require('../pricing');

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch (e) {
    return false;
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function listJsonFiles(dir) {
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  } catch (e) {
    return [];
  }
}

function tokenCount(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

// OpenCode stores timestamps as epoch milliseconds; tolerate ISO strings and
// second-based numbers from older exports.
function toDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  let ms;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    ms = value > 0 && value < 1e11 ? value * 1000 : value;
  } else if (typeof value === 'string') {
    ms = Date.parse(value);
    if (Number.isNaN(ms)) return null;
  } else {
    return null;
  }
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickTime(...values) {
  for (const value of values) {
    const date = toDate(value);
    if (date) return date;
  }
  return null;
}

function messageText(msg) {
  const content = msg.content !== undefined ? msg.content : msg.text;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(part => part && typeof part.text === 'string' && (part.type === undefined || part.type === 'text'))
      .map(part => part.text)
      .join(' ');
  }
  if (content && typeof content === 'object' && typeof content.text === 'string') return content.text;
  return '';
}

function errorText(error) {
  if (!error) return 'Tool error';
  if (typeof error === 'string') return error;
  if (typeof error.message === 'string') return error.message;
  if (typeof error.name === 'string') return error.name;
  try {
    return JSON.stringify(error);
  } catch (e) {
    return 'Tool error';
  }
}

function addTokenUsage(parsed, usage) {
  if (!usage || typeof usage !== 'object') return;
  const cache = usage.cache && typeof usage.cache === 'object' ? usage.cache : {};
  parsed.totalTokens.input += tokenCount(usage.input !== undefined ? usage.input : usage.input_tokens !== undefined ? usage.input_tokens : usage.prompt_tokens);
  const output = usage.output !== undefined ? usage.output
    : usage.output_tokens !== undefined ? usage.output_tokens
      : usage.completion_tokens;
  parsed.totalTokens.output += tokenCount(output) + tokenCount(usage.reasoning !== undefined ? usage.reasoning : usage.reasoning_tokens);
  const cacheRead = cache.read !== undefined ? cache.read
    : usage.cache_read_input_tokens !== undefined ? usage.cache_read_input_tokens
      : usage.cacheRead;
  const cacheWrite = cache.write !== undefined ? cache.write
    : usage.cache_creation_input_tokens !== undefined ? usage.cache_creation_input_tokens
      : usage.cacheWrite;
  parsed.totalTokens.cacheRead += tokenCount(cacheRead);
  parsed.totalTokens.cacheWrite += tokenCount(cacheWrite);
}

function createParsed(id, agentName) {
  return {
    id,
    agentName,
    startTime: null,
    endTime: null,
    duration: 0,
    messages: [],
    toolCalls: [],
    totalTokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    cost: 0,
    errors: [],
    retries: 0,
  };
}

function trackTime(parsed, ...dates) {
  for (const date of dates) {
    if (!date) continue;
    if (!parsed.startTime || date < parsed.startTime) parsed.startTime = date;
    if (!parsed.endTime || date > parsed.endTime) parsed.endTime = date;
  }
}

function finalizeParsed(parsed) {
  if (parsed.startTime && parsed.endTime) {
    parsed.duration = (parsed.endTime - parsed.startTime) / 1000;
  }
  parsed.cost = estimateCost(parsed.agentName, parsed.totalTokens);
}

// Resolve the data directory layout of a storage root. Pre-1.2 OpenCode keeps
// sessions under <root>/storage/{session,message,part}; the storage directory
// itself is accepted too so `agent-trace <path-to-storage>` works.
function findStorageTree(basePath) {
  const candidates = [{
    storagePath: path.join(basePath, 'storage'),
    sessionDir: path.join(basePath, 'storage', 'session'),
  }];
  if (path.basename(basePath) === 'storage') {
    candidates.push({ storagePath: basePath, sessionDir: path.join(basePath, 'session') });
  }
  for (const candidate of candidates) {
    if (isDirectory(candidate.sessionDir)) return candidate;
  }
  return null;
}

function isJsonTreeSessionFile(filePath) {
  return typeof filePath === 'string' && /(?:^|[\\/])storage[\\/]session[\\/]/.test(filePath);
}

function storagePathFromSessionFile(filePath) {
  if (!isJsonTreeSessionFile(filePath)) return null;
  const projectDir = path.dirname(filePath); // <storage>/session/<projectID>
  return path.dirname(path.dirname(projectDir)); // <storage>
}

function toolCallFromPart(part, messageTime) {
  const state = part.state && typeof part.state === 'object' ? part.state : {};
  const stateTime = state.time && typeof state.time === 'object' ? state.time : {};
  const start = pickTime(stateTime.start);
  const end = pickTime(stateTime.end);
  const failed = state.status === 'error' || state.status === 'failed' || !!state.error;
  return {
    name: part.tool || part.name || 'unknown',
    timestamp: start || messageTime || null,
    duration: start && end ? (end - start) / 1000 : null,
    success: !failed,
    error: failed ? errorText(state.error).substring(0, 200) : null,
    input: state.input ? JSON.stringify(state.input).substring(0, 80) : null,
  };
}

/**
 * Parse OpenCode session logs.
 *
 * Supported layouts, newest first:
 * 1. Pre-1.2 JSON tree: `~/.local/share/opencode/storage/session/<projectID>/ses_*.json`
 *    with `storage/message/<sessionID>/msg_*.json` and
 *    `storage/part/<sessionID>/<messageID>/prt_*.json`. Assistant messages carry
 *    `tokens: { input, output, cache: { read, write } }`.
 * 2. Legacy flat JSON: `~/.opencode/sessions/*.json` (or an explicit directory)
 *    containing `messages`/`turns` arrays.
 *
 * OpenCode 1.2+ stores sessions in SQLite (`<dataDir>/opencode.db`). The SQLite
 * database cannot be read here, so findSessions() records a warning in
 * `this.warnings` instead of silently reporting zero sessions.
 */
class OpenCodeParser {
  constructor() {
    this.name = 'OpenCode';
    this.agentName = 'opencode';
    this.warnings = [];
    this.sessionPaths = [];

    // OpenCode resolves its data directory per user profile. HOME is the
    // usual location, while Windows relies on USERPROFILE; check both.
    const homes = OpenCodeParser.homeDirectories();
    for (const home of homes) {
      this.addSessionPath(path.join(home, '.local', 'share', 'opencode'));
    }
    for (const home of homes) {
      this.addSessionPath(path.join(home, '.opencode', 'sessions'));
      this.addSessionPath(path.join(home, '.opencode'));
    }
  }

  static homeDirectories() {
    const homes = [];
    const seen = new Set();
    for (const name of ['HOME', 'USERPROFILE']) {
      const value = process.env[name];
      if (!value) continue;
      const resolved = path.resolve(value);
      const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
      if (seen.has(key)) continue;
      seen.add(key);
      homes.push(resolved);
    }
    if (homes.length === 0) {
      try {
        homes.push(os.homedir());
      } catch (e) { /* ignore */ }
    }
    return homes;
  }

  addSessionPath(candidate) {
    const resolved = path.resolve(candidate);
    const key = process.platform === 'win32' ? resolved.toLowerCase() : resolved;
    const exists = this.sessionPaths.some(existing => {
      const existingKey = process.platform === 'win32' ? existing.toLowerCase() : existing;
      return existingKey === key;
    });
    if (!exists) this.sessionPaths.push(resolved);
  }

  /**
   * Find all session files.
   *
   * Returns one entry per session. JSON-tree sessions load their messages and
   * parts lazily in parseSession(); flat JSON sessions carry their parsed file
   * as `data`. Any SQLite-only data directory is reported through
   * `this.warnings` so the CLI can print a diagnostic to stderr.
   */
  findSessions() {
    this.warnings = [];
    const sessions = [];
    const sqlitePaths = [];
    let jsonTreeSessions = 0;

    for (const basePath of this.sessionPaths) {
      if (!fs.existsSync(basePath)) continue;

      const sqlitePath = path.join(basePath, 'opencode.db');
      if (fs.existsSync(sqlitePath)) sqlitePaths.push(sqlitePath);

      const tree = findStorageTree(basePath);
      if (tree) {
        const treeSessions = this.findJsonTreeSessions(tree);
        jsonTreeSessions += treeSessions.length;
        sessions.push(...treeSessions);
      }

      // Legacy flat JSON files; also the behavior of an explicit directory.
      sessions.push(...this.findFlatSessions(basePath));
    }

    for (const sqlitePath of sqlitePaths) {
      if (jsonTreeSessions === 0) {
        this.warnings.push(
          `OpenCode SQLite storage detected at ${sqlitePath}; JSON-tree export not found — session listing may be incomplete`
        );
      } else {
        this.warnings.push(
          `OpenCode SQLite storage detected at ${sqlitePath}; reading the JSON-tree/flat JSON export only — sessions stored in SQLite may be missing`
        );
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

  findJsonTreeSessions(tree) {
    const sessions = [];
    let entries;
    try {
      entries = fs.readdirSync(tree.sessionDir);
    } catch (e) {
      return sessions;
    }
    for (const entry of entries) {
      const entryPath = path.join(tree.sessionDir, entry);
      if (isDirectory(entryPath)) {
        for (const file of listJsonFiles(entryPath)) {
          this.addJsonTreeSession(sessions, path.join(entryPath, file), tree, entry);
        }
      } else if (entry.endsWith('.json')) {
        this.addJsonTreeSession(sessions, entryPath, tree, null);
      }
    }
    return sessions;
  }

  addJsonTreeSession(sessions, filePath, tree, projectFromDir) {
    const info = readJson(filePath);
    if (!info || typeof info !== 'object') return;
    const id = typeof info.id === 'string' && info.id ? info.id : path.basename(filePath, '.json');
    const messageDir = path.join(tree.storagePath, 'message', id);
    const partDir = path.join(tree.storagePath, 'part', id);
    const hasMessageFiles = listJsonFiles(messageDir).length > 0;
    const hasInlineMessages = Array.isArray(info.messages) && info.messages.length > 0;
    sessions.push({
      file: filePath,
      id,
      layout: 'json-tree',
      project: info.projectID || projectFromDir || null,
      storagePath: tree.storagePath,
      messageDir,
      partDir,
      session: info,
      hasContent: hasMessageFiles || hasInlineMessages,
    });
  }

  findFlatSessions(basePath) {
    const sessions = [];
    if (!isDirectory(basePath)) return sessions;
    let files;
    try {
      files = fs.readdirSync(basePath).filter(f => f.endsWith('.json') && f !== 'package.json' && f !== 'package-lock.json');
    } catch (e) {
      return sessions;
    }
    for (const file of files) {
      const filePath = path.join(basePath, file);
      const content = readJson(filePath);
      // Skip unrelated JSON (config/auth files) that shares the directory.
      const looksLikeSession = content && typeof content === 'object' &&
        (Array.isArray(content.messages) || Array.isArray(content.turns) || content.id !== undefined);
      if (!looksLikeSession) continue;
      const hasContent = (content.messages && content.messages.length > 0) ||
        (content.turns && content.turns.length > 0);
      sessions.push({
        file: filePath,
        id: content.id || file.replace('.json', ''),
        data: content,
        hasContent,
      });
    }
    return sessions;
  }

  /**
   * Parse a single session into structured data.
   *
   * Accepts either a flat session payload (legacy layout / explicit directory),
   * a session record returned by findSessions(), or the path of a JSON-tree
   * session file.
   */
  parseSession(sessionData) {
    if (typeof sessionData === 'string') {
      if (isJsonTreeSessionFile(sessionData)) {
        return this.parseJsonTreeSession({ file: sessionData });
      }
      return this.parseLegacySession(readJson(sessionData) || {});
    }
    if (!sessionData || typeof sessionData !== 'object') {
      return this.parseLegacySession({});
    }
    if (sessionData.layout === 'json-tree') {
      return this.parseJsonTreeSession(sessionData);
    }
    if (sessionData.file && isJsonTreeSessionFile(sessionData.file) &&
      !Array.isArray(sessionData.messages) && !Array.isArray(sessionData.turns)) {
      return this.parseJsonTreeSession(sessionData);
    }
    // findSessions() hands flat sessions to the CLI as { data, ... }.
    if (sessionData.data && typeof sessionData.data === 'object' &&
      !Array.isArray(sessionData.messages) && !Array.isArray(sessionData.turns)) {
      return this.parseLegacySession(sessionData.data);
    }
    return this.parseLegacySession(sessionData);
  }

  /**
   * Parse the pre-1.2 JSON tree: session info + one file per message plus one
   * file per part. Assistant messages record token buckets, not `usage`.
   */
  parseJsonTreeSession(session) {
    const filePath = session.file;
    const info = session.session || (filePath ? readJson(filePath) : null) || {};
    const storagePath = session.storagePath || storagePathFromSessionFile(filePath);
    const id = session.id || info.id || (filePath ? path.basename(filePath, '.json') : 'unknown');
    const parsed = createParsed(id, this.agentName);

    const sessionTime = info.time && typeof info.time === 'object' ? info.time : {};
    trackTime(parsed, pickTime(sessionTime.created), pickTime(sessionTime.updated));

    const messageDir = session.messageDir ||
      (storagePath ? path.join(storagePath, 'message', id) : null);
    const partDir = session.partDir ||
      (storagePath ? path.join(storagePath, 'part', id) : null);
    const messageFiles = messageDir ? listJsonFiles(messageDir) : [];

    // Some pre-1.2 exports inline messages in the session file; fall back to
    // the flat reader instead of reporting an empty session.
    if (messageFiles.length === 0) {
      return this.parseLegacySession({ ...info, id });
    }

    const messageEntries = [];
    for (const file of messageFiles) {
      const msg = readJson(path.join(messageDir, file));
      if (!msg || typeof msg !== 'object') continue;

      const msgId = typeof msg.id === 'string' && msg.id ? msg.id : path.basename(file, '.json');
      const time = msg.time && typeof msg.time === 'object' ? msg.time : {};
      const created = pickTime(time.created, time.start, msg.timestamp, msg.created_at,
        typeof msg.time === 'number' ? msg.time : undefined);
      const completed = pickTime(time.completed, time.end, time.updated, msg.completed_at);
      trackTime(parsed, created, completed);

      addTokenUsage(parsed, msg.usage || msg.tokens || msg.tokenUsage);

      const parts = partDir ? this.readMessageParts(path.join(partDir, msgId)) : [];
      let content = '';
      for (const part of parts) {
        if (!part || typeof part !== 'object') continue;
        if (part.type === 'text' && typeof part.text === 'string') {
          content += part.text;
        } else if (part.type === 'tool') {
          const toolCall = toolCallFromPart(part, created);
          parsed.toolCalls.push(toolCall);
          if (!toolCall.success) {
            parsed.errors.push({ message: toolCall.error, timestamp: toolCall.timestamp });
          }
        }
      }
      if (!content) content = messageText(msg);
      if (msg.error) {
        parsed.errors.push({ message: errorText(msg.error), timestamp: completed || created });
      }

      const timestamp = created || completed;
      messageEntries.push({
        sortTime: timestamp ? timestamp.getTime() : Number.MAX_SAFE_INTEGER,
        message: {
          role: msg.role || 'unknown',
          content: content.substring(0, 200),
          timestamp,
          tokens: msg.tokens || msg.usage || null,
        },
      });
    }

    // Filenames are usually time-ordered ULIDs, but sort explicitly so the
    // conversation reads chronologically even with hand-made exports.
    messageEntries.sort((a, b) => a.sortTime - b.sortTime);
    parsed.messages = messageEntries.map(entry => entry.message);

    finalizeParsed(parsed);
    return parsed;
  }

  readMessageParts(partDir) {
    const parts = [];
    for (const file of listJsonFiles(partDir)) {
      const part = readJson(path.join(partDir, file));
      if (part && typeof part === 'object') parts.push(part);
    }
    const startOf = part => {
      const date = part.time && typeof part.time === 'object' ? pickTime(part.time.start) : null;
      return date ? date.getTime() : 0;
    };
    parts.sort((a, b) => (startOf(a) - startOf(b)) || String(a.id || '').localeCompare(String(b.id || '')));
    return parts;
  }

  /**
   * Parse the legacy flat layout: a single JSON file with `messages`/`turns`
   * arrays (also used for an explicitly supplied session directory).
   */
  parseLegacySession(sessionData) {
    const data = sessionData && typeof sessionData === 'object' ? sessionData : {};
    const messages = data.messages || data.turns || [];
    const parsed = createParsed(data.id || 'unknown', this.agentName);

    for (const msg of messages) {
      if (!msg || typeof msg !== 'object') continue;
      const time = msg.time && typeof msg.time === 'object' ? msg.time : {};
      const timestamp = pickTime(time.created, msg.timestamp, msg.created_at,
        typeof msg.time === 'number' ? msg.time : undefined, time);
      const role = msg.role || msg.type || 'unknown';
      const content = messageText(msg);

      trackTime(parsed, timestamp);

      addTokenUsage(parsed, msg.usage || msg.tokens);

      // Track tool calls
      if (msg.tool_calls || msg.toolCalls) {
        const tools = msg.tool_calls || msg.toolCalls;
        for (const tool of tools) {
          if (!tool || typeof tool !== 'object') continue;
          parsed.toolCalls.push({
            name: tool.name || (tool.function && tool.function.name) || 'unknown',
            timestamp: timestamp || null,
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
          timestamp: timestamp || null,
        });
      }

      // Track retries
      if (msg.retry || (typeof content === 'string' && content.toLowerCase().includes('retry'))) {
        parsed.retries++;
      }

      parsed.messages.push({
        role,
        content: content.substring(0, 200),
        timestamp: timestamp || null,
        tokens: msg.usage || msg.tokens || null,
      });
    }

    finalizeParsed(parsed);
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
