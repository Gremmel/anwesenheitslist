/* eslint-disable camelcase */
/* eslint-disable class-methods-use-this */
import dbController from './dbController.js';
import logger from '../logger.js';

class RegisterController {
  getRegister () {
    try {
      const stmt = dbController.prepare(`SELECT * FROM register ORDER BY name `);
      const registere = stmt.all();

      return registere;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Vereine:', error);

      throw new Error('Konnte keine Vereine abrufen.');
    }
  }

  setUserRegisterId (user) {
    try {
      logger.warn(' user', user);
      const { id, register_id } = user;

      let stmt = dbController.prepare(`
        UPDATE user_register
        SET register_id = ?
        WHERE user_id = ?
      `);
      const result = stmt.run(register_id, id);

      if (result.changes === 0) {
        stmt = dbController.prepare(`
          INSERT INTO user_register (user_id, register_id)
          VALUES (?, ?)
        `);
        stmt.run(id, register_id);
      }

      return true;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Vereine:', error);

      throw new Error('Konnte keine Vereine abrufen.');
    }
  }
}

export default new RegisterController();
