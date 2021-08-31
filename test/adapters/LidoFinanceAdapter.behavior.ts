import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { PoolItem } from "../types";
import { getOverrideOptions } from "../utils";

chai.use(solidity);

export function shouldBehaveLikeLidoFinanceAdapter(token: string, pool: PoolItem): void {
  it(`should deposit ${token} and receive st${token} in ${token} pool of Lido Finance`, async function () {
    const curveStableSwapStEth = "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022";
    // lpToken instance
    const lpTokenInstance = await hre.ethers.getContractAt("IERC20", pool.lpToken);
    // lido finance's deposit vault instance
    const lidoDepositInstance = await hre.ethers.getContractAt("ILidoDeposit", pool.pool);
    const balanceBeforeDeposit = await hre.ethers.provider.getBalance(this.testDeFiAdapter.address);
    const underlyingToken = pool.tokens[0];
    // 1. deposit all underlying tokens
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
    const expectedLPTokenBalanceAfterDeposit = await lidoDepositInstance.getSharesByPooledEth(balanceBeforeDeposit);
    expect(actualLPTokenBalanceAfterDeposit).to.not.be.eq(0);
    expect(actualLPTokenBalanceAfterDeposit).to.be.eq(expectedLPTokenBalanceAfterDeposit);
    // 1.2 assert whether the underlying token balance is as expected or not after deposit
    const actualBalanceAfterDeposit1 = await hre.ethers.provider.getBalance(this.testDeFiAdapter.address);
    expect(actualBalanceAfterDeposit1).to.be.eq(0);
    const actualBalanceAfterDeposit2 = await lpTokenInstance.balanceOf(this.testDeFiAdapter.address);
    const expectedBalanceAfterDeposit = BigNumber.from(balanceBeforeDeposit).sub(BigNumber.from(1));
    expect(actualBalanceAfterDeposit2).to.be.eq(expectedBalanceAfterDeposit);
    // 1.3 assert whether the amount in token is as expected or not after depositing
    const actualAmountInTokenAfterDeposit = await this.lidoFinanceAdapter.getAllAmountInToken(
      this.testDeFiAdapter.address,
      underlyingToken,
      pool.pool,
    );
    const totalPooledEtherAfterDeposit = await lidoDepositInstance.getTotalPooledEther();
    const totalSharesAfterDeposit = await lidoDepositInstance.getTotalShares();
    const expectedAmountInTokenAfterDeposit = BigNumber.from(expectedLPTokenBalanceAfterDeposit)
      .mul(BigNumber.from(totalPooledEtherAfterDeposit))
      .div(BigNumber.from(totalSharesAfterDeposit));
    expect(actualAmountInTokenAfterDeposit).to.be.eq(expectedAmountInTokenAfterDeposit);
    // 2. Withdraw all lpToken balance
    await this.testDeFiAdapter.testGetWithdrawAllCodes(
      underlyingToken,
      pool.pool,
      this.lidoFinanceAdapter.address,
      getOverrideOptions(),
    );
    const actualAllowanceAfterWithdraw = await lidoDepositInstance.allowance(
      this.testDeFiAdapter.address,
      curveStableSwapStEth,
    );
    expect(actualAllowanceAfterWithdraw).to.be.eq(0);
    // 2.1 assert whether lpToken balance is as expected or not after withdraw
    const actualLPTokenBalanceAfterWithdraw = await this.lidoFinanceAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool.pool,
    );
    const expectedLPTokenBalanceAfterWithdraw = await lidoDepositInstance.sharesOf(this.testDeFiAdapter.address);
    expect(actualLPTokenBalanceAfterWithdraw).to.be.eq(expectedLPTokenBalanceAfterWithdraw);
    expect(actualLPTokenBalanceAfterWithdraw).to.be.eq(1);
    // 2.2 assert whether underlying token balance is as expected or not after withdraw
    const expectedMinAmount = await this.lidoFinanceAdapter.calculateMinAmount(balanceBeforeDeposit);
    const actualBalanceAfterWithdraw1 = await hre.ethers.provider.getBalance(this.testDeFiAdapter.address);
    const actualBalanceAfterWithdraw2 = await lpTokenInstance.balanceOf(this.testDeFiAdapter.address);
    expect(actualBalanceAfterWithdraw1).to.be.lt(balanceBeforeDeposit);
    expect(actualBalanceAfterWithdraw1).to.be.gte(expectedMinAmount);
    expect(actualBalanceAfterWithdraw2).to.be.eq(1);
  });
  it(`should calculate minimum amount when swapping from st${token} to ${token} in ${token} pool of Lido Finance`, async function () {
    const amount = 1234;
    const actualMinAmount = await this.lidoFinanceAdapter.calculateMinAmount(amount);
    expect(actualMinAmount).to.be.eq(1228);
  });
}
