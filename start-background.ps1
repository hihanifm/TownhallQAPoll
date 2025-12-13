# PowerShell script to start both backend and frontend servers in the background
# Usage: .\start-background.ps1 [-Prod]  (use -Prod for production mode)

param(
    [switch]$Prod
)

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

if ($Prod) {
    Write-Host "Starting Townhall Q&A Poll servers in PRODUCTION mode..." -ForegroundColor Green
} else {
    Write-Host "Starting Townhall Q&A Poll servers in DEVELOPMENT mode..." -ForegroundColor Green
}
Write-Host ""

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue -State Listen
    return $null -ne $connection
}

# Check if ports are in use
$backendPortInUse = Test-Port -Port 3001
$frontendPortInUse = Test-Port -Port 3000
$portsInUse = $false

if ($backendPortInUse) {
    Write-Host "Error: Port 3001 (backend) is already in use!" -ForegroundColor Red
    $portsInUse = $true
}

if ($frontendPortInUse) {
    Write-Host "Error: Port 3000 (frontend) is already in use!" -ForegroundColor Red
    $portsInUse = $true
}

# Check if servers are already running (via PID file)
$jobsFile = Join-Path $scriptDir "server-jobs.txt"
if (Test-Path $jobsFile) {
    $jobIds = (Get-Content $jobsFile -ErrorAction SilentlyContinue) -split ','
    foreach ($jobId in $jobIds) {
        if ($jobId -match '^\d+$') {
            $job = Get-Job -Id $jobId -ErrorAction SilentlyContinue
            if ($job -and $job.State -eq "Running") {
                Write-Host "Warning: Server job with ID $jobId is already running!" -ForegroundColor Yellow
                $portsInUse = $true
            }
        }
    }
}

# If ports are in use, exit unless user explicitly overrides
if ($portsInUse) {
    Write-Host ""
    Write-Host "Cannot start servers - ports are already in use or servers are running!" -ForegroundColor Red
    Write-Host "Run .\stop-background.ps1 to stop existing servers first." -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Force start anyway? (not recommended) (y/n)"
    if ($response -ne "y") {
        Write-Host "Exiting. Please stop existing servers first." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "Warning: Forcing start - this may cause conflicts!" -ForegroundColor Yellow
    Write-Host ""
}

# Start backend server
Write-Host "Starting backend server..." -ForegroundColor Cyan

# Set NODE_ENV based on mode
if ($Prod) {
    $env:NODE_ENV = "production"
    Write-Host "  Setting NODE_ENV=production" -ForegroundColor Yellow
} else {
    $env:NODE_ENV = "development"
    Write-Host "  Setting NODE_ENV=development" -ForegroundColor Yellow
}

$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:scriptDir\backend
    $env:NODE_ENV = $using:env:NODE_ENV
    npm start 2>&1
}

# Wait for backend to start and verify
Start-Sleep -Seconds 3
$backendJob | Receive-Job | Out-Null  # Flush any immediate output

if ($backendJob.State -ne "Running") {
    $backendOutput = $backendJob | Receive-Job
    Write-Host "Error: Backend server failed to start!" -ForegroundColor Red
    Write-Host $backendOutput -ForegroundColor Red
    if ($backendOutput -like "*EADDRINUSE*" -or $backendOutput -like "*address already in use*") {
        Write-Host "Port 3001 is already in use. Please stop the existing server first." -ForegroundColor Yellow
    }
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

if (-not (Test-Port -Port 3001)) {
    Write-Host "Error: Backend server process started but port 3001 is not listening!" -ForegroundColor Red
    Write-Host "Check job output with: Receive-Job -Id $($backendJob.Id)" -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Backend started successfully (Job ID: $($backendJob.Id))" -ForegroundColor Green

# Start frontend server
Write-Host "Starting frontend server..." -ForegroundColor Cyan

if ($Prod) {
    Write-Host "Building frontend for production..." -ForegroundColor Yellow
    Set-Location "$scriptDir\frontend"
    $buildResult = npm run build 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Frontend build failed!" -ForegroundColor Red
        Write-Host $buildResult -ForegroundColor Red
        # Clean up: stop backend job if frontend build failed
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
        exit 1
    }
    Write-Host "Starting frontend production server..." -ForegroundColor Cyan
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:scriptDir\frontend
        npm run preview 2>&1
    }
} else {
    Write-Host "Starting frontend development server..." -ForegroundColor Cyan
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:scriptDir\frontend
        npm run dev 2>&1
    }
}

# Wait for frontend to start and verify
Start-Sleep -Seconds 3
$frontendJob | Receive-Job | Out-Null  # Flush any immediate output

if ($frontendJob.State -ne "Running") {
    $frontendOutput = $frontendJob | Receive-Job
    Write-Host "Error: Frontend server failed to start!" -ForegroundColor Red
    Write-Host $frontendOutput -ForegroundColor Red
    if ($frontendOutput -like "*EADDRINUSE*" -or $frontendOutput -like "*address already in use*") {
        Write-Host "Port 3000 is already in use. Please stop the existing server first." -ForegroundColor Yellow
    }
    # Clean up: stop backend job if frontend failed
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    exit 1
}

if (-not (Test-Port -Port 3000)) {
    Write-Host "Error: Frontend server process started but port 3000 is not listening!" -ForegroundColor Red
    Write-Host "Check job output with: Receive-Job -Id $($frontendJob.Id)" -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "Frontend started successfully (Job ID: $($frontendJob.Id))" -ForegroundColor Green

# Save job IDs to file for stopping later
$jobsFile = Join-Path $scriptDir "server-jobs.txt"
"$($backendJob.Id),$($frontendJob.Id)" | Out-File -FilePath $jobsFile -Encoding ASCII

Write-Host ""
Write-Host "Servers started in background!" -ForegroundColor Green
if ($Prod) {
    Write-Host "  Mode: PRODUCTION (optimized build)" -ForegroundColor Yellow
} else {
    Write-Host "  Mode: DEVELOPMENT (hot reload enabled)" -ForegroundColor Yellow
}
Write-Host "Backend: http://localhost:3001" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "To stop the servers, run: .\stop-background.ps1" -ForegroundColor Cyan
Write-Host "Or check status with: Get-Job" -ForegroundColor Cyan
if (-not $Prod) {
    Write-Host ""
    Write-Host "To start in production mode, run: .\start-background.ps1 -Prod" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "Note: This window can be closed. Servers will continue running." -ForegroundColor Gray
