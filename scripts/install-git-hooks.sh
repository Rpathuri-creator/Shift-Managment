#!/bin/bash
# ─── install-git-hooks.sh ─────────────────────────────────────────────────────
# Run this once after cloning: bash scripts/install-git-hooks.sh

ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$ROOT/.git/hooks"
SCRIPTS_DIR="$ROOT/scripts/hooks"

echo "Installing git hooks..."

cp "$SCRIPTS_DIR/post-commit" "$HOOKS_DIR/post-commit"
cp "$SCRIPTS_DIR/pre-push"   "$HOOKS_DIR/pre-push"
chmod +x "$HOOKS_DIR/post-commit" "$HOOKS_DIR/pre-push"

echo "✅  Hooks installed:"
echo "    post-commit → pushes gas/ to Apps Script editor"
echo "    pre-push    → pushes + deploys gas/ to Apps Script"
echo ""
echo "Make sure clasp is logged in: clasp login"
