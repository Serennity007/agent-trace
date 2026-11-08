# Changelog

## Unreleased · 2026-10-30

- Honor explicit session directories instead of discovering personal log locations.
- Emit one parseable JSON document for zero, one or multiple sessions; diagnostics use stderr. Preserve the single-session report object, using arrays for zero/multiple reports.
- Fail for unsupported agents, invalid directories and absent explicitly selected sessions.
- Add a synthetic first-run fixture and four actual CLI integration checks.
- Align install commands, package/lock metadata and the Node.js 18+ requirement with the scoped package. Version remains 1.0.3; these source fixes are not published to npm.
- Claude Code parser: a response split across several jsonl entries shared one message id and repeated its usage object, so tokens and estimated cost were counted once per entry. Usage is now counted once per message id (reported by @mattabate in issue #1).
- Claude Code parser: `cache_read_input_tokens` and `cache_creation_input_tokens` are now collected and priced in the cost analysis instead of being ignored.

## [1.0.3] - 2026-08-30

### Fixed
- All GitHub links updated from old username `liangzhengtao` to `Serennity007` (old username no longer exists, no redirect)
- Terminal footer now prints the correct repository URL

## [1.0.2] - 2026-08-19

### Fixed
- Codex parser: token_count events are cumulative, now takes last value instead of summing
- Codex parser: correctly parses event_msg user_message/agent_message and response_item
- Claude Code parser: added hasContent filtering and sort by modification time
- OpenCode parser: added hasContent filtering and sort by modification time

## [1.0.1] - 2026-08-19

### Added
- Summary view for multiple sessions
- Top N most expensive sessions display
- Latest session detail view
- Empty session filtering (use --all to show all)
- Session sorting by cost (descending)

### Improved
- Kimi Code parser: better timestamp extraction and duration calculation
- Conversation timeline: clearer role tags ([YOU], [AI], [TL])
- Tool health display: duration formatting
- CLI: --top option to control number of sessions shown

## [1.0.0] - 2026-08-19

### Added
- Initial release
- Support for OpenCode, Claude Code, Kimi Code, Codex
- Session overview, cost analysis, tool health
- Anomaly detection
- Active period tracking
- Conversation timeline
- JSON output mode
- Terminal report with color coding
