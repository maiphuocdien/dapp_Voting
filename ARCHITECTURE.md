# Attendance DApp - Architecture & Design

## 📐 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React + Vite)               │
│                                                         │
│  - MetaMask Wallet Connection                           │
│  - Session Creation UI (Instructor)                     │
│  - Attendance Marking UI (Student)                      │
│  - Session Query & Display                             │
│                                                         │
│  Tech: React 18, Vite, Ethers.js v6, MetaMask Snap    │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ HTTP/JSON-RPC
                     │
┌────────────────────▼────────────────────────────────────┐
│              Hardhat Local Node (8545)                  │
│                                                         │
│  - Simulates Ethereum network                           │
│  - Provides test accounts (20x 10000 ETH)              │
│  - Instant blocks, no mining wait                      │
│                                                         │
│  Tech: Hardhat v2.22.x                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ Contract Call (send/call)
                     │
┌────────────────────▼────────────────────────────────────┐
│          AttendanceRegistry Smart Contract              │
│                                                         │
│  - createSession() → Creates attendance session        │
│  - markAttendance() → Records student check-in         │
│  - closeSession() → Ends session                       │
│  - getSession() → Query session details                │
│  - didAttend() → Check if address attended            │
│  - getAttendeeCount() → Total attendees               │
│  - getAttendees() → List of attendee addresses        │
│                                                         │
│  Tech: Solidity v0.8.24, OpenZeppelin patterns        │
└─────────────────────────────────────────────────────────┘
```

## 🗂️ Project Structure

```
dapp_Voting/
│
├── contracts/                    # Smart Contract Workspace
│   ├── contracts/
│   │   └── AttendanceRegistry.sol    # Main contract (250 lines)
│   ├── scripts/
│   │   ├── deploy.js                # Deploy to localhost
│   │   ├── smoke.js                 # Quick validation test
│   │   └── e2e.js                   # Comprehensive E2E suite
│   ├── test/
│   │   └── AttendanceRegistry.test.js # 3x Unit tests
│   ├── hardhat.config.js            # Hardhat configuration
│   ├── package.json                 # Dependencies & scripts
│   └── .env.example
│
├── frontend/                    # React Frontend Workspace
│   ├── src/
│   │   ├── App.jsx                  # Main React component
│   │   ├── App.css                  # Styling
│   │   ├── config.js                # .env loader
│   │   ├── main.jsx                 # Entry point
│   │   └── abi/
│   │       └── AttendanceRegistry.json  # Contract ABI
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── run-local.ps1                # Orchestration script
├── README.md                    # Full documentation
├── QUICK_START.md               # Quick setup guide
└── ARCHITECTURE.md              # This file
```

## 🏗️ Smart Contract Design

### Storage Model

```solidity
struct Session {
    uint256 id;
    string courseCode;
    string title;
    uint256 startTime;
    uint256 endTime;
    address instructor;
    bool active;
}

mapping(uint256 => Session) sessions;           // Session metadata
mapping(uint256 => mapping(address => bool)) attended;  // Attendance tracking
mapping(uint256 => address[]) attendees;       // Attendee list
uint256 nextSessionId;                         // Auto-increment ID
```

### Key Functions

| Function | Caller | Effect |
|----------|--------|--------|
| `createSession(code, title, start, end)` | Anyone | Creates session, sets caller as instructor |
| `markAttendance(sessionId)` | Anyone | Records attendance for caller |
| `closeSession(sessionId)` | Instructor | Marks session as inactive |
| `getSession(sessionId)` | Anyone | Query session details (view) |
| `didAttend(sessionId, addr)` | Anyone | Check if addr attended (view) |
| `getAttendeeCount(sessionId)` | Anyone | Total attendee count (view) |
| `getAttendees(sessionId)` | Anyone | Full attendee list (view) |

### Access Control

- **Instructor check**: Only session creator can close
- **Time validation**: Marks only allowed between startTime and endTime
- **Duplicate prevention**: Each address can only mark once per session
- **Session status**: Must be active to allow new marks

### Events

```solidity
SessionCreated(sessionId, courseCode, title, startTime, endTime, instructor)
AttendanceMarked(sessionId, student, timestamp)
SessionClosed(sessionId, timestamp)
```

## 🧠 Frontend Logic Flow

### MetaMask Connection

```javascript
const provider = new ethers.BrowserProvider(window.ethereum);
const accounts = await provider.send("eth_requestAccounts", []);
const network = await provider.getNetwork();
const signer = await provider.getSigner();
```

### Contract Interaction

```javascript
const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  AttendanceRegistry.abi,
  signer  // or provider for read-only
);

