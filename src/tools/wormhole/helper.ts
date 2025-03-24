import {
    ChainAddress,
    ChainContext,
    Network,
    Signer,
    Wormhole,
    Chain,
    TokenId,
    isTokenId,
  } from "@wormhole-foundation/sdk";
  import evm from "@wormhole-foundation/sdk/evm";
  import solana from "@wormhole-foundation/sdk/solana";
  import sui from "@wormhole-foundation/sdk/sui";
  import aptos from "@wormhole-foundation/sdk/aptos";
  import { config } from "dotenv";
  config();
  
  /**
   * Interface defining a signer configuration for a blockchain
   * 
   * @template N - Network type (Mainnet, Testnet, Devnet)
   * @template C - Chain type (Move, Ethereum, etc.)
   * 
   * @property {ChainContext<N, C>} chain - Chain context object
   * @property {Signer<N, C>} signer - Chain-specific signer
   * @property {ChainAddress<C>} address - Address of the signer on the chain
   */
  export interface ChainSignerInfo<N extends Network, C extends Chain> {
    chain: ChainContext<N, C>;
    signer: Signer<N, C>;
    address: ChainAddress<C>;
  }
  
  /**
   * Safely retrieves environment variables with error handling
   * 
   * @param {string} variableName - Name of the environment variable
   * @returns {string} Value of the environment variable
   * @throws {Error} If the environment variable is not defined
   */
  function getEnvironmentVar(variableName: string): string {
    const value = process.env[variableName];
    if (!value) {
      throw new Error(`Required environment variable missing: ${variableName}`);
    }
    return value;
  }
  
  /**
   * Creates a blockchain-specific signer using private keys from environment
   * 
   * Supports different blockchain platforms (Move, EVM, Solana, Sui, Aptos)
   * and handles the specifics of creating signers for each platform.
   * 
   * @template N - Network type (Mainnet, Testnet, Devnet)
   * @template C - Chain type (Move, Ethereum, etc.)
   * 
   * @param {ChainContext<N, C>} chain - Chain context
   * @param {bigint} [gasLimit] - Optional gas limit for EVM chains
   * 
   * @returns {Promise<ChainSignerInfo<N, C>>} Signer configuration
   * @throws {Error} If the platform is unsupported
   */
  export async function getSignerForChain<N extends Network, C extends Chain>(
    chain: ChainContext<N, C>,
    gasLimit?: bigint,
  ): Promise<ChainSignerInfo<N, C>> {
    let signer: Signer;
    const platform = chain.platform.utils()._platform;
    
    switch (platform) {
      case "Solana":
        signer = await (
          await solana()
        ).getSigner(await chain.getRpc(), getEnvironmentVar("SOLANA_PRIVATE_KEY"));
        break;
        
      case "Evm": {
        const evmOptions = gasLimit ? { gasLimit } : {};
        signer = await (
          await evm()
        ).getSigner(
          await chain.getRpc(),
          getEnvironmentVar("ETH_PRIVATE_KEY"),
          evmOptions,
        );
        break;
      }
      
      case "Sui":
        signer = await (
          await sui()
        ).getSigner(await chain.getRpc(), getEnvironmentVar("SUI_MNEMONIC"));
        break;
      
      case "Aptos":
        signer = await (
          await aptos()
        ).getSigner(await chain.getRpc(), getEnvironmentVar("APTOS_PRIVATE_KEY"));
        break;
        
      default:
        throw new Error(`Unsupported blockchain platform: ${platform}`);
    }
    
    return {
      chain,
      signer: signer as Signer<N, C>,
      address: Wormhole.chainAddress(chain.chain, signer.address()),
    };
  }
  
  /**
   * Retrieves token decimal precision for proper amount formatting
   * 
   * @template N - Network type (Mainnet, Testnet, Devnet)
   * 
   * @param {Wormhole<N>} whInstance - Wormhole SDK instance
   * @param {TokenId} token - Token identifier
   * @param {ChainContext<N, any>} chainContext - Chain context
   * 
   * @returns {Promise<number>} Number of decimal places for the token
   */
  export async function getTokenDecimals<
    N extends "Mainnet" | "Testnet" | "Devnet",
  >(
    whInstance: Wormhole<N>,
    token: TokenId,
    chainContext: ChainContext<N, any>,
  ): Promise<number> {
    return isTokenId(token)
      ? Number(await whInstance.getDecimals(token.chain, token.address))
      : chainContext.config.nativeTokenDecimals;
  }