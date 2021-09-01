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
    const underlyingToken = pool.tokens[0];
    const poolValueBeforeDeposit = await this.lidoFinanceAdapter.getPoolValue(pool.pool, underlyingToken);
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
    const expectedLPTokenBalanceAfterDeposit = await this.lidoFinanceAdapter.calculateAmountInLPToken(
      underlyingToken,
      pool.pool,
      balanceBeforeDeposit,
    );
    expect(actualLPTokenBalanceAfterDeposit).to.not.be.eq(0);
    expect(actualLPTokenBalanceAfterDeposit).to.be.eq(expectedLPTokenBalanceAfterDeposit);
    // 1.2 assert whether the underlying token balance is as expected or not after deposit
    const actualBalanceAfterDeposit1 = await hre.ethers.provider.getBalance(this.testDeFiAdapter.address);
    expect(actualBalanceAfterDeposit1).to.be.eq(0);
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
    // 1.4 assert whether the calculated redeemable lpToken amount is as expected or not after deposit
    const actualRedeemableLPTokenAmountAfterDeposit = await this.lidoFinanceAdapter.calculateRedeemableLPTokenAmount(
      this.testDeFiAdapter.address,
      underlyingToken,
      pool.pool,
      expectedLPTokenBalanceAfterDeposit,
    );
    expect(actualRedeemableLPTokenAmountAfterDeposit).to.be.eq(expectedAmountInTokenAfterDeposit);
    // 1.5 assert whether the redeemable amount is sufficient or not after deposit
    const actualIsRedeemableAmountSufficientAfterDeposit = await this.lidoFinanceAdapter.isRedeemableAmountSufficient(
      this.testDeFiAdapter.address,
      underlyingToken,
      pool.pool,
      expectedLPTokenBalanceAfterDeposit,
    );
    expect(actualIsRedeemableAmountSufficientAfterDeposit).to.be.true;
    // 1.6 assert whether the pool value is as expected or not after deposit
    const actualPoolValueAfterDeposit = await this.lidoFinanceAdapter.getPoolValue(pool.pool, underlyingToken);
    const expectedPoolValueAfterDeposit = BigNumber.from(poolValueBeforeDeposit)
      .add(expectedAmountInTokenAfterDeposit)
      .add(1);
    expect(actualPoolValueAfterDeposit).to.be.eq(expectedPoolValueAfterDeposit);
    // 2. Withdraw all lpToken balance
    await this.testDeFiAdapter.testGetWithdrawAllCodes(
      underlyingToken,
      pool.pool,
      this.lidoFinanceAdapter.address,
      getOverrideOptions(),
    );
    const actualAllowanceAfterWithdraw = await lidoDepositInstance.allowance(this.testDeFiAdapter.address, pool.swap);
    expect(actualAllowanceAfterWithdraw).to.be.eq(0);
    // 2.1 assert whether lpToken balance is as expected or not after withdraw
    const actualLPTokenBalanceAfterWithdraw = await this.lidoFinanceAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool.pool,
    );
    const expectedLPTokenBalanceAfterWithdraw = await lidoDepositInstance.sharesOf(this.testDeFiAdapter.address);
    expect(actualLPTokenBalanceAfterWithdraw).to.be.eq(expectedLPTokenBalanceAfterWithdraw);
    // 2.2 assert whether underlying token balance is as expected or not after withdraw
    const expectedMinAmount = await this.lidoFinanceAdapter.calculateMinAmountAfterSwap(balanceBeforeDeposit);
    const actualBalanceAfterWithdraw = await hre.ethers.provider.getBalance(this.testDeFiAdapter.address);
    expect(actualBalanceAfterWithdraw).to.be.lt(balanceBeforeDeposit);
    expect(actualBalanceAfterWithdraw).to.be.gte(expectedMinAmount);
  });

  it(`should return the reward token and assert that staking is not enabled`, async function () {
    // assert reward token
    const actualRewardToken = await this.lidoFinanceAdapter.getRewardToken(pool.pool);
    expect(actualRewardToken).to.be.eq(pool.rewardTokens[0]);
    // assert cannot stake
    const actualCanStake = await this.lidoFinanceAdapter.canStake(pool.pool);
    expect(actualCanStake).to.be.false;
  });

  it(`should check correctness of view function return values`, async function () {
    const underlyingToken = pool.tokens[0];
    // assert underlying token
    const actualUnderlyingTokens = await this.lidoFinanceAdapter.getUnderlyingTokens(pool.pool, underlyingToken);
    expect(actualUnderlyingTokens[0]).to.be.eq(underlyingToken);
    // assert liquidity pool token
    const actualLiquidityPoolToken = await this.lidoFinanceAdapter.getLiquidityPoolToken(underlyingToken, pool.pool);
    expect(actualLiquidityPoolToken).to.be.eq(pool.lpToken);
    // assert redeemable amount is not sufficient
    const actualLPTokenBalance = await this.lidoFinanceAdapter.getLiquidityPoolTokenBalance(
      this.testDeFiAdapter.address,
      this.testDeFiAdapter.address, // placeholder of type address
      pool.pool,
    );
    const actualIsRedeemableAmountSufficient = await this.lidoFinanceAdapter.isRedeemableAmountSufficient(
      this.testDeFiAdapter.address,
      underlyingToken,
      pool.pool,
      actualLPTokenBalance.add(1),
    );
    expect(actualIsRedeemableAmountSufficient).to.be.eq(false);
  });
}
