#!/usr/bin/env bash
# Deploy: fast-forward master to primer-research and push to origin.
# Prod serves this working tree directly, so file changes are already live;
# this script makes the deployment official (tests, master, origin, verify).
# Run: bash /path/to/astra-rising/planning/deploy-prod.sh
set -u
cd /path/to/astra-rising || exit 1

T0=$(date +%s)
ok()   { echo "[$1/5] [OK] $2"; }
fail() { echo "[$1/5] [FAIL] $2"; exit 1; }

echo "[1/5] Checking working tree is clean"
[ -z "$(git status --porcelain)" ] || fail 1 "uncommitted changes present; commit or stash first"
ok 1 "clean"

echo "[2/5] Running test suite"
npm test >/tmp/deploy-test.log 2>&1 || { tail -20 /tmp/deploy-test.log; fail 2 "tests failed (full log: /tmp/deploy-test.log)"; }
ok 2 "all tests passed"

echo "[3/5] Rebuilding generated assets (CSS + icon bundle)"
npm run build:css >/dev/null 2>&1 || fail 3 "CSS build failed"
node planning/slim-lucide.js >/dev/null 2>&1 || fail 3 "icon bundle build failed"
[ -z "$(git status --porcelain)" ] || fail 3 "rebuild changed files; review and commit them, then rerun"
ok 3 "generated assets match committed versions"

echo "[4/5] Fast-forwarding master to primer-research"
git fetch . primer-research:master 2>/dev/null || fail 4 "master cannot fast-forward; merge manually"
ok 4 "master -> $(git rev-parse --short master)"

echo "[5/5] Pushing to origin and verifying live site"
git push origin master >/dev/null 2>&1 || fail 5 "git push failed"
CODE=$(curl -so /dev/null -w '%{http_code}' --max-time 15 https://astrarising.com/)
ENC=$(curl -sI -H 'Accept-Encoding: gzip' --max-time 15 https://astrarising.com/app.js | grep -ci 'content-encoding: gzip')
CSS=$(curl -so /dev/null -w '%{http_code}' --max-time 15 https://astrarising.com/app.css)
[ "$CODE" = "200" ] || fail 5 "site returned HTTP $CODE"
[ "$ENC" -ge 1 ] || fail 5 "gzip not active on app.js"
[ "$CSS" = "200" ] || fail 5 "app.css not served (HTTP $CSS)"
ok 5 "live: HTTP 200, gzip on, stylesheet served"

echo "Pushed to main: https://github.com/kgsubs/astra-rising"
echo "Done in $(( $(date +%s) - T0 ))s"
