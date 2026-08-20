[English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Español](README.es.md) | [العربية](README.ar.md) | [한국어](README.ko.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [Deutsch](README.de.md)

<div align="center">

<img src=".banner.svg" width="100%" alt="banner">

</div>

# 🔍 Agent Trace

<div align="center">

**What is your AI agent actually doing? Track costs, tokens, tool health, and every conversation.**

[![npm](https://img.shields.io/npm/v/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![npm](https://img.shields.io/npm/dt/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/liangzhengtao/agent-trace.svg)](https://github.com/liangzhengtao/agent-trace)

</div>

<div align="center">
<img src=".demo.svg" width="100%" alt="demo">
</div>

---

## The Problem

Your AI coding agent runs for hours. It calls tools, burns tokens, retries failed operations. But you have no idea:

- 💸 How much it actually cost
- 🔧 Which tools keep failing
- 🔄 Why it retried 15 times
- 🐌 Whether the model was slow or the tools were broken
- ⏱️ How long each conversation took

## The Solution

```bash
npx agent-trace
```

**One command. No API keys. No cloud services. Everything runs locally.**

---

## Quick Start

```bash
# Install
npm install -g agent-trace

# Auto-detect and analyze all sessions
agent-trace

# Analyze Kimi Code sessions
agent-trace -a kimi-code

# Analyze Claude Code sessions
agent-trace -a claude-code

# Show top 10 most expensive sessions
agent-trace -n 10

# Output as JSON
agent-trace --json
```

## What It Shows

### Summary View (Multiple Sessions)

```
  📊 Summary
  ─────────────────────────────────────────────────────
  Sessions:      64
  Total Cost:    $4681.95
  Total Tokens:  2,323,222,286
  Total Messages: 3256
  Total Tools:   11570
  Total Time:    1593h 49m

  💰 Top 5 Most Expensive Sessions
  ─────────────────────────────────────────────────────
  Rank  Session ID                         Cost      Tokens    Messages
  ────  ─────────────────────────────────  ────────  ────────  ────────
     1  session_37ce506c-ecbd-4ac9-8151   $1517.15  757,285,306      1177
     2  session_bd1b6c0e-a4cc-402c-8c1e   $1210.12  596,458,795       508
     3  session_daecc013-3b5b-44a8-9c19   $1080.48  538,333,781       489
```

### Session Detail

```
  🔍 Agent Trace Report
  ─────────────────────────────────────────────────────

  📊 Session Overview
  ─────────────────────────────────────────────────────
  Duration: 45m 23s
  Messages: 127 (User: 32, AI: 64, Tool: 31)
  Tool Calls: 89 (12 unique tools)
  Errors: 3
  Retries: 2

  💰 Cost Analysis
  ─────────────────────────────────────────────────────
  Input Tokens:  245,891  ($0.0738)
  Output Tokens: 89,234  ($0.1339)
  Total Tokens:  335,125
  Estimated Cost: $0.2076

  🔧 Tool Health
  ─────────────────────────────────────────────────────
  ✓ Read            ████████████████████ 100%  (45 calls, avg 120ms)
  ✓ Write           ████████████████████ 100%  (23 calls, avg 85ms)
  ⚠ Bash            ███████████████░░░░░  75%  (12 calls, avg 2s)
  ✗ Browser         ████████░░░░░░░░░░░░  44%  (9 calls, avg 5s)

  ⚠️  Anomalies
  ─────────────────────────────────────────────────────
  → High tool failure rate: 18/89
  → High estimated cost: $5.23

  ⏱️  Active Periods
  ─────────────────────────────────────────────────────
  09:15:23 → 09:47:56 (32m 33s, 45 messages)
  10:02:11 → 10:31:44 (29m 33s, 52 messages)

  💬 Conversation
  ─────────────────────────────────────────────────────
  [YOU] Fix the authentication bug...                    10:31:12
  [AI ] I'll check the auth middleware...                10:31:14 (+2s)
  [YOU] What about the token validation?                 10:31:30 (+16s)
  [AI ] Fixed. The issue was...                          10:31:44 (+14s)
```

---

## Options

```
agent-trace [options] [directory]

Options:
  -s, --session <id>   Analyze specific session
  -j, --json           Output as JSON
  -v, --verbose        Show detailed timeline
  -a, --agent <type>   Agent type (opencode, kimi-code, claude-code, codex)
  -n, --top <count>    Show top N sessions by cost (default: 5)
  --all                Show all sessions (including empty)
  --list-agents        List supported agents
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
