# Doctor Directory — VM Deployment Guide (IIS)

## Two Deployment Options

| Option | Best For | Complexity |
|---|---|---|
| **Option A: Direct Node.js** | Quick setup, simple | Easy |
| **Option B: IIS Reverse Proxy** | Production, company standard | Medium |

---

## Option A: Direct Node.js (Recommended for quick deployment)

### Prerequisites
- **Node.js 18+** installed → [nodejs.org](https://nodejs.org)

### Steps

1. **Copy** the `publish` folder to the VM (e.g., `C:\Apps\DoctorDirectory\`)

2. **Open PowerShell** in that folder and run setup:
   ```powershell
   .\setup.ps1
   ```
   This seeds the database with 33,000+ doctors from the Excel files.

3. **Start the server:**
   ```powershell
   .\start.ps1
   ```
   
4. **Open firewall port:**
   ```powershell
   New-NetFirewallRule -DisplayName "Doctor Directory" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow
   ```

5. **Access the app:**
   - Local: `http://localhost:3001`
   - Network: `http://<VM-IP>:3001`

### Run as Background Service (Optional)
To keep the app running after you close the terminal, use NSSM:
```powershell
# Download NSSM from https://nssm.cc/download
nssm install DoctorDirectory "C:\Program Files\nodejs\node.exe"
nssm set DoctorDirectory AppParameters "C:\Apps\DoctorDirectory\node_modules\.bin\tsx server\index.ts"
nssm set DoctorDirectory AppDirectory "C:\Apps\DoctorDirectory"
nssm set DoctorDirectory AppEnvironmentExtra "PORT=3001"
nssm start DoctorDirectory
```

---

## Option B: IIS Reverse Proxy

This sets up IIS to reverse-proxy requests to the Node.js server, giving you a standard port 80/443 setup.

### Prerequisites
1. **Node.js 18+** installed
2. **IIS** enabled on the VM
3. **iisnode** module installed
4. **URL Rewrite** module installed

### Step 1: Enable IIS
```powershell
# Run in PowerShell as Administrator
Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-StaticContent, IIS-DefaultDocument, IIS-HttpErrors, IIS-ApplicationDevelopment, IIS-ISAPIExtensions, IIS-ISAPIFilter, IIS-RequestFiltering -All
```

### Step 2: Install iisnode
Download and install from: https://github.com/Azure/iisnode/releases
- Choose the x64 MSI for your system

### Step 3: Install URL Rewrite Module
Download from: https://www.iis.net/downloads/microsoft/url-rewrite
- Install the x64 version

### Step 4: Copy Files
Copy the `publish` folder contents to:
```
C:\inetpub\wwwroot\DoctorDirectory\
```

### Step 5: Run Setup
```powershell
cd C:\inetpub\wwwroot\DoctorDirectory
.\setup.ps1
```

### Step 6: Set Folder Permissions
IIS needs write access for the SQLite database:
```powershell
$path = "C:\inetpub\wwwroot\DoctorDirectory"
$acl = Get-Acl $path
$rule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS", "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
$acl.AddAccessRule($rule)
Set-Acl $path $acl
Write-Host "Permissions set"
```

### Step 7: Create IIS Site
```powershell
# Run in PowerShell as Administrator
Import-Module WebAdministration

# Remove default site if needed
# Remove-WebSite -Name "Default Web Site"

# Create new site
New-WebSite -Name "DoctorDirectory" `
    -Port 80 `
    -PhysicalPath "C:\inetpub\wwwroot\DoctorDirectory" `
    -Force

Write-Host "IIS Site created on port 80"
```

### Step 8: Test
- Local: `http://localhost`
- Network: `http://<VM-IP>`

---

## 🌐 Production Deployment (No Port / SSL)

To access your app via `https://your-domain.com` without specifying port 3001, follow these steps:

### 1. Prerequisites
- **Node.js 18+** installed.
- **IIS** enabled.
- **Application Request Routing (ARR)** installed: [Download here](https://www.iis.net/downloads/microsoft/application-request-routing)
- **URL Rewrite Module** installed: [Download here](https://www.iis.net/downloads/microsoft/url-rewrite)

### 2. Enable ARR Proxy (Critical)
IIS acts as a middleman. You must tell it to "allow proxying":
1. Open **IIS Manager**.
2. Click on your **Server Name** in the left panel.
3. Open **Application Request Routing Cache**.
4. In the right "Actions" panel, click **Server Proxy Settings**.
5. Check **Enable proxy** and click **Apply**.

### 3. Create IIS Site & Bindings
1. Copy the `publish` folder contents to `C:\inetpub\wwwroot\DoctorDirectory`.
2. In IIS Manager, right-click "Sites" → **Add Website**.
   - **Site name**: DoctorDirectory
   - **Physical path**: C:\inetpub\wwwroot\DoctorDirectory
   - **Binding**: Type: `http`, Port: `80` (or `https`, Port: `443` if SSL is ready).
3. **For SSL (HTTPS):**
   - Click your site "DoctorDirectory".
   - Click **Bindings...** in the right panel.
   - Add a new binding: `https`, Port: `443`.
   - Select your **SSL Certificate** from the dropdown.

### 4. Background Service (Port 3001)
Your app still runs internally on port 3001. Use the included `service_installation.js` to keep it running forever:
1. Open PowerShell as Admin in the app folder.
2. Run: `node service_installation.js`

### 5. Access
The `web.config` included in the `publish` folder will now automatically:
- Serve static files (HTML/CSS/JS) directly via IIS.
- Reverse proxy all `/api` and internal routing to `http://localhost:3001`.
- Allow you to use the URL **without** the `:3001` suffix.

---

## Useful Commands

### Data Export
- **Hidden shortcut:** Click stethoscope logo 5 times → downloads CSV
- **Direct URL:** `http://<VM-IP>:3001/api/export/locations`

### Database Backup
```powershell
Copy-Item "doctor_directory.db" "backup_$(Get-Date -Format 'yyyy-MM-dd').db"
```

### Clear Test Data
```powershell
node -e "const db=require('better-sqlite3')('doctor_directory.db'); db.prepare('DELETE FROM locations').run(); db.prepare('DELETE FROM user_sessions').run(); console.log('Data cleared');"
```

### Check Server Status
```powershell
Invoke-RestMethod "http://localhost:3001/api/doctors?limit=1" | ConvertTo-Json
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| **Can't access from network** | Open firewall port: `New-NetFirewallRule -DisplayName "DoctorDir" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow` |
| **"EADDRINUSE" error** | Another process is using the port. Kill it: `Get-NetTCPConnection -LocalPort 3001 \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` |
| **Database locked** | Restart the Node.js server |
| **iisnode errors** | Check logs in `C:\inetpub\wwwroot\DoctorDirectory\iisnode\` |
| **Permission denied (IIS)** | Re-run Step 6 (folder permissions) |
