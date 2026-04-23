# Quick Start Guide

## 🚀 Chạy toàn bộ dApp trong 1 lệnh

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
& "c:\Users\Windows\Documents\GitHub\dapp_Voting\run-local.ps1"
```

**Đợi khoảng 10-15 giây**, sẽ thấy:

```
Frontend: http://127.0.0.1:5173
Node: http://127.0.0.1:8545
Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

## 📋 Bước tiếp theo

### 1️⃣ Setup MetaMask

**Thêm Network:**
- Network Name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency: `ETH`

**Import Account #0:**
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- Sẽ có 10000 ETH để test

### 2️⃣ Mở Frontend

- Truy cập: `http://127.0.0.1:5173`
- Bấm **Connect MetaMask**
- Chọn Hardhat Local network nếu chưa

### 3️⃣ Test Flow

**A) Tạo Session (Giảng viên):**
1. Điền Course Code: `CS101`
2. Điền Title: `Week 1`
3. Set Start Time: mấy phút nữa (ví dụ +5 min)
4. Set End Time: 1 tiếng sau
5. Bấm **Create Session**
6. Confirm transaction → Ghi Session ID (ví dụ: `0`)

**B) Điểm Danh (Sinh viên - Account #1):**
1. Import Account #1 vào MetaMask
   - Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
2. Refresh browser, connect lại
3. Mục "Mark Attendance":
   - Session ID: `0` (từ bước A)
   - Bấm **Mark Attendance**
4. Confirm transaction

**C) Verify (Xem kết quả):**
1. Mục "Session Lookup":
   - Session ID: `0`
   - Bấm **Load Session**
2. Xem:
   - Course: `CS101`
   - Instructor: `0xf39F...` (Account #0)
   - Attendee Count: `1`
   - My Attendance: `Marked` (nếu dùng Account #1)

## 🧪 Test Tự Động

Chạy smoke test:

```powershell
Set-Location "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts"
npx hardhat run scripts/smoke.js --network localhost
```

Chạy unit tests:

```powershell
npm run test
```

## 📝 Các Lệnh Hữu Ích

```powershell
# Compile smart contract
npm --prefix "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts" run compile

# Run all tests
npm --prefix "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts" run test

# Deploy mới
npm --prefix "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts" run deploy:local

# Build frontend
npm --prefix "c:\Users\Windows\Documents\GitHub\dapp_Voting\frontend" run build

# Dev server only
npm --prefix "c:\Users\Windows\Documents\GitHub\dapp_Voting\frontend" run dev
```

## ❌ Troubleshooting

**Q: Frontend không kết nối được?**
- Kiểm tra `frontend/.env` có `VITE_CONTRACT_ADDRESS` không
- Kiểm tra contract đã deploy chưa
- Reload browser (Ctrl+Shift+R)

**Q: MetaMask không tìm thấy network?**
- Xác nhận RPC: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Thử thêm network lại

**Q: Transaction fail?**
- Kiểm tra MetaMask đang dùng Hardhat Local network
- Kiểm tra account còn ETH không
- Xem message lỗi trên app

**Q: Port 8545/5173 đã bị dùng?**
```powershell
Get-NetTCPConnection -LocalPort 8545 -ErrorAction SilentlyContinue | Stop-Process -Force
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Stop-Process -Force
```

## 📚 Tài liệu chi tiết

Xem `README.md` để hiểu kiến trúc, contract functions, deployment steps.

---

**Chúc mừng! 🎉 Dapp của bạn đã sẵn sàng.**
