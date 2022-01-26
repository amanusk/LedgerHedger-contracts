import { utils, Contract, providers, Wallet } from "ethers";
import { SINGLETON_FACTORY_ABI } from "../src/abis/SingletonFactoryABI";
import * as dotenv from "dotenv";

import fs from "fs";
import path from "path";

dotenv.config();

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY_OWNER = process.env.PRIVATE_KEY_OWNER || "";

if (PRIVATE_KEY_OWNER === "") {
  console.warn("Must provide PRIVATE_KEY environment variable");
  process.exit(1);
}

const provider = new providers.StaticJsonRpcProvider(ETHEREUM_RPC_URL);

const ownerSigningWallet = new Wallet(PRIVATE_KEY_OWNER, provider);

async function main() {
  console.log("Owner Wallet Address: " + (await ownerSigningWallet.getAddress()));

  const singletonFactory = new Contract(
    "0xce0042B868300000d44A59004Da54A005ffdcf9f",
    SINGLETON_FACTORY_ABI,
    ownerSigningWallet,
  );

  var jsonFile = path.resolve(__dirname, "../artifacts/contracts/LedgerHedger.sol/LedgerHedger.json");
  var parsed = JSON.parse(fs.readFileSync(jsonFile).toString());

  let bytecode = parsed.bytecode;

  let nonce = await provider.getTransactionCount(ownerSigningWallet.address);
  console.log("Nonce", nonce);

  let salt = "0x123"; // this can be whatever, as long as it is consistent

  let tx = await singletonFactory.populateTransaction.deploy(bytecode, salt, {
    maxFeePerGas: utils.parseUnits("5", 9),
    maxPriorityFeePerGas: utils.parseUnits("1.5", 9),
    gasLimit: 2500000,
    nonce: nonce,
  });

  console.log("Gas Limit", tx.gasLimit);
  let rec = await ownerSigningWallet.sendTransaction(tx);
  rec.wait(1);
  console.log(rec);
}

main();
