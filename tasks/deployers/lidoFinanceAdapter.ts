import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { LidoFinanceAdapter, LidoFinanceAdapter__factory } from "../../typechain";

task("deploy:LidoFinanceAdapter").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const lidoFinanceAdapterFactory: LidoFinanceAdapter__factory = await ethers.getContractFactory("LidoFinanceAdapter");
  const lidoFinanceAdapter: LidoFinanceAdapter = <LidoFinanceAdapter>await lidoFinanceAdapterFactory.deploy();
  await lidoFinanceAdapter.deployed();
  console.log("LidoFinanceAdapter deployed to: ", lidoFinanceAdapter.address);
});
