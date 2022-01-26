import { ethers, utils, Contract, providers, Wallet, constants, BigNumber } from "ethers";
import * as dotenv from "dotenv";

import { LedgerHedger__factory, TestToken__factory } from "../typechain-types";
import fs from "fs";
import path from "path";

dotenv.config();

const GWEI = 1000000000;

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY_WALLET_OWNER = process.env.PRIVATE_KEY_WALLET_OWNER || "";
const WALLET_CONTRACT_ADDRESS = process.env.WALLET_CONTRACT_ADDRESS || "";

if (PRIVATE_KEY_WALLET_OWNER === "") {
  console.warn("Must provide PRIVATE_KEY_WALLET_OWNER environment variable");
  process.exit(1);
}

if (WALLET_CONTRACT_ADDRESS === "") {
  console.warn("Must provide WALLET_CONTRACT_ADDRESS environment variable");
  process.exit(1);
}

const provider = new providers.StaticJsonRpcProvider(ETHEREUM_RPC_URL);

const ownerSigningWallet = new Wallet(PRIVATE_KEY_WALLET_OWNER, provider);

async function main() {
  console.log("Owner Wallet Address: " + (await ownerSigningWallet.getAddress()));

  let walletContract = LedgerHedger__factory.connect(WALLET_CONTRACT_ADDRESS, ownerSigningWallet);

  let buyer = await walletContract.buyer();
  console.log("Buyer", buyer);

  let currentBlock = await provider.getBlockNumber();
  console.log("Current block", currentBlock);

  let startBlock = await walletContract.startBlock();
  console.log("Start block", startBlock);

  if (currentBlock < startBlock) {
    console.log("Start block not reached, return");
    return;
  }

  let rec = await walletContract.refund();
  let res = await rec.wait(1);
  console.log("Mined tx", res.transactionHash);
}

main();
