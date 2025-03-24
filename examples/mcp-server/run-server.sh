#!/bin/bash
set -e

# Export environment variables
export ANTHROPIC_API_KEY="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"
export APTOS_PRIVATE_KEY="0x3b1eff75e253e157ca2a1d50838a2a371b22d998069384c51dab316da083e744"
export ETH_PRIVATE_KEY="03323e972f8ed0aad112184bc16322ec5236db91d60ee5f35a4f085301a6142b"
export ANKR_API_KEY="https://rpc.ankr.com/base/c964591fa335e2b98161e8b3c6cba99c1801f8d8de8beafe63f9db086fcf1464"
export ALCHEMY_RPC_URL="https://base-mainnet.g.alchemy.com/v2/LQJAkg_rXWdGinhD1VApyddbtt5lBz-R"

# Change to the server directory
cd /Users/nisargthakkar/kit/move-agent-kit/examples/mcp-server

# Run with node directly (no pnpm output that might interfere)
NODE_OPTIONS="--no-warnings" exec node -e "require('ts-node').register({transpileOnly: true}); require('./src/index.ts');"
