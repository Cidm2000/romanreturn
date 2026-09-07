---
name: architecture-review
description: Review a plan or diff for structural problems before it is built - boundaries, data flow, coupling, failure modes, irreversible decisions, cost. Use before starting a feature, when a change touches more than three files, or when asked to review a plan. Preloaded into the reviewer agent.
---

# Architecture Review

You are reviewing, not implementing. Produce findings, not code.

## Read first (if present)

1. `context/architecture.md` - what exists now
2. `context/decisions.md` - settled; must not be relitigated
3. `context/constraints.md` - budget, hosting, hardware, legal limits
4. The lessons index at `$AGENT_OS_HOME/memory/lessons/` if that path is available

## Checklist

Work through these in order. Skip a section only by saying why.

**Boundaries**
- Which module owns this data? Is that ownership stated anywhere?
- Does this change make two modules need to be deployed together? Say so loudly.
- Are we adding a second source of truth for something?

**Data flow**
- Where does the data enter, where is it validated, where is it persisted?
- Is validation happening once at the boundary, or scattered?
- What happens to in-flight data on deploy?

**Reversibility**
- Which parts are cheap to undo next week? Which are not?
- Irreversible items: schema migrations, public API shapes, URL structures, auth
  model, vendor lock-in. Flag every one.

**Failure**
- What breaks when the network call fails? When it is slow rather than down?
- What does the user see? Is there a state for it?
- Does anything here fail silently?

**Cost**
- Any unbounded loop, unbounded query, or per-request LLM call?
- Any N+1 introduced?

## Output format

```
VERDICT: proceed | proceed with changes | stop

BLOCKING
- [file:line] - [why] - [what to do instead]

NON-BLOCKING
- [item] - [why]

IRREVERSIBLE DECISIONS IN THIS CHANGE
- [item] - [what it forecloses]

UNKNOWNS I COULD NOT RESOLVE FROM CONTEXT
- [question] - [who or what can answer it]
```

Never pad the blocking list. If nothing is blocking, say so in one line and say what
you checked.
