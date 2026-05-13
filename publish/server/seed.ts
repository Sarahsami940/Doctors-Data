import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';
import { getDb, closeDb } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const EXCEL_FILE = path.join(DATA_DIR, 'DoctorsData Application.xlsx');

function seedDoctors(force: boolean) {
    const db = getDb();

    const existingCount = db.prepare('SELECT COUNT(*) as c FROM doctors').get() as any;
    if (existingCount.c > 0 && !force) {
        console.log(`Doctors table already has ${existingCount.c} records. Skipping seed. Use --force to re-seed.`);
        return;
    }

    if (force) {
        console.log('Force mode: clearing doctors table...');
        db.exec('DELETE FROM doctors');
    }

    console.log('Reading doctor master data from:', EXCEL_FILE);
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheet = workbook.Sheets['Doctors Master Data'];
    if (!sheet) throw new Error('Sheet "Doctors Master Data" not found in Excel file');
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    console.log(`Found ${rows.length} doctor records`);

    const insert = db.prepare(`
    INSERT INTO doctors (doctor_city_das, distributor_name, doctor_name, mobile_number, qualification, designation, speciality, pmdc_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const insertMany = db.transaction((records: any[]) => {
        for (const row of records) {
            insert.run(
                (row['Doctor City for DAS'] || '').toString().trim(),
                (row['Distributor Name'] || '').toString().trim(),
                (row['Doctor_Name'] || '').toString().trim(),
                row['Doc MobileNumber'] ? String(row['Doc MobileNumber']).trim() : '',
                (row['Qualification'] || '').toString().trim(),
                (row['Designation'] || '').toString().trim(),
                (row['Speciality'] || '').toString().trim(),
                (row['pmdcnumber'] || '').toString().trim()
            );
        }
    });

    insertMany(rows);
    console.log(`Seeded ${rows.length} doctors`);
}

function seedCityBrickMapping(force: boolean) {
    const db = getDb();

    const existingCount = db.prepare('SELECT COUNT(*) as c FROM city_brick_mapping').get() as any;
    if (existingCount.c > 0 && !force) {
        console.log(`City-brick mapping table already has ${existingCount.c} records. Skipping seed.`);
        return;
    }

    if (force) {
        console.log('Force mode: clearing city_brick_mapping table...');
        db.exec('DELETE FROM city_brick_mapping');
    }

    console.log('Reading city-brick mapping from:', EXCEL_FILE);
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheet = workbook.Sheets['City-Brick Mapping (for DAS)'];
    if (!sheet) throw new Error('Sheet "City-Brick Mapping (for DAS)" not found in Excel file');
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    console.log(`Found ${rows.length} city-brick mapping records`);

    const insert = db.prepare(`
    INSERT INTO city_brick_mapping (city_name, brick_name)
    VALUES (?, ?)
  `);

    const insertMany = db.transaction((records: any[]) => {
        for (const row of records) {
            insert.run(
                (row['3SCity'] || '').toString().trim(),
                (row['3SBrick'] || '').toString().trim()
            );
        }
    });

    insertMany(rows);
    console.log(`Seeded ${rows.length} city-brick mappings`);
}

function seedCitiesExpense(force: boolean) {
    const db = getDb();

    const existingCount = db.prepare('SELECT COUNT(*) as c FROM cities_expense').get() as any;
    if (existingCount.c > 0 && !force) {
        console.log(`Cities expense table already has ${existingCount.c} records. Skipping seed.`);
        return;
    }

    if (force) {
        console.log('Force mode: clearing cities_expense table...');
        db.exec('DELETE FROM cities_expense');
    }

    console.log('Reading cities for expense from:', EXCEL_FILE);
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheet = workbook.Sheets['Cities for Expense'];
    if (!sheet) throw new Error('Sheet "Cities for Expense" not found in Excel file');
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    console.log(`Found ${rows.length} expense city records`);

    const insert = db.prepare(`
    INSERT OR IGNORE INTO cities_expense (city_name)
    VALUES (?)
  `);

    const insertMany = db.transaction((records: any[]) => {
        for (const row of records) {
            const cityName = (row['City'] || '').toString().trim();
            if (cityName) insert.run(cityName);
        }
    });

    insertMany(rows);
    console.log(`Seeded expense cities`);
}

function main() {
    const force = process.argv.includes('--force');
    console.log(`Starting database seed...${force ? ' (FORCE MODE — will replace existing data)' : ''}\n`);
    try {
        seedDoctors(force);
        console.log('');
        seedCityBrickMapping(force);
        console.log('');
        seedCitiesExpense(force);
        console.log('\nSeed completed successfully!');
    } catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    } finally {
        closeDb();
    }
}

main();
