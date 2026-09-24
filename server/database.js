import Database from 'better-sqlite3'
import crypto from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const databasePath = join(process.cwd(), 'data', 'habitat.db')
mkdirSync(dirname(databasePath), { recursive: true })

const database = new Database(databasePath)
database.pragma('journal_mode = WAL')
database.pragma('foreign_keys = ON')

database.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    identifier TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    national_id TEXT,
    occupation TEXT,
    bio TEXT,
    company TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS homes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    region TEXT NOT NULL,
    type TEXT NOT NULL,
    parking INTEGER NOT NULL DEFAULT 0,
    price INTEGER NOT NULL,
    deposit INTEGER NOT NULL,
    image TEXT NOT NULL,
    tag TEXT NOT NULL,
    details TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    owner_id INTEGER,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    home_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'refunded')),
    deposit INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (home_id) REFERENCES homes(id)
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    home_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'declined', 'cancelled', 'refunded')),
    tenant_message TEXT,
    contract_text TEXT,
    paybill TEXT,
    contract_pdf_url TEXT,
    paybill_pdf_url TEXT,
    payment_phone TEXT,
    payment_amount INTEGER,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT,
    FOREIGN KEY (tenant_id) REFERENCES users(id),
    FOREIGN KEY (home_id) REFERENCES homes(id)
  );
`)

try { database.exec('ALTER TABLE homes ADD COLUMN owner_id INTEGER') } catch {}
const usersTable = database.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()?.sql || ''
if (usersTable.includes("CHECK (role IN ('Tenant', 'Agent'))")) {
  database.pragma('foreign_keys = OFF')
  database.exec(`
    ALTER TABLE users RENAME TO users_legacy;
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      identifier TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      national_id TEXT,
      occupation TEXT,
      bio TEXT,
      company TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO users (id, name, identifier, password_hash, role, phone, national_id, occupation, bio, company, created_at)
      SELECT id, name, identifier, password_hash, role, phone, national_id, occupation, bio, company, created_at FROM users_legacy;
    DROP TABLE users_legacy;
  `)
  database.pragma('foreign_keys = ON')
}
for (const column of ['phone', 'national_id', 'occupation', 'bio', 'company']) {
  try { database.exec(`ALTER TABLE users ADD COLUMN ${column} TEXT`) } catch {}
}
for (const column of ['contract_pdf_url', 'paybill_pdf_url', 'payment_phone']) {
  try { database.exec(`ALTER TABLE applications ADD COLUMN ${column} TEXT`) } catch {}
}
try { database.exec('ALTER TABLE applications ADD COLUMN payment_amount INTEGER') } catch {}

const adminPassword = 'ChangeMe123!'
const adminHash = crypto.scryptSync(adminPassword, 'habitat-local-salt', 64).toString('hex')
database.prepare("INSERT OR IGNORE INTO users (name, identifier, password_hash, role, company, bio) VALUES (?, ?, ?, 'SuperAdmin', ?, ?)").run('Habitat Super Admin', 'superadmin@habitat.local', adminHash, 'Habitat Operations', 'System administrator')

const homes = [
  ['The Willow House', 'Kitisuru, Nairobi', 'Nairobi County', 'Two bedroom', 1, 85000, 170000, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80', 'Just listed', 'Bright, quiet and close to Karura Forest.'],
  ['Cedar & Stone', 'Kilimani, Nairobi', 'Nairobi County', 'Three bedroom', 1, 145000, 290000, 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=80', 'Popular', 'A calm, considered home with a private courtyard.'],
  ['Palm Court Studio', 'Nyali, Mombasa', 'Mombasa County', 'Bedsitter', 0, 38000, 76000, 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80', 'Best value', 'A minimal, sunny studio near the coast.'],
  ['The Courtyard', 'Runda, Nairobi', 'Nairobi County', 'One bedroom', 1, 110000, 220000, 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=80', 'Furnished', 'Turn-key apartment with a leafy shared garden.'],
  ['Canopy House', 'Upper Hill, Nairobi', 'Nairobi County', 'Four bedroom', 1, 210000, 420000, 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=900&q=80', 'New today', 'Generous rooms, natural light and room to grow.'],
  ['Lakeview Loft', 'Milimani, Kisumu', 'Kisumu County', 'Single room', 0, 55000, 110000, 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=80', 'Quiet pick', 'A peaceful loft with a wide lake view.'],
  ['Lavington Green', 'Lavington, Nairobi', 'Nairobi County', 'Two bedroom', 1, 95000, 190000, 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=80', 'Pet friendly', 'A leafy apartment with a generous balcony.'],
  ['Umoja Corner', 'Umoja, Nairobi', 'Nairobi County', 'Bedsitter', 0, 32000, 64000, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80', 'Best value', 'A well-connected home for easy city living.'],
  ['Nakuru Heights', 'Milimani, Nakuru', 'Nakuru County', 'Three bedroom', 1, 65000, 130000, 'https://images.unsplash.com/photo-1600566753051-f0b89df2dd90?auto=format&fit=crop&w=900&q=80', 'New today', 'Spacious rooms in a quiet, central neighbourhood.'],
]

const insertHome = database.prepare(`INSERT INTO homes (name, location, region, type, parking, price, deposit, image, tag, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
const seedHomes = database.transaction(() => {
  if (database.prepare('SELECT COUNT(*) AS count FROM homes').get().count === 0) {
    for (const home of homes) insertHome.run(...home)
  }
})
seedHomes()

export default database
