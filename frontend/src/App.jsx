import { useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import AttendanceRegistry from "./abi/AttendanceRegistry.json";
import { CONTRACT_ADDRESS, REQUIRED_CHAIN_ID } from "./config";
import heroBanner from "./assets/attendance-hero.svg";

const REQUIRED_CHAIN_HEX = `0x${REQUIRED_CHAIN_ID.toString(16)}`;

function toUnix(datetimeLocal) {
  if (!datetimeLocal) return 0;
  return Math.floor(new Date(datetimeLocal).getTime() / 1000);
}

function formatUnix(unixTs) {
  if (!unixTs) return "-";
  return new Date(Number(unixTs) * 1000).toLocaleString("vi-VN");
}

function formatAddress(address) {
  if (!address) return "-";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function App() {
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(null);
  const [status, setStatus] = useState("Sẵn sàng");
  const [totalSessions, setTotalSessions] = useState(null);

  const [courseCode, setCourseCode] = useState("CS101");
  const [title, setTitle] = useState("Tuần 1");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [markSessionId, setMarkSessionId] = useState("0");
  const [viewSessionId, setViewSessionId] = useState("0");
  const [sessionData, setSessionData] = useState(null);
  const [myAttendance, setMyAttendance] = useState(null);
  const [attendeeCount, setAttendeeCount] = useState(null);

  const summaryRef = useRef(null);
  const createRef = useRef(null);
  const attendanceRef = useRef(null);
  const lookupRef = useRef(null);

  const isConnected = Boolean(account);
  const networkOk = chainId === REQUIRED_CHAIN_ID;

  const shortAccount = useMemo(() => formatAddress(account), [account]);

  const statusTone = useMemo(() => {
    const value = status.toLowerCase();
    if (value.includes("lỗi") || value.includes("fail") || value.includes("error") || value.includes("wrong")) {
      return "error";
    }
    if (value.includes("thành công") || value.includes("loaded") || value.includes("connected") || value.includes("kết nối")) {
      return "success";
    }
    return "neutral";
  }, [status]);

  const networkLabel = networkOk ? "Hardhat Local" : chainId ? `Chuỗi ${chainId}` : "Chưa kết nối";

  function getMetaMaskProviderObject() {
    const ethereum = window.ethereum;
    if (!ethereum) {
      throw new Error("Không tìm thấy MetaMask. Vui lòng cài đặt MetaMask.");
    }

    if (Array.isArray(ethereum.providers) && ethereum.providers.length > 0) {
      const metaMaskProvider = ethereum.providers.find((provider) => provider.isMetaMask);
      if (!metaMaskProvider) {
        throw new Error("Không tìm thấy provider của MetaMask. Hãy tắt các ví khác rồi thử lại.");
      }
      return metaMaskProvider;
    }

    if (!ethereum.isMetaMask) {
      throw new Error("Đang có ví khác chiếm quyền. Vui lòng dùng MetaMask.");
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
    return new ethers.BrowserProvider(getMetaMaskProviderObject());
  }

  async function getContract(withSigner = false) {
    const provider = await getProvider();
    const runner = withSigner ? await provider.getSigner() : provider;
    return new ethers.Contract(CONTRACT_ADDRESS, AttendanceRegistry.abi, runner);
  }

  async function refreshDashboard(provider) {
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.length < 10) {
      return;
    }

    const activeProvider = provider ?? (await getProvider());
    const contract = new ethers.Contract(CONTRACT_ADDRESS, AttendanceRegistry.abi, activeProvider);
    const nextSessionId = await contract.nextSessionId();
    setTotalSessions(Number(nextSessionId));
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
      await refreshDashboard(provider);
      setStatus("Đã kết nối ví thành công.");
    } catch (error) {
      setStatus(error.message || "Kết nối ví thất bại.");
    }
  }

  async function disconnectWallet() {
    try {
      const metaMaskProvider = getMetaMaskProviderObject();
      if (metaMaskProvider?.request) {
        try {
          await metaMaskProvider.request({
            method: "wallet_revokePermissions",
            params: [{ eth_accounts: {} }]
          });
        } catch {
          // Một số phiên bản MetaMask không hỗ trợ revokePermissions.
        }
      }
    } finally {
      setAccount("");
      setChainId(null);
      setSessionData(null);
      setAttendeeCount(null);
      setMyAttendance(null);
      setTotalSessions(null);
      setStatus("Đã đăng xuất ví.");
    }
  }

  async function createSession() {
    try {
      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS.length < 10) {
        throw new Error("Thiếu địa chỉ contract trong `frontend/.env`.");
      }

      const startTime = toUnix(startAt);
      const endTime = toUnix(endAt);

      if (!startTime || !endTime) {
        throw new Error("Vui lòng chọn giờ bắt đầu và kết thúc hợp lệ.");
      }

      const contract = await getContract(true);
      setStatus("Đang tạo buổi điểm danh...");
      const tx = await contract.createSession(courseCode, title, startTime, endTime);
      await tx.wait();
      await refreshDashboard();
      setStatus("Tạo buổi điểm danh thành công.");
    } catch (error) {
      setStatus(error.reason || error.shortMessage || error.message || "Tạo buổi điểm danh thất bại.");
    }
  }

  async function markAttendance() {
    try {
      const contract = await getContract(true);
      setStatus("Đang gửi giao dịch điểm danh...");
      const tx = await contract.markAttendance(markSessionId);
      await tx.wait();
      await refreshDashboard();
      setStatus("Điểm danh thành công.");
    } catch (error) {
      setStatus(error.reason || error.shortMessage || error.message || "Điểm danh thất bại.");
    }
  }

  async function loadSession() {
    try {
      const contract = await getContract(false);
      const provider = await getProvider();
      const [session, total] = await Promise.all([
        contract.getSession(viewSessionId),
        contract.getAttendeeCount(viewSessionId),
        refreshDashboard(provider)
      ]);

      setSessionData(session);
      setAttendeeCount(Number(total));

      if (account) {
        const mine = await contract.didAttend(viewSessionId, account);
        setMyAttendance(mine);
      } else {
        setMyAttendance(null);
      }

      setStatus("Đã tải thông tin buổi học.");
    } catch (error) {
      setStatus(error.reason || error.shortMessage || error.message || "Tải buổi học thất bại.");
      setSessionData(null);
      setAttendeeCount(null);
      setMyAttendance(null);
    }
  }

  return (
    <div className="app dashboard-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <header className="topbar card">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>Attendance DApp</h1>
            <p>Hệ thống điểm danh trên Blockchain</p>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="nav-badge">
            <span>Ví</span>
            <strong>{isConnected ? shortAccount : "Chưa kết nối"}</strong>
          </div>
          <button className="ghost" onClick={isConnected ? disconnectWallet : connectWallet}>
            {isConnected ? "Đăng xuất" : "Kết nối ví"}
          </button>
        </div>
      </header>

      <section className="network-strip card" ref={summaryRef}>
        <div className="network-strip-left">
          <p className="section-label">Mạng</p>
          <h2>{networkLabel}</h2>
          <p className="muted">Môi trường local để kiểm thử điểm danh.</p>
        </div>

        <div className={`status-pill ${networkOk ? "success" : "error"}`}>
          {networkOk ? "Đúng mạng Hardhat Local" : "Sai network"}
        </div>
      </section>

      <section className="hero card">
        <div className="hero-copy">
          <p className="section-label">Tổng quan</p>
          <h2>Bảng điều khiển điểm danh</h2>
          <p className="muted">
            Quản lý buổi học, điểm danh sinh viên và tra cứu trạng thái on-chain với giao diện dashboard rõ ràng, dễ dùng.
          </p>

          <div className="hero-actions">
            <button className="primary" onClick={connectWallet}>Kết nối MetaMask</button>
            <button className="ghost" onClick={() => summaryRef.current?.scrollIntoView({ behavior: "smooth" })}>
              Xem tổng quan
            </button>
          </div>
        </div>

        <img className="hero-banner" src={heroBanner} alt="Banner Attendance DApp" />
      </section>

      <section className="summary-grid">
        <article className="summary-card summary-purple">
          <span>Tổng số buổi</span>
          <strong>{totalSessions ?? "-"}</strong>
        </article>
        <article className="summary-card summary-green">
          <span>Session đang xem</span>
          <strong>{viewSessionId || "0"}</strong>
        </article>
        <article className="summary-card summary-blue">
          <span>Lượt điểm danh</span>
          <strong>{attendeeCount ?? 0}</strong>
        </article>
        <article className="summary-card summary-orange">
          <span>Ví kết nối</span>
          <strong>{isConnected ? shortAccount : "N/A"}</strong>
        </article>
      </section>

      <nav className="section-tabs card">
        <button onClick={() => summaryRef.current?.scrollIntoView({ behavior: "smooth" })}>📊 Tổng quan</button>
        <button onClick={() => createRef.current?.scrollIntoView({ behavior: "smooth" })}>🧑‍🏫 Tạo buổi học</button>
        <button onClick={() => attendanceRef.current?.scrollIntoView({ behavior: "smooth" })}>🧾 Điểm danh</button>
        <button onClick={() => lookupRef.current?.scrollIntoView({ behavior: "smooth" })}>🔎 Tra cứu</button>
      </nav>

      <section className="card module-card" ref={createRef}>
        <div className="module-head">
          <div>
            <p className="section-label">Quản lý buổi học</p>
            <h2>Tạo buổi điểm danh</h2>
          </div>
          <div className="module-tag">Giảng viên</div>
        </div>

        <div className="form-stack">
          <input value={courseCode} onChange={(e) => setCourseCode(e.target.value)} placeholder="Mã môn học" />
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên buổi học" />
          <label className="form-field">
            Thời gian bắt đầu
            <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
          </label>
          <label className="form-field">
            Thời gian kết thúc
            <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
          </label>
          <button className="primary" onClick={createSession} disabled={!networkOk}>Tạo buổi học</button>
        </div>
      </section>

      <div className="two-column-grid">
        <section className="card module-card" ref={attendanceRef}>
          <div className="module-head">
            <div>
              <p className="section-label">Điểm danh</p>
              <h2>Điểm danh sinh viên</h2>
            </div>
            <div className="module-tag module-tag-teal">Sinh viên</div>
          </div>

          <div className="form-stack">
            <input
              type="number"
              min="0"
              value={markSessionId}
              onChange={(e) => setMarkSessionId(e.target.value)}
              placeholder="Session ID"
            />
            <button className="primary" onClick={markAttendance} disabled={!networkOk}>Điểm danh</button>
          </div>
        </section>

        <section className="card module-card" ref={lookupRef}>
          <div className="module-head">
            <div>
              <p className="section-label">Tra cứu</p>
              <h2>Xem chi tiết buổi học</h2>
            </div>
            <div className="module-tag module-tag-indigo">Chỉ xem</div>
          </div>

          <div className="form-stack">
            <input
              type="number"
              min="0"
              value={viewSessionId}
              onChange={(e) => setViewSessionId(e.target.value)}
              placeholder="Session ID"
            />
            <button className="primary" onClick={loadSession}>Tải thông tin</button>
          </div>

          {sessionData && (
            <div className="session-box session-grid">
              <p className="kv"><span>ID</span><code>{sessionData.id.toString()}</code></p>
              <p className="kv"><span>Mã môn</span><code>{sessionData.courseCode}</code></p>
              <p className="kv"><span>Tên buổi</span><code>{sessionData.title}</code></p>
              <p className="kv"><span>Bắt đầu</span><code>{formatUnix(sessionData.startTime)}</code></p>
              <p className="kv"><span>Kết thúc</span><code>{formatUnix(sessionData.endTime)}</code></p>
              <p className="kv"><span>Giảng viên</span><code>{formatAddress(sessionData.instructor)}</code></p>
              <p className="kv"><span>Đang mở</span><code>{sessionData.active ? "Có" : "Không"}</code></p>
              <p className="kv"><span>Số người điểm danh</span><code>{attendeeCount ?? "-"}</code></p>
              <p className="kv"><span>Trạng thái của tôi</span><code>{myAttendance === null ? "-" : myAttendance ? "Đã điểm danh" : "Chưa điểm danh"}</code></p>
            </div>
          )}
        </section>
      </div>

      <footer className="footer-row">
        <p className={`status-pill ${statusTone}`}>Trạng thái: {status}</p>
        <p className="muted footer-contract">Contract: {CONTRACT_ADDRESS || "(thiếu trong .env)"}</p>
      </footer>
    </div>
  );
}
