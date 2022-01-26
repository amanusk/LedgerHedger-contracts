import { ethers, utils, Contract, providers, Wallet, constants, BigNumber } from "ethers";
import * as dotenv from "dotenv";

import { LedgerHedger__factory, TestToken__factory } from "../typechain-types";

dotenv.config();

const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || "http://127.0.0.1:8545";
const PRIVATE_KEY_SELLER = process.env.PRIVATE_KEY_SELLER || "";
const PRIVATE_KEY_WALLET_OWNER = process.env.PRIVATE_KEY_WALLET_OWNER || "";

const WALLET_CONTRACT_ADDRESS = process.env.WALLET_CONTRACT_ADDRESS || "";

if (PRIVATE_KEY_WALLET_OWNER === "") {
  console.warn("Must provide PRIVATE_KEY_WALLET_OWNER environment variable");
  process.exit(1);
}
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS || "";

if (PRIVATE_KEY_SELLER === "") {
  console.warn("Must provide PRIVATE_KEY_SELLER environment variable");
  process.exit(1);
}

if (WALLET_CONTRACT_ADDRESS === "") {
  console.warn("Must provide WALLET_CONTRACT_ADDRESS environment variable");
  process.exit(1);
}

if (TOKEN_ADDRESS === "") {
  console.warn("Must provide TOKEN_ADDRESS environment variable");
  process.exit(1);
}

const provider = new providers.StaticJsonRpcProvider(ETHEREUM_RPC_URL);

const sellerWallet = new Wallet(PRIVATE_KEY_SELLER, provider);
const ownerSigningWallet = new Wallet(PRIVATE_KEY_WALLET_OWNER, provider);

async function main() {
  console.log("Owner Wallet Address: " + (await sellerWallet.getAddress()));

  let walletContract = LedgerHedger__factory.connect(WALLET_CONTRACT_ADDRESS, sellerWallet);

  let buyer = await walletContract.buyer();
  console.log("Buyer", buyer);

  let minCol = await walletContract.collateral();
  console.log("Min Collateral", utils.formatEther(minCol));

  let eps = await walletContract.eps();
  console.log("Eps", utils.formatEther(eps));

  let currentBlock = await provider.getBlockNumber();
  console.log("Current block", currentBlock);

  let startBlock = await walletContract.startBlock();
  console.log("Start block", startBlock);

  if (currentBlock < startBlock) {
    console.log("Start block not reached");
    return;
  }
  const tokenInstance = TestToken__factory.connect(TOKEN_ADDRESS, ownerSigningWallet);

  let walletTokenBalance = await tokenInstance.balanceOf(walletContract.address);
  console.log("Wallet balance", ethers.utils.formatEther(walletTokenBalance));

  let toPay = ethers.utils.parseEther("0.5");

  let stabTransferTx = await tokenInstance.populateTransaction.transfer(ownerSigningWallet.address, toPay);
  let transferData = stabTransferTx.data;

  if (transferData == undefined) {
    console.log("unable to generate data");
    return;
  }

  let to = tokenInstance.address;
  let value = BigNumber.from(0);
  let callData = transferData;

  let walletNonce = await walletContract.nonce();

  let encodedData = utils.defaultAbiCoder.encode(
    ["uint256", "address", "uint256", "bytes"],
    [walletNonce, to, value, callData],
  );
  console.log("Encoded data", encodedData);

  let sig = await ownerSigningWallet.signMessage(utils.arrayify(utils.keccak256(encodedData)));
  console.log("Owner", ownerSigningWallet.address);
  console.log("Sig", sig);

  walletContract = LedgerHedger__factory.connect(walletContract.address, sellerWallet);
  //let rec = await walletContract.verifyAndExecute(
  //  { nonce: walletNonce, to: to, value: value, callData: callData },
  //  sig,
  //  {
  let rec = await walletContract.execute({ nonce: walletNonce, to: to, value: value, callData: callData }, sig, {
    gasLimit: 1000000,
  });
  let res = await rec.wait(1);
  console.log("Mined tx", res.transactionHash);
}

main();

