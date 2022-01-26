import { ethers, utils, Contract, providers, Wallet, constants } from "ethers";
import * as dotenv from "dotenv";

import fs from "fs";
import path from "path";

dotenv.config();

const GWEI = 1000000000;

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY_WALLET_OWNER = process.env.PRIVATE_KEY_WALLET_OWNER || "";

if (PRIVATE_KEY_WALLET_OWNER === "") {
  console.warn("Must provide PRIVATE_KEY_WALLET_OWNER environment variable");
  process.exit(1);
}

const provider = new providers.StaticJsonRpcProvider(ETHEREUM_RPC_URL);

const ownerSigningWallet = new Wallet(PRIVATE_KEY_WALLET_OWNER, provider);

async function main() {
  console.log("Owner Wallet Address: " + (await ownerSigningWallet.getAddress()));

  var jsonFile = path.resolve(__dirname, "../artifacts/contracts/GasFuture.sol/GasFuture.json");
  var parsed = JSON.parse(fs.readFileSync(jsonFile).toString());

  let bytecode = parsed.bytecode;

  let nonce = await provider.getTransactionCount(ownerSigningWallet.address);
  console.log("Nonce", nonce);

  const factory = new ethers.ContractFactory(parsed.abi, parsed.bytecode, ownerSigningWallet);
  const contract = await factory.deploy(ownerSigningWallet.address, {
    maxFeePerGas: utils.parseUnits("5", 9),
    maxPriorityFeePerGas: utils.parseUnits("1.5", 9),
  });
  await contract.deployed();
  console.log(`Deployment successful! Contract Address: ${contract.address}`);
}

main();
