import { Contract, utils, BytesLike } from "ethers";
import { deployerAddress } from "./deployer";

export const deployContract = async (deployerContract: Contract, salt: string, deployTxData: BytesLike) => {
  let deployedContractAddress = utils.getCreate2Address(deployerAddress, salt, utils.keccak256(deployTxData));

  let balance = await deployerContract.provider.getBalance(deployedContractAddress);

  // Gas estimation must be maid manually
  await deployerContract.deploy(deployTxData, salt, { gasLimit: 3000000 });

  // let code = await deployerContract.provider.getCode(deployedContractAddress);
  balance = await deployerContract.provider.getBalance(deployedContractAddress);

  let block = await deployerContract.provider.getBlockNumber();
  return deployedContractAddress;
};
