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

  // Statistik über einen Zeitraum
  // from / to als ISO-Strings (YYYY-MM-DD oder volles ISO-DateTime)
  async getStatistics (from, to) {
    try {
      // Normalisiere Grenzen: from auf Tagesanfang, to auf Tagesende
      const fromIso = `${String(from).slice(0, 10)}T00:00:00.000`;
      const toIso = `${String(to).slice(0, 10)}T23:59:59.999`;

      // Events im Zeitraum
      const events = dbController.prepare(
        `SELECT id, bezeichnung, dateTime, ort
           FROM events
          WHERE dateTime >= ? AND dateTime <= ?
          ORDER BY dateTime ASC`
      ).all(fromIso, toIso);

      const eventCount = events.length;

      // Statistik pro Ort
      const byLocation = dbController.prepare(
        `SELECT
            COALESCE(NULLIF(TRIM(ort), ''), 'Unbekannt') AS ort,
            COUNT(DISTINCT e.id) AS eventCount,
            SUM(CASE WHEN ez.zugesagt = 1 THEN 1 ELSE 0 END) AS zusagen,
            SUM(CASE WHEN ez.zugesagt = 0 THEN 1 ELSE 0 END) AS absagen
           FROM events e
           LEFT JOIN event_zusagen ez ON ez.event_id = e.id
          WHERE e.dateTime >= ? AND e.dateTime <= ?
          GROUP BY COALESCE(NULLIF(TRIM(ort), ''), 'Unbekannt')
          ORDER BY eventCount DESC, ort ASC`
      ).all(fromIso, toIso);

      // Statistik pro User (Anwesenheit + Meldungen)
      // Nur User, die mindestens einem Register zugeordnet sind
      const byUser = dbController.prepare(
        `SELECT
            fu.id           AS userId,
            fu.username     AS username,
            SUM(CASE WHEN ez.zugesagt = 1 THEN 1 ELSE 0 END) AS anwesend,
            SUM(CASE WHEN ez.zugesagt = 0 THEN 1 ELSE 0 END) AS abwesend,
            SUM(CASE WHEN ez.zugesagt IS NOT NULL THEN 1 ELSE 0 END) AS gemeldet
           FROM fos_user fu
           INNER JOIN user_register ur ON ur.user_id = fu.id
           LEFT JOIN event_zusagen ez
             ON ez.user_id = fu.id
            AND ez.event_id IN (
              SELECT id FROM events WHERE dateTime >= ? AND dateTime <= ?
            )
          GROUP BY fu.id, fu.username
          ORDER BY anwesend DESC, gemeldet DESC, username ASC`
      ).all(fromIso, toIso);

      // Quoten je User berechnen
      for (const u of byUser) {
        u.anwesend = Number(u.anwesend) || 0;
        u.abwesend = Number(u.abwesend) || 0;
        u.gemeldet = Number(u.gemeldet) || 0;
        u.offen = Math.max(0, eventCount - u.gemeldet);
        u.anwesenheitsQuote = eventCount > 0
          ? Math.round((u.anwesend / eventCount) * 100)
          : 0;
        u.meldeQuote = eventCount > 0
          ? Math.round((u.gemeldet / eventCount) * 100)
          : 0;
      }

      // Summary
      const totals = dbController.prepare(
        `SELECT
            SUM(CASE WHEN ez.zugesagt = 1 THEN 1 ELSE 0 END) AS zusagen,
            SUM(CASE WHEN ez.zugesagt = 0 THEN 1 ELSE 0 END) AS absagen,
            COUNT(ez.id) AS meldungen
           FROM event_zusagen ez
          WHERE ez.event_id IN (
            SELECT id FROM events WHERE dateTime >= ? AND dateTime <= ?
          )`
      ).get(fromIso, toIso);

      const summary = {
        eventCount,
        zusagen: Number(totals?.zusagen) || 0,
        absagen: Number(totals?.absagen) || 0,
        meldungen: Number(totals?.meldungen) || 0,
        orte: byLocation.length
      };

      return {
        from: fromIso,
        to: toIso,
        summary,
        events,
        byLocation,
        byUser
      };
    } catch (error) {
      logger.error('Fehler beim Erstellen der Statistik:', error);
      throw new Error('Konnte die Statistik nicht erstellen.');
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
