# Skill Performance Log

Track lightweight task metrics so workflow improvements can be measured with real data instead of estimates.

## Log after each meaningful coding task
Append one row to `SKILL-PERFORMANCE.csv` when the task changes code or performs a meaningful debugging/analysis pass.

Fields:
- date
- task_type
- primary_skill
- files_read
- files_changed
- tool_calls
- commits
- rework_count
- clarification_used
- first_pass_success
- notes

## Definitions
- files_read: unique repository files inspected for the task.
- files_changed: unique files modified.
- tool_calls: approximate number of repository/tool operations used for the task.
- commits: commits created for the task.
- rework_count: extra correction cycles after the first implementation.
- clarification_used: yes/no.
- first_pass_success: yes when the first implementation passes the intended acceptance check without corrective rework.
- notes: short reason for unusual cost, delay, failure, or major saving.

## Measurement goal
After 20-30 logged tasks, compare:
- average files read per task,
- average tool calls per task,
- average rework count,
- first-pass success rate,
- average commits per task,
- clarification usage by risk/task type.

Use these as operational proxies for credit efficiency and speed when direct billing/token telemetry is unavailable.

## Logging rules
Keep logging lightweight. Do not inspect extra files or perform extra calls only to improve the log.
Do not invent exact token/credit values.
If a metric cannot be observed reliably, leave it blank or use a short note.
