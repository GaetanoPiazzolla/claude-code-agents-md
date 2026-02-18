#!/bin/bash
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id')
rm -f "/tmp/agents-md-loaded-$SESSION_ID"
exit 0
