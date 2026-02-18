# agents-md

A Claude Code plugin that loads `agents.md` from your project root as session context — so you don't need a `CLAUDE.md` file in your codebase.

## Why

[AGENTS.md](https://agents.md/) is an open standard for giving AI coding agents project-specific context — build steps, testing procedures, code style, conventions. It is already supported by OpenAI Codex, Google Jules, Cursor, VS Code, and others, with over 60,000 open-source projects using it.

`CLAUDE.md` does the same job but locks your project to a single tool. By using `agents.md` instead, your instructions work across every agent that supports the standard — today and in the future.

## Installation

Add the marketplace and install the plugin once, globally:

```shell
/plugin marketplace add gae-piaz/claude-agents-md
/plugin install agents-md@agents-md
```

This installs to user scope by default, meaning it applies to all your projects. No configuration needed.

## Usage

Add an `agents.md` file to the root of any project:

```
my-project/
└── agents.md   ← Claude reads this automatically on session start
```

The filename is case-insensitive — `agents.md`, `AGENTS.MD`, `AgEnTs.Md` all work.

If a `CLAUDE.md` also exists, both are loaded — `agents.md` is injected as additional context alongside it. For a fully AI-agnostic repo, simply skip `CLAUDE.md` entirely.

## How it works

Two hooks work together to mirror how Claude Code handles `CLAUDE.md` files:

- **`SessionStart`**: loads `agents.md` from the project root at the start of every session
- **`PreToolUse`** on `Read`, `Edit`, `Write`: each time Claude accesses a file, walks up from that file's directory to the project root and injects any `agents.md` found along the way — on demand, exactly once per directory per session

This means subdirectory `agents.md` files are loaded only when Claude actually enters that subtree, keeping context lean.

No extra tokens are consumed — both hooks are plain shell scripts with no LLM calls involved.

## Caveats

`additionalContext` from a hook is not identical to `CLAUDE.md` — it is injected into Claude's context window at session start rather than into the system prompt directly. In practice the behavior is very similar, but `CLAUDE.md` has slightly higher authority. For most projects this distinction does not matter.

## License

MIT
