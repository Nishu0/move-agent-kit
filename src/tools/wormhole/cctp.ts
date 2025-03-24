import { wormhole, CircleTransfer, amount } from "@wormhole-foundation/sdk";
import evm from "@wormhole-foundation/sdk/evm";
import solana from "@wormhole-foundation/sdk/solana";
import sui from "@wormhole-foundation/sdk/sui";
import aptos from "@wormhole-foundation/sdk/aptos";
import { getSignerForChain } from "./helper";
import { AptosCctpTransferRequest } from "./types";

/**
 * Executes USDC transfers across blockchains using Circle's Cross-Chain Transfer Protocol (CCTP)
 * via the Wormhole bridge infrastructure from Aptos.
 * 
 * This function manages the complete cross-chain USDC transfer process, including attestation
 * and transaction verification across source and destination chains.
 *
 * @param request - Object containing transfer configuration (destination chain, amount, network)
 * @returns Object with detailed transfer status and transaction information
 */
export const transferUsdcWithCctp = async (request: AptosCctpTransferRequest) => {
  const { targetChain, transferAmount, networkType = "Mainnet" } = request;
  
  // Source chain is fixed to Aptos
  const sourceChainId = "Aptos";
  
  // Set transfer mode (manual vs automatic)
  const useAutomatic = false;
  
  // Native gas amount for destination chain (0 for manual transfers)
  const nativeGasAmount = 0;
  
  try {
    // Initialize Wormhole SDK with blockchain adapters
    const whInstance = await wormhole(networkType, [evm, solana, sui, aptos]);
    console.log("whInstance", whInstance)
    
    // Get chain contexts for source and destination
    const sourceChain = whInstance.getChain(sourceChainId);
    console.log("sourceChain", sourceChain)
    const destChain = whInstance.getChain(targetChain);
    console.log("destChain", destChain)
    
    // Get signers for both chains
    const sourceSigner = await getSignerForChain(sourceChain);
    console.log("sourceSigner", sourceSigner)
    const destSigner = await getSignerForChain(destChain);
    console.log("destSigner", destSigner)
    
    // Parse USDC amount with 6 decimal precision
    const parsedAmount = amount.units(amount.parse(transferAmount, 6));
    console.log("parsedAmount", parsedAmount)
    
    // Calculate native gas amount for automatic transfers (if enabled)
    const nativeGas =
      useAutomatic && nativeGasAmount
        ? amount.units(amount.parse(nativeGasAmount, 6))
        : 0n;
    
    // Create Circle USDC transfer
    const circleTransfer = await whInstance.circleTransfer(
      parsedAmount,
      sourceSigner.address,
      destSigner.address,
      useAutomatic,
      undefined, // No custom payload
      nativeGas,
    );
    
    // Get transfer cost estimate
    const transferQuote = await CircleTransfer.quoteTransfer(
      sourceSigner.chain,
      destSigner.chain,
      circleTransfer.transfer,
    );

    console.log("transferQuote", transferQuote)
    
    // Initiate transfer on source chain
    console.log('Starting Transfer');
    const sourceTxIds = await circleTransfer.initiateTransfer(sourceSigner.signer);
    console.log(`Started Transfer: `, sourceTxIds);

    
    // For manual transfers, handle attestation and completion
    
    // Wait for Circle attestation (timeout after 60 seconds)
    const timeout = 120 * 1000; // Timeout in milliseconds (120 seconds)
	  console.log('Waiting for Attestation');
    const attestationIds = await circleTransfer.fetchAttestation(timeout);
    console.log(`Got Attestation: `, attestationIds);
    
    // Complete transfer on destination chain
    // Step 3: Complete the transfer on the destination chain
	  console.log('Completing Transfer');
    const destTxIds = await circleTransfer.completeTransfer(destSigner.signer);
    console.log(`Completed Transfer: `, destTxIds);
    
    // Return success response with transaction details
    return {
      isSuccess: true,
      status: "Completed",
      sourceChain: sourceChainId,
      destinationChain: targetChain,
      amount: transferAmount,
      sourceTransactions: sourceTxIds,
      attestationIds: attestationIds,
      destinationTransactions: destTxIds,
      automatic: false,
    };
  } catch (error) {
    // Return detailed error information
    return {
      isSuccess: false,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
};