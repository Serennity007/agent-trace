[English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Español](README.es.md) | [العربية](README.ar.md) | [한국어](README.ko.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [Deutsch](README.de.md)

<div align="center">

<img src=".banner.svg" width="100%" alt="banner">

</div>

# 🔍 Agent Trace

<div align="center">

**Que fait réellement votre agent IA ? Suivez les coûts, les tokens, la santé des outils et chaque conversation.**

[![npm](https://img.shields.io/npm/v/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![npm](https://img.shields.io/npm/dt/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Serennity007/agent-trace.svg)](https://github.com/Serennity007/agent-trace)

</div>

<div align="center">
<img src="https://raw.githubusercontent.com/Serennity007/agent-trace/main/.github/demo.svg" width="100%" alt="demo">
</div>

---

## Le problème

Votre agent de codage IA fonctionne pendant des heures. Il appelle des outils, consomme des tokens, relance les opérations échouées. Mais vous n'avez aucune idée :

- 💸 Combien ça a réellement coûté
- 🔧 Quels outils échouent en permanence
- 🔄 Pourquoi il a relancé 15 fois
- 🐌 Si le modèle était lent ou si les outils étaient cassés
- ⏱️ Combien de temps chaque conversation a pris

## La solution

```bash
npx agent-trace
```

**Une seule commande. Pas de clé API. Pas de service cloud. Tout s'exécute localement.**

---

## Démarrage rapide

```bash
# Installation
npm install -g agent-trace

# Détecter automatiquement et analyser toutes les sessions
agent-trace

# Analyser les sessions Kimi Code
agent-trace -a kimi-code

# Analyser les sessions Claude Code
agent-trace -a claude-code

# Afficher les 10 sessions les plus coûteuses
agent-trace -n 10

# Sortie au format JSON
agent-trace --json
```

## Ce qu'il affiche

### Vue résumée (plusieurs sessions)

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

### Détail de session

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
  -s, --session <id>   Analyser une session spécifique
  -j, --json           Sortie au format JSON
  -v, --verbose        Afficher la chronologie détaillée
  -a, --agent <type>   Type d'agent (opencode, kimi-code, claude-code, codex)
  -n, --top <count>    Afficher les N sessions les plus coûteuses (défaut : 5)
  --all                Afficher toutes les sessions (y compris les vides)
  --list-agents        Lister les agents pris en charge
  -h, --help           Afficher l'aide
  -V, --version        Afficher la version
```

## Agents pris en charge

| Agent | Statut | Chemin de configuration |
|-------|--------|------------------------|
| **OpenCode** | ✅ Pris en charge | `~/.opencode/sessions/` |
| **Claude Code** | ✅ Pris en charge | `~/.claude/projects/` |
| **Kimi Code** | ✅ Pris en charge | `~/.kimi-code/sessions/` |
| **Codex** | ✅ Pris en charge | `~/.codex/sessions/` |
| **Cursor** | 🔜 Bientôt disponible | — |
| **Windsurf** | 🔜 Bientôt disponible | — |
| **Cline** | 🔜 Bientôt disponible | — |
| **Continue** | 🔜 Bientôt disponible | — |

### Détection automatique

Par défaut, agent-trace analyse tous les chemins connus et détecte automatiquement l'agent que vous utilisez :

```bash
agent-trace  # Détection automatique et analyse de toutes les sessions
```

### Forcer un agent spécifique

```bash
agent-trace -a claude-code   # Analyser uniquement Claude Code
agent-trace -a kimi-code     # Analyser uniquement Kimi Code
agent-trace -a opencode      # Analyser uniquement OpenCode
agent-trace -a codex         # Analyser uniquement Codex
```

## Intégration CI

```yaml
# GitHub Actions - vérifier les coûts de l'agent
- name: Check agent costs
  run: |
    npx agent-trace --json > trace.json
    COST=$(jq '.costBreakdown.total.cost' trace.json)
    if (( $(echo "$COST > 10" | bc -l) )); then
      echo "Coût de l'agent trop élevé : $COST"
      exit 1
    fi
```

---

## Comment ça fonctionne

1. **Lit les fichiers de session locaux** — Aucune requête réseau, aucun appel API
2. **Analyse l'historique des messages** — Extrait les rôles, tokens, horodatages
3. **Analyse les appels d'outils** — Suit les taux de succès/échec
4. **Calcule les coûts** — Basé sur les tarifs API standards
5. **Détecte les anomalies** — Relances élevées, échecs, coûts élevés
6. **Génère un rapport** — Sortie terminal ou JSON

## Confidentialité

- ✅ 100% local — aucune donnée ne quitte votre machine
- ✅ Lecture seule — ne modifie jamais les fichiers de session
- ✅ Pas de clé API — aucun service externe
- ✅ Aucun suivi — pas d'analytics, pas de télémétrie

---

## Contribuer

Voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

[MIT](LICENSE)

---

## 中文版本

[README.zh.md](README.zh.md)
