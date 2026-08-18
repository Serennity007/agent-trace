<div align="center">

<img src=".banner.svg" width="100%" alt="banner">

</div>

# 🔍 Agent Trace

<div align="center">

**What is your AI agent actually doing? Track costs, tokens, tool health, and every conversation.**

[![npm](https://img.shields.io/npm/v/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

---

## The Problem

Your AI coding agent runs for hours. It calls tools, burns tokens, retries failed operations. But you have no idea:

- How much it actually cost
- Which tools keep failing
- Why it retried 15 times
- Whether the model was slow or the tools were broken
- How long each conversation took

## The Solution

```bash
npx agent-trace
```

That's it. One command. No API keys. No cloud services. Everything runs locally.

---

## Quick Start

```bash
# Install
npm install -g agent-trace

# Analyze your OpenCode sessions
agent-trace

# Or use npx
npx agent-trace
```

## What It Shows

```
  🔍 Agent Trace Report
  ─────────────────────────────────────────────────────

  📊 Session Overview
  ─────────────────────────────────────────────────────
  Duration: 45m 23s
  Messages: 127 (User: 32, Assistant: 64, Tool: 31)
  Tool Calls: 89 (12 unique tools)
  Errors: 3
  Retries: 2

  💰 Cost Analysis
  ─────────────────────────────────────────────────────
  Input Tokens: 245,891 ($0.0738)
  Output Tokens: 89,234 ($0.1339)
  Total Tokens: 335,125
  Estimated Cost: $0.2076

  🔧 Tool Health
  ─────────────────────────────────────────────────────
  ✓ Read: 45 calls, 100% success, avg 120ms
  ✓ Write: 23 calls, 96% success, avg 85ms
  ⚠ Bash: 12 calls, 75% success, avg 2340ms
  ✗ Browser: 9 calls, 44% success, avg 5120ms

  ⚠️  Anomalies Detected
  ─────────────────────────────────────────────────────
  → High tool failure rate: 18/89
  → High estimated cost: $5.23

  ⏱️  Active Periods
  ─────────────────────────────────────────────────────
  09:15:23 → 09:47:56 (32m 33s, 45 messages)
  10:02:11 → 10:31:44 (29m 33s, 52 messages)

  📝 Recent Timeline
  ─────────────────────────────────────────────────────
  10:31:12 You: Fix the authentication bug...
  10:31:14 AI (2s): I'll check the auth middleware...
  10:31:15 Tool (1s): Read src/middleware/auth.ts
  10:31:44 AI (29s): Fixed. The issue was...
```

---

## Options

```
agent-trace [options] [directory]

Options:
  -s, --session <id>   Analyze specific session
  -j, --json           Output as JSON
  -v, --verbose        Show detailed timeline
  --agent <type>       Agent type (opencode, kimi-code, claude-code, codex)
  -h, --help           Display help
  -V, --version        Display version
```

## Supported Agents

| Agent | Status | Config Path |
|-------|--------|-------------|
| **OpenCode** | ✅ Supported | `~/.opencode/sessions/` |
| **Claude Code** | ✅ Supported | `~/.claude/projects/` |
| **Kimi Code** | ✅ Supported | `~/.kimi-code/sessions/` |
| **Codex** | ✅ Supported | `~/.codex/sessions/` |
| **Cursor** | 🔜 Coming soon | — |
| **Windsurf** | 🔜 Coming soon | — |
| **Cline** | 🔜 Coming soon | — |
| **Continue** | 🔜 Coming soon | — |

### Auto-Detection

By default, agent-trace scans all known paths and auto-detects which agent you're using:

```bash
agent-trace  # Auto-detect and analyze all sessions
```

### Force Specific Agent

```bash
agent-trace -a claude-code   # Only analyze Claude Code
agent-trace -a kimi-code     # Only analyze Kimi Code
agent-trace -a opencode      # Only analyze OpenCode
agent-trace -a codex         # Only analyze Codex
```

## CI Integration

```yaml
# GitHub Actions - check agent costs
- name: Check agent costs
  run: |
    npx agent-trace --json > trace.json
    COST=$(jq '.costBreakdown.total.cost' trace.json)
    if (( $(echo "$COST > 10" | bc -l) )); then
      echo "Agent cost too high: $COST"
      exit 1
    fi
```

---

## How It Works

1. **Reads local session files** — No network requests, no API calls
2. **Parses message history** — Extracts roles, tokens, timestamps
3. **Analyzes tool calls** — Tracks success/failure rates
4. **Calculates costs** — Based on standard API pricing
5. **Detects anomalies** — High retries, failures, costs
6. **Generates report** — Terminal output or JSON

## Privacy

- ✅ 100% local — no data leaves your machine
- ✅ Read-only — never modifies session files
- ✅ No API keys — no external services
- ✅ No tracking — no analytics, no telemetry

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)

---

## 中文版本

[README.zh.md](README.zh.md)
