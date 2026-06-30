#!/bin/bash
set -euo pipefail

# Cleanup function: remove temp files and return to main branch
cleanup() {
    rm -rf ../temp_gh_pages
    git checkout main 2>/dev/null || true
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

git checkout gh-pages

# Clean up the current gh-pages directory (keep .git)
rm -rf ./* 2>/dev/null || true

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
