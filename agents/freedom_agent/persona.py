from pathlib import Path


def load_prompt_artifact(filename: str) -> str:
    prompt_path = Path(__file__).with_name("prompts") / filename
    return prompt_path.read_text(encoding="utf-8").strip()


def load_freedom_core_prompt() -> str:
    return load_prompt_artifact("freedom_core.md")


def load_freedom_runtime_policy_prompt() -> str:
    return load_prompt_artifact("freedom_voice_runtime.md")
