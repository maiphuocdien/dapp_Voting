const hre = require("hardhat");

async function main() {
  const Factory = await hre.ethers.getContractFactory("AttendanceRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("AttendanceRegistry deployed to:", deployedAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
