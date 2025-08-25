# ESP32 Sales Deployment Guide - Windows Setup

## Overview

Complete guide for sales team to deploy ESP32 devices using the ESP32 Deployment Tool on Windows. This guide is designed for non-technical users and covers everything from software installation to customer delivery.

**What this tool does:**
- Deploy ESP32 firmware with customer configuration
- Generate CSV files for development team
- Package customer information for license creation
- Track deployments for production workflow

## 📦 Getting ESP32 Deployment Tool

### Distribution Package

**From Development Team, you will receive:**
- `esp32-deployment-tool.zip` - Complete tool package
- `SETUP-INSTRUCTIONS.txt` - This guide
- `Node.js-v18-Windows-Installer.exe` - Required software

**Package Contents:**
```
esp32-deployment-tool/
├── node_modules/          # Pre-installed dependencies (included)
├── src/                   # Application code (included)  
├── package.json           # Configuration (included)
├── README.md              # Technical documentation
├── templates/             # ESP32 firmware templates (included)
├── exports/               # Output folder for CSV files
└── temp/                  # Temporary files (auto-created)
```

## 🖥 Windows Setup (Step-by-Step)

### Step 1: Install Node.js

**Required:** Node.js v18 or higher

```
1. Run "Node.js-v18-Windows-Installer.exe" (provided by development team)
2. Follow installation wizard:
   - Click "Next" through all steps
   - Keep all default settings
   - Click "Install" (may require Administrator privileges)
   - Click "Finish"

3. Verify installation:
   - Press Windows Key + R
   - Type "cmd" and press Enter
   - Type: node --version
   - Should show: v18.x.x or higher
   - Type: npm --version  
   - Should show: 8.x.x or higher
```

**If Node.js installation fails:**
- Download latest version from https://nodejs.org/
- Choose "LTS" version for Windows (.msi file)
- Run as Administrator

### Step 2: Extract Tool Package

```
1. Extract "esp32-deployment-tool.zip" to your desired location:
   - Recommended: C:\esp32-deployment-tool\
   - Alternative: Desktop\esp32-deployment-tool\
   
2. Verify extraction:
   - Open the extracted folder
   - Should see folders: src, node_modules, templates, exports
   - Should see files: package.json, README.md
```

### Step 3: Install ESP32 Drivers (Important!)

**ESP32 USB Driver Installation:**
```
1. Download CP2102 USB Driver:
   - Search "CP2102 driver Windows" 
   - Download from Silicon Labs official website
   - Or ask development team for driver package

2. Install driver:
   - Run driver installer as Administrator
   - Follow installation steps
   - Restart computer if prompted

3. Test ESP32 connection:
   - Connect ESP32 to USB port
   - Open Device Manager (Windows Key + X → Device Manager)
   - Should see "Silicon Labs CP210x USB to UART Bridge" under "Ports (COM & LPT)"
   - Note the COM port number (e.g., COM3, COM4)
```

### Step 4: Start ESP32 Deployment Tool

**Launch Application:**
```
1. Open Command Prompt:
   - Press Windows Key + R
   - Type "cmd" and press Enter

2. Navigate to tool directory:
   - Type: cd C:\esp32-deployment-tool
   - Press Enter

3. Start the server:
   - Type: npm run dev
   - Press Enter
   - Wait for "Ready on http://localhost:3000" message

4. Open web browser:
   - Open Chrome, Firefox, or Edge
   - Go to: http://localhost:3000
   - ESP32 Deployment Tool should appear
```

**Success Indicators:**
- ✅ Command prompt shows "Ready on http://localhost:3000"
- ✅ Browser opens ESP32 Deployment Tool interface
- ✅ No error messages in command prompt
- ✅ Tool shows customer form and device detection area

## 🎯 ESP32 Deployment Workflow

### Step 1: Prepare ESP32 Device

**Hardware Setup:**
```
1. Get ESP32 development board
2. Connect ESP32 to computer via USB cable
3. Verify connection:
   - ESP32 power LED should turn on
   - Windows should detect USB device
   - Check Device Manager for COM port
```

**If ESP32 not detected:**
- Try different USB cable
- Use USB 2.0 port (not USB 3.0)
- Install CP2102 drivers (see setup instructions above)
- Try different ESP32 board

### Step 2: Fill Customer Information

**In ESP32 Deployment Tool (web browser):**

1. **Organization Name:**
   ```
   Example: "SMC Medical Center Bangkok"
   Format: Full legal name of medical facility
   ```

2. **Customer ID:**
   ```
   Example: "BGK001"
   Format: Unique 6-character code (letters + numbers)
   Rules: Use city code + sequential number
   ```

3. **Application Name:**
   ```
   Example: "SMC_Cabinet"  
   Default: Use "SMC_Cabinet" for medication cabinet
   ```

4. **Expiry Date:**
   ```
   Example: "2025-12-31"
   Format: YYYY-MM-DD
   Alternative: Check "No Expiry" for permanent licenses
   ```

