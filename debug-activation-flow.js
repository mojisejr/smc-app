/**
 * Debug Activation Flow Analysis Script
 * 
 * This script helps analyze the activation flow timing issue where no state check 
 * command is sent after activation and navigating to the homepage.
 * 
 * Usage:
 * 1. Run this script: node debug-activation-flow.js
 * 2. Follow the activation process in the app
 * 3. The script will save logs to activation-debug-logs.json
 * 4. Send the JSON file to the assistant for analysis
 */

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Import the debug logger utility
const debugLoggerPath = path.join(__dirname, 'renderer', 'utils', 'debugLogger.ts');

console.log('🔍 Debug Activation Flow Analysis Script');
console.log('==========================================');
console.log('');
console.log('Instructions:');
console.log('1. This script will monitor activation flow events');
console.log('2. Perform the activation process in the app');
console.log('3. Navigate to home page after activation');
console.log('4. Press Ctrl+C to stop monitoring and save logs');
console.log('5. Send the generated activation-debug-logs.json file for analysis');
console.log('');
console.log('Starting monitoring...');
console.log('');

// Store all captured events
let capturedEvents = [];
let startTime = Date.now();

// Function to log events with timing
function logEvent(source, event, data = {}) {
  const timestamp = Date.now();
  const relativeTime = timestamp - startTime;
  
  const logEntry = {
    timestamp: new Date(timestamp).toISOString(),
    relativeTime: relativeTime,
    source: source,
    event: event,
    data: data
  };
  
  capturedEvents.push(logEntry);
  
  console.log(`[${relativeTime}ms] ${source}: ${event}`, data ? JSON.stringify(data) : '');
}

// Function to save logs to file
function saveLogs() {
  const logFile = path.join(__dirname, 'activation-debug-logs.json');
  
  const analysisData = {
    metadata: {
      totalEvents: capturedEvents.length,
      duration: Date.now() - startTime,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString()
    },
    events: capturedEvents,
    analysis: {
      eventsBySource: {},
      timingAnalysis: [],
      criticalEvents: []
    }
  };
  
  // Group events by source
  capturedEvents.forEach(event => {
    if (!analysisData.analysis.eventsBySource[event.source]) {
      analysisData.analysis.eventsBySource[event.source] = [];
    }
    analysisData.analysis.eventsBySource[event.source].push(event);
  });
  
  // Find critical timing events
  const criticalEventTypes = [
    'HANDLE_CONTINUE_START',
    'REFRESH_ACTIVATION_STATUS_START',
    'REFRESH_ACTIVATION_STATUS_COMPLETE',
    'NAVIGATION_TO_HOME_START',
    'USE_EFFECT_IS_ACTIVATED_TRIGGERED',
    'REFRESH_SLOTS_CALL_START',
    'IPC_INIT_INVOKE_START'
  ];
  
  analysisData.analysis.criticalEvents = capturedEvents.filter(event => 
    criticalEventTypes.includes(event.event)
  );
  
  // Calculate timing between critical events
  for (let i = 0; i < analysisData.analysis.criticalEvents.length - 1; i++) {
    const current = analysisData.analysis.criticalEvents[i];
    const next = analysisData.analysis.criticalEvents[i + 1];
    
    analysisData.analysis.timingAnalysis.push({
      from: current.event,
      to: next.event,
      duration: next.relativeTime - current.relativeTime,
      fromSource: current.source,
      toSource: next.source
    });
  }
  
  fs.writeFileSync(logFile, JSON.stringify(analysisData, null, 2));
  
  console.log('');
  console.log('📊 Analysis Complete!');
  console.log('====================');
  console.log(`Total events captured: ${capturedEvents.length}`);
  console.log(`Total duration: ${Date.now() - startTime}ms`);
  console.log(`Log file saved: ${logFile}`);
  console.log('');
  console.log('📋 Summary of Critical Events:');
  analysisData.analysis.criticalEvents.forEach(event => {
    console.log(`  [${event.relativeTime}ms] ${event.source}: ${event.event}`);
  });
  
  if (analysisData.analysis.timingAnalysis.length > 0) {
    console.log('');
    console.log('⏱️  Timing Analysis:');
    analysisData.analysis.timingAnalysis.forEach(timing => {
      console.log(`  ${timing.from} → ${timing.to}: ${timing.duration}ms`);
    });
  }
  
  console.log('');
  console.log('📤 Please send the activation-debug-logs.json file to the assistant for detailed analysis.');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping monitoring...');
  saveLogs();
  process.exit(0);
});

// Simulate monitoring (in real app, this would be connected to the debug logger)
console.log('⚠️  Note: This is a standalone monitoring script.');
console.log('   In the actual app, the debug logger will automatically capture events.');
console.log('   To get real data:');
console.log('   1. Start the Electron app');
console.log('   2. Open DevTools (F12)');
console.log('   3. Go to Console tab');
console.log('   4. Run: window.debugLogger.exportLogs()');
console.log('   5. Copy the JSON output and save it as activation-debug-logs.json');
console.log('');
console.log('   Or use the built-in export function in the app after testing.');

// Keep the script running
setInterval(() => {
  // This keeps the script alive for monitoring
}, 1000);