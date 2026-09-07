---
name: outcome-gate
description: The strategist procedure and the four gates that run before any substantive implementation - preserve what works, reconstruct the real outcome behind the request, compare five approaches before building new machinery, and route the judgment lanes that could change the result. Use at the start of ANY feature, refactor, redesign, bug beyond a one-liner, or vague instruction such as "make X easier", "add reporting", "fix the experience", "build this" - and whenever a request names a mechanism (a library, a database, a cache, a rewrite) rather than an outcome. Also use before answering "should we build X", before any research task, and whenever you must decide where authoritative evidence lives rather than searching generically. Produces a MISSION brief. This is a working procedure, not a document to show the user.
---

# The gates

This is the strategist's procedure, written so it runs anywhere: as the
`strategist` subagent, as the main session's own reasoning, or as a checklist for a
tool with no subagents at all. The judgment is the requirement; a subagent is only
one way to get it.

```
OWNER -> STRATEGIST -> COORDINATOR -> JUDGMENT LANES -> BUILDERS -> QA / REVIEW
```

Run these before substantive implementation or orchestration. They exist because the
same four failures keep happening: the literal wording gets executed instead of the
intended result; working behaviour is regenerated instead of preserved; new machinery
is invented where reuse would do; and the judgment that would have changed the answer
never happens because nobody asked for it by name.

On a small task each gate is one line. **None may be skipped.** None of them is
output: they are how you decide, not what you report. Do not print the card, do not
narrate the comparison, do not list the lanes you considered. Report the decisions,
under the report's own format.

## Gate 1 - PRESERVE

Read the state file (`.agent/STATE.md`, or whatever `AGENTS.md` names) and the code
around the goal, before the first edit.

Write down a **PROTECTED list**: what works today and must still work when you finish.
Include anything the user relies on, anything with a passing test, and anything the
project's own rules call binding. Carry the list verbatim into every builder brief and
check it again at the end.

Then: is there work already in progress here? Continue it. Restarting something
half-built because it is easier to reason about a blank file is the most expensive
mistake available.

## Gate 2 - OUTCOME

Fill this from the repository. The user has already said everything they intend to;
the answers are in the code, the docs, the tests and the state file.

```
OUTCOME CARD
Literal request:              <their words>
Real outcome:                 <what they are actually trying to make true>
End user:                     <which person, specifically - "users" is not an answer>
Moment of use:                <where they are and what they just did>
Current workaround:           <what they do today instead - the most informative fact available>
What happens immediately after:<the next thing that person does>
Success signal:               <the one observable result that proves it landed>
Silent failure:               <how this ships, passes every check, and still fails them>
Protected existing behaviour: <from gate 1>
Assumptions:                  <what you are deciding without confirmation>
Hard stops:                   <what in this task the owner must decide>
```

Then answer, explicitly:

> **Does the requested mechanism actually achieve the outcome? YES / PARTLY / NO.**

- **YES** - proceed to gate 3.
- **PARTLY / NO** - determine the better *reversible* implementation and build that
  instead. Say so in one line in the report, with what you built and why. You are not
  asking permission; you are stating a judgment. This is the whole point of the gate,
  so do not soften a NO into a YES because the request was confidently worded.

Where the answer could materially change what gets built, dispatch the `product` lane
rather than deciding alone. Where it plainly could not, decide and move.

## Gate 3 - COMPARE, and find the best evidence

### The routes

Generate them before choosing one. Search the repo and the current stack **before**
inventing anything.

| | |
|---|---|
| **A. Direct** | build what was asked, as asked |
| **B. Simpler** | the same outcome with less machinery |
| **C. Reuse / composition** | something in this repo or this stack already does most of it |
| **D. No-build** | configuration, consolidation, deletion, or documenting what already exists |
| **E. Outcome substitution** | a different mechanism reaches the same outcome - often a better default, a copy change, or removing a decision the user should never have faced |
| **F. External capability** | an existing tool, API, service or dataset already does this |
| **G. Manual-process removal** | the real win is deleting a step, not automating it |

C, D and G are the routes that get skipped, and they are the ones that most often win.

**Reject weak mechanisms out loud.** A named technology is a hypothesis about a cause,
not a specification. Asked for a cache, establish what is actually slow. Asked for a
second store, establish why the first cannot hold it. The rejected list is part of the
output, not a private deliberation.

**The decision rule:**

> Among approaches that fully achieve the outcome, choose the one with the fewest new
> concepts, moving parts, dependencies, failure modes, user burdens, maintenance
> burdens, sensitive-data surfaces and irreversible commitments.

Fully achieve is not negotiable - a simpler option that leaves the outcome half-true
loses to a larger one that completes it. Cleverness is not a tiebreaker. Record the
choice; it becomes **WHY THIS APPROACH** in every builder brief. If C, D or G wins,
build nothing and say so: a run that correctly removes the task is a successful run.

