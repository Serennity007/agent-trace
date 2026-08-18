const assert = require('assert');
const path = require('path');
const { OpenCodeParser } = require('../src/parsers/opencode');
const { SessionAnalyzer } = require('../src/analyzers/session');

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
