import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'doctor_directory.db');

let db: Database.Database;

export function getDb(): Database.Database {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        db.pragma('busy_timeout = 5000');
        initSchema(db);
    }
    return db;
}

function initSchema(db: Database.Database) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_city_das TEXT,
      distributor_name TEXT,
      doctor_name TEXT NOT NULL,
      mobile_number TEXT,
      qualification TEXT,
      designation TEXT,
      speciality TEXT,
      pmdc_number TEXT,
      deleted_at TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS city_brick_mapping (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_name TEXT NOT NULL,
      brick_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cities_expense (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city_name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      employee_code INTEGER NOT NULL,
      role TEXT NOT NULL,
      team TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      city_expense TEXT NOT NULL COLLATE NOCASE,
      city_das TEXT NOT NULL COLLATE NOCASE,
      brick_das TEXT NOT NULL COLLATE NOCASE,
      location_name TEXT DEFAULT '' COLLATE NOCASE,
      session_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (session_id) REFERENCES user_sessions(id),
      UNIQUE(doctor_id, city_expense, city_das, brick_das, location_name)
    );

    -- PMDC lookup table (seeded from Excel)
    CREATE TABLE IF NOT EXISTS pmdc_lookup (
      pmdc_number TEXT PRIMARY KEY,
      doctor_name TEXT NOT NULL
    );

    -- Dropdown options (seeded from Excel)
    CREATE TABLE IF NOT EXISTS dropdown_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      value TEXT NOT NULL,
      UNIQUE(category, value)
    );

    -- Doctor info suggestions from TSMs
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

    -- Finalized doctor records (approved suggestions)
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
      finalized_by TEXT NOT NULL,
      finalized_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (source_doctor_id) REFERENCES doctors(id)
    );

    -- CNIC lock per doctor (first TSM to submit locks it)
    CREATE TABLE IF NOT EXISTS doctor_cnic (
      doctor_id INTEGER PRIMARY KEY,
      cnic TEXT NOT NULL,
      submitted_by_session INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id),
      FOREIGN KEY (submitted_by_session) REFERENCES user_sessions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(doctor_name);
    CREATE INDEX IF NOT EXISTS idx_doctors_speciality ON doctors(speciality);
    CREATE INDEX IF NOT EXISTS idx_doctors_designation ON doctors(designation);
    CREATE INDEX IF NOT EXISTS idx_doctors_qualification ON doctors(qualification);
    CREATE INDEX IF NOT EXISTS idx_doctors_city_das ON doctors(doctor_city_das);
    CREATE INDEX IF NOT EXISTS idx_doctors_distributor ON doctors(distributor_name);
    CREATE INDEX IF NOT EXISTS idx_city_brick_city ON city_brick_mapping(city_name);
    CREATE INDEX IF NOT EXISTS idx_locations_doctor ON locations(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_suggestions_doctor ON doctor_suggestions(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_suggestions_status ON doctor_suggestions(status);
    CREATE INDEX IF NOT EXISTS idx_finalized_source ON doctors_finalized(source_doctor_id);
    CREATE INDEX IF NOT EXISTS idx_dropdown_category ON dropdown_options(category);
  `);
}

export function closeDb() {
    if (db) {
        db.close();
    }
}
