# Model Registry

| Model | Intended Role | Boundaries | Status |
| --- | --- | --- | --- |
| `gpt-5.4` | Strategist, workflow analyst, governance reviewer | Recommendations and reviews only; no unilateral irreversible actions | Planned and represented in V1 |
| `gpt-5.4-mini` | Researcher, QA reviewer, docs agent, operator | Fast bounded execution and summarization | Planned and represented in V1 |
| `gpt-5.3-codex` | Coder | Code drafting, tests, and implementation assistance under repo controls | Planned and represented in V1 |
| `gpt-4o-realtime-preview` | Freedom voice partner | LiveKit/OpenAI Realtime voice turns only; bounded to conversational guidance and lightweight coordination tools | Active when voice env vars are configured |

Most control-plane behavior is still seeded. The LiveKit voice worker invokes OpenAI
Realtime when the voice environment variables are configured.
