import { ethers, utils, Contract, providers, Wallet, constants, BigNumber } from "ethers";
import * as dotenv from "dotenv";

import { GasFuture__factory, TestToken__factory } from "../typechain-types";
import fs from "fs";
import path from "path";

dotenv.config();

const GWEI = 1000000000;

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY_SELLER = process.env.PRIVATE_KEY_SELLER || "";
const WALLET_CONTRACT_ADDRESS = process.env.WALLET_CONTRACT_ADDRESS || "";

if (PRIVATE_KEY_SELLER === "") {
  console.warn("Must provide PRIVATE_KEY_SELLER environment variable");
  process.exit(1);
}

if (WALLET_CONTRACT_ADDRESS === "") {
  console.warn("Must provide WALLET_CONTRACT_ADDRESS environment variable");
  process.exit(1);
}

const provider = new providers.StaticJsonRpcProvider(ETHEREUM_RPC_URL);

const sellerWallet = new Wallet(PRIVATE_KEY_SELLER, provider);

async function main() {
  console.log("Owner Wallet Address: " + (await sellerWallet.getAddress()));

  let walletContract = GasFuture__factory.connect(WALLET_CONTRACT_ADDRESS, sellerWallet);

  let buyer = await walletContract.buyer();
  console.log("Buyer", buyer);

  let minCol = await walletContract.collateral();
  console.log("Min Collateral", utils.formatEther(minCol));

  let eps = await walletContract.eps();
  console.log("Eps", utils.formatEther(eps));

  let currentBlock = await provider.getBlockNumber();
  console.log("Current block", currentBlock);

  let regBlock = await walletContract.regBlock();
  console.log("Registration block", regBlock);

  if (currentBlock > regBlock) {
    console.log("Registration block expired");
    return;
  }

  let rec = await walletContract.register({
    value: minCol,
  });
  let res = await rec.wait(1);
  console.log("Mined tx", res.transactionHash);
}

main();
