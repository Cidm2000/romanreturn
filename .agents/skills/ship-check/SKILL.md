---
name: ship-check
description: Pre-launch verification for a website or web app - runs the deterministic preflight script, then walks the manual checklist. Use before any deploy to production, or when asked whether something is ready to ship.
allowed-tools:
  - Bash(bash "${CLAUDE_PLUGIN_ROOT}/skills/ship-check/scripts/preflight.sh")
  - Bash(bash "${CLAUDE_PLUGIN_ROOT}/skills/ship-check/scripts/preflight.sh" *)
  - PowerShell(bash "${CLAUDE_PLUGIN_ROOT}/skills/ship-check/scripts/preflight.sh")
---

# Ship Check

Two halves. Run the script first. Do not do by hand what the script already does.

## 1. Automated

**Use the `Bash` tool for this command - not `PowerShell`.** (The Bash tool is Git Bash
on Windows; the command below is pre-approved only for the Bash tool.) Run exactly:

```bash
bash "${CLAUDE_PLUGIN_ROOT}/skills/ship-check/scripts/preflight.sh"
```

If the Bash tool is genuinely unavailable and you must use PowerShell, the same
command works there only when Git's `bin` folder is on PATH (`agentos doctor` says so);
otherwise read the script and perform its checks by hand, saying so.

Report the output verbatim. Do not summarise failures away. A `SKIP` is not a pass -
say what was skipped and why. If the script cannot run at all, read it and perform its
checks by hand, saying so.

## 2. Manual

Only these, and only the ones the script cannot cover:

**Content**
- [ ] No lorem ipsum, no `TODO`, no placeholder image anywhere in the build output
- [ ] Every route has a unique `<title>` and meta description
- [ ] OG image renders correctly at 1200x630
- [ ] Favicon set, including the 180px apple-touch icon

**Behaviour**
- [ ] Every form submits, and shows something on both success and failure
- [ ] Every external link opens correctly and is not a 404
- [ ] Back button works after any client-side navigation
- [ ] Page works with JavaScript disabled, or degrades to a stated message

**Accessibility**
- [ ] Tab through the whole page - focus is always visible and order is sane
- [ ] All images have alt text, decorative ones have `alt=""`
- [ ] Contrast passes at 4.5:1 for body text
- [ ] Zoom to 200% - nothing is clipped or overlapping

**Responsive**
- [ ] 360px, 768px, 1440px - no horizontal scroll at any of them
- [ ] Touch targets at least 44x44px

**Operational**
- [ ] Env vars set in the deploy target, not just locally
- [ ] Analytics or error reporting actually receiving events
- [ ] `robots.txt` and `sitemap.xml` present and correct
- [ ] 404 page exists and is styled

## 3. Record

Anything that failed goes into the journal via `/agent-os-core:journal` so it can
become a lesson, and eventually a new line in the preflight script. A manual check
that fails twice should be automated.
