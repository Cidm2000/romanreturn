# Execution tiers

<!-- GENERATED from kernel/models.json by agentos sync. Do not edit here. -->

Route the tier automatically. **Never stop to ask the owner which model to use.**

| Tier | What | Good for |
|---|---|---|
| `local` | models on this machine (Ollama and friends) | repo inventory, classification, large-file summarisation, candidate extraction, clustering, log and test triage, portfolio-memory retrieval, repetitive mechanical edits |
| `hosted` | routine hosted coding and review capacity | well-specified implementation, mechanical refactors, test writing |
| `frontier` | the strongest available reasoning model | outcome framing, possibility search, source selection, architecture, security, design critique, reconciliation of conflicting judgments |

**Use the local tier when:**

- the input is large but the risk is low
- the task is extractive or classificatory rather than judgmental
- the output is cheap to verify mechanically
- a mistake is cheap and reversible
- the material must not leave the machine

**Use the frontier tier when:**

- the judgment materially changes what gets built
- security, privacy or trust-boundary architecture is involved
- ambiguity is high and the request names a mechanism rather than an outcome
- several trade-offs must be reconciled against each other
- the result is hard to verify mechanically

## Default tier per lane

| Lane / job | Tier |
|---|---|
| `mission-control` | frontier |
| `strategist` | frontier |
| `product` | frontier |
| `cso` | frontier |
| `cto` | frontier |
| `ciso` | frontier |
| `cfo` | frontier |
| `cmo` | frontier |
| `designer` | frontier |
| `editor` | frontier |
| `reviewer` | frontier |
| `frontend` | hosted |
| `implementer` | hosted |
| `qa` | hosted |
| `journal` | local |
| `distill` | local |
| `inventory` | local |
| `retrieval` | local |

## Rules

- Route automatically from the table. Never stop to ask the owner which model to use.
- Local is a compute tier, not a trust tier. 'Ran locally' never means 'trusted without checking'.
- Escalate on failure: if the local tier is unavailable or its output fails verification, move up a tier and continue. Never stall waiting for a tier.
- The strategist's final call - what the user actually needs, which approach wins, which evidence matters - stays at the strongest available tier unless a project policy forbids external use, in which case say so and proceed locally.
- A project whose rules say nothing leaves the machine overrides every line above: local only, and the limitation is reported, not worked around.
