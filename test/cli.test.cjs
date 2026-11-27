const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const demo = JSON.parse(fs.readFileSync(path.join(root, 'examples/session-demo/synthetic-demo.json'), 'utf8'));
function run(dir, ...args) {
  return spawnSync(process.execPath, [path.join(root, 'bin/cli.js'), dir, '-a', 'opencode', '--json', ...args], { encoding: 'utf8' });
}
function runTerminal(dir, ...args) {
  return spawnSync(process.execPath, [path.join(root, 'bin/cli.js'), dir, '-a', 'opencode', ...args], { encoding: 'utf8' });
}
function withFolder(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-trace-cli-'));
  try { return fn(dir); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function runDiscovery(env) {
  return spawnSync(process.execPath, [path.join(root, 'bin/cli.js'), '-a', 'opencode', '--json'], {
    encoding: 'utf8',
    env,
  });
}
test('explicit empty directory yields JSON without discovering personal logs', () => withFolder(dir => {
  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), []);
}));
test('discovers and parses the pre-1.2 OpenCode JSON tree', () => {
  const result = run(path.join(root, 'test', 'fixtures', 'opencode-json-tree'));
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.agent, 'opencode');
  assert.equal(report.session, 'ses_fixtureTree0001');
  assert.equal(report.stats.totalMessages, 2);
  assert.equal(report.costBreakdown.input.tokens, 1000);
  assert.equal(report.costBreakdown.output.tokens, 500);
  assert.equal(report.costBreakdown.cache.read.tokens, 200);
  assert.equal(report.costBreakdown.cache.write.tokens, 300);
  assert.equal(report.toolUsage.read.count, 1);
  assert.equal(report.toolUsage.bash.successRate, 0);
  assert.equal(result.stderr, '');
});
test('discovers OpenCode data under HOME/USERPROFILE without a directory argument', () => withFolder(home => {
  const dataDir = path.join(home, '.local', 'share', 'opencode');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.cpSync(path.join(root, 'test', 'fixtures', 'opencode-json-tree'), dataDir, { recursive: true });
  const result = runDiscovery({ ...process.env, HOME: home, USERPROFILE: home });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.session, 'ses_fixtureTree0001');
}));
test('warns on stderr but keeps working for SQLite-only storage', () => withFolder(dir => {
  fs.writeFileSync(path.join(dir, 'opencode.db'), '', 'utf-8');
  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), []);
  assert.match(result.stderr, /OpenCode SQLite storage detected/);
  assert.match(result.stderr, /JSON-tree export not found/);
  assert.match(result.stderr, /may be incomplete/);
}));
test('synthetic first run retains the single-session JSON contract', () => {
  const result = run(path.join(root, 'examples/session-demo'));
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.agent, 'opencode');
  assert.equal(report.session, 'synthetic-demo');
  assert.equal(report.costBreakdown.input.tokens, 100);
  assert.equal(report.costBreakdown.output.tokens, 50);
  assert.ok(report.costBreakdown.total.cost > 0);
});
test('multiple sessions produce one JSON array and selection still works', () => withFolder(dir => {
  for (const id of ['fixture-one', 'fixture-two']) fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ ...demo, id }));
  const multiple = run(dir);
  assert.equal(multiple.status, 0, multiple.stderr);
  assert.deepEqual(JSON.parse(multiple.stdout).map(x => x.session).sort(), ['fixture-one', 'fixture-two']);
  const single = run(dir, '-s', 'fixture-two');
  assert.equal(single.status, 0, single.stderr);
  assert.equal(JSON.parse(single.stdout).session, 'fixture-two');
}));
test('missing sessions and invalid directories fail without a success document', () => withFolder(dir => {
  for (const result of [run(dir, '-s', 'missing'), run(path.join(dir, 'missing'))]) {
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
  }
}));
test('--verbose adds a timeline to JSON for every agent, not only Kimi', () => {
  const demoDir = path.join(root, 'examples/session-demo');
  const plain = JSON.parse(run(demoDir).stdout);
  assert.equal(plain.timeline, undefined);
  const verbose = JSON.parse(run(demoDir, '-v').stdout);
  assert.ok(Array.isArray(verbose.timeline), 'expected a timeline array');
  assert.equal(verbose.timeline.length, 2);
  assert.equal(verbose.timeline[0].role, 'user');
  assert.match(verbose.timeline[0].contentPreview, /Synthetic fixture/);
});
test('--verbose toggles the conversation and active-period sections in terminal mode', () => {
  const demoDir = path.join(root, 'examples/session-demo');
  const plain = runTerminal(demoDir);
  assert.equal(plain.status, 0, plain.stderr);
  assert.ok(!plain.stdout.includes('Conversation'), 'timeline should be hidden without -v');
  assert.ok(!plain.stdout.includes('Active Periods'), 'active periods should be hidden without -v');

  const verbose = runTerminal(demoDir, '-v');
  assert.equal(verbose.status, 0, verbose.stderr);
  assert.ok(verbose.stdout.includes('Conversation'), 'timeline should render with -v');
  assert.ok(verbose.stdout.includes('Active Periods'), 'active periods should render with -v');
  assert.ok(verbose.stdout.includes('[YOU]'));
});
test('--top rejects non-positive or non-numeric values with a clear error', () => withFolder(dir => {
  for (const id of ['fixture-one', 'fixture-two', 'fixture-three']) {
    fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ ...demo, id }));
  }
  for (const bad of ['0', '-1', 'abc']) {
    const result = runTerminal(dir, '-n', bad);
    assert.notEqual(result.status, 0, `-n ${bad} should exit nonzero`);
    assert.match(result.stderr, /Invalid --top value/, `-n ${bad} should explain the error`);
    assert.ok(!result.stdout.includes('Top '), `-n ${bad} should not print a table`);
  }
  const single = runTerminal(dir, '-n', '1');
  assert.equal(single.status, 0, single.stderr);
  assert.match(single.stdout, /Top 1 Most Expensive Sessions/);
  assert.equal((single.stdout.match(/^\s+\d+\s+fixture-/gm) || []).length, 1);

  const larger = runTerminal(dir, '-n', '10');
  assert.equal(larger.status, 0, larger.stderr);
  assert.match(larger.stdout, /Top 10 Most Expensive Sessions/);
  assert.equal((larger.stdout.match(/^\s+\d+\s+fixture-/gm) || []).length, 3);
}));
test('Codex JSON reports one estimated cost and cost breakdown', () => withFolder(dir => {
  const day = path.join(dir, '2026', '01', '01');
  fs.mkdirSync(day, { recursive: true });
  fs.writeFileSync(path.join(day, 'codex-session.jsonl'), [
    JSON.stringify({ type: 'session_meta', timestamp: '2026-01-01T00:00:00Z', payload: { id: 'codex-session' } }),
    JSON.stringify({
      type: 'event_msg',
      timestamp: '2026-01-01T00:00:05Z',
      payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 1000000, output_tokens: 1000000 } } },
    }),
  ].join('\n') + '\n');
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'bin/cli.js'), dir, '-a', 'codex', '--json'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.agent, 'codex');
  assert.equal(report.stats.estimatedCost, 12.5);
  assert.equal(report.costBreakdown.total.cost, 12.5);
  assert.equal(report.costBreakdown.input.cost + report.costBreakdown.output.cost, 12.5);
}));
