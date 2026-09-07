#!/usr/bin/env bash
# Preflight checks for a web project. Deterministic, zero-token.
# Every check that lives here is one the model no longer has to remember.
# Add a line whenever a manual check fails twice.
#
# Exit 0 = all automated checks passed (SKIPs are reported, never counted as passes).
# Exit 1 = at least one FAIL.

set -uo pipefail
FAIL=0
pass() { printf '  \033[32mPASS\033[0m  %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAIL=1; }
skip() { printf '  \033[33mSKIP\033[0m  %s\n' "$1"; }

LOG_DIR="${TMPDIR:-/tmp}"
PY="$(command -v python3 || command -v python || true)"

echo "preflight: $(pwd)"
echo

# --- source hygiene ---------------------------------------------------------
SRC_DIRS=$(ls -d src app pages components lib 2>/dev/null | tr '\n' ' ')
if [ -n "$SRC_DIRS" ]; then
  # shellcheck disable=SC2086  # word-splitting is intended
  if grep -rIlE 'lorem ipsum|LOREM IPSUM' $SRC_DIRS >/dev/null 2>&1; then
    fail "placeholder text found: $(grep -rIlE 'lorem ipsum' $SRC_DIRS 2>/dev/null | head -5 | tr '\n' ' ')"
  else
    pass "no placeholder text"
  fi

  if grep -rInE '(TODO|FIXME|XXX|HACK):' $SRC_DIRS >/dev/null 2>&1; then
    N=$(grep -rInE '(TODO|FIXME|XXX|HACK):' $SRC_DIRS 2>/dev/null | wc -l | tr -d ' ')
    fail "$N TODO/FIXME markers still in source"
  else
    pass "no TODO/FIXME markers"
  fi

  if grep -rInE '(sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|ghp_[A-Za-z0-9]{30,})' $SRC_DIRS >/dev/null 2>&1; then
    fail "possible hardcoded secret in source - inspect immediately"
  else
    pass "no obvious hardcoded secrets"
  fi

  if grep -rInE 'console\.log\(' $SRC_DIRS >/dev/null 2>&1; then
    N=$(grep -rInE 'console\.log\(' $SRC_DIRS 2>/dev/null | wc -l | tr -d ' ')
    fail "$N console.log calls left in source"
  else
    pass "no stray console.log"
  fi
else
  skip "no recognised source directory (src app pages components lib)"
fi

# --- required files ---------------------------------------------------------
for f in .gitignore README.md; do
  [ -f "$f" ] && pass "$f present" || fail "$f missing"
done

ROBOTS=0
for f in public/robots.txt static/robots.txt robots.txt; do
  [ -f "$f" ] && { ROBOTS=1; break; }
done
[ "$ROBOTS" = "1" ] && pass "robots.txt present" || fail "robots.txt missing"

SITEMAP=0
for f in public/sitemap.xml static/sitemap.xml sitemap.xml; do
  [ -f "$f" ] && { SITEMAP=1; break; }
done
if [ "$SITEMAP" = "1" ]; then
  pass "sitemap.xml present"
elif grep -q 'sitemap' package.json 2>/dev/null; then
  skip "no static sitemap.xml but package.json mentions sitemap - check it is generated at build"
else
  fail "sitemap.xml missing"
fi

# --- env safety -------------------------------------------------------------
if [ -f .gitignore ]; then
  grep -qE '^\.env(\*|\.\*|$)' .gitignore && pass ".env is gitignored" || fail ".env NOT in .gitignore"
fi
if git rev-parse --git-dir >/dev/null 2>&1; then
  if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    fail ".env is COMMITTED to git - rotate those keys now"
  else
    pass ".env not tracked by git"
  fi
fi
if [ -f .env ] && [ ! -f .env.example ]; then
  fail ".env exists but .env.example does not - deploy target will be missing vars"
fi

# --- build ------------------------------------------------------------------
if [ -f package.json ]; then
  if grep -q '"build"' package.json; then
    echo "  ....  running build"
    if npm run build >"$LOG_DIR/preflight-build.log" 2>&1; then
      pass "build succeeds"
    else
      fail "build FAILED - see $LOG_DIR/preflight-build.log"
      tail -20 "$LOG_DIR/preflight-build.log" | sed 's/^/        /'
    fi
  else
    skip "no build script"
  fi

  if grep -q '"test"' package.json; then
    if npm test --silent >"$LOG_DIR/preflight-test.log" 2>&1; then
      pass "tests pass"
    else
      fail "tests FAILED - see $LOG_DIR/preflight-test.log"
    fi
  else
    skip "no test script"
  fi

  # npm audit: only meaningful with a lockfile, a network, and a JSON parser.
  # A check that could not run is a SKIP, never a PASS.
  if ! command -v npm >/dev/null 2>&1; then
    skip "npm not on PATH - audit not run"
  elif [ ! -f package-lock.json ] && [ ! -f npm-shrinkwrap.json ]; then
    skip "no package-lock.json - npm audit needs a lockfile"
  elif [ -z "$PY" ]; then
    skip "no python on PATH to parse the audit report"
  else
    npm audit --audit-level=high --json >"$LOG_DIR/preflight-audit.json" 2>/dev/null
    N=$("$PY" -c 'import sys,json
try:
    d=json.load(open(sys.argv[1]))
    m=d.get("metadata",{}).get("vulnerabilities")
    print(-1 if m is None else int(m.get("high",0))+int(m.get("critical",0)))
except Exception:
    print(-1)' "$LOG_DIR/preflight-audit.json" 2>/dev/null | tr -d '\r\n ')
    case "$N" in
      0)   pass "no high/critical npm vulnerabilities" ;;
      -1|"") skip "npm audit did not return a report (offline? registry error?) - see $LOG_DIR/preflight-audit.json" ;;
      *)   fail "$N high/critical npm vulnerabilities" ;;
    esac
  fi
else
  skip "no package.json"
fi

echo
if [ "$FAIL" = "0" ]; then
  printf '\033[32mpreflight: all automated checks passed\033[0m - SKIPs above still need a human; now do the manual list\n'
else
  printf '\033[31mpreflight: FAILURES above - do not deploy\033[0m\n'
fi
exit $FAIL
