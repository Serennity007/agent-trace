[English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Español](README.es.md) | [العربية](README.ar.md) | [한국어](README.ko.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [Deutsch](README.de.md)

<div align="center">

<img src=".banner.svg" width="100%" alt="banner">

</div>

# 🔍 Agent Trace

<div align="center">

**Что на самом деле делает ваш ИИ-агент? Отслеживайте расходы, токены, состояние инструментов и каждую беседу.**

[![npm](https://img.shields.io/npm/v/@liangzhengtao/agent-trace.svg)](https://www.npmjs.com/package/@liangzhengtao/agent-trace)
[![npm](https://img.shields.io/npm/dt/@liangzhengtao/agent-trace.svg)](https://www.npmjs.com/package/@liangzhengtao/agent-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Serennity007/agent-trace.svg)](https://github.com/Serennity007/agent-trace)

</div>

<div align="center">
<img src="https://raw.githubusercontent.com/Serennity007/agent-trace/main/.github/demo.svg" width="100%" alt="demo">
</div>

---

## Проблема

Ваш ИИ-агент для программирования работает часами. Он вызывает инструменты, расходует токены, повторяет неудачные операции. Но вы не знаете:

- 💸 Сколько это на самом деле стоило
- 🔧 Какие инструменты постоянно сбоят
- 🔄 Почему была предпринята 15-я попытка
- 🐌 Медленная была модель или сломаны инструменты
- ⏱️ Сколько времени заняла каждая беседа

## Решение

```bash
npx @liangzhengtao/agent-trace
```

**Одна команда. Без ключей API. Без облачных сервисов. Всё работает локально.**

---

## Быстрый старт

```bash
# Установка
npm install -g agent-trace

# Автоопределение и анализ всех сессий
agent-trace

# Анализ сессий Kimi Code
agent-trace -a kimi-code

# Анализ сессий Claude Code
agent-trace -a claude-code

# Показать 10 самых дорогих сессий
agent-trace -n 10

# Вывод в формате JSON
agent-trace --json
```

## Что показывает инструмент

### Сводный обзор (несколько сессий)

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

### Детали сессии

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

## Параметры

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

## Поддерживаемые агенты

| Агент | Статус | Путь конфигурации |
|-------|--------|-------------------|
| **OpenCode** | ✅ Поддерживается | `~/.opencode/sessions/` |
| **Claude Code** | ✅ Поддерживается | `~/.claude/projects/` |
| **Kimi Code** | ✅ Поддерживается | `~/.kimi-code/sessions/` |
| **Codex** | ✅ Поддерживается | `~/.codex/sessions/` |
| **Cursor** | 🔜 Скоро | — |
| **Windsurf** | 🔜 Скоро | — |
| **Cline** | 🔜 Скоро | — |
| **Continue** | 🔜 Скоро | — |

### Автоопределение

По умолчанию agent-trace сканирует все известные пути и автоматически определяет, какой агент вы используете:

```bash
agent-trace  # Автоопределение и анализ всех сессий
```

### Принудительный выбор агента

```bash
agent-trace -a claude-code   # Анализ только Claude Code
agent-trace -a kimi-code     # Анализ только Kimi Code
agent-trace -a opencode      # Анализ только OpenCode
agent-trace -a codex         # Анализ только Codex
```

## Интеграция с CI

```yaml
# GitHub Actions - проверка расходов агента
- name: Check agent costs
  run: |
    npx @liangzhengtao/agent-trace --json > trace.json
    COST=$(jq '.costBreakdown.total.cost' trace.json)
    if (( $(echo "$COST > 10" | bc -l) )); then
      echo "Agent cost too high: $COST"
      exit 1
    fi
```

---

## Принцип работы

1. **Чтение локальных файлов сессий** — Без сетевых запросов, без вызовов API
2. **Анализ истории сообщений** — Извлечение ролей, токенов, временных меток
3. **Анализ вызовов инструментов** — Отслеживание частоты успехов и сбоев
4. **Расчёт стоимости** — На основе стандартных цен API
5. **Обнаружение аномалий** — Частые повторы, сбои, высокие расходы
6. **Генерация отчёта** — Вывод в терминал или в формате JSON

## Конфиденциальность

- ✅ 100% локально — данные не покидают ваш компьютер
- ✅ Только чтение — никогда не изменяет файлы сессий
- ✅ Без ключей API — без внешних сервисов
- ✅ Без отслеживания — без аналитики, без телеметрии

---

## Участие в проекте

См. [CONTRIBUTING.md](CONTRIBUTING.md).

## Лицензия

[MIT](LICENSE)

---

## 中文版

[README.zh.md](README.zh.md)
