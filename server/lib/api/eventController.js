/* eslint-disable class-methods-use-this */
import dbController from './dbController.js';
import logger from '../logger.js';

class ChallengesController {
  // Alle Zusagen eines Users abrufen
  async getParticipation (userId) {
    try {
      const stmt = dbController.prepare(`
          SELECT * FROM event_zusagen WHERE user_id = ?
        `);
      const zusagen = stmt.all(userId);

      return zusagen;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Event-Teilnahmen für User:', error);
      throw new Error('Konnte die Event-Teilnahmen für den User nicht abrufen.');
    }
  }

  async getParticipations (eventId) {
    try {
      // Alle User mit Teilnahme-Status für das Event
        const stmt = dbController.prepare(`
          SELECT
            fu.id as user_id,
            fu.username,
            fu.email,
            ez.zugesagt,
            ez.zugesagt_am,
            v.id as register_id,
            v.name as register_name,
            v.sortierung as register_sortierung
          FROM fos_user fu
          LEFT JOIN event_zusagen ez ON fu.id = ez.user_id AND ez.event_id = ?
          INNER JOIN user_register uv ON fu.id = uv.user_id
          LEFT JOIN register v ON uv.register_id = v.id
          ORDER BY v.sortierung ASC, fu.username ASC
        `);
      const participations = stmt.all(eventId);

      // Alle Register
      const regStmt = dbController.prepare(`SELECT * FROM register ORDER BY sortierung ASC`);
      const registers = regStmt.all();

      return { participations, registers };
    } catch (error) {
      logger.error('Fehler beim Abrufen der Event-Teilnahmen für Event:', error);
      throw new Error('Konnte die Event-Teilnahmen für das Event nicht abrufen.');
    }
  }

  async setParticipation (participationData) {
    try {
      // Prüfen, ob Eintrag schon existiert
      const checkStmt = dbController.prepare(`
          SELECT COUNT(*) as count FROM event_zusagen WHERE user_id = ? AND event_id = ?
        `);
      const result = checkStmt.get(participationData.userId, participationData.eventId);

      if (result.count === 0) {
        // Eintrag hinzufügen
        const insertStmt = dbController.prepare(`
            INSERT INTO event_zusagen (user_id, event_id, zugesagt, zugesagt_am)
            VALUES (?, ?, ?, ?)
          `);

        insertStmt.run(
          participationData.userId,
          participationData.eventId,
          participationData.zugesagt,
          participationData.zugesagtAm || new Date().toISOString()
        );
      } else {
        // Eintrag updaten
        const updateStmt = dbController.prepare(`
            UPDATE event_zusagen SET zugesagt = ?, zugesagt_am = ? WHERE user_id = ? AND event_id = ?
          `);

        updateStmt.run(
          participationData.zugesagt,
          participationData.zugesagtAm || new Date().toISOString(),
          participationData.userId,
          participationData.eventId
        );
      }

      return true;
    } catch (error) {
      logger.error('Fehler beim Setzen der Event-Teilnahme:', error);
      throw new Error('Konnte die Event-Teilnahme nicht setzen.');
    }
  }

  async getList () {
    try {
      const stmt = dbController.prepare(`SELECT * FROM events ORDER BY dateTime ASC`);
      const list = stmt.all();

      return list;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Events:', error);

      throw new Error('Konnte keine Events abrufen.');
    }
  }

  async getEvent (eventId) {
    try {
      const stmt = dbController.prepare(`SELECT * FROM events WHERE id = ?`);
      const event = stmt.get(eventId);

      if (!event) {
        throw new Error('Event nicht gefunden.');
      }

      return event;
    } catch (error) {
      logger.error('Fehler beim Abrufen des Events:', error);
      throw new Error('Konnte das Event nicht abrufen.');
    }
  }

  // Event löschen
  async deleteEvent (eventId) {
    try {
      dbController.prepare(`DELETE FROM events WHERE id = ?`).run(eventId);

      return true;
    } catch (error) {
      logger.error('Fehler beim Löschen des Events:', error);
      throw new Error('Konnte das Event nicht löschen.');
    }
  }

  // Event hinzufügen
  addEvent (event) {
    try {
      dbController.prepare(
        `INSERT INTO events (
          bezeichnung,
          dateTime,
          ort
        ) VALUES (
          ?,
          ?,
          ?
        )`
      ).run(
        event.bezeichnung,
        event.dateTime,
        event.ort
      );

      return true;
    } catch (error) {
      logger.error('Fehler beim Hinzufügen des Events:', error);
      throw new Error('Konnte das Event nicht hinzufügen.');
    }
  }
}

export default new ChallengesController();
