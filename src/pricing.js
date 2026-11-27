'use strict';

/**
 * Central per-agent price table (USD per million tokens).
 *
 * Parsers estimate a session's cost and the session analyzer renders a cost
 * breakdown. Both MUST read the same table, otherwise a single session reports
 * two different totals (issue #3). Cache buckets that a parser cannot provide
 * are absent/zero and simply price as zero.
 *
 * The base rates are the ones each parser documented before the table was
 * centralized:
 *   - Claude Code / OpenCode: $3 input / $15 output, $0.30 cache read / $3.75 cache write
 *   - Kimi Code:              $2 input / $10 output, $0.30 cache read / $3.75 cache write
 *   - Codex:                  $2.5 input / $10 output, cached input $1.25 (50% of the
 *                             base input rate, GPT-4o cache pricing); OpenAI does not
 *                             charge a separate cache-write fee, so that bucket is $0.
 *
 * These are built-in estimates, not bills or verified current model prices.
 */
const PRICING = {
  'claude-code': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'opencode': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'kimi-code': { input: 2, output: 10, cacheRead: 0.3, cacheWrite: 3.75 },
  'codex': { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 0 },
};

// Legacy callers (library users, hand-built parsed objects) priced with Claude
// rates before the table existed; keep that as the fallback.
const DEFAULT_AGENT = 'claude-code';

function getPricing(agentName) {
  return PRICING[agentName] || PRICING[DEFAULT_AGENT];
}

/**
 * Estimate a session cost from its token buckets and agent price table.
 * `totalTokens` uses the parser convention: { input, output, cacheRead, cacheWrite }.
 */
function estimateCost(agentName, totalTokens = {}) {
  const rates = getPricing(agentName);
  const inputCost = ((totalTokens.input || 0) * rates.input) / 1000000;
  const outputCost = ((totalTokens.output || 0) * rates.output) / 1000000;
  const cacheReadCost = ((totalTokens.cacheRead || 0) * rates.cacheRead) / 1000000;
  const cacheWriteCost = ((totalTokens.cacheWrite || 0) * rates.cacheWrite) / 1000000;
  return inputCost + outputCost + cacheReadCost + cacheWriteCost;
}

module.exports = { PRICING, DEFAULT_AGENT, getPricing, estimateCost };
