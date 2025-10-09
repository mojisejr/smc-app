# Debug Activation Flow Analysis Script
# This script helps analyze the activation flow timing issue

Write-Host "Debug Activation Flow Analysis Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Green
Write-Host "1. Start the SMC Electron app" -ForegroundColor White
Write-Host "2. Open DevTools (Press F12)" -ForegroundColor White
Write-Host "3. Go to the Console tab" -ForegroundColor White
Write-Host "4. Perform the activation process" -ForegroundColor White
Write-Host "5. In DevTools Console, run:" -ForegroundColor White
Write-Host "   window.debugLogger.exportLogs()" -ForegroundColor Magenta
Write-Host "6. Copy the JSON output" -ForegroundColor White
Write-Host "7. Save it as activation-debug-logs.json" -ForegroundColor White
Write-Host ""

# Create template
$templatePath = Join-Path $PSScriptRoot "activation-debug-logs-template.json"
$template = @{
    metadata = @{
        note = "Replace with actual logs from DevTools Console"
        instruction = "Run window.debugLogger.exportLogs() in DevTools"
        totalEvents = 0
        duration = 0
        startTime = ""
        endTime = ""
    }
    events = @()
}

$template | ConvertTo-Json -Depth 10 | Out-File -FilePath $templatePath -Encoding UTF8
Write-Host "Created log template: $templatePath" -ForegroundColor Green

Write-Host ""
Write-Host "Waiting for you to capture logs..." -ForegroundColor Yellow
Write-Host "Press any key after saving the logs" -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Check for logs
$logPath = Join-Path $PSScriptRoot "activation-debug-logs.json"

if (Test-Path $logPath) {
    try {
        $logs = Get-Content $logPath | ConvertFrom-Json
        
        Write-Host ""
        Write-Host "Log Analysis Results:" -ForegroundColor Cyan
        Write-Host "Total Events: $($logs.metadata.totalEvents)" -ForegroundColor White
        
        Write-Host ""
        Write-Host "Checking for critical events..." -ForegroundColor Yellow
        
        $hasRefreshActivation = $logs.events | Where-Object { $_.event -eq "REFRESH_ACTIVATION_STATUS_COMPLETE" }
        $hasNavigationToHome = $logs.events | Where-Object { $_.event -eq "NAVIGATION_TO_HOME_COMPLETE" }
        $hasHomeUseEffect = $logs.events | Where-Object { $_.event -eq "USE_EFFECT_IS_ACTIVATED_TRIGGERED" }
        $hasRefreshSlots = $logs.events | Where-Object { $_.event -eq "REFRESH_SLOTS_CALL_START" }
        
        if ($hasRefreshActivation) {
            Write-Host "  Found REFRESH_ACTIVATION_STATUS_COMPLETE" -ForegroundColor Green
        } else {
            Write-Host "  Missing REFRESH_ACTIVATION_STATUS_COMPLETE" -ForegroundColor Red
        }
        
        if ($hasNavigationToHome) {
            Write-Host "  Found NAVIGATION_TO_HOME_COMPLETE" -ForegroundColor Green
        } else {
            Write-Host "  Missing NAVIGATION_TO_HOME_COMPLETE" -ForegroundColor Red
        }
        
        if ($hasHomeUseEffect) {
            Write-Host "  Found USE_EFFECT_IS_ACTIVATED_TRIGGERED" -ForegroundColor Green
        } else {
            Write-Host "  Missing USE_EFFECT_IS_ACTIVATED_TRIGGERED" -ForegroundColor Red
        }
        
        if ($hasRefreshSlots) {
            Write-Host "  Found REFRESH_SLOTS_CALL_START" -ForegroundColor Green
        } else {
            Write-Host "  Missing REFRESH_SLOTS_CALL_START - This is the main issue!" -ForegroundColor Red
        }
        
        Write-Host ""
        Write-Host "Analysis complete!" -ForegroundColor Green
        
    } catch {
        Write-Host "Error analyzing log file: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Log file not found. Please follow the instructions above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Green
Write-Host "1. Send the activation-debug-logs.json file to the assistant" -ForegroundColor White
Write-Host "2. The assistant will analyze and fix the issue" -ForegroundColor White

Write-Host ""
Write-Host "Debug session complete!" -ForegroundColor Cyan