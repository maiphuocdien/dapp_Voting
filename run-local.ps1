# Orchestrate local dapp startup
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "Starting Hardhat node..." -ForegroundColor Cyan
$nodeJob = Start-Job -ScriptBlock { Set-Location "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts"; npx hardhat node }
Start-Sleep -Seconds 4

$nodeOk = $false
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:8545" -Method Post -ContentType "application/json" -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ErrorAction Stop | Out-Null
  $nodeOk = $true
  Write-Host "Node ready" -ForegroundColor Green
}
catch {
  Write-Host "Node failed" -ForegroundColor Red
  exit 1
}

Write-Host "Deploying contract..." -ForegroundColor Cyan
Set-Location "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts"
$out = npx hardhat run scripts/deploy.js --network localhost 2>&1
$addr = ($out | Select-String "deployed to:" | ForEach-Object { $_ -replace ".*deployed to: ", "" }).Trim()

if ($addr) {
  Write-Host "Contract: $addr" -ForegroundColor Green
} else {
  Write-Host "Deploy failed" -ForegroundColor Red
  exit 1
}

Write-Host "Updating frontend..." -ForegroundColor Cyan
$env_content = "VITE_CHAIN_ID=31337`nVITE_CONTRACT_ADDRESS=$addr"
Set-Content "c:\Users\Windows\Documents\GitHub\dapp_Voting\frontend\.env" $env_content
Write-Host "Frontend updated" -ForegroundColor Green

Write-Host "Starting frontend..." -ForegroundColor Cyan
$feJob = Start-Job -ScriptBlock { Set-Location "c:\Users\Windows\Documents\GitHub\dapp_Voting\frontend"; npm run dev -- --host 127.0.0.1 --port 5173 }
Start-Sleep -Seconds 3

Write-Host "Running smoke test..." -ForegroundColor Cyan
Set-Location "c:\Users\Windows\Documents\GitHub\dapp_Voting\contracts"
npx hardhat run scripts/smoke.js --network localhost 2>&1 | Select-String "SMOKE"

Write-Host "`nReady!" -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:5173" -ForegroundColor Cyan
Write-Host "Node: http://127.0.0.1:8545" -ForegroundColor Cyan
