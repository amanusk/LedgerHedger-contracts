# LedgerHedger Contracts

This is the implementations of the contracts as described in the paper [LedgerHedger: Gas Reservation for Smart-Contract Security](https://eprint.iacr.org/2022/056.pdf).

The contract `LedgerHedger` implements a basic Smart Contract Wallet, and supports [Meta-Transactions](https://medium.com/@austin_48503/ethereum-meta-transactions-90ccf0859e84) as a way to allow anyone to pay transaction fees.

Two notable functions in our implementation are `execute` and `exhaust`.
Function `execute` receives a meta-transaction, verifies the conditions, and the calls the `verifyAndExecute` function, which executes the meta-transaction.
It is up to the creator of the meta-transaction to make sure it performs the desired operation, the wallet nonce will be increased regardless of the success of the meta-transaction, as long as enough gas is provided for execution.
Function `exectue` fulfills the functionality of function `Apply` in the paper pseudo code. The naming was replaces since `apply` is a keyword in Solidity.

Function `exhaust` works by running a loop the number of times needed to exhaust the gas in `gasHedged`.
The number of iterations the loop performs is calculated as `(gasHedged - constant) / gasCostOfLoop` where the constant is the gas required to calculate the number of iterations and the call to the inner function.
The amount of gas burned is accurate up to the remainder of gasCostOfLoop, and should be accounted for by the executor.
In our implementation, `gasCostOfLoop` is `117` gas, which is negligible compared to the entire cost of the operation.

## Usage

### Pre Requisites

Before running any command, make sure to install dependencies:

Copy the provided `.env.example` file to `.env` and replace the variables accordingly.

```sh
$ yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### Test

Run the Mocha tests:

```sh
$ yarn test
```

\*Notice that the `exhaust` test might take a while. Optionally add `skip` on this test.

## Deploying the contracts

For convenience, a set of scripts for deploying and executing the functionality on chain is provided.
Notice you need to replace environment variables in `.env` accordingly.

`./scripts/deploy_regular_contract` deploys an Ethereum contract, e.g. the test token contract;

`./scripts/deploy_wallet_contract.ts` deploys a wallet contract owned by the deployer's public key.

`./scripts/init_hedge_contract.ts` Initiates a new hedge contract on the existing wallet. Notice you need to set the parameters in the script to fit your needs.

`./scripts/register_hedge_contract.ts` registers the executor of the call as the `seller` of the hedging contract

`./scripts/exhaust_hedge_contract.ts` Signs the call and broadcasts the transaction. The call will be executed if all requirements are met

`./scripts/exhaust_hedge_contract.ts` Calls the exhaust function and burns gas to remove the seller's collateral.

`./scripts/refund_hedge_contract.ts` Refunds the user with the payment if no seller registered for the contract.

## Example of deployed contract and transactions

In our example, the owner wishes to distribute ERC20 tokens to a list of addresses.
This is an common and often expensive operation on the Ethereum chain.
The owner signs the meta-transaction with the appropriate nonce.
The transaction is then executed by the seller, and results in a successful distribution of tokens from the SCW to the requested addresses.

[Contract deployment](https://goerli.etherscan.io/tx/0x95523988ef4419c3a921737df140a6fca0c6282767c58e4fe4fdb253d7698b31)

[First init](https://goerli.etherscan.io/tx/0x37d4a7332ad18753277c62b96f9e8b97d2f59c7aa22126dd23fe6825c361743f)

[Refund](https://goerli.etherscan.io/tx/0xe8b69c4ae70f40e72e3a8df353c38e449c176d9a4d7aee86b073e3a3a6a55531)

[Second init](https://goerli.etherscan.io/tx/0xfa4431ed6f747f75ef971083d3a8bddd8926f8f9ea8e604118098c9c57f703b5)

[Exhaust](https://goerli.etherscan.io/tx/0xc482ad2b3bfc1ca64b83e8fcdc29fe82652ef7d839fc24323d035f8aba0b66b0)

[Third init](https://goerli.etherscan.io/tx/0x9fee96dcfedd8f94e5442c1d8d50c92e40bcfbf27ae512f9e2e3b01e670b005f)

[Register](https://goerli.etherscan.io/tx/0xb0f3cd808d5ad637b94541f3519614dc444d2c76eaf60e4917f32bfc57df6eb9)

[Execute](https://goerli.etherscan.io/tx/0xfacb062758d24a2266b3e6d989ffe430202fdc2f23f4f73a585945e132fe0d7b)

## License

MIT
