import { useMemo, useState } from "react";
import { ethers } from "ethers";
import AttendanceRegistry from "./abi/AttendanceRegistry.json";
import { CONTRACT_ADDRESS, REQUIRED_CHAIN_ID } from "./config";

function toUnix(datetimeLocal) {
  if (!datetimeLocal) {
    return 0;
  }
  return Math.floor(new Date(datetimeLocal).getTime() / 1000);
}

function formatUnix(unixTs) {
  if (!unixTs) {
    return "-";
  }
  return new Date(Number(unixTs) * 1000).toLocaleString();
}

export default function App() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState("Ready");

  const [courseCode, setCourseCode] = useState("CS101");
  const [title, setTitle] = useState("Week 1");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [markSessionId, setMarkSessionId] = useState("0");
  const [viewSessionId, setViewSessionId] = useState("0");
  const [sessionData, setSessionData] = useState(null);
  const [myAttendance, setMyAttendance] = useState(null);
  const [attendeeCount, setAttendeeCount] = useState(null);

  const networkOk = chainId === REQUIRED_CHAIN_ID;

  const shortAccount = useMemo(() => {
    if (!account) return "Not connected";
    return `${account.slice(0, 6)}...${account.slice(-4)}`;
  }, [account]);

  async function getProvider() {
    if (!window.ethereum) {
      throw new Error("MetaMask not found. Please install MetaMask.");
    }
    return new ethers.BrowserProvider(window.ethereum);
  }

  async function getContract(withSigner = false) {
    const provider = await getProvider();
    const runner = withSigner ? await provider.getSigner() : provider;
    return new ethers.Contract(CONTRACT_ADDRESS, AttendanceRegistry.abi, runner);
  }

  async function connectWallet() {
    try {
      const provider = await getProvider();
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();

      setAccount(accounts[0] || "");
      setChainId(Number(network.chainId));
      setStatus("Wallet connected.");
    } catch (error) {
      setStatus(error.message || "Failed to connect wallet");
    }
  }

  async function createSession() {
    try {
      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.length < 10) {
        throw new Error("Set VITE_CONTRACT_ADDRESS in frontend/.env first.");
      }
      const startTime = toUnix(startAt);
      const endTime = toUnix(endAt);
      if (!startTime || !endTime) {
        throw new Error("Please choose valid start and end time.");
      }
      const contract = await getContract(true);
      setStatus("Submitting createSession transaction...");
      const tx = await contract.createSession(courseCode, title, startTime, endTime);
      await tx.wait();
      setStatus("Session created successfully.");
    } catch (error) {
      setStatus(error.reason || error.shortMessage || error.message || "Create session failed");
    }
  }

  async function markAttendance() {
    try {
      const contract = await getContract(true);
      setStatus("Submitting markAttendance transaction...");
      const tx = await contract.markAttendance(markSessionId);
      await tx.wait();
      setStatus("Attendance marked successfully.");
    } catch (error) {
      setStatus(error.reason || error.shortMessage || error.message || "Mark attendance failed");
    }
  }

  async function loadSession() {
    try {
      const contract = await getContract(false);
      const [session, total] = await Promise.all([
        contract.getSession(viewSessionId),
        contract.getAttendeeCount(viewSessionId)
      ]);

      setSessionData(session);
      setAttendeeCount(Number(total));

      if (account) {
        const mine = await contract.didAttend(viewSessionId, account);
        setMyAttendance(mine);
      } else {
        setMyAttendance(null);
      }

      setStatus("Session loaded.");
    } catch (error) {
      setStatus(error.reason || error.shortMessage || error.message || "Load session failed");
      setSessionData(null);
      setAttendeeCount(null);
      setMyAttendance(null);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Attendance DApp</h1>
        <p>Solidity + React + MetaMask + Ethers.js</p>
      </header>

      <section className="card">
        <h2>Wallet</h2>
        <p><strong>Account:</strong> {shortAccount}</p>
        <p><strong>Chain ID:</strong> {chainId ?? "-"}</p>
        <p><strong>Required:</strong> {REQUIRED_CHAIN_ID}</p>
        <p><strong>Contract:</strong> {CONTRACT_ADDRESS || "(missing in .env)"}</p>
        <button onClick={connectWallet}>Connect MetaMask</button>
        {!networkOk && chainId !== null && (
          <p className="warning">Wrong network. Switch MetaMask to chain {REQUIRED_CHAIN_ID}.</p>
        )}
      </section>

      <section className="card">
        <h2>Create Session (Instructor)</h2>
        <input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="Course Code" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <label>
          Start Time
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </label>
        <label>
          End Time
          <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        </label>
        <button onClick={createSession} disabled={!networkOk}>Create Session</button>
      </section>

      <section className="card">
        <h2>Mark Attendance (Student)</h2>
        <input
          type="number"
          min="0"
          value={markSessionId}
          onChange={(e) => setMarkSessionId(e.target.value)}
          placeholder="Session ID"
        />
        <button onClick={markAttendance} disabled={!networkOk}>Mark Attendance</button>
      </section>

      <section className="card">
        <h2>Session Lookup</h2>
        <input
          type="number"
          min="0"
          value={viewSessionId}
          onChange={(e) => setViewSessionId(e.target.value)}
          placeholder="Session ID"
        />
        <button onClick={loadSession}>Load Session</button>

        {sessionData && (
          <div className="session-box">
            <p><strong>ID:</strong> {sessionData.id.toString()}</p>
            <p><strong>Course:</strong> {sessionData.courseCode}</p>
            <p><strong>Title:</strong> {sessionData.title}</p>
            <p><strong>Start:</strong> {formatUnix(sessionData.startTime)}</p>
            <p><strong>End:</strong> {formatUnix(sessionData.endTime)}</p>
            <p><strong>Instructor:</strong> {sessionData.instructor}</p>
            <p><strong>Active:</strong> {sessionData.active ? "Yes" : "No"}</p>
            <p><strong>Attendee Count:</strong> {attendeeCount ?? "-"}</p>
            <p><strong>My Attendance:</strong> {myAttendance === null ? "-" : myAttendance ? "Marked" : "Not Marked"}</p>
          </div>
        )}
      </section>

      <footer>
        <p>Status: {status}</p>
      </footer>
    </div>
  );
}
