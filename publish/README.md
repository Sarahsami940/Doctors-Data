# Doctor Directory — Deployment Guide (Phase 1 & 2)

## Admin Password
Default: **`admin123`**
To override, set the environment variable `ADMIN_KEY=your_password` before starting.

---

## Two Deployment Options

| Option | Best For | Complexity |
|---|---|---|
| **Option A: Direct Node.js** | Quick setup, simple | Easy |
| **Option B: IIS Reverse Proxy** | Production, company standard | Medium |

---

## Option A: Direct Node.js (Recommended)

### Prerequisites
- **Node.js 18+** installed → [nodejs.org](https://nodejs.org)

### Steps

1. **Copy** the `publish` folder to the VM (e.g., `C:\Apps\DoctorDirectory\`)

2. **Open PowerShell** in that folder and run setup:
   ```powershell
   .\setup.ps1
   ```
   This installs dependencies and seeds the database with doctors, city/brick mappings, and expense cities from the Excel files in the `data\` folder.

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

---

## Option B: IIS Reverse Proxy

### Prerequisites
1. Node.js 18+
2. IIS enabled
3. iisnode module
4. URL Rewrite module

### Steps
1. Copy `publish` contents to `C:\inetpub\wwwroot\DoctorDirectory\`
2. Run `.\setup.ps1`
3. Set folder permissions for IIS_IUSRS:
   ```powershell
   $path = "C:\inetpub\wwwroot\DoctorDirectory"
   $acl = Get-Acl $path
   $rule = New-Object System.Security.AccessControl.FileSystemAccessRule("IIS_IUSRS","FullControl","ContainerInherit,ObjectInherit","None","Allow")
   $acl.AddAccessRule($rule)
   Set-Acl $path $acl
   ```
4. Create IIS site pointing to the folder on port 80.
5. The included `web.config` handles reverse proxy of `/api` to port 3001.

---

## 🗄️ Database: Schema & Migrations

### How Schema is Applied
The schema is **automatically applied** when the server first starts. All tables use `CREATE TABLE IF NOT EXISTS`, so running on an existing database is safe — new tables are added without touching existing data.

**No manual SQL migration is needed for a fresh install.**

### Phase 1 & 2 Tables (applied automatically)
| Table | Purpose |
|---|---|
| `doctors` | Master doctor records (seeded from Excel) |
| `locations` | TSM-added locations per doctor |
| `user_sessions` | User login sessions |
| `city_brick_mapping` | DAS city → brick lookup (seeded from Excel) |
| `cities_expense` | Expense city list (seeded from Excel) |
| `doctor_suggestions` | TSM-submitted info corrections |
| `doctors_finalized` | Admin-approved finalized records |
| `doctor_cnic` | CNIC lock per doctor (first-submit wins) |
| `pmdc_lookup` | PMDC number → doctor name lookup |
| `dropdown_options` | Seeded dropdown values |

### If Upgrading an Existing Database
If you have a live database from **before Phase 2** (missing `doctor_suggestions`, `doctors_finalized`, `doctor_cnic`), run this migration script once:

```powershell
# Open PowerShell in the publish folder
node -e "
const Database = require('better-sqlite3');
const db = new Database('doctor_directory.db');

db.exec(\`
  CREATE TABLE IF NOT EXISTS doctor_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    employee_name TEXT NOT NULL,
    suggested_name TEXT,
    suggested_mobile TEXT,
    suggested_speciality TEXT,
    suggested_designation TEXT,
    suggested_qualification TEXT,
    suggested_pmdc TEXT,
    suggested_cnic TEXT,
    suggest_delete INTEGER DEFAULT 0,
    delete_reason TEXT,
    change_reason TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (session_id) REFERENCES user_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS doctors_finalized (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_doctor_id INTEGER NOT NULL,
    doctor_name TEXT NOT NULL,
    mobile_number TEXT,
    speciality TEXT,
    designation TEXT,
    qualification TEXT,
    pmdc_number TEXT,
    pmdc_number_new TEXT,
    cnic TEXT,
    is_deleted INTEGER DEFAULT 0,
    finalized_by TEXT NOT NULL,
    finalized_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (source_doctor_id) REFERENCES doctors(id)
  );

  CREATE TABLE IF NOT EXISTS doctor_cnic (
    doctor_id INTEGER PRIMARY KEY,
    cnic TEXT NOT NULL,
    submitted_by_session INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (submitted_by_session) REFERENCES user_sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_suggestions_doctor ON doctor_suggestions(doctor_id);
  CREATE INDEX IF NOT EXISTS idx_suggestions_status ON doctor_suggestions(status);
  CREATE INDEX IF NOT EXISTS idx_finalized_source ON doctors_finalized(source_doctor_id);
\`);

console.log('Migration complete — Phase 2 tables created');
db.close();
"
```

### Seeding Data from Excel Files
The `setup.ps1` script runs `node seed.ts` automatically. To re-run seeding manually (e.g. after updating Excel files):

```powershell
# In the publish folder
npx tsx server\seed.ts
```

**What gets seeded:**
- `data\doctors.xlsx` → `doctors` table (~33,000 records)
- `data\city_brick_mapping.xlsx` → `city_brick_mapping` table
- `data\cities_expense.xlsx` → `cities_expense` table

> ⚠️ **Seeding is safe to re-run** — it uses `INSERT OR IGNORE` so existing records are never overwritten or duplicated.

### Database Backup
```powershell
Copy-Item "doctor_directory.db" "backup_$(Get-Date -Format 'yyyy-MM-dd_HH-mm').db"
```

### Verify the database is healthy
```powershell
node -e "
const db = require('better-sqlite3')('doctor_directory.db');
const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all();
console.log('Tables:', tables.map(t => t.name).join(', '));
const doctorCount = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;
console.log('Doctors:', doctorCount);
db.close();
"
```

---

## 🌐 Production Deployment (IIS with ARR — No Port Suffix)

1. Install **Application Request Routing (ARR)**: [Download](https://www.iis.net/downloads/microsoft/application-request-routing)
2. In IIS Manager → Server → **Application Request Routing Cache** → **Server Proxy Settings** → enable **Enable proxy**
3. Copy publish folder to `C:\inetpub\wwwroot\DoctorDirectory`
4. Run `setup.ps1`
5. Run `node service_installation.js` as Admin to install as a Windows service
6. The included `web.config` proxies all `/api` traffic to `localhost:3001`
7. Access via `http://<server-name>` (no port needed)

---

## Useful Commands

| Command | Purpose |
|---|---|
| `.\start.ps1` | Start the server |
| `.\start.bat` | Start the server (Windows CMD) |
| `node service_installation.js` | Install as a Windows service |
| `node service_uninstall.js` | Remove the Windows service |

### Data Export
- **Hidden shortcut:** Click stethoscope logo 5 times → downloads CSV
- **Direct URL:** `http://<VM-IP>:3001/api/export/locations`

### Clear Test/Session Data Only (keep doctors)
```powershell
node -e "
const db = require('better-sqlite3')('doctor_directory.db');
db.prepare('DELETE FROM locations').run();
db.prepare('DELETE FROM user_sessions').run();
db.prepare('DELETE FROM doctor_suggestions').run();
db.prepare('DELETE FROM doctors_finalized').run();
db.prepare('DELETE FROM doctor_cnic').run();
console.log('User data cleared. Doctor master data preserved.');
db.close();
"
```

### Check Server Status
```powershell
Invoke-RestMethod "http://localhost:3001/api/doctors?limit=1" | ConvertTo-Json
```

---

## Troubleshooting

| Issue | Solution |
|---|---|
| **Can't access from network** | `New-NetFirewallRule -DisplayName "DoctorDir" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow` |
| **"EADDRINUSE" error** | `Get-NetTCPConnection -LocalPort 3001 \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` |
| **Database locked** | Restart the Node.js server |
| **iisnode errors** | Check logs in `C:\inetpub\wwwroot\DoctorDirectory\iisnode\` |
| **Permission denied (IIS)** | Re-run the IIS_IUSRS permission step |
| **Missing Phase 2 tables** | Run the migration script in the **Upgrading** section above |
