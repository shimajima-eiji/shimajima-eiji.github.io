#!/usr/bin/env bash
# ローカル CI: GitHub Actions の ci.yml と同じ検証をローカルで回す。
#
# 目的:
#   GHA が止まっている / 課金停止中でも、push 前に「壊れたものを送らない」状態を保つ。
#   ci.yml(.github/workflows/ci.yml) と同じ 2 ステップ(py_compile + validate.py)を実行する。
#
# 使い方:
#   bash scripts/ci-local.sh          # 単発実行
#   bash scripts/ci-local.sh --install-hook   # pre-push hook を入れて push 時に自動実行
#
# ci.yml を変更したら、このスクリプトの STEPS も合わせて更新すること。
set -euo pipefail

cd "$(dirname "$0")/.."

PY="${PYTHON:-python3}"
fail=0

run() {
  echo "── $1"
  shift
  if "$@"; then
    echo "   OK"
  else
    echo "   FAILED"
    fail=1
  fi
}

# ci.yml と同じ検証ステップ
run "Compile scripts (py_compile)" bash -c "$PY -m py_compile scripts/*.py"
run "Validate docs and generators" "$PY" scripts/validate.py

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "❌ ローカル CI 失敗。push しないこと。"
  exit 1
fi
echo ""
echo "✅ ローカル CI 通過。"

# --install-hook: pre-push hook を設置して push 時に自動でこの CI を回す
if [ "${1:-}" = "--install-hook" ]; then
  hook=".git/hooks/pre-push"
  cat > "$hook" <<'HOOK'
#!/usr/bin/env bash
# auto-installed by scripts/ci-local.sh --install-hook
exec bash "$(git rev-parse --show-toplevel)/scripts/ci-local.sh"
HOOK
  chmod +x "$hook"
  echo "📌 pre-push hook を設置: $hook (push 時に自動でローカル CI が走る)"
fi
