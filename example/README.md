# Example — agents-md plugin in action

This directory demonstrates the `agents-md` Claude Code plugin.

## What's here

| File | Purpose |
|---|---|
| `agents.md` | Project rules injected automatically by the plugin |
| `calculator.py` | A simple Python file that does not follow this rules |

## Rules defined in `agents.md`

1. All variable and function names must use `snake_case`.
2. Every function must have a docstring.

## How to verify the plugin is working

### 1. Install the plugin

```shell
/plugin marketplace add GaetanoPiazzolla/claude-code-agents-md
/plugin install agents-md@agents-md
```

### 2. Open Claude Code inside this directory

```shell
cd example/
claude
```

### 3. Ask Claude to add a new function

Try a prompt like:

> Add a `subtract` function to `calculator.py`.

**Without the plugin**, Claude may or may not add a docstring, and might name variables `firstNumber` or `n1`.

**With the plugin**, Claude will:
- use `snake_case` for all names (e.g. `first_number`, not `firstNumber`)
- include a docstring on every function

### 4. Watch the hook fire in real time

When Claude reads or writes any file in this directory, you will see a `system-reminder` block in the tool output that starts with:

```
PreToolUse:Write hook additional context:
[agents.md from example]
# Project Rules
...
```

This confirms that the `agents-md` plugin loaded the rules and injected them into Claude's context.

### 5. Test subdirectory loading

Create a nested `agents.md`:

```shell
mkdir -p lib
echo "- All functions in lib/ must return a value explicitly." > lib/agents.md
```

Then ask Claude to create or edit a file inside `lib/`. The plugin will inject the subdirectory `agents.md` on demand, in addition to the root one.
