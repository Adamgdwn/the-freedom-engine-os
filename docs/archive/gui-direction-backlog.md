# GUI Direction Backlog

Archived: 2026-04-25
Status: deferred design backlog kept for historical context, not current execution guidance.

Use [Roadmap](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/roadmap.md:1)
for active directional work and
[Known Deficiencies (2026-04-25)](/home/adamgoodwin/code/agents/the-freedom-engine-os/docs/known-deficiencies-2026-04-25.md:1)
for current missing capabilities and unfinished areas.

The original content is preserved below.

# GUI Direction Backlog

Status: deferred until the app/runtime is functional and stable.

This file captures the bigger GUI/product direction so it does not get lost while current work stays focused on getting the desktop/mobile system working reliably.

## Product framing

- Freedom desktop = the Freedom Engine agent and command bridge
- Android app = connection, collaboration, capture, approvals, and intervention tool
- Goal feeling: a serious JARVIS-style partnership, not a remote-control utility

## Current priority

- make the Android app stable
- make pairing/runtime reliable
- make desktop and phone continuity work end to end
- defer major GUI rebuild work until the product is functional

## Deferred desktop GUI ideas

- replace the current dashboard-first shell with a real multi-pane workbench
- add a top command bar as the main way to ask Freedom, jump, run, and inspect
- use a VS Code-like shell structure:
  - activity rail
  - left context sidebar
  - center tabbed workspace
  - right context/approval pane
  - bottom logs/events/transcript panel
- make the desktop landing view a working mission view, not a static KPI page
- center the desktop around conversations, tasks, runs, files, agents, approvals, and governance
- make the right pane operational, not decorative

## Deferred mobile GUI ideas

- reshape mobile around a voice-first companion model, not host administration
- target 5 main surfaces:
  - Talk
  - Tasks
  - Tools
  - Memory
  - Settings
- keep voice as the front door, but always show visible transcript and action state
- make approvals, quick capture, and interventions easy from anywhere
- keep risky actions explicit and inspectable

## Shared product ideas to preserve

- same core objects across desktop and phone:
  - Conversation
  - Task
  - Run
  - Agent
  - Tool
  - Flow
  - Memory
  - File
  - Approval
  - Notification
- a conversation started on phone should reopen on desktop cleanly
- a desktop run should be inspectable and approvable from phone
- every spoken action should become visible text and linked system state

## Visual direction for later

- premium, calm, technical, slightly futuristic
- polish over clutter
- motion should clarify state, not act as spectacle
- avoid fake sci-fi HUD noise
- avoid making the phone a mini desktop
- avoid making the desktop a blown-up chat app

## Revisit when

- Android app no longer crashes
- pairing is stable
- desktop shell/runtime loop is reliable
- core Freedom session model works across desktop and phone
