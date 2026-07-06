#!/bin/zsh

set -euo pipefail

SCRIPT_DIR=${0:A:h}
REPO_ROOT=${SCRIPT_DIR:h}
RUNNER="${SCRIPT_DIR}/run-codex-daily-summary.sh"
SUMMARY_ROOT="${SUMMARY_ROOT:-/Users/sijin.kuang/obs/learn/mini-dify}"
CRON_LOG="${SUMMARY_ROOT}/.codex-daily-summary/logs/cron.log"
BEGIN_MARKER="# >>> mini-dify codex daily summary >>>"
END_MARKER="# <<< mini-dify codex daily summary <<<"

mkdir -p "${SUMMARY_ROOT}/.codex-daily-summary/logs"

if [[ ! -f "$RUNNER" ]]; then
  print -u2 "Runner script not found: $RUNNER"
  exit 1
fi

managed_block=$(
  cat <<EOF
${BEGIN_MARKER}
* * * * * /bin/zsh "$RUNNER" >> "$CRON_LOG" 2>&1
${END_MARKER}
EOF
)

existing_crontab="$(crontab -l 2>/dev/null || true)"
cleaned_crontab="$(printf '%s\n' "$existing_crontab" | awk -v begin="$BEGIN_MARKER" -v end="$END_MARKER" '
  $0 == begin { skip = 1; next }
  $0 == end { skip = 0; next }
  skip != 1 { print }
')"

new_crontab="$cleaned_crontab"
if [[ -n "$new_crontab" && "$new_crontab" != *$'\n' ]]; then
  new_crontab="${new_crontab}"$'\n'
fi
new_crontab="${new_crontab}${managed_block}"$'\n'

printf '%s' "$new_crontab" | crontab -

print "Installed cron job."
print "Schedule check: every minute; the runner only executes at 17:55 Monday-Friday in Asia/Shanghai."
print "Runner: $RUNNER"
print "Cron log: $CRON_LOG"
print "Report directory: $SUMMARY_ROOT"
print "Manual test: /bin/zsh $RUNNER --force"
