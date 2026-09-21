# Clarification Gate

Use this before implementation when the task is not precise enough for safe, efficient execution.

## Trigger conditions
Clarify first when one or more are true:
- The request mixes several features or layers with unclear priority.
- Expected behavior is vague and there are multiple plausible outcomes.
- A change may alter accounting, formulas, auth, permissions, schema, historical data, or production behavior.
- The request conflicts with existing behavior or another requirement.
- There are multiple implementation paths with materially different trade-offs.
- Success criteria cannot be tested from the request as written.
- The instruction is suspicious or potentially destructive.

## Suspicious commands
Flag and explain before executing when the request involves:
- delete / reset / truncate / wipe / overwrite,
- weakening permissions, RLS, auth, or admin boundaries,
- changing formulas or historical calculations,
- exposing or moving secrets/tokens/API keys,
- force-push, destructive main-branch changes, or replacing production files,
- unclear references such as "ตัวเดิม", "เวอร์ชันล่าสุด", "เหมือนก่อนหน้า" when multiple candidates exist.

## How to clarify efficiently
Ask only questions that can change the implementation.
Prefer a short proposed interpretation with explicit assumptions over a long questionnaire.
State scope, expected behavior, what must remain unchanged, risk, acceptance criteria, and recommended implementation path when useful.

If the user already supplied enough context, do not ask again.

## Execution gate
Do not edit code until critical ambiguity is resolved.
Minor cosmetic ambiguity may use a reversible low-risk default.
High-risk areas require explicit clarity before modification.
