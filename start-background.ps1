# PowerShell script to start both backend and frontend servers in the background
Write-Host "Starting Townhall Q&A Poll servers in background..." -ForegroundColor Green
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Check if servers are already running
$backendProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*server.js*" }
$frontendProcess = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" }

if ($backendProcess -or $frontendProcess) {
    Write-Host "Warning: Servers may already be running!" -ForegroundColor Yellow
    Write-Host "Use stop-background.ps1 to stop them first." -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -ne "y") {
        exit
    }
}

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:scriptDir\backend
    npm start
}

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend server
Write-Host "Starting frontend server..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:scriptDir\frontend
    npm run dev
}

# Save job IDs to file for stopping later
$jobsFile = Join-Path $scriptDir "server-jobs.txt"
"$($backendJob.Id),$($frontendJob.Id)" | Out-File -FilePath $jobsFile -Encoding ASCII

Write-Host ""
Write-Host "Servers started in background!" -ForegroundColor Green
Write-Host "Backend: http://localhost:3001" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop the servers, run: .\stop-background.ps1" -ForegroundColor Cyan
Write-Host "Or check status with: Get-Job" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: This window can be closed. Servers will continue running." -ForegroundColor Gray
