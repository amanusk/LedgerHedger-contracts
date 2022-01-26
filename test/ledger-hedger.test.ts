import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { LedgerHedger__factory, TestToken__factory } from "../typechain-types";
import { BigNumber, Contract, ContractFactory, utils } from "ethers";

chai.use(solidity);
const { expect } = chai;

describe("Testing wallet with verified sig", () => {
  describe("Test vanilla wallet functionality", async () => {
    let walletAddress: string;
    beforeEach(async () => {
      const [deployer, owner] = await ethers.getSigners();

      let nonce = await deployer.getTransactionCount();
      const walletFactory = await ethers.getContractFactory("LedgerHedger");
      let walletContract = await walletFactory.deploy(owner.address);
      walletAddress = walletContract.address;
    });

    describe("Test sending ether", async () => {
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

        let walletContract = LedgerHedger__factory.connect(walletAddress, owner);

        let walletNonce = await walletContract.nonce();
        let payeeBalanceBefore = await ethers.provider.getBalance(payee.address);
        let encodedData = utils.defaultAbiCoder.encode(
          ["uint256", "address", "uint256", "bytes"],
          [walletNonce, payee.address, sendValue, callData],
        );

        let sig = await owner.signMessage(utils.arrayify(utils.keccak256(encodedData)));

        await walletContract.verifyAndExecute(
          { nonce: walletNonce, to: payee.address, value: sendValue, callData: callData },
          sig,
        );

        let payeeBalanceAfter = await ethers.provider.getBalance(payee.address);

        expect(payeeBalanceAfter).to.be.equal(payeeBalanceBefore.add(sendValue));

        await expect(
          walletContract.verifyAndExecute(
            { nonce: walletNonce, to: payee.address, value: sendValue, callData: callData },
            sig,
          ),
        ).to.be.revertedWith("Nonce incorrect");
      });
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

        let walletContract = LedgerHedger__factory.connect(walletAddress, owner);
        let walletNonce = await walletContract.nonce();

        let encodedData = utils.defaultAbiCoder.encode(
          ["uint256", "address", "uint256", "bytes"],
          [walletNonce, to, value, callData],
        );

        let sig = await owner.signMessage(utils.arrayify(utils.keccak256(encodedData)));

        await walletContract.verifyAndExecute({ nonce: walletNonce, to: to, value: value, callData: callData }, sig, {
          gasLimit: 150000,
        });

        let payeeBalanceAfter = await tokenInstance.balanceOf(payee.address);
        let walletBalance = await tokenInstance.balanceOf(walletAddress);

        expect(payeeBalanceAfter).to.be.equal(toPay);
      });
    });
  });

  describe("Check hedge function", async () => {
    let walletAddress: string;
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

      const walletFactory = await ethers.getContractFactory("LedgerHedger");
      let walletContract = await walletFactory.deploy(owner.address);
      walletAddress = walletContract.address;
    });

    it("Should initiate the wallet with the correct blocks", async () => {
      const [deployer, owner, payee] = await ethers.getSigners();
      const tokenInstance = new TestToken__factory(owner).attach(tokenAddress);

      let walletContract = LedgerHedger__factory.connect(walletAddress, owner);
      let currentBlock = await ethers.provider.getBlockNumber();
      let gasHedged = BigNumber.from(1000000);
      let minCol = ethers.utils.parseEther("1");

      // let code = ethers.provider.getCode(walletAddress);

      let payment = ethers.utils.parseEther("1");
      let eps = ethers.utils.parseEther("0.01");

      await walletContract.init(currentBlock + 10, currentBlock + 20, currentBlock + 30, gasHedged, minCol, eps, {
        value: payment.add(eps),
      });
    });

    it("Should test a miner registering for the contract", async () => {
      const [deployer, owner, payee, miner] = await ethers.getSigners();
      const tokenInstance = new TestToken__factory(owner).attach(tokenAddress);

      let currentBlock = await ethers.provider.getBlockNumber();

      let walletContract = LedgerHedger__factory.connect(walletAddress, owner);
      let gasHedged = BigNumber.from(1000000);
      let minCol = ethers.utils.parseEther("1");

      let payment = ethers.utils.parseEther("1");
      let eps = ethers.utils.parseEther("0.01");

      await walletContract.init(currentBlock + 10, currentBlock + 20, currentBlock + 30, gasHedged, minCol, eps, {
        value: payment.add(eps),
      });

      walletContract = LedgerHedger__factory.connect(walletAddress, miner);
      let walletUser = await walletContract.buyer();

      let minColQueried = await walletContract.collateral();

      await walletContract.register({ value: minColQueried });
      let walletStatus = await walletContract.status();
    });

    it("Should transfer tokens from the wallet to the payee with tx sent by miner", async () => {
      const [deployer, owner, payee, miner] = await ethers.getSigners();

      let currentBlock = await ethers.provider.getBlockNumber();
      // INIT
      let walletContract = LedgerHedger__factory.connect(walletAddress, owner);
      let gasHedged = BigNumber.from(1000000);
      let minCol = ethers.utils.parseEther("1");

      let payment = ethers.utils.parseEther("1");
      let eps = ethers.utils.parseEther("0.01");

      await walletContract.init(currentBlock + 10, currentBlock + 20, currentBlock + 30, gasHedged, minCol, eps, {
        value: payment.add(eps),
      });

      // REGISTER
      walletContract = LedgerHedger__factory.connect(walletAddress, miner);
      let walletUser = await walletContract.buyer();

      let minColQueried = await walletContract.collateral();

      await walletContract.register({ value: minColQueried });
      let walletStatus = await walletContract.status();

      /// Setup execution

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

      walletContract = LedgerHedger__factory.connect(walletAddress, miner);
      let walletNonce = await walletContract.nonce();

      let encodedData = utils.defaultAbiCoder.encode(
        ["uint256", "address", "uint256", "bytes"],
        [walletNonce, to, value, callData],
      );

      let sig = await owner.signMessage(utils.arrayify(utils.keccak256(encodedData)));

      currentBlock = await ethers.provider.getBlockNumber();
      let startBlock = await walletContract.startBlock();
      let diff = BigNumber.from(startBlock).sub(currentBlock).toNumber();

      for (let i = 0; i < diff; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      let currentBlockAfterMine = await ethers.provider.getBlockNumber();

      await walletContract.execute({ nonce: walletNonce, to: to, value: value, callData: callData }, sig, {
        gasLimit: 200000,
      });
      // await walletContract.verifyAndExecute({ nonce: walletNonce, to: to, value: value, callData: callData }, sig);

      let payeeBalanceAfter = await tokenInstance.balanceOf(payee.address);
      let walletBalance = await tokenInstance.balanceOf(walletAddress);

      expect(payeeBalanceAfter).to.be.equal(toPay);
    });

    it("Should fail to use reserved funds for anything else", async () => {
      const [deployer, owner, payee, miner] = await ethers.getSigners();

      let currentBlock = await ethers.provider.getBlockNumber();
      // INIT
      let walletContract = LedgerHedger__factory.connect(walletAddress, owner);
      let gasHedged = BigNumber.from(1000000);
      let minCol = ethers.utils.parseEther("1");

      let payment = ethers.utils.parseEther("1");
      let eps = ethers.utils.parseEther("0.01");

      await walletContract.init(currentBlock + 10, currentBlock + 20, currentBlock + 30, gasHedged, minCol, eps, {
        value: payment.add(eps),
      });

      let walletBalance = await ethers.provider.getBalance(walletContract.address);

      let sendValue = walletBalance;
      let callData = "0x";

      walletContract = LedgerHedger__factory.connect(walletAddress, owner);

      let walletNonce = await walletContract.nonce();
      let payeeBalanceBefore = await ethers.provider.getBalance(payee.address);
      let encodedData = utils.defaultAbiCoder.encode(
        ["uint256", "address", "uint256", "bytes"],
        [walletNonce, payee.address, sendValue, callData],
      );

      let sig = await owner.signMessage(utils.arrayify(utils.keccak256(encodedData)));

      await expect(
        walletContract.verifyAndExecute(
          { nonce: walletNonce, to: payee.address, value: sendValue, callData: callData },
          sig,
        ),
      ).to.be.revertedWith("cannot spend locked funds");

      let payeeBalanceAfter = await ethers.provider.getBalance(payee.address);

      // REGISTER
      walletContract = LedgerHedger__factory.connect(walletAddress, miner);
      let walletUser = await walletContract.buyer();

      let minColQueried = await walletContract.collateral();

      await walletContract.register({ value: minColQueried });
      let walletStatus = await walletContract.status();

      /// Setup execution
      walletBalance = await ethers.provider.getBalance(walletContract.address);

      sendValue = walletBalance;
      callData = "0x";

      walletContract = LedgerHedger__factory.connect(walletAddress, owner);

      walletNonce = await walletContract.nonce();
      payeeBalanceBefore = await ethers.provider.getBalance(payee.address);
      encodedData = utils.defaultAbiCoder.encode(
        ["uint256", "address", "uint256", "bytes"],
        [walletNonce, payee.address, sendValue, callData],
      );

      sig = await owner.signMessage(utils.arrayify(utils.keccak256(encodedData)));

      await expect(
        walletContract.verifyAndExecute(
          { nonce: walletNonce, to: payee.address, value: sendValue, callData: callData },
          sig,
        ),
      ).to.be.revertedWith("cannot spend locked funds");

      payeeBalanceAfter = await ethers.provider.getBalance(payee.address);
    });

    it("Should fail to use execute if tx is signed by someone else", async () => {
      const [deployer, owner, payee, miner] = await ethers.getSigners();

      let currentBlock = await ethers.provider.getBlockNumber();
      // INIT
      let walletContract = LedgerHedger__factory.connect(walletAddress, owner);
      let gasHedged = BigNumber.from(1000000);
      let minCol = ethers.utils.parseEther("1");

      let payment = ethers.utils.parseEther("1");
      let eps = ethers.utils.parseEther("0.01");

      await walletContract.init(currentBlock + 10, currentBlock + 20, currentBlock + 30, gasHedged, minCol, eps, {
        value: payment.add(eps),
      });

      // REGISTER
      walletContract = LedgerHedger__factory.connect(walletAddress, miner);
      let walletUser = await walletContract.buyer();

      let minColQueried = await walletContract.collateral();

      await walletContract.register({ value: minColQueried });
      let walletStatus = await walletContract.status();

      /// Setup execution
      let walletBalance = await ethers.provider.getBalance(walletContract.address);

      let sendValue = ethers.utils.parseEther("0.1");
      let callData = "0x";

      await owner.sendTransaction({ to: walletContract.address, value: sendValue });

      walletContract = LedgerHedger__factory.connect(walletAddress, owner);

      let walletNonce = await walletContract.nonce();
      let payeeBalanceBefore = await ethers.provider.getBalance(payee.address);
      let encodedData = utils.defaultAbiCoder.encode(
        ["uint256", "address", "uint256", "bytes"],
        [walletNonce, payee.address, sendValue, callData],
      );

      // create sig by someone else
      let sig = await miner.signMessage(utils.arrayify(utils.keccak256(encodedData)));

      await expect(
        walletContract.verifyAndExecute(
          { nonce: walletNonce, to: payee.address, value: sendValue, callData: callData },
          sig,
        ),
      ).to.be.revertedWith("UNAUTH");

      let payeeBalanceAfter = await ethers.provider.getBalance(payee.address);
    });

    it("Should pay the miner even if tx removes ETH from wallet", async () => {
      const [deployer, owner, payee, miner] = await ethers.getSigners();

      let currentBlock = await ethers.provider.getBlockNumber();
      // INIT
      let walletContract = LedgerHedger__factory.connect(walletAddress, owner);
      let gasHedged = BigNumber.from(1000000);
      let minCol = ethers.utils.parseEther("1");

      let payment = ethers.utils.parseEther("1");
      let eps = ethers.utils.parseEther("0.01");

      await walletContract.init(currentBlock + 10, currentBlock + 20, currentBlock + 30, gasHedged, minCol, eps, {
        value: payment.add(eps),
      });

      // REGISTER
      walletContract = LedgerHedger__factory.connect(walletAddress, miner);
      let walletUser = await walletContract.buyer();

      let minColQueried = await walletContract.collateral();

      await walletContract.register({ value: minColQueried });
      let walletStatus = await walletContract.status();

      /// Setup execution

      // Generate transfer data
      //
      let walletBalance = await ethers.provider.getBalance(walletContract.address);
      let callData = "0x";

      let walletNonce = await walletContract.nonce();
      let encodedData = utils.defaultAbiCoder.encode(
        ["uint256", "address", "uint256", "bytes"],
        [walletNonce, payee.address, walletBalance, callData],
      );

      let sig = await owner.signMessage(utils.arrayify(utils.keccak256(encodedData)));

      walletContract = LedgerHedger__factory.connect(walletAddress, miner);

      currentBlock = await ethers.provider.getBlockNumber();
      let startBlock = await walletContract.startBlock();
      let diff = BigNumber.from(startBlock).sub(currentBlock).toNumber();

      for (let i = 0; i < diff; i++) {
        await ethers.provider.send("evm_mine", []);
      }

      let currentBlockAfterMine = await ethers.provider.getBlockNumber();

      let payeeBalanceBefore = await ethers.provider.getBalance(payee.address);

      let walletBalanceBefore = await ethers.provider.getBalance(walletContract.address);

      let minerBalanceBefore = await ethers.provider.getBalance(miner.address);

      await walletContract.execute(
        { nonce: walletNonce, to: payee.address, value: walletBalance, callData: callData },
        sig,
      );

      let minerBalanceAfter = await ethers.provider.getBalance(miner.address);
      expect(minerBalanceAfter).to.be.gt(minerBalanceBefore);
    });

    describe("Check exhaust functionality", async () => {
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

      it("Should test burning the gas upon exaustion", async () => {
        const [deployer, owner, payee, miner] = await ethers.getSigners();
        let tokenInstance = new TestToken__factory(owner).attach(tokenAddress);

        let walletContract = LedgerHedger__factory.connect(walletAddress, owner);
        let currentBlock = await ethers.provider.getBlockNumber();
        let gasHedged = BigNumber.from(2000000);
        let minCol = ethers.utils.parseEther("1");

        let payment = ethers.utils.parseEther("1");
        let eps = ethers.utils.parseEther("0.01");

        await walletContract.init(currentBlock + 10, currentBlock + 20, currentBlock + 30, gasHedged, minCol, eps, {
          value: payment.add(eps),
        });

        walletContract = LedgerHedger__factory.connect(walletAddress, miner);
        let walletUser = await walletContract.buyer();

        let minColQueried = await walletContract.collateral();

        await walletContract.register({ value: minColQueried });
        let walletStatus = await walletContract.status();

        currentBlock = await ethers.provider.getBlockNumber();
        let startBlock = await walletContract.startBlock();
        let diff = BigNumber.from(startBlock).sub(currentBlock).toNumber();

        for (let i = 0; i < diff; i++) {
          await ethers.provider.send("evm_mine", []);
        }

        let currentBlockAfterMine = await ethers.provider.getBlockNumber();

        let tx = await walletContract.populateTransaction.exhaust();
        // let tx = await walletContract.populateTransaction.loopUntil();

        let estimatedGas = await ethers.provider.estimateGas(tx);

        await walletContract.exhaust();

        // TODO: check balances
      }).timeout(100000);
    });

    describe("Check refund functionality", async () => {
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

      it("Should test recovering the locked funds by the user", async () => {
        const [deployer, owner, payee, miner] = await ethers.getSigners();
        let tokenInstance = new TestToken__factory(owner).attach(tokenAddress);

        let walletContract = LedgerHedger__factory.connect(walletAddress, owner);
        let currentBlock = await ethers.provider.getBlockNumber();
        let gasHedged = BigNumber.from(2000000);
        let minCol = ethers.utils.parseEther("1");

        let payment = ethers.utils.parseEther("1");
        let eps = ethers.utils.parseEther("0.01");

        await walletContract.init(currentBlock + 10, currentBlock + 20, currentBlock + 30, gasHedged, minCol, eps, {
          value: payment.add(eps),
        });

        currentBlock = await ethers.provider.getBlockNumber();
        let startBlock = await walletContract.startBlock();
        let diff = BigNumber.from(startBlock).sub(currentBlock).toNumber();

        for (let i = 0; i < diff; i++) {
          await ethers.provider.send("evm_mine", []);
        }

        let currentBlockAfterMine = await ethers.provider.getBlockNumber();

        let userBalanceBefore = await ethers.provider.getBalance(owner.address);
        let walletBalance = await ethers.provider.getBalance(walletAddress);
        await walletContract.refund();
        let userBalanceAfter = await ethers.provider.getBalance(owner.address);
        walletBalance = await ethers.provider.getBalance(walletAddress);
        expect(userBalanceAfter).to.be.gt(userBalanceBefore);
      });
    });

    describe("Check double init functionality", async () => {
      it("Should test refunding then starting the wallet again", async () => {
        const [deployer, owner, payee, miner] = await ethers.getSigners();

        let walletContract = LedgerHedger__factory.connect(walletAddress, owner);
        let currentBlock = await ethers.provider.getBlockNumber();
        let gasHedged = BigNumber.from(2000000);
        let minCol = ethers.utils.parseEther("1");

        let payment = ethers.utils.parseEther("1");
        let eps = ethers.utils.parseEther("0.01");

        await walletContract.init(currentBlock + 10, currentBlock + 20, currentBlock + 30, gasHedged, minCol, eps, {
          value: payment.add(eps),
        });

        currentBlock = await ethers.provider.getBlockNumber();
        let startBlock = await walletContract.startBlock();
        let diff = BigNumber.from(startBlock).sub(currentBlock).toNumber();

        for (let i = 0; i < diff; i++) {
          await ethers.provider.send("evm_mine", []);
        }

        let currentBlockAfterMine = await ethers.provider.getBlockNumber();

        let userBalanceBefore = await ethers.provider.getBalance(owner.address);
        let walletBalance = await ethers.provider.getBalance(walletAddress);
        await walletContract.refund();
        let userBalanceAfter = await ethers.provider.getBalance(owner.address);
        walletBalance = await ethers.provider.getBalance(walletAddress);
        expect(userBalanceAfter).to.be.gt(userBalanceBefore);

        currentBlock = await ethers.provider.getBlockNumber();
        gasHedged = BigNumber.from(3000000);
        minCol = ethers.utils.parseEther("2");

        payment = ethers.utils.parseEther("1");
        eps = ethers.utils.parseEther("0.01");

        await walletContract.init(currentBlock + 10, currentBlock + 20, currentBlock + 30, gasHedged, minCol, eps, {
          value: payment.add(eps),
        });
      });
    });
  });
});
