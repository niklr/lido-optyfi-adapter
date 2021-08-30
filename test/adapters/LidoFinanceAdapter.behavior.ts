import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { PoolItem } from "../types";
import { getOverrideOptions } from "../utils";

chai.use(solidity);

export function shouldBehaveLikeLidoFinanceAdapter(token: string, pool: PoolItem): void {
  it(`should deposit ${token} and receive st${token} in ${token} pool of Lido Finance`, async function () {
    // lido finance's deposit vault instance
    const lidoDepositInstance = await hre.ethers.getContractAt("ILidoDeposit", pool.pool);
    const balanceBeforeDeposit = await hre.ethers.provider.getBalance(this.testDeFiAdapter.address);
    // 1. deposit some underlying tokens
    await this.testDeFiAdapter.testGetDepositAllCodes(
      pool.tokens[0],
      pool.pool,
      this.lidoFinanceAdapter.address,
      getOverrideOptions(),
    );
    // 1.1 assert whether lptoken balance is as expected or not after deposit
    const actualLPTokenBalanceAfterDeposit = await this.lidoFinanceAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool.pool,
    );
    const expectedLPTokenBalanceAfterDeposit = await this.lidoFinanceAdapter.getSharesByPooledEth(balanceBeforeDeposit);
    expect(actualLPTokenBalanceAfterDeposit).to.not.be.eq(0);
    expect(actualLPTokenBalanceAfterDeposit).to.be.eq(expectedLPTokenBalanceAfterDeposit);
    // 1.2 assert whether the underlying token balance is as expected or not after deposit
    const actualBalanceAfterDeposit = await hre.ethers.provider.getBalance(this.testDeFiAdapter.address);
    expect(actualBalanceAfterDeposit).to.be.eq(0);
    // 1.3 assert whether the amount in token is as expected or not after depositing
    const actualAmountInTokenAfterDeposit = await this.lidoFinanceAdapter.getAllAmountInToken(
      this.testDeFiAdapter.address,
      pool.tokens[0],
      pool.pool,
    );
    const totalPooledEtherAfterDeposit = await lidoDepositInstance.getTotalPooledEther();
    const totalSharesAfterDeposit = await lidoDepositInstance.getTotalShares();
    const expectedAmountInTokenAfterDeposit = BigNumber.from(expectedLPTokenBalanceAfterDeposit)
      .mul(BigNumber.from(totalPooledEtherAfterDeposit))
      .div(BigNumber.from(totalSharesAfterDeposit));
    expect(actualAmountInTokenAfterDeposit).to.be.eq(expectedAmountInTokenAfterDeposit);
  });
}
