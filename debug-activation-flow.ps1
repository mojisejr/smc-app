# Debug Activation Flow Analysis Script (PowerShell)
# 
# This script helps analyze the activation flow timing issue where no state check 
# command is sent after activation and navigating to the homepage.
# 
# Usage:
# 1. Run this script: .\debug-activation-flow.ps1
# 2. Follow the activation process in the app
# 3. The script will guide you through extracting logs
# 4. Send the JSON file to the assistant for analysis

Write-Host "🔍 Debug Activation Flow Analysis Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will help you capture activation flow debug logs." -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Instructions:" -ForegroundColor Green
Write-Host "1. Start the SMC Electron app" -ForegroundColor White
Write-Host "2. Open DevTools (Press F12 or Ctrl+Shift+I)" -ForegroundColor White
Write-Host "3. Go to the Console tab" -ForegroundColor White
Write-Host "4. Perform the activation process:" -ForegroundColor White
Write-Host "   - Go through license activation" -ForegroundColor Gray
Write-Host "   - Click 'เข้าสู่ระบบ' (Login) button" -ForegroundColor Gray
Write-Host "   - Navigate to home page" -ForegroundColor Gray
Write-Host "5. In DevTools Console, run this command:" -ForegroundColor White
Write-Host "   window.debugLogger.exportLogs()" -ForegroundColor Magenta
Write-Host "6. Copy the JSON output from the console" -ForegroundColor White
Write-Host "7. Save it as 'activation-debug-logs.json'" -ForegroundColor White
Write-Host ""

# Function to create a sample log file template
function Create-LogTemplate {
    $templatePath = Join-Path $PSScriptRoot "activation-debug-logs-template.json"
    
    $template = @{
        metadata = @{
            note = "Replace this template with actual logs from DevTools Console"
            instruction = "Run 'window.debugLogger.exportLogs()' in DevTools Console"
            totalEvents = 0
            duration = 0
            startTime = ""
            endTime = ""
        }
        events = @()
        analysis = @{
            eventsBySource = @{}
            timingAnalysis = @()
            criticalEvents = @()
        }
    }
    
    $template | ConvertTo-Json -Depth 10 | Out-File -FilePath $templatePath -Encoding UTF8
    
    Write-Host "📄 Created log template: $templatePath" -ForegroundColor Green
    return $templatePath
}

# Function to analyze logs if they exist
function Analyze-Logs {
    param($LogPath)
    
    if (Test-Path $LogPath) {
        try {
            $logs = Get-Content $LogPath | ConvertFrom-Json
            
            Write-Host ""
            Write-Host "📊 Log Analysis Results:" -ForegroundColor Cyan
            Write-Host "========================" -ForegroundColor Cyan
            Write-Host "Total Events: $($logs.metadata.totalEvents)" -ForegroundColor White
            Write-Host "Duration: $($logs.metadata.duration)ms" -ForegroundColor White
            Write-Host "Start Time: $($logs.metadata.startTime)" -ForegroundColor White
            Write-Host "End Time: $($logs.metadata.endTime)" -ForegroundColor White
            
            if ($logs.analysis.criticalEvents -and $logs.analysis.criticalEvents.Count -gt 0) {
                Write-Host ""
                Write-Host "🔍 Critical Events Timeline:" -ForegroundColor Yellow
                foreach ($event in $logs.analysis.criticalEvents) {
                    Write-Host "  [$($event.relativeTime)ms] $($event.source): $($event.event)" -ForegroundColor Gray
                }
            }
            
            if ($logs.analysis.timingAnalysis -and $logs.analysis.timingAnalysis.Count -gt 0) {
                Write-Host ""
                Write-Host "⏱️  Timing Analysis:" -ForegroundColor Yellow
                foreach ($timing in $logs.analysis.timingAnalysis) {
                    Write-Host "  $($timing.from) → $($timing.to): $($timing.duration)ms" -ForegroundColor Gray
                }
            }
            
            # Check for potential issues
            Write-Host ""
            Write-Host "🔍 Potential Issues Detected:" -ForegroundColor Red
            
            $hasRefreshActivation = $logs.events | Where-Object { $_.event -eq "REFRESH_ACTIVATION_STATUS_COMPLETE" }
            $hasNavigationToHome = $logs.events | Where-Object { $_.event -eq "NAVIGATION_TO_HOME_COMPLETE" }
            $hasHomeUseEffect = $logs.events | Where-Object { $_.event -eq "USE_EFFECT_IS_ACTIVATED_TRIGGERED" }
            $hasRefreshSlots = $logs.events | Where-Object { $_.event -eq "REFRESH_SLOTS_CALL_START" }
            
            if (-not $hasRefreshActivation) {
                Write-Host "  ❌ Missing REFRESH_ACTIVATION_STATUS_COMPLETE event" -ForegroundColor Red
            }
            
            if (-not $hasNavigationToHome) {
                Write-Host "  ❌ Missing NAVIGATION_TO_HOME_COMPLETE event" -ForegroundColor Red
            }
            
            if (-not $hasHomeUseEffect) {
                Write-Host "  ❌ Missing USE_EFFECT_IS_ACTIVATED_TRIGGERED event" -ForegroundColor Red
            } else {
                $homeEvent = $hasHomeUseEffect | Select-Object -First 1
                if ($homeEvent.data.isActivated -eq $false) {
                    Write-Host "  ⚠️  Home useEffect triggered but isActivated is false" -ForegroundColor Yellow
                }
            }
            
            if (-not $hasRefreshSlots) {
                Write-Host "  ❌ Missing REFRESH_SLOTS_CALL_START event - This is the main issue!" -ForegroundColor Red
            }
            
            Write-Host ""
            Write-Host "✅ Analysis complete. Send this file to the assistant for detailed review." -ForegroundColor Green
            
        } catch {
            Write-Host "❌ Error analyzing log file: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "📄 Log file not found. Please follow the instructions above to capture logs." -ForegroundColor Yellow
    }
}

# Main execution
Write-Host "🔧 Setting up debug environment..." -ForegroundColor Cyan

# Create template
$templatePath = Create-LogTemplate

Write-Host ""
Write-Host "⏳ Waiting for you to capture logs..." -ForegroundColor Yellow
Write-Host "Press any key after you've saved the logs as 'activation-debug-logs.json'" -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Check for logs
$logPath = Join-Path $PSScriptRoot "activation-debug-logs.json"
Analyze-Logs -LogPath $logPath

Write-Host ""
Write-Host "📤 Next Steps:" -ForegroundColor Green
Write-Host "1. Send the activation-debug-logs.json file to the assistant" -ForegroundColor White
Write-Host "2. The assistant will analyze the timing and identify the root cause" -ForegroundColor White
Write-Host "3. A fix will be implemented based on the analysis" -ForegroundColor White

Write-Host ""
Write-Host "🎯 Debug session complete!" -ForegroundColor Cyan