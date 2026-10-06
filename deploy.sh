#!/bin/bash
set -euo pipefail

# Local-only docs (AGENTS.md, workflow.md): never pushed to GitHub.
# - Version history lives in ../will-local-docs.git (bare repo OUTSIDE this
#   working tree, so no branch's `git add .` can ever sweep it up).
# - They are backed up/restored around the gh-pages working-tree swap and
#   auto-snapshotted to the history repo at the end of every deploy.
KEEP_FILES="AGENTS.md workflow.md"
DOCS_GIT_DIR=../will-local-docs.git

cleanup() {
    rm -rf ../temp_gh_pages
    git checkout main 2>/dev/null || true
    # Restore docs AFTER returning to main — restoring while on gh-pages
    # would commit them to the public site (that branch has no .gitignore).
    local f
    for f in $KEEP_FILES; do
        [ -f "../$f.keep" ] && mv "../$f.keep" "$f"
    done
    # Auto-snapshot docs into the local history repo (commit is a no-op if
    # nothing changed). Never pushed anywhere.
    if [ -d "$DOCS_GIT_DIR" ]; then
        git --git-dir="$DOCS_GIT_DIR" --work-tree=. add -f $KEEP_FILES 2>/dev/null || true
        git --git-dir="$DOCS_GIT_DIR" --work-tree=. commit -q \
            -m "Docs snapshot $(date '+%Y-%m-%d %H:%M')" >/dev/null 2>&1 || true
    fi
}
trap cleanup EXIT

# Deploy to main branch
git checkout main
npm run build

read -p "Enter commit message for the main branch: " commit_message

git add .
git commit -m "$commit_message"
git push origin main

# Deploy to gh-pages branch
mkdir -p ../temp_gh_pages
cp -r dist/* ../temp_gh_pages/

# Preserve local-only docs across the working-tree swap below
for f in $KEEP_FILES; do
    [ -f "$f" ] && cp "$f" "../$f.keep" || true
done

git checkout gh-pages

# Wipe the working tree INCLUDING dot-directories — `rm -rf ./*` misses
# dotfiles (e.g. .vite/), which then leak into the gh-pages commit
find . -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# Copy the built files to the gh-pages branch
cp -r ../temp_gh_pages/* .

read -p "Do you want to push to gh-pages? (y/n): " confirm_push

if [[ "$confirm_push" == "y" || "$confirm_push" == "Y" ]]; then
    git add .
    git commit -m "Deploy to gh-pages"
    git push origin gh-pages
else
    echo "Skipping push to gh-pages."
fi
