import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { LidoFinanceAdapter } from "../../typechain";
import { TestDeFiAdapter } from "../../typechain/TestDeFiAdapter";
import { default as LidoFinancePools } from "../lido.finance-pools.json";
import { LiquidityPool, Signers } from "../types";
import { getOverrideOptions } from "../utils";
import { shouldBehaveLikeLidoFinanceAdapter } from "./LidoFinanceAdapter.behavior";

const { deployContract } = hre.waffle;

describe("Unit tests", function () {
  before(async function () {
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.owner = signers[1];
    this.signers.deployer = signers[2];
    this.signers.alice = signers[3];

    // deploy Lido Finance Adapter
    const lidoFinanceAdapterArtifact: Artifact = await hre.artifacts.readArtifact("LidoFinanceAdapter");
    this.lidoFinanceAdapter = <LidoFinanceAdapter>(
      await deployContract(this.signers.deployer, lidoFinanceAdapterArtifact, [], getOverrideOptions())
    );

    // deploy TestDeFiAdapter Contract
    const testDeFiAdapterArtifact: Artifact = await hre.artifacts.readArtifact("TestDeFiAdapter");
    this.testDeFiAdapter = <TestDeFiAdapter>(
      await deployContract(this.signers.deployer, testDeFiAdapterArtifact, [], getOverrideOptions())
    );

    // fund the TestDeFiAdapter with x tokens
    await this.signers.admin.sendTransaction({
      to: this.testDeFiAdapter.address,
      value: hre.ethers.utils.parseEther("10"),
      ...getOverrideOptions(),
    });
  });

  describe("LidoFinanceAdapter", function () {
    Object.keys(LidoFinancePools).map((token: string) => {
      shouldBehaveLikeLidoFinanceAdapter(token, (LidoFinancePools as LiquidityPool)[token]);
    });
  });
});
