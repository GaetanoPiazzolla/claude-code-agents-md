---
name: agents-tree
description: Show a tree of all agents.md files in the current project. Use when asked about which agent instruction files exist or where they are located.
allowed-tools: Bash(node *)
---
Here are all the agent instruction files found in this project:

```
!`node ${CLAUDE_PLUGIN_ROOT}/src/tree.js`
```
