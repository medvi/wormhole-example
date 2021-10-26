import * as sweb3 from "@solana/web3.js";
import { getProvider, PhantomProvider } from "./phantom";
import detectEthereumProvider from "@metamask/detect-provider";
import * as wormhole from "@certusone/wormhole-sdk";
import { ethers } from "ethers";

const PHANTOM_PROVIDER: PhantomProvider | undefined = getProvider();
const METAMASK_PROVIDER = await detectEthereumProvider();

const CONNECTION = new sweb3.Connection("http://127.0.0.1:8899");

const PHANTOM_WALLET_SPAN = document.getElementById("phantom_wallet_span");
const METAMASK_WALLET_SPAN = document.getElementById("metamask_wallet_span");

const SOL_AMOUNT_INPUT = document.getElementById("sol_amount_input");
const ATTEST_SOL_TO_ETH_BTN = document.getElementById("attest_sol_to_eth_btn");
const TRANSFER_SOL_TO_ETH_BTN = document.getElementById(
  "transfer_sol_to_eth_btn"
);
const ETH_AMOUNT_INPUT = document.getElementById("eth_amount_input");
const ATTEST_ETH_TO_SOL_BTN = document.getElementById("attest_eth_to_sol_btn");
const TRANSFER_ETH_TO_SOL_BTN = document.getElementById(
  "transfer_eth_to_sol_btn"
);

const SOL_BRIDGE_ADDRESS = "Bridge1p5gheXUvJ6jGWGeCsgPKgnE3YgdGKRVCMY9o";
const SOL_TOKEN_BRIDGE_ADDRESS = "B6RHG3mfcckmrYN1UhmJzyS1XX3fZKbkeUcpJe9Sy3FE";
const PAYER_ADDRESS = "6sbzC1eH4FTujJXWj51eQe25cYvr4xfXbJ1vAj7j2k5J";
const MINT_ADDRESS = "2WDq7wSs9zYrpx2kbHDA4RUTRch2CCTP6ZWaH4GNfnQQ";
const ETH_TOKEN_BRIDGE_ADDRESS = "0x0290FB167208Af455bB137780163b7B7a9a10C16";
const TOKEN_ADDRESS = "0x2D8BE6BF0baA74e0A907016679CaE9190e80dD0A";
const WORMHOLE_RPC_HOST = "http://localhost:8080";

const SIGNER = new ethers.Wallet("...");

async function attestSolToEth() {
  // Submit transaction - results in a Wormhole message being published
  const transaction = await wormhole.attestFromSolana(
    CONNECTION,
    SOL_BRIDGE_ADDRESS,
    SOL_TOKEN_BRIDGE_ADDRESS,
    PAYER_ADDRESS,
    MINT_ADDRESS
  );

  const signed = await PHANTOM_PROVIDER?.signTransaction(transaction);
  const txid = await CONNECTION.sendRawTransaction(signed?.serialize());
  await CONNECTION.confirmTransaction(txid);
  // Get the sequence number and emitter address required to fetch the signedVAA of our message
  const info = await CONNECTION.getTransaction(txid);
  const sequence = wormhole.parseSequenceFromLogSolana(info);
  const emitterAddress = await wormhole.getEmitterAddressSolana(
    SOL_TOKEN_BRIDGE_ADDRESS
  );
  // Fetch the signedVAA from the Wormhole Network (this may require retries while you wait for confirmation)
  const { signedVAA } = await wormhole.getSignedVAA(
    WORMHOLE_RPC_HOST,
    wormhole.CHAIN_ID_SOLANA,
    emitterAddress,
    sequence
  );
  // Create the wrapped token on Ethereum
  await wormhole.createWrappedOnEth(
    ETH_TOKEN_BRIDGE_ADDRESS,
    SIGNER,
    signedVAA
  );
}

async function transferSolToEth() {}

async function attestEthToSol() {
  // Submit transaction - results in a Wormhole message being published
  const receipt = await wormhole.attestFromEth(
    ETH_TOKEN_BRIDGE_ADDRESS,
    SIGNER,
    TOKEN_ADDRESS
  );
  // Get the sequence number and emitter address required to fetch the signedVAA of our message
  const sequence = wormhole.parseSequenceFromLogEth(
    receipt,
    ETH_BRIDGE_ADDRESS
  );
  const emitterAddress = wormhole.getEmitterAddressEth(
    ETH_TOKEN_BRIDGE_ADDRESS
  );
  // Fetch the signedVAA from the Wormhole Network (this may require retries while you wait for confirmation)
  const { signedVAA } = await wormhole.getSignedVAA(
    WORMHOLE_RPC_HOST,
    wormhole.CHAIN_ID_ETH,
    emitterAddress,
    sequence
  );
  // On Solana, we have to post the signedVAA ourselves
  await wormhole.postVaaSolana(
    CONNECTION,
    PHANTOM_PROVIDER,
    SOL_BRIDGE_ADDRESS,
    PAYER_ADDRESS,
    signedVAA
  );
  // Finally, create the wrapped token
  const transaction = await wormhole.createWrappedOnSolana(
    CONNECTION,
    SOL_BRIDGE_ADDRESS,
    SOL_TOKEN_BRIDGE_ADDRESS,
    PAYER_ADDRESS,
    signedVAA
  );
  const signed = await PHANTOM_PROVIDER.signTransaction(transaction);
  const txid = await CONNECTION.sendRawTransaction(signed.serialize());
  await CONNECTION.confirmTransaction(txid);
}

async function transferEthToSol() {}

function events() {
  ATTEST_SOL_TO_ETH_BTN?.addEventListener("click", attestSolToEth, false);
  TRANSFER_SOL_TO_ETH_BTN?.addEventListener("click", transferSolToEth, false);
  ATTEST_ETH_TO_SOL_BTN?.addEventListener("click", attestEthToSol, false);
  TRANSFER_ETH_TO_SOL_BTN?.addEventListener("click", transferEthToSol, false);

  if (PHANTOM_PROVIDER !== undefined) {
    if (!PHANTOM_PROVIDER.isConnected) {
      PHANTOM_PROVIDER.connect().then(async () => {
        if (PHANTOM_WALLET_SPAN) PHANTOM_WALLET_SPAN.innerText = "Connected";
      });
    }

    PHANTOM_PROVIDER.on("connect", () => {
      // @ts-ignore
      if (phantom_wallet_span) phantom_wallet_span.innerText = "Connected";
    });
  }

  if (METAMASK_PROVIDER) {
    if (METAMASK_PROVIDER.isConnected()) {
      if (METAMASK_WALLET_SPAN) METAMASK_WALLET_SPAN.innerText = "Connected";
    }
  }
}

(async () => {
  events();
})();