5. **WiFi Configuration:**
   ```
   WiFi SSID Example: "SMC_ESP32_BGK001"
   WiFi Password Example: "SecurePass123!"
   
   Requirements:
   - Password minimum 8 characters
   - Include uppercase, lowercase, numbers
   - Avoid special characters: < > " ' & 
   ```

**Form Validation:**
- All fields turn green when valid
- Error messages appear for invalid data
- "Deploy Configuration" button becomes active when all valid

### Step 3: Deploy ESP32 Configuration

**Deployment Process:**
```
1. Click "Deploy Configuration" button
2. Tool will automatically:
   - Detect ESP32 device on COM port
   - Flash firmware to ESP32
   - Configure WiFi settings
   - Set up customer parameters
   
3. Monitor progress:
   - Progress bar shows flashing status
   - Messages show current step
   - Success message when complete

4. Verify deployment:
   - ESP32 should restart automatically
   - Built-in LED may blink (normal)
   - Tool shows "Deployment Successful" message
```

**Common Deployment Issues:**

**Issue:** "ESP32 not detected"
```
Solution:
1. Check USB connection
2. Verify drivers installed
3. Try different USB port
4. Check Device Manager for COM port
5. Close other applications using COM port
```

**Issue:** "Flash failed" or "Upload failed"
```
Solution:
1. Press and hold ESP32 "Boot" button during flashing
2. Use high-quality USB cable
3. Try different USB port
4. Restart ESP32 Deployment Tool
5. Power cycle ESP32 (unplug/plug USB)
```

**Issue:** "Permission denied" or "Access denied"
```
Solution:
1. Close Arduino IDE or other serial applications
2. Run Command Prompt as Administrator
3. Disconnect/reconnect ESP32
4. Restart computer if persistent
```

### Step 4: Test ESP32 Configuration

**After successful deployment:**
```
1. ESP32 testing (built into tool):
   - Tool automatically tests ESP32 after deployment
   - Verifies WiFi configuration
   - Checks HTTP endpoints (/mac, /health)
   - Shows MAC address and device info

2. Manual verification (if needed):
   - ESP32 creates WiFi hotspot with configured name
   - Connect laptop to ESP32 WiFi network
   - Open browser to 192.168.4.1
   - Should see ESP32 web interface

3. Record information:
   - Note ESP32 MAC address (shown in tool)
   - Note WiFi network name created by ESP32
   - Verify customer information is correct
```

### Step 5: Generate Export Files

**Export Customer Data:**
```
1. Click "Export Customer Data" button
2. Two files are automatically created in exports/ folder:
   
   Individual JSON file:
   - customer-BGK001-2025-08-25.json
   - Contains single customer configuration
   
   Daily CSV file:
   - esp32-deployments-2025-08-25.csv  
   - Contains all customers deployed today
   - Automatically updates with each deployment

3. File locations:
   - C:\esp32-deployment-tool\exports\
   - Files are automatically timestamped
   - Each deployment adds to daily CSV
```

**Export File Contents:**
```
CSV includes:
- organization: Customer name
- customer_id: Unique customer code
- application_name: Application type
- expiry_date: License expiry (or "No Expiry")
- wifi_ssid: ESP32 WiFi network name
- wifi_password: ESP32 WiFi password  
- mac_address: ESP32 MAC address
- deployment_date: When ESP32 was deployed
- sales_person: Your name (can add manually)
- notes: Additional information
```

## 📋 Daily Sales Workflow

### Morning Setup

**Start of day routine:**
```
1. Turn on Windows computer
2. Open Command Prompt
3. Navigate: cd C:\esp32-deployment-tool
4. Start tool: npm run dev
5. Open browser: http://localhost:3000
6. Verify tool is working
7. Check exports/ folder for yesterday's files
```

### Per-Customer Process

**For each customer deployment:**
```
1. Fill customer form (5 minutes)
2. Connect ESP32 device  
3. Deploy configuration (5 minutes)
4. Test ESP32 operation (2 minutes)
5. Export customer data (1 minute)
6. Package ESP32 for shipping (as needed)
7. Update customer tracking (your system)

Total time per customer: ~15 minutes
```

### End of Day

**Daily completion routine:**
```
1. Check exports/ folder for today's CSV file
2. Email CSV file to development team:
   - Subject: "ESP32 Deployments - [TODAY'S DATE]"
   - Attach: esp32-deployments-2025-08-25.csv
   - Include: Number of customers deployed today

3. Backup export files (optional):
   - Copy exports/ folder to USB drive or network
   
4. Close ESP32 Deployment Tool:
   - Close web browser
   - Press Ctrl+C in Command Prompt
   - Close Command Prompt

5. Shut down computer or leave running for next day
```

## 🚀 Advanced Operations

### Multiple ESP32 Deployments

