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
      pmdc_number TEXT
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

    CREATE INDEX IF NOT EXISTS idx_doctors_name ON doctors(doctor_name);
    CREATE INDEX IF NOT EXISTS idx_doctors_speciality ON doctors(speciality);
    CREATE INDEX IF NOT EXISTS idx_doctors_designation ON doctors(designation);
    CREATE INDEX IF NOT EXISTS idx_doctors_qualification ON doctors(qualification);
    CREATE INDEX IF NOT EXISTS idx_doctors_city_das ON doctors(doctor_city_das);
    CREATE INDEX IF NOT EXISTS idx_doctors_distributor ON doctors(distributor_name);
    CREATE INDEX IF NOT EXISTS idx_city_brick_city ON city_brick_mapping(city_name);
    CREATE INDEX IF NOT EXISTS idx_locations_doctor ON locations(doctor_id);
  `);
}

export function closeDb() {
    if (db) {
        db.close();
    }
}
