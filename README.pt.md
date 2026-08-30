[English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Español](README.es.md) | [العربية](README.ar.md) | [한국어](README.ko.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [Deutsch](README.de.md)

<div align="center">

<img src=".banner.svg" width="100%" alt="banner">

</div>

# 🔍 Agent Trace

<div align="center">

**O que seu agente de IA realmente está fazendo? Rastreie custos, tokens, saúde das ferramentas e cada conversa.**

[![npm](https://img.shields.io/npm/v/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![npm](https://img.shields.io/npm/dt/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Serennity007/agent-trace.svg)](https://github.com/Serennity007/agent-trace)

</div>

<div align="center">
<img src="https://raw.githubusercontent.com/Serennity007/agent-trace/main/.github/demo.svg" width="100%" alt="demo">
</div>

---

## O Problema

Seu agente de programação com IA funciona por horas. Ele chama ferramentas, consome tokens, tenta novamente operações falhas. Mas você não tem ideia:

- 💸 Quanto realmente custou
- 🔧 Quais ferramentas continuam falhando
- 🔄 Por que tentou 15 vezes
- 🐌 Se o modelo estava lento ou as ferramentas estavam quebradas
- ⏱️ Quanto tempo cada conversa levou

## A Solução

```bash
npx agent-trace
```

**Um comando. Sem chaves de API. Sem serviços na nuvem. Tudo roda localmente.**

---

## Início Rápido

```bash
# Instalar
npm install -g agent-trace

# Auto-detectar e analisar todas as sessões
agent-trace

# Analisar sessões do Kimi Code
agent-trace -a kimi-code

# Analisar sessões do Claude Code
agent-trace -a claude-code

# Mostrar as 10 sessões mais caras
agent-trace -n 10

# Saída como JSON
agent-trace --json
```

## O Que Ele Mostra

### Visão de Resumo (Múltiplas Sessões)

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

### Detalhes da Sessão

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

## Opções

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

## Agentes Suportados

| Agente | Status | Caminho de Configuração |
|--------|--------|------------------------|
| **OpenCode** | ✅ Suportado | `~/.opencode/sessions/` |
| **Claude Code** | ✅ Suportado | `~/.claude/projects/` |
| **Kimi Code** | ✅ Suportado | `~/.kimi-code/sessions/` |
| **Codex** | ✅ Suportado | `~/.codex/sessions/` |
| **Cursor** | 🔜 Em breve | — |
| **Windsurf** | 🔜 Em breve | — |
| **Cline** | 🔜 Em breve | — |
| **Continue** | 🔜 Em breve | — |

### Detecção Automática

Por padrão, o agent-trace escaneia todos os caminhos conhecidos e detecta automaticamente qual agente você está usando:

```bash
agent-trace  # Auto-detectar e analisar todas as sessões
```

### Forçar Agente Específico

```bash
agent-trace -a claude-code   # Analisar apenas Claude Code
agent-trace -a kimi-code     # Analisar apenas Kimi Code
agent-trace -a opencode      # Analisar apenas OpenCode
agent-trace -a codex         # Analisar apenas Codex
```

## Integração com CI

```yaml
# GitHub Actions - verificar custos do agente
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

## Como Funciona

1. **Lê arquivos de sessão locais** — Sem requisições de rede, sem chamadas de API
2. **Analisa histórico de mensagens** — Extrai papéis, tokens, timestamps
3. **Analisa chamadas de ferramentas** — Rastreia taxas de sucesso/falha
4. **Calcula custos** — Baseado nos preços padrão de API
5. **Detecta anomalias** — Altas tentativas, falhas, custos
6. **Gera relatório** — Saída no terminal ou JSON

## Privacidade

- ✅ 100% local — nenhum dado sai da sua máquina
- ✅ Somente leitura — nunca modifica arquivos de sessão
- ✅ Sem chaves de API — sem serviços externos
- ✅ Sem rastreamento — sem analytics, sem telemetria

---

## Contribuindo

Consulte [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

[MIT](LICENSE)

---

## Versão em Chinês

[README.zh.md](README.zh.md)
