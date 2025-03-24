import { startMcpServer } from "../../../src/index"
import { AgentRuntime } from "../../../src/agent"
import { LocalSigner } from "../../../src/signers/local-signer"
import { z } from "zod";
import * as dotenv from "dotenv";
import { Aptos, AptosConfig, Ed25519PrivateKey, Network, PrivateKey, PrivateKeyVariants } from "@aptos-labs/ts-sdk";
import { 
    getBalance,
    getTokenDetails,
    getTokenPrice,
    getTransaction
} from "../../../src/tools/aptos";
import { transferUsdcWithCctp,createAptosWrappedToken,getSupportedWormholeChains,tokenTransfer } from "../../../src/tools/wormhole/index";
import { DynamicStructuredTool } from "@langchain/core/tools";

dotenv.config();

// Add this enum definition before the tools array
enum WormholeChain {
    Solana = 1,
    Ethereum = 2,
    Aptos = 22,
    Sui = 21
}

export async function main() {
    const aptosConfig = new AptosConfig({
        network: Network.MAINNET,
    });
    
    const aptos = new Aptos(aptosConfig);
    
    // Validate and get private key from environment
    const privateKeyStr = process.env.APTOS_PRIVATE_KEY;
    const ethereumPrivateKeyStr = process.env.ETHEREUM_PRIVATE_KEY;
    if (!privateKeyStr) {
        throw new Error("Missing APTOS_PRIVATE_KEY environment variable");
    }
    
    // Setup account and signer
    const account = await aptos.deriveAccountFromPrivateKey({
        privateKey: new Ed25519PrivateKey(PrivateKey.formatPrivateKey(privateKeyStr, PrivateKeyVariants.Ed25519)),
    });
    
    const signer = new LocalSigner(account, Network.MAINNET);
    const agentRuntime = new AgentRuntime(signer, aptos, {
        PANORA_API_KEY: process.env.PANORA_API_KEY,
    });
    //console.log("Agent runtime created");

    // Create a few simple tools with well-defined schemas
    const tools = [
        new DynamicStructuredTool({
            name: "get_balance",
            description: "Get the balance of a token if no token is provided, it will return the balance of the APT. Divide the balance by 10^8 to get the human readable balance. Mainet USDC is 0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3bS use as mint param and it is 6 decimal token so divide by 10^6 to get human readable balance",
            schema: z.object({
                mint: z.string().optional()
            }),
            func: async ({ mint }) => getBalance(agentRuntime, mint)
        }),
        new DynamicStructuredTool({
            name: "get_token_details",
            description: "Get details of a token",
            schema: z.object({
                tokenAddress: z.string()
            }),
            func: async ({ tokenAddress }) => getTokenDetails(tokenAddress)
        }),
        new DynamicStructuredTool({
            name: "get_token_price",
            description: "Get the price of a token",
            schema: z.object({
                query: z.string()
            }),
            func: async ({ query }) => getTokenPrice(query)
        }),
        new DynamicStructuredTool({
            name: "get_transaction",
            description: "Get transaction details",
            schema: z.object({
                hash: z.string()
            }),
            func: async ({ hash }) => getTransaction(agentRuntime, hash)
        }),
        new DynamicStructuredTool({
            name: "create_wrapped_token",
            description: "Create a wrapped token on the destination chain",
            schema: z.object({
                targetChain: z.enum(["Solana", "Ethereum", "Aptos", "Sui"]),
                tokenAddress: z.string(),
                networkType: z.enum(["Mainnet", "Testnet", "Devnet"])
            }),
            func: async ({ targetChain, tokenAddress, networkType }) => createAptosWrappedToken({targetChain, originTokenAddress: tokenAddress, networkType})
        }),
        new DynamicStructuredTool({
            name: "token_transfer",
            description: "Transfer a token from the source chain to the destination chain. When the base is used the token address is taget chain is ethereum and the network type is mainet and if aptos is the source chain then token address is 0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b",
            schema: z.object({
                targetChain: z.enum(["Solana", "Ethereum", "Aptos", "Sui", "Terra", "Bsc", "Polygon", "Avalanche", "Oasis", "Algorand", "Aurora", "Fantom", "Karura", "Acala", "Klaytn", "Celo", "Near"]),
                networkType: z.enum(["Mainnet", "Testnet", "Devnet"]),
                transferAmount: z.string(),
                tokenAddress: z.string()
            }),
            func: async ({ targetChain, networkType, transferAmount, tokenAddress }) => tokenTransfer({
                targetChain,
                networkType,
                transferAmount,
                tokenAddress
            })
        }),
        new DynamicStructuredTool({
            name: "get_supported_wormhole_chains",
            description: "Get the list of supported chains by Wormhole",
            schema: z.object({}),
            func: async () => getSupportedWormholeChains()
        }),
        new DynamicStructuredTool({
            name: "transfer_usdc_with_cctp",
            description: `this tool can be used to Transfer USDC from Aptos to another chain.
    
    Inputs (input is a JSON string):
    targetChain: string, eg "Ethereum" or "Avalanche" or "Optimism" or "Arbitrum" or "Aptos" or "Solana" or "Sui"
    transferAmount: number, eg 1 or 0.01 (required)
    networkType: string, eg "Mainnet" or "Testnet" or "Devnet" (required)
    `,
            schema: z.object({
                targetChain: z.enum(["Solana", "Ethereum", "Aptos", "Sui", "Terra", "Bsc", "Polygon", "Avalanche", "Oasis", "Algorand", "Aurora", "Fantom", "Karura", "Acala", "Klaytn", "Celo", "Near", "Base"]),
                networkType: z.enum(["Mainnet", "Testnet", "Devnet"]),
                transferAmount: z.string(),
            }),
            func: async ({ targetChain, networkType, transferAmount }) => transferUsdcWithCctp({
                targetChain,
                transferAmount,
                networkType
            })
        })
    ];
    
    // Store the tools in agentRuntime.config
    agentRuntime.config = {
        ...agentRuntime.config,
        tools: tools
    };
    //console.log("Agent runtime config updated with", tools.length, "tools");

    // Start the MCP server
    try {
        await startMcpServer(agentRuntime, {
            name: "move-agent-tools",
            version: "1.0.0"
        });
        //console.log("MCP server started successfully");
    } catch (error) {
        console.error("Failed to start MCP server:", error);
        // Continue running the program even if MCP server fails
        //console.log("Continuing without MCP server...");
    }
}

// Run the main function
main().catch((error) => {
    console.error("Error running MCP server:", error);
    process.exit(1);
});