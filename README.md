# Blockchain Attendance DApp (Solidity + React + MetaMask + Ethers)

Full-stack attendance dapp gồm:

- Smart contract Solidity quản lý buổi học và điểm danh on-chain
- Hardhat để compile, test, deploy
- React + Vite + Ethers.js để kết nối MetaMask và tương tác contract

## 1) Cấu trúc dự án

```text
dapp_Voting/
├─ contracts/
│  ├─ contracts/AttendanceRegistry.sol
│  ├─ scripts/deploy.js
│  ├─ test/AttendanceRegistry.test.js
│  ├─ hardhat.config.js
│  ├─ package.json
│  └─ .env.example
└─ frontend/
	├─ src/
	│  ├─ abi/AttendanceRegistry.json
	│  ├─ App.jsx
	│  ├─ App.css
	│  ├─ config.js
	│  └─ main.jsx
	├─ index.html
	├─ package.json
	├─ vite.config.js
	└─ .env.example
```

## 2) Yêu cầu

- Node.js 18+
- MetaMask

## 3) Chạy local (Hardhat node + React)

### Bước A: Smart contract

```powershell
Set-Location "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts"
Copy-Item .env.example .env
npm install
npm run test
npm run node
```

Mở terminal mới và deploy:

```powershell
Set-Location "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts"
npm run deploy:local
```

Lưu địa chỉ contract in ra từ terminal (ví dụ `0x...`).

### Bước B: Frontend

```powershell
Set-Location "c:\Users\Windows\Documents\GitHub\dapp_Voting\frontend"
Copy-Item .env.example .env
npm install
```

Sửa `frontend/.env`:

```env
VITE_CHAIN_ID=31337
VITE_CONTRACT_ADDRESS=PASTE_DEPLOYED_ADDRESS_HERE
```

Chạy app:

```powershell
npm run dev
```

## 4) Cấu hình MetaMask local

- Network Name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency: `ETH`

Import một account test từ private key mà Hardhat node in ra.

## 5) Deploy Sepolia (tuỳ chọn)

Trong `contracts/.env` cấu hình:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
```

Deploy:

```powershell
Set-Location "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts"
npm run deploy:sepolia
```

Sau đó cập nhật `frontend/.env`:

```env
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=DEPLOYED_SEPOLIA_ADDRESS
```

## 6) MetaMask Local Setup (Chi tiết)

### Bước 1: Thêm Network vào MetaMask

1. Mở **MetaMask** → Click biểu tượng chaining ở trên phải
2. Chọn **Settings** → **Networks** → **Add Network**
3. Điền:
   - **Network Name:** `Hardhat Local`
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency:** `ETH`
4. Bấm **Save**

### Bước 2: Import Test Account

Lấy private key từ Hardhat node output:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Import vào MetaMask:
1. Click biểu tượng **Profile** → **Import Account**
2. Chọn **Private Key**
3. Paste: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
4. Bấm **Import**

(Có thể import tới 3-4 account khác từ node output để test multiple users)

## 7) Chạy Full Local

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
& "c:\Users\Windows\Documents\GitHub\dapp_Voting\run-local.ps1"
```

Output:
```
Frontend: http://127.0.0.1:5173
Node: http://127.0.0.1:8545
Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## 8) Sử dụng App

### Luồng Giảng viên:

1. Mở `http://127.0.0.1:5173`
2. Bấm **Connect MetaMask** → Chọn account #0
3. Đảm bảo **Chain ID** là `31337`
4. Điền:
   - Course Code: `CS101`
   - Title: `Week 1 Class`
   - Start Time: `2024-12-20 10:00`
   - End Time: `2024-12-20 11:00`
5. Bấm **Create Session** → Xác nhận transaction
6. Ghi lại **Session ID** (ví dụ: `0`)

### Luồng Sinh viên:

1. Import account #1 hoặc #2 vào MetaMask
2. Mở `http://127.0.0.1:5173` (account mới)
3. Bấm **Connect MetaMask** → Chọn account #1
4. Điền **Session ID** từ bước trên
5. Bấm **Mark Attendance** → Xác nhận transaction
6. Thấy: `"My Attendance: Marked"`

### Xem Session Details:

1. Quay lại lên mục **Session Lookup**
2. Nhập **Session ID** (ví dụ: `0`)
3. Bấm **Load Session**
4. Xem thông tin:
   - Course
   - Instructor
   - Start/End time
   - Attendee Count
   - Your Status

## 9) Tính năng

- **Giảng viên**: Tạo buổi điểm danh (course code, title, start/end time)
- **Sinh viên**: Tự điểm danh trong khung giờ hợp lệ
- **Constraint**: Mỗi ví chỉ điểm danh 1 lần/buổi
- **Query**: Xem chi tiết session, số người đã điểm danh, danh sách attendees

## 10) Các Tài khoản Test (từ Hardhat)

| No | Address | Private Key | ETH |
|----|---------|-------------|-----|
| #0 | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 | 10000 |
| #1 | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 | 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d | 10000 |
| #2 | 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC | 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a | 10000 |
| #3 | 0x90F79bf6EB2c4f870365E785982E1f101E93b906 | 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6 | 10000 |

## 11) Kiểm tra on-chain

Mở browser console hoặc dùng Hardhat task:

```powershell
Set-Location "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts"
npx hardhat run scripts/smoke.js --network localhost
```

Output:
```
[SMOKE] Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
[SMOKE] Session ID: 0
[SMOKE] Course: CS-E2E
[SMOKE] Student attended: true
[SMOKE] Attendee count: 1
```

