#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
exec python3 "$repo_root/tools/oracle/phreeqc/install_ci.py" --repo-root "$repo_root"
