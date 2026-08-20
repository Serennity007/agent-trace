[English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Español](README.es.md) | [العربية](README.ar.md) | [한국어](README.ko.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [Deutsch](README.de.md)

<div align="center">

<img src=".banner.svg" width="100%" alt="banner">

</div>

# 🔍 Agent Trace

<div align="center">

**Was macht Ihr KI-Agent wirklich? Verfolgen Sie Kosten, Token, Tool-Zustand und jedes Gespräch.**

[![npm](https://img.shields.io/npm/v/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![npm](https://img.shields.io/npm/dt/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/liangzhengtao/agent-trace.svg)](https://github.com/liangzhengtao/agent-trace)

</div>

<div align="center">
<img src=".demo.svg" width="100%" alt="demo">
</div>

---

## Das Problem

Ihr KI-Coding-Agent läuft stundenlang. Er ruft Tools auf, verbraucht Token, wiederholt fehlgeschlagene Operationen. Aber Sie haben keine Ahnung:

- 💸 Was es tatsächlich gekostet hat
- 🔧 Welche Tools ständig fehlschlagen
- 🔄 Warum es 15 Mal wiederholt wurde
- 🐌 Ob das Modell langsam war oder die Tools defekt
- ⏱️ Wie lange jedes Gespräch dauerte

## Die Lösung

```bash
npx agent-trace
```

**Ein Befehl. Keine API-Schlüssel. Keine Cloud-Dienste. Alles läuft lokal.**

---

## Schnellstart

```bash
# Installation
npm install -g agent-trace

# Automatische Erkennung und Analyse aller Sitzungen
agent-trace

# Kimi Code-Sitzungen analysieren
agent-trace -a kimi-code

# Claude Code-Sitzungen analysieren
agent-trace -a claude-code

# Top 10 teuersten Sitzungen anzeigen
agent-trace -n 10

# Als JSON ausgeben
agent-trace --json
```

## Was es zeigt

### Zusammenfassungsansicht (Mehrere Sitzungen)

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

### Sitzungsdetails

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

## Optionen

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

## Unterstützte Agenten

| Agent | Status | Konfigurationspfad |
|-------|--------|-------------------|
| **OpenCode** | ✅ Unterstützt | `~/.opencode/sessions/` |
| **Claude Code** | ✅ Unterstützt | `~/.claude/projects/` |
| **Kimi Code** | ✅ Unterstützt | `~/.kimi-code/sessions/` |
| **Codex** | ✅ Unterstützt | `~/.codex/sessions/` |
| **Cursor** | 🔜 Demnächst | — |
| **Windsurf** | 🔜 Demnächst | — |
| **Cline** | 🔜 Demnächst | — |
| **Continue** | 🔜 Demnächst | — |

### Automatische Erkennung

Standardmäßig scannt agent-trace alle bekannten Pfade und erkennt automatisch, welchen Agent Sie verwenden:

```bash
agent-trace  # Automatische Erkennung und Analyse aller Sitzungen
```

### Bestimmten Agent erzwingen

```bash
agent-trace -a claude-code   # Nur Claude Code analysieren
agent-trace -a kimi-code     # Nur Kimi Code analysieren
agent-trace -a opencode      # Nur OpenCode analysieren
agent-trace -a codex         # Nur Codex analysieren
```

## CI-Integration

```yaml
# GitHub Actions - Agent-Kosten prüfen
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

## So funktioniert es

1. **Liest lokale Sitzungsdateien** — Keine Netzwerkanfragen, keine API-Aufrufe
2. **Analysiert Nachrichtenverlauf** — Extrahiert Rollen, Token, Zeitstempel
3. **Analysiert Tool-Aufrufe** — Verfolgt Erfolgs-/Fehlerraten
4. **Berechnet Kosten** — Basierend auf Standard-API-Preisen
5. **Erkennt Anomalien** — Häufige Wiederholungen, Fehler, hohe Kosten
6. **Erstellt Bericht** — Terminal-Ausgabe oder JSON

## Datenschutz

- ✅ 100% lokal — keine Daten verlassen Ihren Computer
- ✅ Nur lesen — Sitzungsdateien werden nie verändert
- ✅ Keine API-Schlüssel — keine externen Dienste
- ✅ Kein Tracking — keine Analytik, keine Telemetrie

---

## Mitwirken

Siehe [CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

[MIT](LICENSE)

---

## Chinesische Version

[README.zh.md](README.zh.md)
