#!/bin/zsh

set -euo pipefail

# Cron often runs with a minimal PATH, so prime common install locations first.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

SCRIPT_DIR=${0:A:h}
REPO_ROOT=${SCRIPT_DIR:h}
PROMPT_TEMPLATE="${SCRIPT_DIR}/codex-daily-summary.prompt.md"
SUMMARY_ROOT="${SUMMARY_ROOT:-/Users/sijin.kuang/obs/learn/mini-dify}"
RUNTIME_ROOT="${SUMMARY_ROOT}/.codex-daily-summary"
REPORT_ROOT="${SUMMARY_ROOT}"
LOG_ROOT="${RUNTIME_ROOT}/logs"
STATE_ROOT="${RUNTIME_ROOT}/state"
TZ_REGION="${SUMMARY_TZ:-Asia/Shanghai}"
FORCE_RUN="${1:-}"
SUMMARY_WINDOW_MINUTES="${SUMMARY_WINDOW_MINUTES:-5}"

mkdir -p "$REPORT_ROOT" "$LOG_ROOT" "$STATE_ROOT"

if [[ ! -f "$PROMPT_TEMPLATE" ]]; then
  print -u2 "Prompt template not found: $PROMPT_TEMPLATE"
  exit 1
fi

codex_bin="${CODEX_BIN:-$(command -v codex || true)}"
if [[ -z "$codex_bin" ]]; then
  print -u2 "codex binary not found. Set CODEX_BIN or add codex to PATH."
  exit 1
fi

today="$(TZ="$TZ_REGION" date '+%Y-%m-%d')"
current_hm="$(TZ="$TZ_REGION" date '+%H:%M')"
weekday="$(TZ="$TZ_REGION" date '+%u')"
current_minutes=$(( 10#${current_hm%:*} * 60 + 10#${current_hm#*:} ))
target_minutes=$(( 17 * 60 + 55 ))
timestamp="$(TZ="$TZ_REGION" date '+%Y-%m-%d %H:%M:%S %Z')"
today_start="${today} 00:00:00"
today_end="${today} 23:59:59"
report_path="${REPORT_ROOT}/${today}.md"
tmp_report_path="${REPORT_ROOT}/${today}.md.tmp"
last_run_stamp="${STATE_ROOT}/last-run-date.txt"
lock_dir="${STATE_ROOT}/lock"

if [[ "$FORCE_RUN" != "--force" ]]; then
  # A short grace window avoids losing the report if cron wakes up a minute late.
  if (( weekday > 5 )) || (( current_minutes < target_minutes )) || (( current_minutes >= target_minutes + SUMMARY_WINDOW_MINUTES )); then
    exit 0
  fi

  if [[ -f "$last_run_stamp" ]] && [[ "$(<"$last_run_stamp")" == "$today" ]]; then
    exit 0
  fi
fi

if ! mkdir "$lock_dir" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$lock_dir"' EXIT

prompt_header=$(
  cat <<EOF
今天按 ${TZ_REGION} 统计，当前时间是 ${timestamp}。
请只总结 ${today} 这一天（从 ${today_start} 到 ${today_end}）在仓库 ${REPO_ROOT} 中完成的工作。

仓库背景：
- workspace: shared / backend / frontend
- 根命令：
  - pnpm run typecheck
  - pnpm run test

补充要求：
- 先看 git 证据，再决定是否查看具体 diff。
- 只有在确实需要时才运行校验命令，避免无意义重复。
- 最终答案直接输出为日报正文，不要包含前言或方法说明。
- 输出文字为中文

EOF
)

prompt_body="$(<"$PROMPT_TEMPLATE")"
full_prompt="${prompt_header}
${prompt_body}"

rm -f "$tmp_report_path"

print "[daily-summary] Running Codex for ${today} at ${timestamp}"

# `codex exec` is already non-interactive; current CLI versions do not accept approval flags here.
if ! printf '%s\n' "$full_prompt" | "$codex_bin" exec \
  --cd "$REPO_ROOT" \
  --sandbox workspace-write \
  --output-last-message "$tmp_report_path" \
  --color never \
  -; then
  rm -f "$tmp_report_path"
  print -u2 "[daily-summary] codex exec failed"
  exit 1
fi

if [[ ! -s "$tmp_report_path" ]]; then
  rm -f "$tmp_report_path"
  print -u2 "[daily-summary] codex exec produced no summary output"
  exit 1
fi

mv "$tmp_report_path" "$report_path"
print -r -- "$today" > "$last_run_stamp"
print "[daily-summary] Wrote ${report_path}"
