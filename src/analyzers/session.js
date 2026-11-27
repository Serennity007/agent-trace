const fs = require('fs');
const path = require('path');
const { getPricing, estimateCost } = require('../pricing');

/**
 * Generic session analyzer - works with any parser output
 */
class SessionAnalyzer {
  /**
   * Calculate session statistics
   */
  static getStats(parsed) {
    return {
      totalMessages: parsed.messages.length,
      userMessages: parsed.messages.filter(m => m.role === 'user').length,
      assistantMessages: parsed.messages.filter(m => m.role === 'assistant').length,
      toolMessages: parsed.messages.filter(m => m.role === 'tool').length,
      totalToolCalls: parsed.toolCalls.length,
      uniqueTools: [...new Set(parsed.toolCalls.map(t => t.name))],
      totalTokens: parsed.totalTokens,
      estimatedCost: parsed.cost,
      duration: parsed.duration,
      errors: parsed.errors.length,
      retries: parsed.retries,
    };
  }

  /**
   * Total tokens across base and cache buckets
   */
  static getTokenTotal(totalTokens) {
    const tokens = totalTokens || {};
    return (tokens.input || 0) + (tokens.output || 0)
      + (tokens.cacheRead || 0) + (tokens.cacheWrite || 0);
  }

  /**
   * Analyze cost breakdown using the session's per-agent price table.
   *
   * The total is computed with the same estimator the parser used, so for
   * every agent `stats.estimatedCost === costBreakdown.total.cost`.
   */
  static getCostBreakdown(parsed) {
    const tokens = parsed.totalTokens || {};
    const rates = getPricing(parsed.agentName);
    const inputCost = ((tokens.input || 0) * rates.input) / 1000000;
    const outputCost = ((tokens.output || 0) * rates.output) / 1000000;
    const cacheReadCost = ((tokens.cacheRead || 0) * rates.cacheRead) / 1000000;
    const cacheWriteCost = ((tokens.cacheWrite || 0) * rates.cacheWrite) / 1000000;
    return {
      input: { tokens: tokens.input || 0, cost: inputCost },
      output: { tokens: tokens.output || 0, cost: outputCost },
      cache: {
        read: { tokens: tokens.cacheRead || 0, cost: cacheReadCost },
        write: { tokens: tokens.cacheWrite || 0, cost: cacheWriteCost },
      },
      total: {
        tokens: SessionAnalyzer.getTokenTotal(tokens),
        cost: estimateCost(parsed.agentName, tokens),
      },
    };
  }

  /**
   * Analyze tool usage patterns
   */
  static getToolUsage(toolCalls) {
    const usage = {};
    for (const call of toolCalls) {
      if (!usage[call.name]) {
        usage[call.name] = { count: 0, totalDuration: 0, avgDuration: 0, successRate: 0 };
      }
      usage[call.name].count++;
      if (typeof call.duration === 'number' && call.duration >= 0) {
        usage[call.name].totalDuration += call.duration;
      }
    }
    for (const [name, data] of Object.entries(usage)) {
      const calls = toolCalls.filter(t => t.name === name);
      // Only average calls that actually recorded a duration; otherwise a
      // session with mostly unknown durations (e.g. Claude Code) understates
      // the average by dividing by the total call count.
      const timedCalls = calls.filter(t => typeof t.duration === 'number' && t.duration >= 0);
      data.avgDuration = timedCalls.length > 0
        ? timedCalls.reduce((sum, call) => sum + call.duration, 0) / timedCalls.length
        : 0;
      const successes = calls.filter(t => t.success).length;
      data.successRate = calls.length > 0 ? (successes / calls.length) * 100 : 0;
    }
    return usage;
  }

  /**
   * Detect anomalies
   */
  static detectAnomalies(parsed) {
    const anomalies = [];

    // High retry count
    if (parsed.retries > 3) {
      anomalies.push({ type: 'high_retries', message: `High retry count: ${parsed.retries}` });
    }

    // High error rate
    if (parsed.errors.length > parsed.messages.length * 0.1) {
      anomalies.push({ type: 'high_errors', message: `High error rate: ${parsed.errors.length} errors` });
    }

    // Long duration
    if (parsed.duration > 3600) {
      anomalies.push({ type: 'long_session', message: `Session lasted ${(parsed.duration / 3600).toFixed(1)} hours` });
    }

    // High cost
    if (parsed.cost > 5) {
      anomalies.push({ type: 'high_cost', message: `High estimated cost: $${parsed.cost.toFixed(2)}` });
    }

    // Tool failures
    const toolCalls = parsed.toolCalls;
    const failedTools = toolCalls.filter(t => !t.success);
    if (failedTools.length > toolCalls.length * 0.2) {
      anomalies.push({ type: 'tool_failures', message: `High tool failure rate: ${failedTools.length}/${toolCalls.length}` });
    }

    return anomalies;
  }

  /**
   * Get active time periods
   */
  static getActivePeriods(messages) {
    if (messages.length < 2) return [];
    const periods = [];
    let currentPeriod = { start: messages[0].timestamp, end: messages[0].timestamp, count: 1 };

    for (let i = 1; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg.timestamp) continue;
      const gap = (msg.timestamp - currentPeriod.end) / 1000 / 60; // minutes

      if (gap > 10) {
        // New period
        periods.push(currentPeriod);
        currentPeriod = { start: msg.timestamp, end: msg.timestamp, count: 1 };
      } else {
        currentPeriod.end = msg.timestamp;
        currentPeriod.count++;
      }
    }
    periods.push(currentPeriod);
    return periods;
  }
}

module.exports = { SessionAnalyzer };
