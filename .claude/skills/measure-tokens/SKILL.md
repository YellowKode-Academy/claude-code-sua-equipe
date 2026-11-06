---
name: measure-tokens
description: Shows where this project's tokens went - by agent, by model or by day - from the local transcripts. Use when asked how much it cost, who spent the most or whether it is worth changing a role's model.
argument-hint: [agent|model|day|session] [YYYY-MM-DD start]
---
# Measure tokens

Run `node tools/measure-tokens.mjs --project <this-project-folder-name> --by <$1, or agent if empty> --since <$2, or 7 days ago>`.
The project folder name in `~/.claude/projects/` is the repository path with `:`, `\` and `/` replaced by `-`.

After running it, answer in at most 10 lines:
1. Who spent the most (agent or model) and each one's share.
2. **Where the cost comes from:** output, cache read or cache write. In a long session, rereading the context usually costs more than the answer.
3. One concrete suggestion, only if the number supports it. Examples: switch the model of a subagent that does mechanical reading, open a new session when the context passes 70%, send broad reading to the `researcher`.

Remember: the US$ value is API price. On the subscription plan it shows relative weight, not the bill.