const addressesToSend = [
  "0xa9920e434d2342c4e5c5b9ee2f85c147011ebae8",
  "0x5fd22c58bbac96a95aa61bf69693c1a56fd03c80",
  "0xc10cc82a7acae1772fe9b29abc1353063b1fc16a",
  "0xcf33d4f6aab84a479a532281fc4e4631c5a10caf",
  "0xe79d06c15ee834c807664f5fddd6bd1f16cc1e12",
  "0x55a8ef7c8b7c57e7e639c53300df76f61c2a551c",
  "0x57c987a182a37416053be67f2a7cdcb94ffa71a1",
  "0x10f1ce8bc9a4e5a2812e7bd2ec7a96386ec2dec6",
  "0xea28d3152f431b7e273d9aba9c68d89da3f35e97",
  "0x76b4f0d4dec4e14a278eb81d4b40e68e5e19999a",
  "0xb83365f875100663fe57c4ed38833bebe17668d0",
  "0xa2066410d5b0594e4528b4873096a2d2f2c5f7f0",
  "0x915c2c13bf02be601ddaea4ac7bddf4a4f3402b2",
  "0x495051cee71b514c0f951c42b92f31376843a3a3",
  "0xa5e0dd445bf79da954716095c2b70bce414c1e31",
  "0xb4c66a9e2dc46a1235a94507beccbb26e023451b",
  "0xe0ca486ab540f732be142d044b9b164d0fc7fe64",
  "0x6d8ea240bf1fe56ade067fe04e481ea1b8810637",
  "0x3dd4f837f9e99a059feb909e89ba328568f46d8e",
  "0x26ff03cec6b48fc2f592c1a98053aed8c304536b",
  "0xf424fc695b62cf25c0d29ec7cc3409452b5d0b5b",
  "0x912fa5a3d6b93d5dbd8270e746a4ce1868cb44cd",
  "0x532fcb39c1b558cd45b4944b1f302931490d7a69",
  "0xc8e617e294ba8cee305f6346c0a7c45c0f1636c7",
  "0xa8152a42071d443e05ad4c85e89147bf152f58ab",
  "0x9a22ae85f00d7489d06a5560f34a18a05b34628f",
  "0xc1fdb54f6179bc2042e7e673e7feaf7e51b94393",
  "0x85433f07464ce33ce1e2a3a1111b347c39395ac9",
  "0xb97b5ba79ba074016bc9515ead605d597b00dd42",
  "0x01406dcdd924d79965afd36fb64912659e15e1f2",
  "0xa173ddf7cda3b4136990c5548a07b5086210c7bd",
  "0x9d83ad9f744d9b6520d9066548abdf1713463c8c",
  "0x885310515509931b84fdb3b0bc4e41d376dedd15",
  "0x26d836201d11772ff1f688743b2167b735380409",
  "0x67767f5d5b93d8bcb4d09c839784f7871306564f",
  "0x2020638a62515e409c8cf36a24099c921a30f99f",
  "0x1baaac79cc07440ee9cc75f281fab284446b51fe",
  "0x1e3b30d4e51b2690a72187b40e9e3ce8ca40a86a",
  "0xba73c7dfdea5e8d86f9349f23691f7a6a750aabe",
  "0x2a691c3e196b98de5d5bd4df0255d8016dbe0c83",
  "0xb0cd01b8d2b7c8d9ddbb3edb35fe0bc028609776",
  "0x2a7720a96f7ab69b6af65b3c722f8ad3c8a444a3",
  "0xd041773b72fea1ef9b914ee5f3d117e2ce4295bf",
  "0x803e8d221b41fd4d4500c083aaa0ce09c23cd420",
  "0x8e922115328ea5ad6f8beb948cc4579749fa8c70",
  "0xd209a9ad0d76f59fe279d761515297bc823dba6b",
  "0x72c4708248444d955cc1fee56eeb35e6d5b7e817",
  "0x2028c7c7ef6a6609ce40aa8481e91d1ed7266079",
  "0x4d24f45cdc1b975d0b76a9c13f2b764aa139c2c0",
  "0x4a492ec4a63c1626ed62adf1a0397ecedab8d8c0",
  "0xa83b1456c2483053f44df8bc586d79f62e984efb",
  "0x308d63d50d4ccd021d9f022e42a7fdc3e4568349",
  "0x872173c6aeda780411f56a69cb6c5abaa5fedeaf",
  "0x42b5258872a20c32f664bd6cfaf79fa365155f6a",
  "0xadc1d2b850214fbf543a577cfb0bb560f4ef1f8c",
  "0xd772c5aa8058ba764ef32c701e632393d7efb2f5",
  "0xc93d8fb182188c56d61aa0f542d2495565449ad9",
  "0x1f036e72f0310eea8eaafff1f7c4035411d38189",
  "0x7e3aeb8dbd16d1081eb5716b11ed3d9d85520a86",
  "0xda196c633c0f58244dd68d116c6f5d2b37b22f0f",
  "0x10f11547f6e6c5a4dff276a77938398be02bd21f",
  "0xddc95bce3be8590a023847a1e27be17d88b32561",
  "0xa0199ee81ef9be8209a3754d0a1992aed84fcdf4",
  "0x37d8e111cfd9131468fa6f6e2ce549c0141c92f1",
  "0xa4ef341af3df21046bb3b8480145137d2c7ed45f",
  "0x8d65076cee2f959d02cb88b23c5a0aee31ab33b4",
  "0xb5a3a03516b482f7552d3a046dfd6b78af8ca08b",
  "0xb5aded6086bfdd323ae6d4e535056d8e8d271eda",
  "0x1f85ba03777d1cf4406c2cf31447299e5f4a8417",
  "0xc0c079942ce43e12fc6c179de156d25370a89779",
  "0xa5dd5bbe20eea6244cfec01efeacfe3679d81145",
  "0x98d2c11a928b633f538b74cd751deb43161e26c6",
  "0x0acc6e8474bb45626f5848c8d534edd686c9835b",
  "0x5b3af6f43934db7b33d82310f71ba748b800b0db",
  "0x39c1932d195a39aaa4b8fc9864c944773964f4cd",
  "0x98c8cc5be04bf58d19ca2263ff7026d7ed24b331",
  "0xd9c1e6c554d62ec9f685ca3ee6b76c452fd921b4",
  "0x03a8f5fc05a4bba0f895063624d0c65465d5d22a",
  "0xb8f1e6b9377db0126962e3d71429cc99b31e49a5",
  "0xa8b9588225c9f734f22d65d7349d4f76ce530614",
  "0x434161e3b2594d4353deb5dbd418e01f7ae75a2f",
  "0x20731abb879007de9d25469c7876af9f45d24c6a",
  "0xaeefc6d902a6a5882c563bd0d4817f5dd77dede6",
  "0x6125a0542d0d0d9f957527122393ff93dd446469",
  "0x46325e0a952b7f32f9e823f0223071be95c79153",
  "0x98a384fff5742b802d826ee98f7d9d44a48016e9",
  "0xdd6ec1f18747bddde7a7cf73d0e76e6128c55106",
  "0xdfd8f5847e72d298a44c10dc5f34f96bd897dd5c",
  "0x48c4fc21eb7029f22962b64e6339b7608583822e",
  "0x7d251fcab4d5892ff846a43f5309e57dd1a808cb",
  "0xbc61e5f13c786b6007dddd33f265f7888407c628",
  "0x62982e73a7226369c480119a95815d98d5b7969f",
  "0x2bd7743901906f0b22edf352ef0252a2a62f99dc",
  "0x0d5e320de96a1d78b113a96313cda49af51e8d35",
  "0x75c11a8c224f0a2f61ffa005d297d1c226406ea0",
  "0x21006e8d898bded5de763e219c4be30fc5a7c68f",
  "0x57a04436978fa5bd8c4f5d93d022fed04f0664fa",
  "0x904aaa3d8a3d342d6aad073d6b2778e02bf4ce6f",
  "0x2c301c0c02056113e758714a0887810f6b2c1aa3",
  "0x1fd134ffcd8096485a597850b6f2be1c8b8f3ffb",
];
