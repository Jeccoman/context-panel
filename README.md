# Context

Context stops teams from solving the same problem twice.

Open any Jira issue and Context shows:

- **Similar work already in progress.** It's flagged first, so two people don't fix the same thing.
- **Solved before.** Past resolved issues that describe the same problem, each with a match score and how it ended, taken from its last comment.
- **Who knows this area.** The people who resolved related issues.

The same knowledge is available in three places:

| Where | What |
|---|---|
| Jira issue panel | The panel above, on every issue |
| Rovo agent "Context" | Ask "Has this been solved before?" or "Who knows M-Pesa refunds?" in Rovo chat. The agent decides which candidates really match, explains the old fix, and says what to check first. |
| MCP server | The same three tools for Claude Code, Cursor or any MCP client, so a coding agent pulls team history before it starts work |

## How matching works

Matching runs inside Forge and needs no external AI service or API key.

1. **Find candidates.**
   - Search Jira text for the issue's key terms, plus their synonyms from a support vocabulary of about 45 concept groups. For example, waybill = label, billed = charged, signed out = logged out, and M-Pesa = mobile money.
   - Also include resolved issues in the same component.
2. **Rank the candidates.** Each candidate gets an IDF-weighted overlap score over words and concepts. Summary words count three times as much as description words. Shared components, labels and project add a small boost.
3. **Add context.** Read the latest comments of the top matches to show how each one ended, and count who resolved them.

The Rovo agent then reads the candidates critically. It compares the details that matter (platform, carrier, payment method) before calling anything a match.

## Accuracy

The offline evaluation in `eval/run.mjs` runs the same ranking code against 28 seeded issues. The score is how often the right past issue comes first:

| Query set | Word matching only | With concept matching |
|---|---|---|
| Hard paraphrases (used while tuning) | 44% | 88% |
| Held-out set, written after tuning | 80% | 88% (92% in top 3) |

Run it yourself:

```bash
node eval/run.mjs --set=queries-test --verbose
node --test test/rank.test.mjs
```

## Modules

- `jira:issuePanel`: the panel (UI Kit).
- `rovo:agent`: the Context agent.
- `action` x3: `find-similar-issues`, `get-resolution-notes` and `find-experts`, shared by the agent and the MCP server.
- `rovo:mcp`: the MCP server.

Permissions are read-only: `read:jira-work` and `read:jira-user`. All Jira calls run as the current user, so Context only shows issues that the user can already see.

## Develop

```bash
npm install
forge deploy -e development
forge install --site <your-site>.atlassian.net -p Jira -e development
```
