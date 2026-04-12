# Tool Permission Matrix

| Tool | Purpose | Allowed Actions | Prohibited Actions | Approval Required | Notes |
| --- | --- | --- | --- | --- | --- |
| GitHub | Branches, issues, reviews, CI visibility | Draft code changes, open branches, inspect reviews | Merge protected branches, admin setting changes | Yes for merges and admin changes | Core code-control surface |
| Supabase | Persistence and future auth | Read and write governed application data | Unapproved production data deletion | Yes for production schema or destructive changes | V1 schema only today |
| Local shell | Build, test, and automate repo tasks | Run validation, inspect code, bootstrap local state | Destructive resets, unauthorized secret access | Yes for destructive or spending-related commands | Used during implementation |
| Web research | External evidence collection | Benchmark public tools and gather supporting context | Present unsourced claims as facts | Yes for outbound commitments or publishing | Use primary sources where possible |
