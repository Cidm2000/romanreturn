# Lane routing

<!-- GENERATED from kernel/routing.json by agentos sync. Do not edit: edit the JSON
     in Agent OS and re-sync, or the invariant tests and this file disagree. -->

**The rule:** route through every judgment lane whose answer could materially change
the result, and no lane whose answer cannot. Do not wait to be told to use one.

In a tool with subagents, dispatch these lanes. In a tool without them, read the
matching file in `.agents/lanes/` and answer its questions in your own reasoning
before implementing. The judgment is the requirement; the subagent is one way to get it.

## Lanes

| Lane | Kind | Writes | Owns |
|---|---|---|---|
| `mission-control` | portfolio | portfolio/, docs/portfolio/ | portfolio goals, which repository should own the work, capability reuse across repositories, duplication, sequencing, bottlenecks, the full action space beyond building, and the opportunity ledger |
| `strategist` | framing | docs/product/, docs/mission/ | what the request is really for, the possible routes, which mechanisms to reject, where authoritative evidence lives, the minimum complete solution, and the MISSION handed to the coordinator |
| `product` | judgment | docs/product/ | intended user outcome, jobs-to-be-done, workflow, current workaround, friction, scope, success signal, what deliberately should not be built |
| `cso` | judgment | docs/strategy/ | do it at all, which bet, sequencing, competitive position, the not-doing list |
| `cfo` | judgment | docs/finance/ | unit economics, pricing economics, budgets, ROI, infrastructure cost |
| `cto` | judgment | docs/engineering/ | architecture, build-vs-buy, technical risk, feasibility, what breaks at 10x |
| `ciso` | judgment | none | security review, threat model, secrets, data handling, deploy gate |
| `cmo` | judgment | docs/marketing/ | positioning, naming, copy, GTM, campaigns, CRO, SEO |
| `editor` | judgment | docs/editorial/ | structural, line and copy editing, house style, fact discipline |
| `designer` | craft | none | UI/UX critique and a buildable SPEC, hierarchy, type, tokens, states, accessibility |
| `frontend` | builder | owned files | builds the interface from a SPEC or design system |
| `implementer` | builder | owned files | one narrow non-UI build task under the eight-field brief |
| `qa` | gate | none | runs the product and observes real behaviour against what was claimed |
| `reviewer` | gate | none | architecture / diff / plan review |

## Rules

| When the work involves | Route | Why |
|---|---|---|
| substantial | `mission-control` | no repository may act as if it were the only one: reuse, ownership and the wider action space are decided before a goal is framed |
| substantial | `strategist` | substantial work is framed before it is coordinated; the coordinator must never receive the raw request as its only brief |
| visible | `product`, `designer`, `frontend`, `qa` | a visible change is a product and craft decision before it is a code change; nobody has looked at it until QA does |
| visible + market | `cmo` | words on the surface carry the persuasion |
| backend | `implementer`, `reviewer` | non-UI implementation with a diff worth reading |
| backend + visible | `product` | the capability changes a user workflow |
| architecture | `cto`, `reviewer` | structure decided before build, read after it |
| named_mechanism + backend | `cto` | adopting a named technology is a build-vs-buy decision, not an implementation detail: prove the bottleneck before buying the cure |
| reuse_risk | `cto` | a second store, service or copy is an architecture decision; consolidation is checked before it is created |
| security | `ciso` | a trust boundary is moving |
| money | `product`, `cfo`, `cmo` | what it is worth, what it costs, how it is presented |
| strategy | `cso`, `product` | which bet, and what it means for the user |
| market | `cmo` | market-facing judgment |
| editorial | `editor` | a draft needs editing, not rewriting |
| integrity | `cto`, `reviewer` | provenance and reproducibility are architecture, not preference |
| bug | `implementer`, `qa` | the relevant builder, then someone who runs it |

## Invariants

- **portfolio-before-framing** — `substantial => lanes begins with mission-control then strategist` — a project that cannot see the portfolio rebuilds what already exists
- **strategist-on-substantial** — `substantial => lanes begins with strategist` — the builder must never be the component that decides what the user meant
- **qa-on-visible** — `visible => lanes includes qa` — if nobody renders it, it is not finished
- **no-lone-implementer** — `visible => lanes excludes bare implementer` — the generic implementer builds correctly and designs nothing
- **reviewer-on-structure** — `architecture => lanes includes reviewer`
- **ciso-on-security** — `security => lanes includes ciso`
- **no-theatre-on-trivial** — `trivial => no judgment lanes` — a typo does not convene an executive team
- **hard-stop-surfaces** — `irreversible => hard_stop is raised, never executed`
- **no-strategist-on-trivial** — `trivial => lanes excludes strategist` — overhead on small work is its own failure
- **no-portfolio-ceremony-on-trivial** — `trivial => lanes excludes mission-control`

## Repository classes

| Class | Prefer | Avoid | Note |
|---|---|---|---|
| PRODUCT | product, designer, frontend, qa | — | visible outcome matters |
| STATIC_SITE | designer, frontend, qa | cto | no framework may be introduced to standardise |
| INFRASTRUCTURE | cto, implementer, reviewer | cmo, designer | operational boundaries over product overhead |
| TOOLING | cto, implementer, reviewer | cmo |  |
| RESEARCH | cto, reviewer | cmo, cfo | provenance, reproducibility, rights and data integrity stay binding |
| DATA | cto, implementer, reviewer, ciso | — |  |
| EDITORIAL | editor, product | — | source and provenance constraints stay binding |
| CONTENT | editor, designer | — |  |
| AUTOMATION | implementer, reviewer | cmo, designer |  |
| EXPERIMENTAL | implementer | — |  |
| DORMANT | — | — |  |

Check a request against this table deterministically:

```bash
node "$AGENT_OS_HOME/scripts/route.mjs" "<the request>" --class <class>
```
