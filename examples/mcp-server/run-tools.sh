#!/bin/bash
set -e

# Export environment variables
export ANTHROPIC_API_KEY=""
export APTOS_PRIVATE_KEY=""

# Change to the server directory
cd /Users/nisargthakkar/kit/move-agent-kit/examples/mcp-server

# Run with node directly (no pnpm output that might interfere)
NODE_OPTIONS="--no-warnings" exec node -e "require('ts-node').register({transpileOnly: true}); require('./src/tools.ts');"
