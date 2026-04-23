const { expect } = require("chai");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("AttendanceRegistry", function () {
  async function deployFixture() {
    const [instructor, student] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AttendanceRegistry");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();
    return { contract, instructor, student };
  }

  it("creates session and stores metadata", async function () {
    const { contract, instructor } = await deployFixture();
    const now = await time.latest();
    const startTime = now + 60;
    const endTime = now + 3600;

    await expect(contract.createSession("CS101", "Week 1", startTime, endTime))
      .to.emit(contract, "SessionCreated")
      .withArgs(0, "CS101", "Week 1", startTime, endTime, instructor.address);

    const session = await contract.getSession(0);
    expect(session.courseCode).to.equal("CS101");
    expect(session.title).to.equal("Week 1");
    expect(session.instructor).to.equal(instructor.address);
    expect(session.active).to.equal(true);
  });

  it("marks attendance once during valid window", async function () {
    const { contract, student } = await deployFixture();
    const now = await time.latest();
    const startTime = now + 30;
    const endTime = now + 3600;

    await contract.createSession("CS102", "Lab", startTime, endTime);

    await expect(contract.connect(student).markAttendance(0)).to.be.revertedWith("Session not started");

    await time.increaseTo(startTime + 1);

    await expect(contract.connect(student).markAttendance(0))
      .to.emit(contract, "AttendanceMarked")
      .withArgs(0, student.address, anyValue);

    expect(await contract.didAttend(0, student.address)).to.equal(true);
    expect(await contract.getAttendeeCount(0)).to.equal(1);

    await expect(contract.connect(student).markAttendance(0)).to.be.revertedWith("Already marked");
  });

  it("allows instructor to close session", async function () {
    const { contract, student } = await deployFixture();
    const now = await time.latest();
    await contract.createSession("CS103", "Seminar", now + 10, now + 3000);

    await contract.closeSession(0);
    const session = await contract.getSession(0);
    expect(session.active).to.equal(false);

    await expect(contract.connect(student).markAttendance(0)).to.be.revertedWith("Session closed");
  });
});
