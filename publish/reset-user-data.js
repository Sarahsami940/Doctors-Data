// Reset user data (locations + sessions) — keeps master doctor data intact
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'doctor_directory.db');
const db = new Database(dbPath);

const locCount = db.prepare('SELECT COUNT(*) as c FROM locations').get().c;
const sessCount = db.prepare('SELECT COUNT(*) as c FROM user_sessions').get().c;

console.log(`\nCurrent data:`);
console.log(`  Locations:      ${locCount}`);
console.log(`  User Sessions:  ${sessCount}`);

db.exec('DELETE FROM locations; DELETE FROM user_sessions;');

console.log(`\n✅ Cleared all locations and user sessions.`);
console.log(`   Master doctor data is untouched.\n`);

db.close();
