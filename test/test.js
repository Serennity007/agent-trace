const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { OpenCodeParser } = require('../src/parsers/opencode');
const { ClaudeCodeParser } = require('../src/parsers/claude-code');
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

  test('getCostBreakdown folds cache buckets into the total', () => {
    const breakdown = SessionAnalyzer.getCostBreakdown({
      totalTokens: { input: 1000, output: 500, cacheRead: 2000, cacheWrite: 100 },
    });
    assert.strictEqual(breakdown.cache.read.tokens, 2000);
    assert.strictEqual(breakdown.total.tokens, 3600);
    assert.ok(Math.abs(breakdown.total.cost - (breakdown.input.cost + breakdown.output.cost
      + breakdown.cache.read.cost + breakdown.cache.write.cost)) < 1e-12);
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
