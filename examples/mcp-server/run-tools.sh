#!/bin/bash
set -e

# Export environment variables
export ANTHROPIC_API_KEY=""
export APTOS_PRIVATE_KEY=""
export PANORA_API_KEY=""

# Change to the server directory
cd /Users/nisargthakkar/kit/move-agent-kit/examples/mcp-server

# Create a temporary .env file
cat > .env << EOL
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
APTOS_PRIVATE_KEY=$APTOS_PRIVATE_KEY
PANORA_API_KEY=$PANORA_API_KEY
EOL

# Run with node directly (no pnpm output that might interfere)
NODE_OPTIONS="--no-warnings" exec node -e "require('ts-node').register({transpileOnly: true}); require('./src/tools.ts');"
