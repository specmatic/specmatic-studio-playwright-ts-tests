#!/bin/zsh
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VALIDATOR="/Users/anand.bagmar/.codex/skills/.system/skill-creator/scripts/quick_validate.py"

PYTHONPATH="$SKILL_DIR/vendor${PYTHONPATH:+:$PYTHONPATH}" \
python3 "$VALIDATOR" "$SKILL_DIR" "$@"
