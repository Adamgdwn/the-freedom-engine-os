# Model Registry

| Model | Intended Role | Boundaries | Status |
| --- | --- | --- | --- |
| `gpt-5.4` | Strategist, workflow analyst, governance reviewer | Recommendations and reviews only; no unilateral irreversible actions | Planned and represented in V1 |
| `gpt-5.4-mini` | Researcher, QA reviewer, docs agent, operator | Fast bounded execution and summarization | Planned and represented in V1 |
| `gpt-5.3-codex` | Coder | Code drafting, tests, and implementation assistance under repo controls | Planned and represented in V1 |
| `gpt-4o-realtime-preview` | Freedom voice partner | LiveKit/OpenAI Realtime voice turns only; bounded to conversational guidance, memory/task introspection, and approval-gated coordination tools, with no live external web research yet | Active when voice env vars are configured |

Most control-plane behavior is still seeded. The LiveKit voice worker invokes OpenAI
Realtime when the voice environment variables are configured.

Intended routing posture:

- day-to-day operator work should prefer a configured local model path
- desktop-host now enforces that posture for non-voice turns when `FREEDOM_LOCAL_MODEL_COMMAND`
  is configured; the local lane is a prompt-in/stdout-out command bridge rather than a
  hosted provider integration
- when Freedom asks to escalate, the first suggested external option can be `OpenAI / ChatGPT`,
  but the operator chooses whether to use `OpenAI / ChatGPT`, `Codex`, or `Claude Code`
- large code changes and governed build execution may still be better fits for `Codex`
- broad synthesis, architecture, or research-heavy work may still be better fits for `Claude Code`
- the current live voice runtime is still `gpt-4o-realtime-preview`, so local-first is not yet full runtime reality across voice and non-voice paths
