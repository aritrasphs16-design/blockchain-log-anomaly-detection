@echo off
echo Starting all BLAD services for demonstration...

echo Starting Target Website...
start "Target Website" cmd /k "cd target_website && node server.js"

echo Starting ML Engine...
start "ML Engine" cmd /k "cd ml_engine && python ml_detector.py"

echo Starting Blockchain Node...
start "Blockchain Node" cmd /k "cd contracts_layer && npx hardhat node"

echo Waiting for Blockchain Node to boot...
timeout /t 5 /nobreak >nul

echo Deploying Smart Contracts...
start "Smart Contract Deployer" cmd /c "cd contracts_layer && npx hardhat run scripts/deploy.cjs --network localhost"

echo Starting Server Agent...
start "Server Agent" cmd /k "cd server_agent && node staking_monitor.js"

echo Starting Frontend Dashboard...
start "Frontend Dashboard" cmd /k "cd frontend && npm run dev"

echo.
echo All 5 services have been launched in separate windows!
echo You can now open http://localhost:3000 in your browser to simulate the attacks.
