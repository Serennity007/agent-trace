const fs = require('fs');
const path = require('path');

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
   * Analyze cost breakdown
   */
  static getCostBreakdown(parsed) {
    const inputCost = (parsed.totalTokens.input * 3) / 1000000;
    const outputCost = (parsed.totalTokens.output * 15) / 1000000;
    return {
      input: { tokens: parsed.totalTokens.input, cost: inputCost },
      output: { tokens: parsed.totalTokens.output, cost: outputCost },
      total: { tokens: parsed.totalTokens.input + parsed.totalTokens.output, cost: inputCost + outputCost },
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
      if (call.duration) usage[call.name].totalDuration += call.duration;
    }
    for (const [name, data] of Object.entries(usage)) {
      data.avgDuration = data.count > 0 ? data.totalDuration / data.count : 0;
      const calls = toolCalls.filter(t => t.name === name);
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
