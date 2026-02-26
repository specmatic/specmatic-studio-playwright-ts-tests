#!/bin/bash
# Restart docker containers by stopping and then starting them

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"$SCRIPT_DIR/stop-docker.sh"
"$SCRIPT_DIR/start-docker.sh"
