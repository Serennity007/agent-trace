const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { OpenCodeParser } = require('../src/parsers/opencode');
const { ClaudeCodeParser } = require('../src/parsers/claude-code');
const { KimiCodeParser } = require('../src/parsers/kimi-code');
const { CodexParser } = require('../src/parsers/codex');
const { SessionAnalyzer } = require('../src/analyzers/session');

function withClaudeLog(lines, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-trace-claude-'));
  const file = path.join(dir, 'session.jsonl');
  try {
    fs.writeFileSync(file, lines.join('\n') + '\n', 'utf-8');
    return fn(new ClaudeCodeParser().parseSession(file));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function claudeEntry(id, content, usage, timestamp) {
  return JSON.stringify({
    type: 'assistant',
    timestamp,
    message: { id, role: 'assistant', content, usage },
  });
}

function withCodexSession(entries, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-trace-codex-'));
  try {
    const dayDir = path.join(dir, '2026', '01', '01');
    fs.mkdirSync(dayDir, { recursive: true });
    const file = path.join(dayDir, 'session.jsonl');
    const lines = entries.map(entry => JSON.stringify(entry));
    fs.writeFileSync(file, lines.join('\n') + (lines.length ? '\n' : ''), 'utf-8');
    return fn(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function codexTokenCount(usage, timestamp = '2026-01-01T00:00:05Z') {
  return {
    type: 'event_msg',
    timestamp,
    payload: { type: 'token_count', info: { total_token_usage: usage } },
  };
}

function assertOneCostOfTruth(parsed, expectedCost) {
  const breakdown = SessionAnalyzer.getCostBreakdown(parsed);
  const stats = SessionAnalyzer.getStats(parsed);
  assert.strictEqual(breakdown.total.cost, parsed.cost,
    `breakdown ${breakdown.total.cost} !== parser ${parsed.cost}`);
  assert.strictEqual(stats.estimatedCost, breakdown.total.cost,
    `stats ${stats.estimatedCost} !== breakdown ${breakdown.total.cost}`);
  if (expectedCost !== undefined) {
    assert.ok(Math.abs(breakdown.total.cost - expectedCost) < 1e-12,
      `cost was ${breakdown.total.cost}, expected ${expectedCost}`);
  }
  return breakdown;
}

function withKimiSession(wireFiles, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-trace-kimi-'));
  try {
    const sessionDir = path.join(dir, 'workspace', 'session-1');
    fs.mkdirSync(path.join(sessionDir, 'agents', 'main'), { recursive: true });
    fs.writeFileSync(path.join(sessionDir, 'state.json'), JSON.stringify({
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:10Z',
    }), 'utf-8');
    for (const [agent, entries] of Object.entries(wireFiles)) {
      const agentDir = path.join(sessionDir, 'agents', agent);
      fs.mkdirSync(agentDir, { recursive: true });
      const lines = entries.map(entry => JSON.stringify(entry));
      fs.writeFileSync(path.join(agentDir, 'wire.jsonl'), lines.join('\n') + (lines.length ? '\n' : ''), 'utf-8');
    }
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try { fn(); console.log(`  ✓ ${name}`); passed++; }
    catch (error) { console.log(`  ✗ ${name}\n    ${error.message}`); failed++; }
  }

  console.log('\n🧪 Running agent-trace tests...\n');

  // Parser tests
  console.log('📋 OpenCode Parser:');
  test('parser has correct name', () => {
    const parser = new OpenCodeParser();
    assert.strictEqual(parser.name, 'OpenCode');
  });

  test('parser has session paths', () => {
    const parser = new OpenCodeParser();
    assert(Array.isArray(parser.sessionPaths));
    assert(parser.sessionPaths.length > 0);
  });

  test('parseSession handles empty data', () => {
    const parser = new OpenCodeParser();
    const parsed = parser.parseSession({});
    assert.strictEqual(parsed.messages.length, 0);
    assert.strictEqual(parsed.toolCalls.length, 0);
    assert.strictEqual(parsed.totalTokens.input, 0);
  });

  test('parseSession extracts messages', () => {
    const parser = new OpenCodeParser();
    const data = {
      messages: [
        { role: 'user', content: 'Hello', timestamp: '2026-01-01T00:00:00Z' },
        { role: 'assistant', content: 'Hi there', timestamp: '2026-01-01T00:00:01Z' },
      ],
    };
    const parsed = parser.parseSession(data);
    assert.strictEqual(parsed.messages.length, 2);
    assert.strictEqual(parsed.messages[0].role, 'user');
    assert.strictEqual(parsed.messages[1].role, 'assistant');
  });

  test('parseSession tracks tokens', () => {
    const parser = new OpenCodeParser();
    const data = {
      messages: [
        { role: 'user', content: 'test', usage: { input_tokens: 100, output_tokens: 50 } },
      ],
    };
    const parsed = parser.parseSession(data);
    assert.strictEqual(parsed.totalTokens.input, 100);
    assert.strictEqual(parsed.totalTokens.output, 50);
  });

  test('parseSession detects tool calls', () => {
    const parser = new OpenCodeParser();
    const data = {
      messages: [
        {
          role: 'assistant',
          content: 'test',
          tool_calls: [
            { name: 'read_file', success: true },
            { name: 'write_file', success: false, error: 'Permission denied' },
          ],
        },
      ],
    };
    const parsed = parser.parseSession(data);
    assert.strictEqual(parsed.toolCalls.length, 2);
    assert.strictEqual(parsed.toolCalls[0].name, 'read_file');
    assert.strictEqual(parsed.toolCalls[1].error, 'Permission denied');
  });

  test('parseSession calculates duration', () => {
    const parser = new OpenCodeParser();
    const data = {
      messages: [
        { role: 'user', content: 'start', timestamp: '2026-01-01T00:00:00Z' },
        { role: 'assistant', content: 'end', timestamp: '2026-01-01T00:05:00Z' },
      ],
    };
    const parsed = parser.parseSession(data);
    assert.strictEqual(parsed.duration, 300); // 5 minutes
  });

  test('OpenCode cost estimate matches the analyzer breakdown', () => {
    const parsed = new OpenCodeParser().parseSession({
      messages: [
        { role: 'assistant', content: 'x', usage: { input_tokens: 1000, output_tokens: 500 } },
      ],
    });
    assert.strictEqual(parsed.agentName, 'opencode');
    assertOneCostOfTruth(parsed, 0.0105);
  });

  // Claude Code parser: one response spread over several log entries
  console.log('\n📋 Claude Code Parser:');
  const splitResponse = [
    JSON.stringify({ type: 'user', timestamp: '2026-01-01T00:00:00Z', message: { role: 'user', content: 'hello' } }),
    claudeEntry('msg_1', [{ type: 'text', text: 'thinking out loud' }], {
      input_tokens: 1000, output_tokens: 200,
      cache_read_input_tokens: 5000,
      cache_creation_input_tokens: { ephemeral_5m_input_tokens: 300, ephemeral_1h_input_tokens: 0 },
    }, '2026-01-01T00:00:01Z'),
    claudeEntry('msg_1', [{ type: 'tool_use', name: 'Bash', input: { command: 'ls' } }], {
      input_tokens: 1000, output_tokens: 200,
      cache_read_input_tokens: 5000,
      cache_creation_input_tokens: { ephemeral_5m_input_tokens: 300, ephemeral_1h_input_tokens: 0 },
    }, '2026-01-01T00:00:02Z'),
    claudeEntry('msg_2', [{ type: 'text', text: 'done' }], {
      input_tokens: 500, output_tokens: 100,
      cache_read_input_tokens: 1500, cache_creation_input_tokens: 100,
    }, '2026-01-01T00:00:03Z'),
  ];

  test('counts usage once when a response spans several entries', () => {
    withClaudeLog(splitResponse, parsed => {
      assert.strictEqual(parsed.totalTokens.input, 1500);
      assert.strictEqual(parsed.totalTokens.output, 300);
    });
  });

  test('keeps every tool call from a split response', () => {
    withClaudeLog(splitResponse, parsed => {
      assert.strictEqual(parsed.toolCalls.length, 1);
      assert.strictEqual(parsed.toolCalls[0].name, 'Bash');
      assert.strictEqual(parsed.messages.filter(m => m.role === 'assistant').length, 2);
    });
  });

  test('tracks cache read and cache creation tokens', () => {
    withClaudeLog(splitResponse, parsed => {
      assert.strictEqual(parsed.totalTokens.cacheRead, 6500);
      assert.strictEqual(parsed.totalTokens.cacheWrite, 400);
      assert.ok(Math.abs(parsed.cost - 0.01245) < 1e-9, `cost was ${parsed.cost}`);
    });
  });

  test('still counts usage when entries carry no message id', () => {
    withClaudeLog([
      claudeEntry(undefined, [{ type: 'text', text: 'a' }], { input_tokens: 40, output_tokens: 5 }, '2026-01-01T00:00:01Z'),
      claudeEntry(undefined, [{ type: 'text', text: 'b' }], { input_tokens: 60, output_tokens: 7 }, '2026-01-01T00:00:02Z'),
    ], parsed => {
      assert.strictEqual(parsed.totalTokens.input, 100);
      assert.strictEqual(parsed.totalTokens.output, 12);
    });
  });

  test('marks a tool call failed when a nested tool_result has is_error', () => {
    withClaudeLog([
      JSON.stringify({ type: 'user', timestamp: '2026-01-01T00:00:00Z', message: { role: 'user', content: 'run it' } }),
      claudeEntry('msg_tool', [{ type: 'tool_use', id: 'toolu_01', name: 'Bash', input: { command: 'false' } }], {
        input_tokens: 10, output_tokens: 5,
      }, '2026-01-01T00:00:01Z'),
      JSON.stringify({
        type: 'user',
        timestamp: '2026-01-01T00:00:02Z',
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 'toolu_01', content: 'exit code 1', is_error: true }],
        },
      }),
    ], parsed => {
      assert.strictEqual(parsed.toolCalls.length, 1);
      assert.strictEqual(parsed.toolCalls[0].success, false);
      assert.strictEqual(parsed.toolCalls[0].error, 'exit code 1');
      assert.strictEqual(parsed.errors.length, 1);
      assert.strictEqual(parsed.errors[0].message, 'exit code 1');
      const usage = SessionAnalyzer.getToolUsage(parsed.toolCalls);
      assert.strictEqual(usage.Bash.successRate, 0);
      assert(SessionAnalyzer.detectAnomalies(parsed).some(a => a.type === 'tool_failures'));
    });
  });

  test('matches nested tool results by tool_use id', () => {
    withClaudeLog([
      claudeEntry('msg_a', [{ type: 'tool_use', id: 'toolu_01', name: 'Bash', input: { command: 'false' } }], {
        input_tokens: 10, output_tokens: 5,
      }, '2026-01-01T00:00:01Z'),
      claudeEntry('msg_b', [{ type: 'tool_use', id: 'toolu_02', name: 'Read', input: { file_path: 'a.txt' } }], {
        input_tokens: 10, output_tokens: 5,
      }, '2026-01-01T00:00:02Z'),
      JSON.stringify({
        type: 'user',
        timestamp: '2026-01-01T00:00:03Z',
        message: {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: 'toolu_01',
            content: [{ type: 'text', text: 'exit code 1' }],
            is_error: true,
          }],
        },
      }),
    ], parsed => {
      assert.strictEqual(parsed.toolCalls.length, 2);
      assert.strictEqual(parsed.toolCalls[0].success, false);
      assert.strictEqual(parsed.toolCalls[0].error, 'exit code 1');
      assert.strictEqual(parsed.toolCalls[1].success, true);
      assert.strictEqual(parsed.errors.length, 1);
    });
  });

  test('getCostBreakdown folds cache buckets into the total', () => {
    const breakdown = SessionAnalyzer.getCostBreakdown({
      totalTokens: { input: 1000, output: 500, cacheRead: 2000, cacheWrite: 100 },
    });
    assert.strictEqual(breakdown.cache.read.tokens, 2000);
    assert.strictEqual(breakdown.total.tokens, 3600);
    assert.ok(Math.abs(breakdown.total.cost - (breakdown.input.cost + breakdown.output.cost
      + breakdown.cache.read.cost + breakdown.cache.write.cost)) < 1e-12);
  });

  test('Claude cost estimate matches the analyzer breakdown', () => {
    withClaudeLog(splitResponse, parsed => {
      assert.strictEqual(parsed.agentName, 'claude-code');
      assertOneCostOfTruth(parsed, 0.01245);
    });
  });

  // Codex parser: cumulative token_count usage and per-agent pricing
  console.log('\n📋 Codex Parser:');
  test('prices Codex tokens once and agrees with the analyzer breakdown', () => {
    withCodexSession([codexTokenCount({ input_tokens: 1000000, output_tokens: 1000000 })], file => {
      const parsed = new CodexParser().parseSession(file);
      assert.strictEqual(parsed.agentName, 'codex');
      assert.deepStrictEqual(parsed.totalTokens, {
        input: 1000000, output: 1000000, cacheRead: 0, cacheWrite: 0,
      });
      const breakdown = assertOneCostOfTruth(parsed, 12.5);
      assert.ok(Math.abs(breakdown.input.cost - 2.5) < 1e-12);
      assert.ok(Math.abs(breakdown.output.cost - 10) < 1e-12);
    });
  });

  test('prices Codex cached input at the cache-read rate', () => {
    withCodexSession([codexTokenCount({
      input_tokens: 1000000, cached_input_tokens: 400000, output_tokens: 1000000,
    })], file => {
      const parsed = new CodexParser().parseSession(file);
      assert.deepStrictEqual(parsed.totalTokens, {
        input: 600000, output: 1000000, cacheRead: 400000, cacheWrite: 0,
      });
      // Split buckets must still add up to the reported total token count.
      assert.strictEqual(SessionAnalyzer.getTokenTotal(parsed.totalTokens), 2000000);
      const breakdown = assertOneCostOfTruth(parsed, 12);
      assert.ok(Math.abs(breakdown.cache.read.cost - 0.5) < 1e-12);
    });
  });

  test('takes the last cumulative Codex token count instead of summing', () => {
    withCodexSession([
      codexTokenCount({ input_tokens: 100, output_tokens: 10 }, '2026-01-01T00:00:01Z'),
      codexTokenCount({ input_tokens: 250, output_tokens: 30 }, '2026-01-01T00:00:02Z'),
    ], file => {
      const parsed = new CodexParser().parseSession(file);
      assert.deepStrictEqual(parsed.totalTokens, {
        input: 250, output: 30, cacheRead: 0, cacheWrite: 0,
      });
      assertOneCostOfTruth(parsed);
    });
  });

  // Kimi Code parser: four usage buckets across every agent wire log
  console.log('\n📋 Kimi Code Parser:');
  const kimiUsage = (usage, time) => ({ type: 'usage.record', time, usage });

  test('sums cache buckets from main and subagent wire logs', () => {
    withKimiSession({
      main: [kimiUsage({ inputOther: 1000, output: 500, inputCacheRead: 200, inputCacheCreation: 300 }, '2026-01-01T00:00:05Z')],
      'sub-agent': [kimiUsage({ inputOther: 200, output: 100 }, '2026-01-01T00:00:06Z')],
    }, dir => {
      const parser = new KimiCodeParser();
      parser.sessionPaths = [dir];
      const sessions = parser.findSessions();
      assert.strictEqual(sessions.length, 1);
      assert.strictEqual(sessions[0].hasContent, true);

      const parsed = parser.parseSession(sessions[0]);
      assert.deepStrictEqual(parsed.totalTokens, { input: 1200, output: 600, cacheRead: 200, cacheWrite: 300 });
      assert.strictEqual(SessionAnalyzer.getTokenTotal(parsed.totalTokens), 2300);

      const breakdown = SessionAnalyzer.getCostBreakdown(parsed);
      assert.strictEqual(breakdown.cache.read.tokens, 200);
      assert.strictEqual(breakdown.cache.write.tokens, 300);
      assert.strictEqual(breakdown.total.tokens, 2300);
      // Kimi rates: input $2/MTok, output $10/MTok, cache read $0.30/MTok, write $3.75/MTok.
      assert.ok(Math.abs(parsed.cost - 0.009585) < 1e-12, `cost was ${parsed.cost}`);
    });
  });

  test('finds a session whose only content is a subagent wire log', () => {
    withKimiSession({
      main: [],
      'sub-agent': [kimiUsage({ inputOther: 200, output: 100 }, '2026-01-01T00:00:06Z')],
    }, dir => {
      const parser = new KimiCodeParser();
      parser.sessionPaths = [dir];
      const sessions = parser.findSessions();
      assert.strictEqual(sessions.length, 1);
      assert.strictEqual(sessions[0].hasContent, true);
      const parsed = parser.parseSession(sessions[0]);
      assert.deepStrictEqual(parsed.totalTokens, { input: 200, output: 100, cacheRead: 0, cacheWrite: 0 });
    });
  });

  test('Kimi cost estimate matches the analyzer breakdown', () => {
    withKimiSession({
      main: [kimiUsage({ inputOther: 1000, output: 500, inputCacheRead: 200, inputCacheCreation: 300 }, '2026-01-01T00:00:05Z')],
      'sub-agent': [kimiUsage({ inputOther: 200, output: 100 }, '2026-01-01T00:00:06Z')],
    }, dir => {
      const parser = new KimiCodeParser();
      parser.sessionPaths = [dir];
      const parsed = parser.parseSession(parser.findSessions()[0]);
      assert.strictEqual(parsed.agentName, 'kimi-code');
      assertOneCostOfTruth(parsed, 0.009585);
    });
  });

  // Package entry point
  console.log('\n📋 Package Entry Point:');
  test('require("..") resolves the declared library entry point', () => {
    const api = require('..');
    assert.strictEqual(typeof api.OpenCodeParser, 'function');
    assert.strictEqual(typeof api.ClaudeCodeParser, 'function');
    assert.strictEqual(typeof api.KimiCodeParser, 'function');
    assert.strictEqual(typeof api.CodexParser, 'function');
    assert.strictEqual(typeof api.SessionAnalyzer, 'function');
    assert.strictEqual(typeof api.Reporter, 'function');
    assert.strictEqual(typeof api.Pricing.estimateCost, 'function');
    assert.strictEqual(new api.KimiCodeParser().name, 'Kimi Code');
  });

  // Central price table
  console.log('\n📋 Pricing:');
  test('has one price table for all four supported agents', () => {
    const { PRICING, getPricing, estimateCost } = require('../src/pricing');
    for (const agent of ['opencode', 'claude-code', 'kimi-code', 'codex']) {
      assert.ok(PRICING[agent], `missing pricing for ${agent}`);
    }
    // Unknown agents keep the legacy Claude fallback.
    assert.strictEqual(getPricing('unknown-agent'), PRICING['claude-code']);
    assert.strictEqual(estimateCost('claude-code', { input: 1000000, output: 1000000 }), 18);
    assert.strictEqual(estimateCost('kimi-code', { input: 1000000, output: 1000000 }), 12);
    assert.strictEqual(estimateCost('codex', { input: 1000000, output: 1000000 }), 12.5);
    assert.strictEqual(estimateCost('codex', { cacheRead: 1000000 }), 1.25);
    assert.strictEqual(estimateCost('claude-code', {}), 0);
  });

  // Analyzer tests
  console.log('\n📋 Session Analyzer:');
  test('getStats counts messages correctly', () => {
    const parsed = {
      messages: [
        { role: 'user' },
        { role: 'assistant' },
        { role: 'user' },
        { role: 'tool' },
      ],
      toolCalls: [],
      totalTokens: { input: 0, output: 0 },
      cost: 0,
      duration: 0,
      errors: [],
      retries: 0,
    };
    const stats = SessionAnalyzer.getStats(parsed);
    assert.strictEqual(stats.totalMessages, 4);
    assert.strictEqual(stats.userMessages, 2);
    assert.strictEqual(stats.assistantMessages, 1);
    assert.strictEqual(stats.toolMessages, 1);
  });

  test('getCostBreakdown calculates correctly', () => {
    const parsed = {
      totalTokens: { input: 1000, output: 500 },
      cost: 0.0105,
    };
    const breakdown = SessionAnalyzer.getCostBreakdown(parsed);
    assert.strictEqual(breakdown.input.tokens, 1000);
    assert.strictEqual(breakdown.output.tokens, 500);
    assert(breakdown.total.cost > 0);
  });

  test('detectAnomalies flags high retries', () => {
    const parsed = {
      messages: [],
      toolCalls: [],
      errors: [],
      retries: 5,
      duration: 60,
      cost: 1,
    };
    const anomalies = SessionAnalyzer.detectAnomalies(parsed);
    assert(anomalies.some(a => a.type === 'high_retries'));
  });

  test('detectAnomalies flags high cost', () => {
    const parsed = {
      messages: [],
      toolCalls: [],
      errors: [],
      retries: 0,
      duration: 60,
      cost: 10,
    };
    const anomalies = SessionAnalyzer.detectAnomalies(parsed);
    assert(anomalies.some(a => a.type === 'high_cost'));
  });

  test('getToolUsage calculates success rate', () => {
    const toolCalls = [
      { name: 'read', success: true },
      { name: 'read', success: true },
      { name: 'write', success: false },
    ];
    const usage = SessionAnalyzer.getToolUsage(toolCalls);
    assert.strictEqual(usage.read.count, 2);
    assert.strictEqual(usage.read.successRate, 100);
    assert.strictEqual(usage.write.count, 1);
    assert.strictEqual(usage.write.successRate, 0);
  });

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => { console.error(err); process.exit(1); });
