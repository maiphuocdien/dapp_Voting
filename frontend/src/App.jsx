import { useMemo, useState } from "react";
import { ethers } from "ethers";
import AttendanceRegistry from "./abi/AttendanceRegistry.json";
import { CONTRACT_ADDRESS, REQUIRED_CHAIN_ID } from "./config";
import heroBanner from "./assets/attendance-hero.svg";

const REQUIRED_CHAIN_HEX = `0x${REQUIRED_CHAIN_ID.toString(16)}`;

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

  const statusTone = useMemo(() => {
    const normalized = status.toLowerCase();
    if (normalized.includes("fail") || normalized.includes("error") || normalized.includes("wrong")) {
      return "error";
    }
    if (normalized.includes("success") || normalized.includes("loaded") || normalized.includes("connected")) {
      return "success";
    }
    return "neutral";
  }, [status]);

  function getMetaMaskProviderObject() {
    const ethereum = window.ethereum;
    if (!ethereum) {
      throw new Error("MetaMask not found. Please install MetaMask.");
    }

    if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
      const metaMaskProvider = ethereum.providers.find((provider) => provider.isMetaMask);
      if (!metaMaskProvider) {
        throw new Error("MetaMask provider not found. Disable other wallet extensions and try again.");
      }
      return metaMaskProvider;
    }

    if (!ethereum.isMetaMask) {
      throw new Error("Another wallet extension is active. Please use MetaMask.");
    }

    return ethereum;
  }

  async function ensureCorrectNetwork(metaMaskProvider) {
    const currentChainHex = await metaMaskProvider.request({ method: "eth_chainId" });
    if (currentChainHex?.toLowerCase() === REQUIRED_CHAIN_HEX.toLowerCase()) {
      return;
    }

    try {
      await metaMaskProvider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: REQUIRED_CHAIN_HEX }]
      });
    } catch (switchError) {
      if (switchError?.code === 4902) {
        await metaMaskProvider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: REQUIRED_CHAIN_HEX,
              chainName: "Hardhat Local",
              rpcUrls: ["http://127.0.0.1:8545"],
              nativeCurrency: {
                name: "Ethereum",
                symbol: "ETH",
                decimals: 18
              }
            }
          ]
        });
        return;
      }
      throw switchError;
    }
  }

  async function getProvider() {
    const metaMaskProvider = getMetaMaskProviderObject();
    return new ethers.BrowserProvider(metaMaskProvider);
  }

  async function getContract(withSigner = false) {
    const provider = await getProvider();
    const runner = withSigner ? await provider.getSigner() : provider;
    return new ethers.Contract(CONTRACT_ADDRESS, AttendanceRegistry.abi, runner);
  }

  async function connectWallet() {
    try {
      const metaMaskProvider = getMetaMaskProviderObject();
      await ensureCorrectNetwork(metaMaskProvider);

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
      <header className="hero">
        <img className="hero-banner" src={heroBanner} alt="Blockchain Attendance DApp banner" />
        <h1>Attendance DApp</h1>
        <p className="hero-subtitle">Solidity + React + MetaMask + Ethers.js</p>
      </header>

      <section className="card wallet-card">
        <h2>Wallet</h2>
        <div className="wallet-grid">
          <p className="kv"><span>Account</span><code>{shortAccount}</code></p>
          <p className="kv"><span>Chain ID</span><code>{chainId ?? "-"}</code></p>
          <p className="kv"><span>Required</span><code>{REQUIRED_CHAIN_ID}</code></p>
          <p className="kv"><span>Contract</span><code>{CONTRACT_ADDRESS || "(missing in .env)"}</code></p>
        </div>
        <button className="primary" onClick={connectWallet}>Connect MetaMask</button>
        {!networkOk && chainId !== null && (
          <p className="warning">Wrong network. Switch MetaMask to chain {REQUIRED_CHAIN_ID}.</p>
        )}
      </section>

      <section className="card">
        <h2>Create Session (Instructor)</h2>
        <input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="Course Code" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <label className="form-field">
          Start Time
          <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </label>
        <label className="form-field">
          End Time
          <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
        </label>
        <button className="primary" onClick={createSession} disabled={!networkOk}>Create Session</button>
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
        <button className="primary" onClick={markAttendance} disabled={!networkOk}>Mark Attendance</button>
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
        <button className="primary" onClick={loadSession}>Load Session</button>

        {sessionData && (
          <div className="session-box">
            <p className="kv"><span>ID</span><code>{sessionData.id.toString()}</code></p>
            <p className="kv"><span>Course</span><code>{sessionData.courseCode}</code></p>
            <p className="kv"><span>Title</span><code>{sessionData.title}</code></p>
            <p className="kv"><span>Start</span><code>{formatUnix(sessionData.startTime)}</code></p>
            <p className="kv"><span>End</span><code>{formatUnix(sessionData.endTime)}</code></p>
            <p className="kv"><span>Instructor</span><code>{sessionData.instructor}</code></p>
            <p className="kv"><span>Active</span><code>{sessionData.active ? "Yes" : "No"}</code></p>
            <p className="kv"><span>Attendee Count</span><code>{attendeeCount ?? "-"}</code></p>
            <p className="kv"><span>My Attendance</span><code>{myAttendance === null ? "-" : myAttendance ? "Marked" : "Not Marked"}</code></p>
          </div>
        )}
      </section>

      <footer>
        <p className={`status-pill ${statusTone}`}>Status: {status}</p>
      </footer>
    </div>
  );
}
