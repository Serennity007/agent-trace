[English](README.md) | [中文](README.zh.md) | [日本語](README.ja.md) | [Français](README.fr.md) | [Español](README.es.md) | [العربية](README.ar.md) | [한국어](README.ko.md) | [Português](README.pt.md) | [Русский](README.ru.md) | [Deutsch](README.de.md)

<div align="center">

<img src=".banner.svg" width="100%" alt="banner">

</div>

# 🔍 Agent Trace

<div align="center">

**你的 Agent 到底在背着你干什么？追踪成本、Token、工具健康、每一条对话。**

[![npm](https://img.shields.io/npm/v/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

</div>

<div align="center">
<img src="https://raw.githubusercontent.com/Serennity007/agent-trace/main/.github/demo.svg" width="100%" alt="demo">
</div>

---

## 问题

你的 AI 编程 Agent 跑了好几个小时。它调用工具、烧 Token、不断重试。但你完全不知道：

- 到底花了多少钱
- 哪些工具一直在失败
- 为什么重试了 15 次
- 是模型不行还是工具在抽风
- 每条对话花了多久

## 解决方案

```bash
npx agent-trace
```

一条命令，无需 API Key，无需云服务，全部本地运行。

---

## 快速开始

```bash
# 安装
npm install -g agent-trace

# 自动检测并分析所有会话
agent-trace

# 分析 Kimi Code 会话
agent-trace -a kimi-code

# 分析 Claude Code 会话
agent-trace -a claude-code

# 显示花费最高的 10 个会话
agent-trace -n 10

# 输出 JSON 格式
agent-trace --json
```

## 输出示例

### 汇总视图（多个会话）

```
  📊 汇总
  ─────────────────────────────────────────────────────
  会话数:        64
  总花费:        $4681.95
  总 Token:      2,323,222,286
  总消息数:      3256
  总工具调用:    11570
  总时长:        1593小时49分

  💰 花费最高的 5 个会话
  ─────────────────────────────────────────────────────
  排名  会话ID                               花费      Token     消息数
  ────  ─────────────────────────────────  ────────  ────────  ────────
     1  session_37ce506c-ecbd-4ac9-8151   $1517.15  757,285,306      1177
     2  session_bd1b6c0e-a4cc-402c-8c1e   $1210.12  596,458,795       508
     3  session_daecc013-3b5b-44a8-9c19   $1080.48  538,333,781       489
```

### 会话详情

```
  🔍 Agent 轨迹报告
  ─────────────────────────────────────────────────────

  📊 会话概览
  ─────────────────────────────────────────────────────
  持续时间: 45分23秒
  消息数: 127 (用户: 32, AI: 64, 工具: 31)
  工具调用: 89 次 (12 个不同工具)
  错误数: 3
  重试数: 2

  💰 成本分析
  ─────────────────────────────────────────────────────
  输入 Token:  245,891  ($0.0738)
  输出 Token: 89,234  ($0.1339)
  总 Token:    335,125
  预估成本:    $0.2076

  🔧 工具健康度
  ─────────────────────────────────────────────────────
  ✓ Read            ████████████████████ 100%  (45 次, 平均 120ms)
  ✓ Write           ████████████████████ 100%  (23 次, 平均 85ms)
  ⚠ Bash            ███████████████░░░░░  75%  (12 次, 平均 2s)
  ✗ Browser         ████████░░░░░░░░░░░░  44%  (9 次, 平均 5s)

  ⚠️  异常检测
  ─────────────────────────────────────────────────────
  → 工具失败率高: 18/89
  → 预估成本高: $5.23

  ⏱️  活跃时段
  ─────────────────────────────────────────────────────
  09:15:23 → 09:47:56 (32分33秒, 45条消息)
  10:02:11 → 10:31:44 (29分33秒, 52条消息)

  💬 对话记录
  ─────────────────────────────────────────────────────
  [你] 修复认证 bug...                                 10:31:12
  [AI] 我来检查一下 auth 中间件...                     10:31:14 (+2秒)
  [你] token 验证那块呢?                               10:31:30 (+16秒)
  [AI] 修好了。问题在于...                              10:31:44 (+14秒)
```

---

## 命令行选项

```
agent-trace [选项] [目录]

选项:
  -s, --session <id>   分析指定会话
  -j, --json           输出 JSON 格式
  -v, --verbose        显示详细时间线
  -a, --agent <type>   Agent 类型 (opencode, kimi-code, claude-code, codex)
  -n, --top <count>    显示花费最高的 N 个会话 (默认: 5)
  --all                显示所有会话 (包括空会话)
  --list-agents        列出支持的 Agent
  -h, --help           显示帮助
  -V, --version        显示版本
```

## 支持的 Agent

| Agent | 状态 | 配置路径 |
|-------|------|---------|
| **OpenCode** | ✅ 已支持 | `~/.opencode/sessions/` |
| **Claude Code** | ✅ 已支持 | `~/.claude/projects/` |
| **Kimi Code** | ✅ 已支持 | `~/.kimi-code/sessions/` |
| **Codex** | ✅ 已支持 | `~/.codex/sessions/` |
| **Cursor** | 🔜 即将支持 | — |
| **Windsurf** | 🔜 即将支持 | — |
| **Cline** | 🔜 即将支持 | — |
| **Continue** | 🔜 即将支持 | — |

### 自动检测

默认情况下，agent-trace 会扫描所有已知路径并自动检测你使用的 Agent：

```bash
agent-trace  # 自动检测并分析所有会话
```

### 指定 Agent

```bash
agent-trace -a claude-code   # 只分析 Claude Code
agent-trace -a kimi-code     # 只分析 Kimi Code
agent-trace -a opencode      # 只分析 OpenCode
agent-trace -a codex         # 只分析 Codex
```

## CI 集成

```yaml
# GitHub Actions - 检查 Agent 花费
- name: Check agent costs
  run: |
    npx agent-trace --json > trace.json
    COST=$(jq '.costBreakdown.total.cost' trace.json)
    if (( $(echo "$COST > 10" | bc -l) )); then
      echo "Agent 花费过高: $COST"
      exit 1
    fi
```

---

## 工作原理

1. **读取本地会话文件** — 不发网络请求，不调 API
2. **解析消息历史** — 提取角色、Token、时间戳
3. **分析工具调用** — 追踪成功/失败率
4. **计算成本** — 基于标准 API 定价
5. **检测异常** — 高重试、高失败率、高成本
6. **生成报告** — 终端输出或 JSON

## 隐私

- ✅ 100% 本地运行 — 数据不会离开你的电脑
- ✅ 只读模式 — 不修改任何会话文件
- ✅ 不需要 API Key — 不依赖外部服务
- ✅ 无追踪 — 没有分析、没有遥测

---

## 贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

[MIT](LICENSE)

---

## English Version

[README.md](README.md)
