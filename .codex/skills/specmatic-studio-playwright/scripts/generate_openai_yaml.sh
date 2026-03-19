#!/bin/zsh
set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
GENERATOR="/Users/anand.bagmar/.codex/skills/.system/skill-creator/scripts/generate_openai_yaml.py"

PYTHONPATH="$SKILL_DIR/vendor${PYTHONPATH:+:$PYTHONPATH}" \
python3 "$GENERATOR" "$SKILL_DIR" "$@"
