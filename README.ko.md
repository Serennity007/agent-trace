[English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Español](README.es.md) | [العربية](README.ar.md) | [한국어](README.ko.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [Deutsch](README.de.md)

<div align="center">

<img src=".banner.svg" width="100%" alt="banner">

</div>

# 🔍 Agent Trace

<div align="center">

**AI 에이전트가 실제로 무엇을 하고 있나요? 비용, 토큰, 도구 상태, 모든 대화를 추적하세요.**

[![npm](https://img.shields.io/npm/v/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![npm](https://img.shields.io/npm/dt/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/Serennity007/agent-trace.svg)](https://github.com/Serennity007/agent-trace)

</div>

<div align="center">
<img src="https://raw.githubusercontent.com/Serennity007/agent-trace/main/.github/demo.svg" width="100%" alt="demo">
</div>

---

## 문제점

AI 코딩 에이전트는 몇 시간 동안 실행됩니다. 도구를 호출하고, 토큰을 소모하고, 실패한 작업을 재시도합니다. 하지만 여러분은 다음을 알 수 없습니다:

- 💸 실제로 얼마를 썼는지
- 🔧 어떤 도구가 계속 실패하는지
- 🔄 왜 15번이나 재시도했는지
- 🐌 모델이 느렸는지, 도구가 고장났는지
- ⏱️ 각 대화에 얼마나 걸렸는지

## 해결 방법

```bash
npx agent-trace
```

**명령어 하나. API 키 불필요. 클라우드 서비스 불필요. 모든 것이 로컬에서 실행됩니다.**

---

## 빠른 시작

```bash
# 설치
npm install -g agent-trace

# 자동 감지 및 모든 세션 분석
agent-trace

# Kimi Code 세션 분석
agent-trace -a kimi-code

# Claude Code 세션 분석
agent-trace -a claude-code

# 비용 상위 10개 세션 표시
agent-trace -n 10

# JSON으로 출력
agent-trace --json
```

## 표시되는 내용

### 요약 보기 (여러 세션)

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

### 세션 상세

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

## 옵션

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

## 지원되는 에이전트

| 에이전트 | 상태 | 설정 경로 |
|---------|------|----------|
| **OpenCode** | ✅ 지원됨 | `~/.opencode/sessions/` |
| **Claude Code** | ✅ 지원됨 | `~/.claude/projects/` |
| **Kimi Code** | ✅ 지원됨 | `~/.kimi-code/sessions/` |
| **Codex** | ✅ 지원됨 | `~/.codex/sessions/` |
| **Cursor** | 🔜 출시 예정 | — |
| **Windsurf** | 🔜 출시 예정 | — |
| **Cline** | 🔜 출시 예정 | — |
| **Continue** | 🔜 출시 예정 | — |

### 자동 감지

기본적으로 agent-trace는 모든 알려진 경로를 스캔하여 사용 중인 에이전트를 자동 감지합니다:

```bash
agent-trace  # 자동 감지 및 모든 세션 분석
```

### 특정 에이전트 강제 지정

```bash
agent-trace -a claude-code   # Claude Code만 분석
agent-trace -a kimi-code     # Kimi Code만 분석
agent-trace -a opencode      # OpenCode만 분석
agent-trace -a codex         # Codex만 분석
```

## CI 통합

```yaml
# GitHub Actions - 에이전트 비용 확인
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

## 작동 방식

1. **로컬 세션 파일 읽기** — 네트워크 요청 없음, API 호출 없음
2. **메시지 기록 분석** — 역할, 토큰, 타임스탬프 추출
3. **도구 호출 분석** — 성공/실패 비율 추적
4. **비용 계산** — 표준 API 가격 기준
5. **이상 감지** — 높은 재시도율, 실패, 비용
6. **보고서 생성** — 터미널 출력 또는 JSON

## 개인정보 보호

- ✅ 100% 로컬 — 데이터가 사용자의 기기를 떠나지 않음
- ✅ 읽기 전용 — 세션 파일을 절대 수정하지 않음
- ✅ API 키 불필요 — 외부 서비스 없음
- ✅ 추적 없음 — 분석 없음, 원격 측정 없음

---

## 기여하기

[CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요.

## 라이선스

[MIT](LICENSE)

---

## 中文 버전

[README.zh.md](README.zh.md)
