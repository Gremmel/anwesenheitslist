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
      // Teilnehmer wie bisher
      const stmt = dbController.prepare(`
        SELECT
          ez.*,
          fu.username,
          fu.email,
          v.id as register_id,
          v.name as register_name,
          v.sortierung as register_sortierung
        FROM event_zusagen ez
        JOIN fos_user fu ON ez.user_id = fu.id
        LEFT JOIN user_register uv ON fu.id = uv.user_id
        LEFT JOIN register v ON uv.register_id = v.id
        WHERE ez.event_id = ?
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
      if (participationData.zugesagt === false) {
        // Eintrag entfernen, wenn keine Zusage
        const delStmt = dbController.prepare(`
          DELETE FROM event_zusagen WHERE user_id = ? AND event_id = ?
        `);

        delStmt.run(participationData.userId, participationData.eventId);
      } else {
        // Prüfen, ob Eintrag schon existiert
        const checkStmt = dbController.prepare(`
          SELECT COUNT(*) as count FROM event_zusagen WHERE user_id = ? AND event_id = ?
        `);
        const result = checkStmt.get(participationData.userId, participationData.eventId);

        if (result.count === 0) {
          // Eintrag hinzufügen
          const insertStmt = dbController.prepare(`
            INSERT INTO event_zusagen (user_id, event_id, zugesagt_am)
            VALUES (?, ?, ?)
          `);

          insertStmt.run(
            participationData.userId,
            participationData.eventId,
            participationData.zugesagtAm || new Date().toISOString()
          );
        }
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
