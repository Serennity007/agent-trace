# First run / 第一次使用

Use Node.js 18+ and npm. This source checkout includes unreleased directory/JSON fixes. Dependency installation needs network access; the invented fixture needs no personal logs or API key.

以下使用当前源码与合成样本，需要 Node.js 18+ 和 npm。安装依赖需要网络，分析样例不需要个人日志或密钥。源码修复尚未发布到 npm。

```sh
git clone https://github.com/Serennity007/agent-trace.git
cd agent-trace
npm ci --ignore-scripts
node bin/cli.js examples/session-demo -a opencode --json
```

Expect one JSON object with `session = "synthetic-demo"`, 100 input tokens, 50 output tokens and one `read_file` tool call. This is invented data, not a usage or billing record.

成功时 `session` 为 `synthetic-demo`，输入/输出 token 为 100/50，含一次 `read_file` 调用。人工样本不代表真实使用或账单。

An explicit directory limits discovery to that directory. OpenCode reads JSON files directly inside it; Claude Code expects project subdirectories and Codex year/month/day subdirectories. Without a directory, the command discovers supported personal-session locations. Cost estimates use built-in rates, not actual bills or verified current model prices.

传目录时只查该目录，不回退个人会话。OpenCode 直接读取目录内 JSON；Claude Code、Codex 等保留各自目录层级。省略目录才自动查找个人会话位置。成本使用内置费率估算，不等于账单或已核验的当前模型价格。

`--json` emits one document: an object for one session, an array for multiple sessions, `[]` for no sessions. Diagnostics use stderr. Invalid directories and absent `-s` selections fail with nonzero exit codes. JSON includes all matched sessions; `--top` controls only the terminal summary.

`--json` 单会话输出对象、多会话输出数组、无会话输出 `[]`；诊断写入 stderr。目录无效或 `-s` 找不到会话时非零退出。JSON 包含全部匹配会话，`--top` 只控制终端汇总。

Run `npm test` for parser/analyzer and real CLI checks.

[Six project entrypoints](https://github.com/Serennity007/repo-catalog/blob/main/docs/projects.md) · [Changes](../CHANGELOG.md)