// Write transaction
const tx = await contract.createSession(code, title, start, end);
await tx.wait();

// Read call
const session = await contract.getSession(0);
const attended = await contract.didAttend(0, address);
```

### State Management

- **Account**: Current connected address
- **ChainId**: Network ID verification (31337 for local)
- **NetworkOk**: boolean flag for valid network
- **SessionData**: Currently loaded session details
- **Status**: User-facing status messages

## 🔐 Security Considerations

### Current Scope (Local Testing)

✅ Access control (instructor-only close)  
✅ Time window validation  
✅ Duplicate prevention  
✅ State consistency  

### Production Considerations (Not Implemented)

⚠️ No reentrancy protection (not applicable for this contract)  
⚠️ No pause mechanism  
⚠️ No role hierarchy (admin/instructor separation)  
⚠️ No event indexing (would need The Graph)  
⚠️ No upgrade mechanism  

## 📊 Data Flow Example

### Scenario: Student marks attendance

```
User (Browser)
     │
     ├─ 1. Click "Mark Attendance"
     │
     ├─ 2. Frontend calls:
     │    contract.markAttendance(0)
     │
     ├─ 3. MetaMask signs transaction
     │
     ├─ 4. Transaction sent to Hardhat RPC (8545)
     │
     ├─ 5. Contract executes:
     │    - Check session exists ✓
     │    - Check active ✓
     │    - Check time window ✓
     │    - Check not already marked ✓
     │    - Set attended[0][student] = true ✓
     │    - Emit event ✓
     │
     ├─ 6. Frontend receives receipt
     │
     └─ 7. Shows "Attendance marked successfully"
```

## 🧪 Testing Strategy

### Unit Tests (3 cases in test/)
- Session creation + metadata
- Attendance marking + duplicate prevention
- Session close + authorization

### E2E Tests (scripts/e2e.js)
- 11 comprehensive test scenarios
- Edge cases: early attendance, post-close, authorization

### Smoke Test (scripts/smoke.js)
- Quick validation that core flow works

### Manual Testing (UI)
- Full user journey through React app
- MetaMask integration
- Multi-user attendance marking

## 🚀 Deployment Targets

### Local (Hardhat)
- Chain ID: 31337
- RPC: http://127.0.0.1:8545
- Accounts: 20 test accounts, each 10000 ETH

### Testnet (Sepolia)
- Chain ID: 11155111
- Requires: SEPOLIA_RPC_URL, PRIVATE_KEY in .env
- Setup: See README section 5

### Production (Mainnet)
- Not configured, but same deploy script works
- Requires: real ETH, gas considerations

## 📈 Performance Notes

- **Gas**: Contract deploy ~300K gas, createSession ~100K, markAttendance ~50K
- **Storage**: ~3 SSTORE per session, ~1 per attendance
- **Scalability**: Linear with sessions/attendees (no batch ops currently)

## 🔮 Future Enhancements

1. **Batch Operations**: Create multiple sessions at once
2. **QR Code Check-in**: Generate QR for session, scan to mark
3. **Attendance Stats**: Pie charts, export to CSV
4. **Role System**: Separate instructor/admin roles
5. **Graph Indexing**: Query historical data efficiently
6. **IPFS Storage**: Store course materials on-chain
7. **NFT Certificates**: Mint certificates after attendance threshold

---

**Last Updated**: 2026-04-23  
**Solidity Version**: 0.8.24  
**React Version**: 18.3.1  
**Ethers.js Version**: 6.13.4
