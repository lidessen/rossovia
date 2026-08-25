#!/bin/sh

set -eu

item=${1:-}
case "$item" in
  A|B|C|D|E) ;;
  *) echo "usage: $0 A|B|C|D|E" >&2; exit 2 ;;
esac

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_root=$(dirname -- "$script_dir")
input_dir="$project_root/evals/skill-evaluation/inputs/planning-inbox-round-3"
run_dir="$project_root/evals/skill-evaluation/runs/planning-inbox-round-3"
log_dir="$run_dir/logs"

mkdir -p "$log_dir" "/tmp/skills-pi-r3-$item-old" "/tmp/skills-pi-r3-$item-new"

run_arm() {
  arm=$1
  input="$input_dir/$item-$arm.md"
  output="$run_dir/$item-$arm.md"
  events="$log_dir/$item-$arm.jsonl"
  errors="$log_dir/$item-$arm.stderr.log"
  eval_root="/tmp/skills-pi-r3-$item-$arm"

  if [ -e "$output" ] || [ -e "$events" ]; then
    echo "$item $arm output already exists; refusing to overwrite" >&2
    return 3
  fi

  echo "starting $item $arm"
  codex exec \
    --model gpt-5.6-luna \
    -c 'model_reasoning_effort="high"' \
    --ephemeral \
    --ignore-user-config \
    --ignore-rules \
    --sandbox read-only \
    --skip-git-repo-check \
    --color never \
    --json \
    -C "$eval_root" \
    -o "$output" \
    - < "$input" > "$events" 2> "$errors"

  test -s "$output"
  test -s "$events"
  rg -q '"type":"turn.completed"' "$events"
  echo "completed $item $arm"
  shasum -a 256 "$input" "$output" "$events" "$errors"
}

run_arm old &
old_pid=$!
run_arm new &
new_pid=$!

old_status=0
new_status=0
wait "$old_pid" || old_status=$?
wait "$new_pid" || new_status=$?

if [ "$old_status" -ne 0 ] || [ "$new_status" -ne 0 ]; then
  echo "$item failed: old=$old_status new=$new_status" >&2
  exit 1
fi

echo "$item pair complete"
