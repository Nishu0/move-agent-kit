#!/bin/bash
set -e

# Export environment variables
export ANTHROPIC_API_KEY="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"
export APTOS_PRIVATE_KEY="0xf7481ac247bfc5441d63bf6b921e363f93bde12de4fe419ef442cef1b66d582d"

# Change to the server directory
cd /Users/nisargthakkar/kit/move-agent-kit/examples/mcp-server

# Run with node directly (no pnpm output that might interfere)
NODE_OPTIONS="--no-warnings" exec node -e "require('ts-node').register({transpileOnly: true}); require('./src/tools.ts');"
