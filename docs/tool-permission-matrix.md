# Tool Permission Matrix

Document status: live reference

| Tool | Purpose | Allowed Actions | Prohibited Actions | Approval Required | Notes |
| --- | --- | --- | --- | --- | --- |
| GitHub | Branches, issues, reviews, CI visibility | Draft code changes, open branches, inspect reviews | Merge protected branches, admin setting changes | Yes for merges and admin changes | Core code-control surface |
| Supabase | Persistence, memory, auth, storage | Read and write governed application data, prepare migrations, operate staging data | Unapproved production data deletion or destructive schema work | Yes for production schema or destructive changes | Core data plane for Freedom memory and future product backends |
| Vercel | Web deploy and environment surface | Inspect deployments, create previews, prepare env configuration, operate approved staging projects | Silent production releases, secret sprawl, disabling protection | Yes for production release or new privileged env changes | Required for real app delivery beyond local dev |
| LiveKit | Voice transport and room control | Create and inspect governed voice infrastructure, tune transport config, operate approved environments | Broadening public access, destructive production resets without runbook | Yes for production-impacting room, credential, or transport changes | Core realtime voice backbone |
| OpenAI | Hosted inference, realtime voice, platform APIs | Use approved models, update app integrations, test staging behavior | Unapproved spend expansion, unsafe external automation | Yes for spend or production posture changes | Primary hosted model lane today |
| Claude / Codex | Premium coding and reasoning lanes | Use approved external coding or reasoning providers through router policy | Silent provider expansion, unreviewed external commitments | Yes for new provider posture or privileged integration changes | Treated as governed execution lanes, not autonomous authorities |
| Local LLM runtimes | Private low-cost local inference | Draft, summarize, transform, and assist local development work | Pretending local models are authoritative when they are not | Yes for commands with destructive or spending side effects | Optional cost-control and privacy lane |
| Local shell | Build, test, and automate repo tasks | Run validation, inspect code, bootstrap local state | Destructive resets, unauthorized secret access | Yes for destructive or spending-related commands | Used during implementation |
| Web research | External evidence collection | Run current public lookups and weather checks through the default Perplexity lane, benchmark public tools, and gather supporting context | Present unsourced claims as facts, bluff that search exists when it is unconfigured | Yes for outbound commitments or publishing | Default provider should be Perplexity when configured; use primary sources where possible |
| Email / outbound messaging | Customer or partner communication | Prepare drafts, summarize updates, route through trusted recipients | Silent sends, legal or sales commitments without review | Yes for sends and external commitments | Draft-first only |