**Processing multiple devices:**
```
1. Deploy first ESP32:
   - Fill form → Deploy → Test → Export
   - Remove ESP32 from USB

2. Deploy second ESP32:
   - Keep same browser tab open
   - Connect new ESP32 to USB
   - Fill new customer form
   - Deploy → Test → Export

3. Continue for additional devices:
   - Tool automatically adds to same daily CSV
   - No need to restart application
```

### Batch Deployment Day

**For high-volume deployment days:**
```
1. Prepare multiple ESP32 devices
2. Prepare customer information list
3. Set up assembly line process:
   - Station 1: Customer form entry
   - Station 2: ESP32 connection and deployment  
   - Station 3: Testing and packaging
   - Station 4: Export and documentation

4. Use multiple USB ports:
   - Tool detects whichever ESP32 is connected
   - Can switch between devices quickly
```

### Troubleshooting Customer Issues

**When customer reports problems:**
```
1. Get customer information:
   - Customer ID from original deployment
   - ESP32 MAC address (if available)
   - Error messages from SMC application

2. Find deployment record:
   - Check exports/ folder for deployment date
   - Search CSV file for customer ID
   - Verify configuration details

3. Re-deploy if needed:
   - Use same customer information
   - Re-flash ESP32 with same settings
   - Generate new export for development team

4. Contact development team:
   - Send original CSV entry
   - Include problem description
   - Provide re-deployment CSV if created
```

## 🔧 Windows-Specific Issues & Solutions

### Command Prompt Issues

**Issue:** "Command not found" or "'npm' is not recognized"
```
Solution:
1. Restart Command Prompt
2. Check Node.js installation: node --version
3. If still failing, add Node.js to PATH:
   - Control Panel → System → Advanced System Settings
   - Environment Variables → System Variables
   - Find PATH → Edit → Add Node.js installation folder
   - Usually: C:\Program Files\nodejs\
```

**Issue:** Command Prompt closes automatically
```
Solution:
1. Don't close Command Prompt while tool is running
2. Minimize instead of closing
3. If accidentally closed, restart: npm run dev
```

### Windows Firewall Issues

**Issue:** Browser cannot connect to localhost:3000
```
Solution:
1. Windows Defender Firewall notification may appear
2. Click "Allow access" when prompted
3. If no prompt appears:
   - Control Panel → Windows Defender Firewall
   - Allow an app through firewall → Change settings
   - Find Node.js → Check "Private" and "Public"
   - Click OK
```

### USB Connection Issues

**Issue:** ESP32 connects/disconnects repeatedly
```
Solution:
1. Use high-quality USB cable (not charging-only cable)
2. Connect to USB 2.0 port (usually black, not blue)
3. Avoid USB hubs - connect directly to computer
4. Try different USB ports
5. Update USB drivers via Device Manager
```

**Issue:** Multiple COM ports appear in Device Manager
```
Solution:
1. Only connect one ESP32 at a time during deployment
2. If multiple ports exist, tool will automatically find correct one
3. To clean up old ports:
   - Device Manager → View → Show hidden devices
   - Uninstall old/disconnected COM ports
```

### Network Configuration Issues

**Issue:** Cannot access ESP32 web interface
```
Solution:
1. Connect computer to ESP32 WiFi network
2. ESP32 network name format: SMC_ESP32_[CUSTOMER_ID]
3. Default ESP32 IP: 192.168.4.1
4. If still not accessible:
   - Check Windows WiFi settings
   - Disable other network adapters temporarily
   - Try different web browser
```

## 📞 Support & Contacts

### Technical Support

**For ESP32 Deployment Tool issues:**
- Check this guide first
- Restart tool: Close Command Prompt → Restart npm run dev
- Check Windows/driver issues above
- Contact development team with:
  - Error messages (screenshot)
  - Windows version
  - Node.js version (node --version)

**For Customer Configuration issues:**
- Verify customer information accuracy
- Check export CSV file format
- Contact development team with:
  - Customer ID and deployment date
  - Original customer form data
  - Export files from deployment

### Emergency Procedures

**If tool completely stops working:**
```
1. Restart computer
2. Check Node.js still installed: node --version
3. Re-extract esp32-deployment-tool.zip if needed
4. Contact development team immediately
5. Use backup deployment method (if provided)
```

**If ESP32 deployment fails repeatedly:**
```
1. Try different ESP32 device
2. Check USB cable and port
3. Verify drivers installed correctly
4. Document error messages and patterns
5. Switch to manual ESP32 programming (if trained)
```

### Daily Reporting

**Send to development team daily:**
- ESP32 deployment CSV file
- Number of successful deployments  
- Any issues encountered
- Customer feedback (if any)

**Weekly reporting:**
- Total deployments for week
- Common issues observed
- Suggestions for tool improvements

---

**Tool Status:** ESP32 Deployment Tool v4.5 Ready ✅  
**Windows Compatibility:** Windows 10/11 ✅  
**Last Updated:** August 2025  
**Support:** Development Team