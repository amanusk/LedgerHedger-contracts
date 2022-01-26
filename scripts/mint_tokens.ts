import { ethers, utils, Contract, providers, Wallet, constants } from "ethers";
import * as dotenv from "dotenv";

import fs from "fs";
import path from "path";

dotenv.config();

const GWEI = 1000000000;

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY_DEPLOYER = process.env.PRIVATE_KEY_DEPLOYER || "";

const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "";

if (PRIVATE_KEY_DEPLOYER === "") {
  console.warn("Must provide PRIVATE_KEY environment variable");
  process.exit(1);
}

if (TOKEN_ADDRESS === "") {
  console.warn("Must provide TOKEN_ADDRESS environment variable");
  process.exit(1);
}

const provider = new providers.StaticJsonRpcProvider(ETHEREUM_RPC_URL);

const ownerSigningWallet = new Wallet(PRIVATE_KEY_DEPLOYER, provider);

async function main() {
  console.log("Owner Wallet Address: " + (await ownerSigningWallet.getAddress()));

  var jsonFile = path.resolve(__dirname, "../artifacts/contracts/TestToken.sol/TestToken.json");
  var parsed = JSON.parse(fs.readFileSync(jsonFile).toString());

  let bytecode = parsed.bytecode;

  let nonce = await provider.getTransactionCount(ownerSigningWallet.address);
  console.log("Nonce", nonce);

  let tokenContract = new Contract(TOKEN_ADDRESS, parsed.abi, ownerSigningWallet);

  await tokenContract.mint("0x3f4003AE630Fd2ecfBF892AFc6E199362b9581f3", utils.parseEther("3"));
}

main();
