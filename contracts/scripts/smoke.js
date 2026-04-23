const { ethers } = require("hardhat");

async function main() {
  const [instructor, student] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("AttendanceRegistry", instructor);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  const latestBlock = await ethers.provider.getBlock("latest");
  const now = latestBlock.timestamp;
  const startTime = now - 30;
  const endTime = now + 3600;

  const createTx = await contract.createSession("CS-E2E", "Smoke Session", startTime, endTime);
  await createTx.wait();

  const markTx = await contract.connect(student).markAttendance(0);
  await markTx.wait();

  const session = await contract.getSession(0);
  const didAttend = await contract.didAttend(0, student.address);
  const count = await contract.getAttendeeCount(0);

  console.log("[SMOKE] Contract:", address);
  console.log("[SMOKE] Session ID:", session.id.toString());
  console.log("[SMOKE] Course:", session.courseCode);
  console.log("[SMOKE] Student attended:", didAttend);
  console.log("[SMOKE] Attendee count:", count.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
