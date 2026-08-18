# 🔍 Agent Trace

<div align="center">

**你的 Agent 到底在背着你干什么？追踪成本、Token、工具健康、每一条对话。**

[![npm](https://img.shields.io/npm/v/agent-trace.svg)](https://www.npmjs.com/package/agent-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

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

# 分析 OpenCode 会话
agent-trace

# 或者用 npx
npx agent-trace
```

## 输出示例

```
  🔍 Agent Trace Report
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
  输入 Token: 245,891 ($0.0738)
  输出 Token: 89,234 ($0.1339)
  总 Token: 335,125
  预估成本: $0.2076

  🔧 工具健康度
  ─────────────────────────────────────────────────────
  ✓ Read: 45 次调用, 100% 成功率, 平均 120ms
  ✓ Write: 23 次调用, 96% 成功率, 平均 85ms
  ⚠ Bash: 12 次调用, 75% 成功率, 平均 2340ms
  ✗ Browser: 9 次调用, 44% 成功率, 平均 5120ms

  ⚠️  异常检测
  ─────────────────────────────────────────────────────
  → 工具失败率高: 18/89
  → 预估成本高: $5.23

  ⏱️  活跃时段
  ─────────────────────────────────────────────────────
  09:15:23 → 09:47:56 (32分33秒, 45 条消息)
  10:02:11 → 10:31:44 (29分33秒, 52 条消息)

  📝 最近时间线
  ─────────────────────────────────────────────────────
  10:31:12 你: 修复认证 bug...
  10:31:14 AI (2秒): 我来检查认证中间件...
  10:31:15 工具 (1秒): 读取 src/middleware/auth.ts
  10:31:44 AI (29秒): 已修复，问题是...
```

---

## 选项

```
agent-trace [选项] [目录]

选项:
  -s, --session <id>   分析指定会话 ID
  -j, --json           输出 JSON 格式
  -v, --verbose        显示详细时间线
  --agent <type>       Agent 类型 (opencode, kimi-code, claude-code, codex)
  -h, --help           显示帮助
  -V, --version        显示版本
```

## 支持的 Agent

| Agent | 状态 | 配置路径 |
|-------|------|---------|
| **OpenCode** | ✅ 已支持 | `~/.opencode/sessions/` |
| **Kimi Code** | 🔜 即将支持 | `~/.kimi-code/sessions/` |
| **Claude Code** | 🔜 即将支持 | `~/.claude/sessions/` |
| **Codex** | 🔜 即将支持 | `~/.codex/sessions/` |

## CI 集成

```yaml
# GitHub Actions - 检查 Agent 成本
- name: Check agent costs
  run: |
    npx agent-trace --json > trace.json
    COST=$(jq '.costBreakdown.total.cost' trace.json)
    if (( $(echo "$COST > 10" | bc -l) )); then
      echo "Agent 成本过高: $COST"
      exit 1
    fi
```

---

## 工作原理

1. **读取本地会话文件** — 不发网络请求，不调用 API
2. **解析消息历史** — 提取角色、Token、时间戳
3. **分析工具调用** — 追踪成功/失败率
4. **计算成本** — 基于标准 API 定价
5. **检测异常** — 高重试、高失败、高成本
6. **生成报告** — 终端输出或 JSON

## 隐私

- ✅ 100% 本地 — 数据不离开你的机器
- ✅ 只读 — 不修改会话文件
- ✅ 无需 API Key — 不调用外部服务
- ✅ 无追踪 — 无分析、无遥测

---

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)

## 许可证

[MIT](LICENSE)

---

## English Version

[README.md](README.md)
