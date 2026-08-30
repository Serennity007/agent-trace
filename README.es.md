[English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Español](README.es.md) | [العربية](README.ar.md) | [한국어](README.ko.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [Deutsch](README.de.md)

<div align="center">

<img src=".banner.svg" width="100%" alt="banner">

</div>

# 🔍 Agent Trace

<div align="center">

**¿Qué está haciendo realmente tu agente de IA? Rastrea costos, tokens, salud de herramientas y cada conversación.**

[![npm](https://img.shields.io/npm/v/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![npm](https://img.shields.io/npm/dt/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Serennity007/agent-trace.svg)](https://github.com/Serennity007/agent-trace)

</div>

<div align="center">
<img src="https://raw.githubusercontent.com/Serennity007/agent-trace/main/.github/demo.svg" width="100%" alt="demo">
</div>

---

## El problema

Tu agente de codificación con IA funciona durante horas. Llama herramientas, consume tokens, reintenta operaciones fallidas. Pero no tienes idea:

- 💸 Cuánto costó realmente
- 🔧 Qué herramientas siguen fallando
- 🔄 Por qué reintentó 15 veces
- 🐌 Si el modelo estaba lento o las herramientas estaban rotas
- ⏱️ Cuánto tardó cada conversación

## La solución

```bash
npx agent-trace
```

**Un solo comando. Sin claves API. Sin servicios en la nube. Todo se ejecuta localmente.**

---

## Inicio rápido

```bash
# Instalar
npm install -g agent-trace

# Detectar automáticamente y analizar todas las sesiones
agent-trace

# Analizar sesiones de Kimi Code
agent-trace -a kimi-code

# Analizar sesiones de Claude Code
agent-trace -a claude-code

# Mostrar las 10 sesiones más costosas
agent-trace -n 10

# Salida en formato JSON
agent-trace --json
```

## Lo que muestra

### Vista resumen (múltiples sesiones)

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

### Detalle de sesión

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

## Opciones

```
agent-trace [options] [directory]

Options:
  -s, --session <id>   Analizar sesión específica
  -j, --json           Salida en formato JSON
  -v, --verbose        Mostrar línea de tiempo detallada
  -a, --agent <type>   Tipo de agente (opencode, kimi-code, claude-code, codex)
  -n, --top <count>    Mostrar las N sesiones más costosas (por defecto: 5)
  --all                Mostrar todas las sesiones (incluidas las vacías)
  --list-agents        Listar agentes compatibles
  -h, --help           Mostrar ayuda
  -V, --version        Mostrar versión
```

## Agentes compatibles

| Agente | Estado | Ruta de configuración |
|--------|--------|-----------------------|
| **OpenCode** | ✅ Compatible | `~/.opencode/sessions/` |
| **Claude Code** | ✅ Compatible | `~/.claude/projects/` |
| **Kimi Code** | ✅ Compatible | `~/.kimi-code/sessions/` |
| **Codex** | ✅ Compatible | `~/.codex/sessions/` |
| **Cursor** | 🔜 Próximamente | — |
| **Windsurf** | 🔜 Próximamente | — |
| **Cline** | 🔜 Próximamente | — |
| **Continue** | 🔜 Próximamente | — |

### Detección automática

Por defecto, agent-trace escanea todas las rutas conocidas y detecta automáticamente qué agente estás usando:

```bash
agent-trace  # Detección automática y análisis de todas las sesiones
```

### Forzar un agente específico

```bash
agent-trace -a claude-code   # Solo analizar Claude Code
agent-trace -a kimi-code     # Solo analizar Kimi Code
agent-trace -a opencode      # Solo analizar OpenCode
agent-trace -a codex         # Solo analizar Codex
```

## Integración CI

```yaml
# GitHub Actions - verificar costos del agente
- name: Check agent costs
  run: |
    npx agent-trace --json > trace.json
    COST=$(jq '.costBreakdown.total.cost' trace.json)
    if (( $(echo "$COST > 10" | bc -l) )); then
      echo "Costo del agente demasiado alto: $COST"
      exit 1
    fi
```

---

## Cómo funciona

1. **Lee archivos de sesión locales** — Sin peticiones de red, sin llamadas API
2. **Analiza el historial de mensajes** — Extrae roles, tokens, marcas de tiempo
3. **Analiza las llamadas a herramientas** — Rastrea tasas de éxito/fallo
4. **Calcula costos** — Basado en precios estándar de API
5. **Detecta anomalías** — Reintentos altos, fallos, costos elevados
6. **Genera reporte** — Salida en terminal o JSON

## Privacidad

- ✅ 100% local — ningún dato sale de tu máquina
- ✅ Solo lectura — nunca modifica archivos de sesión
- ✅ Sin claves API — sin servicios externos
- ✅ Sin rastreo — sin analytics, sin telemetría

---

## Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

[MIT](LICENSE)

---

## 中文版本

[README.zh.md](README.zh.md)
