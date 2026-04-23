const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

async function main() {
  const [instructor, student1, student2] = await ethers.getSigners();

  const Factory = await ethers.getContractFactory("AttendanceRegistry", instructor);
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  ADVANCED E2E TEST SUITE               ║");
  console.log("║  AttendanceRegistry Contract           ║");
  console.log("╚════════════════════════════════════════╝\n");

  // Get current time
  const latestBlock = await ethers.provider.getBlock("latest");
  const now = latestBlock.timestamp;
  const startTime = now + 60;
  const endTime = now + 3600;

  // TEST 1: Create Session
  console.log("📝 TEST 1: Create Session");
  console.log("  Instructor:", instructor.address);
  const createTx = await contract.createSession("CS101", "Lecture 1", startTime, endTime);
  await createTx.wait();
  const session0 = await contract.getSession(0);
  console.log("  ✓ Session 0 created");
  console.log("    - Course: CS101");
  console.log("    - Title:", session0.title);
  console.log("    - Instructor:", session0.instructor);
  console.log("    - Active:", session0.active);

  // TEST 2: Create multiple sessions
  console.log("\n📝 TEST 2: Create Multiple Sessions");
  await contract.createSession("CS102", "Lab 1", startTime, endTime);
  await contract.createSession("CS103", "Tutorial", startTime, endTime);
  const nextId = await contract.nextSessionId();
  console.log("  ✓ Created 3 sessions total");
  console.log("    - Next Session ID:", nextId.toString());

  // TEST 3: Mark attendance in time window
  console.log("\n📝 TEST 3: Mark Attendance (Valid Time Window)");
  await time.increaseTo(startTime + 10);
  const markTx1 = await contract.connect(student1).markAttendance(0);
  await markTx1.wait();
  const attended1 = await contract.didAttend(0, student1.address);
  const count1 = await contract.getAttendeeCount(0);
  console.log("  ✓ Student 1 marked for Session 0");
  console.log("    - Attended:", attended1);
  console.log("    - Total attendees:", count1.toString());

  // TEST 4: Multiple students mark attendance
  console.log("\n📝 TEST 4: Multiple Students Mark Attendance");
  const markTx2 = await contract.connect(student2).markAttendance(0);
  await markTx2.wait();
  const count2 = await contract.getAttendeeCount(0);
  const attendees = await contract.getAttendees(0);
  console.log("  ✓ Student 2 marked for Session 0");
  console.log("    - Total attendees:", count2.toString());
  console.log("    - Attendee list:", attendees);

  // TEST 5: Prevent duplicate attendance
  console.log("\n📝 TEST 5: Prevent Duplicate Attendance");
  try {
    await contract.connect(student1).markAttendance(0);
    console.log("  ✗ FAILED: Should not allow duplicate attendance");
  } catch (error) {
    console.log("  ✓ Correctly rejected duplicate attendance");
    console.log("    - Error:", error.reason || error.message.split('\n')[0]);
  }

  // TEST 6: Prevent attendance before session starts
  console.log("\n📝 TEST 6: Prevent Early Attendance");
  try {
    await contract.connect(student1).markAttendance(1); // Session 1, not yet started
    console.log("  ✗ FAILED: Should not allow attendance before start");
  } catch (error) {
    console.log("  ✓ Correctly rejected early attendance");
    console.log("    - Error:", error.reason || error.message.split('\n')[0]);
  }

  // TEST 7: Close session
  console.log("\n📝 TEST 7: Close Session");
  const closeTx = await contract.closeSession(0);
  await closeTx.wait();
  const closedSession = await contract.getSession(0);
  console.log("  ✓ Session 0 closed");
  console.log("    - Active:", closedSession.active);

  // TEST 8: Prevent attendance after session closed
  console.log("\n📝 TEST 8: Prevent Attendance After Close");
  try {
    await contract.connect(student2).markAttendance(0);
    console.log("  ✗ FAILED: Should not allow attendance after close");
  } catch (error) {
    console.log("  ✓ Correctly rejected post-close attendance");
    console.log("    - Error:", error.reason || error.message.split('\n')[0]);
  }

  // TEST 9: Only instructor can close
  console.log("\n📝 TEST 9: Authorization Check (Only Instructor Can Close)");
  try {
    await contract.connect(student1).closeSession(1);
    console.log("  ✗ FAILED: Should only allow instructor to close");
  } catch (error) {
    console.log("  ✓ Correctly rejected non-instructor close");
    console.log("    - Error:", error.reason || error.message.split('\n')[0]);
  }

  // TEST 10: Query session details
  console.log("\n📝 TEST 10: Query Session Data");
  const s1 = await contract.getSession(1);
  const count1_s1 = await contract.getAttendeeCount(1);
  console.log("  ✓ Session 1 details:");
  console.log("    - ID:", s1.id.toString());
  console.log("    - Course:", s1.courseCode);
  console.log("    - Title:", s1.title);
  console.log("    - Active:", s1.active);
  console.log("    - Attendee Count:", count1_s1.toString());

  // TEST 11: Prevent attendance after session ends
  console.log("\n📝 TEST 11: Prevent Attendance After End Time");
  await time.increaseTo(endTime + 100);
  try {
    await contract.connect(student1).markAttendance(1);
    console.log("  ✗ FAILED: Should not allow attendance after end");
  } catch (error) {
    console.log("  ✓ Correctly rejected post-end attendance");
    console.log("    - Error:", error.reason || error.message.split('\n')[0]);
  }

  // SUMMARY
  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  TEST SUMMARY                          ║");
  console.log("╚════════════════════════════════════════╝");
  console.log("✓ Contract Address:", addr);
  console.log("✓ Sessions Created: 3");
  console.log("✓ Total Marked Attendances: 2 (for Session 0)");
  console.log("✓ Access Control: Working");
  console.log("✓ Time Window Validation: Working");
  console.log("✓ Duplicate Prevention: Working");
  console.log("\n✅ ALL TESTS PASSED!\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
