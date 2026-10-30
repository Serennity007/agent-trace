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
function withFolder(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-trace-cli-'));
  try { return fn(dir); }
  finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('explicit empty directory yields JSON without discovering personal logs', () => withFolder(dir => {
  const result = run(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), []);
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
