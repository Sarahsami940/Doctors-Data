# Doctor Directory App - VM Deployment Guide

## Prerequisites
- Node.js 18+ installed on the VM
- The project folder copied to the VM

## Setup Steps

### 1. Install Dependencies
```powershell
cd "path\to\Doctor's directory app"
npm install
```

### 2. Seed the Database
This imports doctor records and city-brick mappings from the Excel files in `data/` folder.
```powershell
npm run seed
```
The database file `doctor_directory.db` will be created in the project root.

### 3. Build the Frontend
```powershell
npm run build
```
This creates the `dist/` folder with the production frontend.

### 4. Start the Production Server
```powershell
npm run start
```
The server will run on port 3001 by default. To change the port:
```powershell
$env:PORT = "8080"; npm run start
```

### 5. Access the App
Open a browser and navigate to `http://<VM-IP>:<PORT>`

## Using the PowerShell Scripts

### Quick Setup (first time)
```powershell
.\deploy\setup.ps1
```

### Start the Server
```powershell
.\deploy\start.ps1
```

## Data Export
- Visit `http://<VM-IP>:<PORT>/api/export/locations` to download all collected location data as CSV
- The database file is at `doctor_directory.db` - you can copy this file directly for backup

## Notes
- The SQLite database is a single file (`doctor_directory.db`) - easy to backup
- The server uses WAL mode for safe concurrent access
- No authentication needed - user identity is captured per session via the popup prompt
