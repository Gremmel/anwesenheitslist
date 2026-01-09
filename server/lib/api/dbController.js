/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
// db.mjs
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger.js';

// Bestimme das Root-Verzeichnis des Projekts
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseController {
  constructor (dbPath) {
    this.db = new Database(dbPath, { verbose: console.log });
    this.ensureTablesAndColumns();
    logger.info('Datenbankverbindung hergestellt und Tabellen/Spalten überprüft.');
  }

  /**
   * Prüft, ob die gewünschten Tabellen existieren und legt sie ggf. an. Prüft außerdem die Spalten für challenges.
   */
  ensureTablesAndColumns () {
    // EVENTS
    this.db.prepare(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bezeichnung TEXT,
      datum TEXT,
      ort TEXT,
      uhrzeit TEXT
    )`).run();

    // EVENT_ZUSAGEN
    this.db.prepare(`CREATE TABLE IF NOT EXISTS event_zusagen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      zugesagt_am TEXT,
      FOREIGN KEY(event_id) REFERENCES events(id),
      FOREIGN KEY(user_id) REFERENCES fos_user(id)
    )`).run();

    // REGISTER
    this.db.prepare(`CREATE TABLE IF NOT EXISTS register (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      sortierung INTEGER
    )`).run();

    // Notwendige Register definieren
    const requiredRegisters = [
      { name: 'Register 1' },
      { name: 'Register 2' },
      { name: 'Register 3' }

      // Weitere Register nach Bedarf hinzufügen
    ];

    // Prüfen, ob alle Register vorhanden sind, sonst anlegen
    // eslint-disable-next-line id-length
    const existingRegisters = this.db.prepare('SELECT name FROM register').all().map((r) => r.name);

    // Hinzufügen fehlender Register
    for (const reg of requiredRegisters) {
      if (!existingRegisters.includes(reg.name)) {
        this.db.prepare(
          'INSERT INTO register (name) VALUES (?)'
        ).run(reg.name);
        logger.info(`Register hinzugefügt: ${reg.name}`);
      }
    }

    // Löschen von Registern, die nicht im Array sind
    // eslint-disable-next-line id-length
    const requiredNames = requiredRegisters.map((r) => r.name);
    const toDelete = existingRegisters.filter((name) => !requiredNames.includes(name));

    for (const name of toDelete) {
      this.db.prepare('DELETE FROM register WHERE name = ?').run(name);
      logger.info(`Register gelöscht: ${name}`);
    }
  }

  prepare (query) {
    return this.db.prepare(query);
  }

  close () {
    this.db.close();
  }
}

const dbPath = path.join(__dirname, '..', '..', '..', 'extern', 'datenbank.db');
const dbController = new DatabaseController(dbPath);

export default dbController;
