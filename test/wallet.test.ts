import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { Wallet__factory, TestToken__factory } from "../typechain-types";
import { deployContract } from "../src/deploy";
import { deployDeployer } from "../src/deployer";
import { BigNumber, Contract, ContractFactory, utils } from "ethers";

chai.use(solidity);
const { expect } = chai;

describe("Testing wallet with verified sig", () => {
  let deployerContract: Contract;
  let walletAddress: string;

  beforeEach(async () => {
    const [deployer, owner] = await ethers.getSigners();
    deployerContract = await deployDeployer(deployer);

    let nonce = await deployer.getTransactionCount();
    const walletFactory = await ethers.getContractFactory("Wallet");
    const deployTx = walletFactory.getDeployTransaction(owner.address);
    if (deployTx.data) {
      walletAddress = ethers.utils.getCreate2Address(
        deployerContract.address,
        // use owner address as salt
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(owner.address)),
        ethers.utils.keccak256(deployTx.data),
      );

      let deployedAddress = await deployContract(
        deployerContract,
        // walletFactory,
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(owner.address)),
        deployTx.data,
      );

      expect(deployedAddress).to.be.equal(walletAddress);
    }
  });

  describe("Deploys a wallet contract", async () => {
    it("Should send some funds to the deployed wallet", async () => {
      const [deployer, owner] = await ethers.getSigners();

      await owner.sendTransaction({ to: walletAddress, value: ethers.utils.parseEther("1.0") });

      let walletBalanceAfter = await ethers.provider.getBalance(walletAddress);

      expect(walletBalanceAfter).to.be.equal(ethers.utils.parseEther("1.0"));
    });

    it("Should send some funds from wallet to payee", async () => {
      const [deployer, owner, payee] = await ethers.getSigners();

      // fund the wallet
      await owner.sendTransaction({ to: walletAddress, value: ethers.utils.parseEther("1.0") });

      let sendValue = utils.parseEther("0.6");
      //let callData = utils.toUtf8Bytes("");
      let callData = "0x";

      let payeeBalanceBefore = await ethers.provider.getBalance(payee.address);
      let encodedData = utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes"],
        [payee.address, sendValue, callData],
      );

      let sig = await owner.signMessage(utils.arrayify(utils.keccak256(encodedData)));

      let walletContract = Wallet__factory.connect(walletAddress, owner);
      await walletContract.verifySig({ to: payee.address, value: sendValue, callData: callData }, sig);

      let payeeBalanceAfter = await ethers.provider.getBalance(payee.address);

      expect(payeeBalanceAfter).to.be.equal(payeeBalanceBefore.add(sendValue));
    });

    describe("Check wallet works with contract calls", async () => {
      let tokenAddress: string;
      beforeEach(async () => {
        const [deployer, owner, payee] = await ethers.getSigners();
        const tokenFactory = new TestToken__factory(deployer);
        const tokenContract = await tokenFactory.deploy();
        tokenAddress = tokenContract.address;

        expect(await tokenContract.totalSupply()).to.eq(ethers.utils.parseEther("100"));

        const toMint = ethers.utils.parseEther("1");

        await tokenContract.mint(owner.address, toMint);
        expect(await tokenContract.balanceOf(owner.address)).to.eq(toMint);
      });

      it("Should send some tokens out of the wallet", async () => {
        const [deployer, owner, payee] = await ethers.getSigners();
        const tokenInstance = new TestToken__factory(owner).attach(tokenAddress);

        const toPay = ethers.utils.parseEther("1");

        await tokenInstance.transfer(walletAddress, toPay);
        expect(await tokenInstance.balanceOf(walletAddress)).to.eq(toPay);

        // Generate transfer data
        let stabTransferTx = await tokenInstance.populateTransaction.transfer(payee.address, toPay);
        let transferData = stabTransferTx.data;

        if (transferData == undefined) {
          return;
        }

        let to = tokenInstance.address;
        let value = BigNumber.from(0);
        let callData = transferData;

        let encodedData = utils.defaultAbiCoder.encode(["address", "uint256", "bytes"], [to, value, callData]);

        let sig = await owner.signMessage(utils.arrayify(utils.keccak256(encodedData)));

        let walletContract = Wallet__factory.connect(walletAddress, owner);
        await walletContract.verifySig({ to: to, value: value, callData: callData }, sig);

        let payeeBalanceAfter = await tokenInstance.balanceOf(payee.address);
        let walletBalance = await tokenInstance.balanceOf(walletAddress);

        expect(payeeBalanceAfter).to.be.equal(toPay);
      });

      it("Should send tokens, no auth", async () => {
        const [deployer, owner, payee] = await ethers.getSigners();
        const tokenInstance = new TestToken__factory(owner).attach(tokenAddress);

        const toPay = ethers.utils.parseEther("1");

        await tokenInstance.transfer(walletAddress, toPay);
        expect(await tokenInstance.balanceOf(walletAddress)).to.eq(toPay);

        // Generate transfer data
        let stabTransferTx = await tokenInstance.populateTransaction.transfer(payee.address, toPay);
        let transferData = stabTransferTx.data;

        if (transferData == undefined) {
          return;
        }

        let to = tokenInstance.address;
        let value = BigNumber.from(0);
        let callData = transferData;

        let encodedData = utils.defaultAbiCoder.encode(["address", "uint256", "bytes"], [to, value, callData]);

        let walletContract = Wallet__factory.connect(walletAddress, owner);
        await walletContract.call({ to: to, value: value, callData: callData });

        let payeeBalanceAfter = await tokenInstance.balanceOf(payee.address);
        let walletBalance = await tokenInstance.balanceOf(walletAddress);

        expect(payeeBalanceAfter).to.be.equal(toPay);
      });
    });
  });
});