### Where the evidence comes from

Before researching anything, ask: **what would an actual expert in this domain consult
first?** Then start at the highest tier that can answer, not the one easiest to reach.

```
1  primary / official          the thing itself: the code, the schema, the tests, the
                               running product, filings, registries, official statistics
2  specialist domain source    the database or publication practitioners actually use
3  peer-reviewed / institutional
4  high-quality trade / professional
5  structured data / API / registry
6  practitioner or community evidence, where discourse IS the evidence
7  generic summary
```

- A generic encyclopedia or web result is a **discovery map, never the endpoint**, when
  a domain-native source exists. Use it to find the tier-1 source, then go there.
- **Inside a repository, tier 1 is the code, the schema, the tests and the running
  product** - not the documentation about them. Documentation is a claim; the code is
  the fact. When they disagree, the code wins and the documentation is a finding.
- Name the tier of anything you rely on, and say when you could only reach a low one.
- Anything you cannot source is `[needs-research: <what, and where it lives>]`, never a
  confident summary in its place.

Domain maps live in `kernel/sources.json`, rendered to `.agents/sources.md`. If the
domain is not there, build the map - name the kinds of source an expert would use, in
tier order - and record it so it can be promoted.

## Gate 4 - ROUTE

**Route through every judgment lane whose answer could materially change the result,
and no lane whose answer cannot.** Do not wait for the user to name a lane.

The rules are machine-readable and pinned by tests - `kernel/routing.json` in Agent
OS, rendered to `.agents/routing.md` in a synced project. Run it when unsure:

```bash
node "$AGENT_OS_HOME/scripts/route.mjs" "<the request>" --class <repo class>
```

The invariants hold whether or not you run it:

- **visible or interactive** -> product, designer, frontend, QA - never the generic
  implementer alone;
- **QA is mandatory** on anything a person sees or clicks. If nobody opened it, it is
  not finished;
- **architecture** -> CTO before the build, reviewer after it;
- **security, auth, user data, uploads, payments, any trust boundary** -> CISO,
  automatically;
- **pricing** -> product, CFO, CMO; add CSO when positioning moves;
- **a named technology** ("add Redis") is a hypothesis about a cause, not a spec -
  prove the bottleneck, then route CTO for build-vs-buy;
- **a second store, service, queue or copy** -> CTO, and the reuse question first;
- **trivial** -> nobody. A typo does not convene an executive team.

**Route the model tier too, and never ask which model to use.** Cheap and local for
inventory, extraction, summarising, clustering, log and test triage and repetitive
mechanical edits; the strongest available tier for this framing, for architecture,
security and design judgment, and for reconciling conflicting results. Local is a
compute tier, not a trust tier - verify its output like any other. If a tier is
unavailable or its output fails verification, escalate and continue. The table is
`.agents/models.md`; a project rule that nothing leaves the machine overrides all of
it, and the limitation is reported rather than worked around.

In a session with no subagent mechanism, the lanes are still mandatory: read the lane
files under `.agents/lanes/` and answer each one's questions in your own reasoning
before implementing. The judgment is the requirement; the subagent is only one way to
get it.

## The handoff - the MISSION

When a coordinator or another agent will act on this, the gates end in one artefact.
Never hand on the raw request: a coordinator that receives "make it better" has been
given your job to do.

```
MISSION
OUTCOME:                 <what the end user can do afterwards that they cannot now>
SUCCESS SIGNAL:          <the one observable result that proves it landed>
SILENT FAILURE:          <how this ships, passes every check, and still fails them>
CURRENT STATE:           <what exists today, read from the repo>
PROTECTED:               <what works today and must not regress>
BEST APPROACH:           <the route chosen, A-G>
WHY THIS APPROACH:       <against the decision rule>
ALTERNATIVES CONSIDERED: <the routes generated>
ALTERNATIVES REJECTED:   <each with its reason - especially any mechanism the owner named>
AUTHORITATIVE SOURCES / WHERE TO LOOK: <tiered; or "in-repo only">
REQUIRED JUDGMENT LANES: <only lanes whose answer could change the result>
DO NOT BUILD:            <deliberately out of scope>
HARD STOPS:              <what in this task the owner must decide>
DEFINITION OF DONE:      <observable outcome, never "it compiles">
```

## After the build - the outcome test

The gate is not finished when the code is. Reopen the card and answer:

1. Is the **Real Outcome** now true?
2. Is the **Success Signal** observable - did you look at it?
3. Did anything on **PROTECTED** regress?
4. Would a real user still have to do avoidable manual or technical work?
5. Did we implement the mechanism, or solve the problem?

Anything found here that is safe and inside the goal is **fixed now**, in this run.
Returning "everything is done except X, Y and Z" when X, Y and Z were yours to fix
turns the user into your task manager, which is the failure this whole system exists
to prevent.
