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
import { DynamicStructuredTool } from "@langchain/core/tools";

dotenv.config();

export async function main() {
    const aptosConfig = new AptosConfig({
        network: Network.MAINNET,
    });
    
    const aptos = new Aptos(aptosConfig);
    
    // Validate and get private key from environment
    const privateKeyStr = process.env.APTOS_PRIVATE_KEY;
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
            description: "Get the balance of a token if no token is provided, it will return the balance of the APT. Divide the balance by 10^8 to get the human readable balance.",
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
    }
}

// Run the main function
main().catch((error) => {
    console.error("Error running MCP server:", error);
    process.exit(1);
});