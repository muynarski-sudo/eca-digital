import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
// On Railway, use /data volume for persistence; locally, use project root
const DB_PATH = process.env.DB_PATH || join(__dirname, '../data.sqlite')

const db = new Database(DB_PATH)

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ─── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS schools (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    cnpj      TEXT,
    type      TEXT NOT NULL DEFAULT 'escola',
    email     TEXT,
    phone     TEXT,
    responsible TEXT,
    city      TEXT,
    state     TEXT,
    notes     TEXT,
    active    INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'client',
    school_id  INTEGER REFERENCES schools(id) ON DELETE CASCADE,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS checklist_progress (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id     INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    item_id       TEXT NOT NULL,
    checklist_type TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'nao_conforme',
    evidence      TEXT,
    responsible   TEXT,
    notes         TEXT,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by    INTEGER REFERENCES users(id),
    UNIQUE(school_id, item_id, checklist_type)
  );
`)

// ─── Seed admin user ──────────────────────────────────────────────────────────
const adminExists = db.prepare(`SELECT id FROM users WHERE email = ?`).get('admin@ecadigital.com.br')
if (!adminExists) {
  const hashed = bcrypt.hashSync('Admin@2026', 10)
  db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')`)
    .run('Administrador', 'admin@ecadigital.com.br', hashed)
  console.log('[DB] Admin user created: admin@ecadigital.com.br / Admin@2026')
}

// ─── Seed demo school ─────────────────────────────────────────────────────────
const schoolExists = db.prepare(`SELECT id FROM schools WHERE name = ?`).get('Escola Demo LGPD')
if (!schoolExists) {
  const r = db.prepare(`
    INSERT INTO schools (name, cnpj, type, email, phone, responsible, city, state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('Escola Demo LGPD', '12.345.678/0001-99', 'escola', 'contato@escolademo.com.br',
         '(11) 99999-0000', 'Maria da Silva', 'São Paulo', 'SP')

  const hashed = bcrypt.hashSync('Demo@2026', 10)
  db.prepare(`INSERT INTO users (name, email, password, role, school_id) VALUES (?, ?, ?, 'client', ?)`)
    .run('Demo Escola', 'demo@escolademo.com.br', hashed, r.lastInsertRowid)
  console.log('[DB] Demo school + user created: demo@escolademo.com.br / Demo@2026')
}

// ─── Anamnese table ───────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS anamnese (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id  INTEGER UNIQUE NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    respostas  TEXT NOT NULL DEFAULT '{}',
    perfil_4cs TEXT NOT NULL DEFAULT '{}',
    concluida  INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

export default db
