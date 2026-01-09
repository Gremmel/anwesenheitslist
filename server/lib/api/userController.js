/* eslint-disable class-methods-use-this */
// userController.mjs
import dbController from './dbController.js';
import logger from '../logger.js';
import bcrypt from 'bcrypt';

class UserController {
  getUsers (onlyEnabled = false) {
    try {
      let stmt;

      if (onlyEnabled) {
        stmt = dbController.prepare('SELECT fos_user.id as id, fos_user.password as password, fos_user.username as username, fos_user.email as email, fos_user.enabled as enabled, fos_user.roles as roles, register.id as register_id, register.name as register_name FROM fos_user LEFT JOIN user_register ON user_register.user_id=fos_user.id LEFT JOIN register ON register.id= user_register.register_id WHERE enabled = 1');
      } else {
        stmt = dbController.prepare('SELECT fos_user.id as id, fos_user.password as password, fos_user.username as username, fos_user.email as email, fos_user.enabled as enabled, fos_user.roles as roles, register.id as register_id, register.name as register_name FROM fos_user LEFT JOIN user_register ON user_register.user_id=fos_user.id LEFT JOIN register ON register.id= user_register.register_id WHERE true');
      }

      const users = stmt.all();

      // passwort hash entfernen
      for (const user of users) {
        delete user.password;
      }

      return users;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Benutzer:', error);
    }
  }

  getUserByName (username) {
    try {
      const stmt = dbController.prepare(`SELECT fos_user.id as id, fos_user.password as password, fos_user.username as username, fos_user.email as email, fos_user.enabled as enabled, fos_user.roles as roles, register.id as register_id, register.name as register_name FROM fos_user LEFT JOIN user_register ON user_register.user_id=fos_user.id LEFT JOIN register ON register.id= user_register.register_id WHERE username ='${username}' COLLATE NOCASE`);
      const user = stmt.get();

      return user;
    } catch (error) {
      logger.error('Fehler beim Abrufen der Benutzer:', error);
    }
  }

  getUserEnabled (user) {
    try {
      const stmt = dbController.prepare(`SELECT enabled FROM fos_user WHERE id = ${user.id}`);
      const res = stmt.get();

      return res.enabled;
    } catch (error) {
      logger.error('Fehler beim Abrufen des Benutzers:', error);
    }
  }

  async hashPassword (password) {
    const saltRounds = 13; // Je höher die Zahl, desto sicherer, aber langsamer

    try {
      const hash = await bcrypt.hash(password, saltRounds);

      return hash; // Gibt den erzeugten Hash zurück
    } catch (error) {
      logger.error('Fehler beim Erzeugen des Passwort-Hashes:', error);
      throw error; // Fehler weiterleiten, damit der Aufrufer ihn behandeln kann
    }
  }

  async addUser (user) {
    const { username, email, password, roles, enabled } = user;

    const passHash = await this.hashPassword(password);

    logger.info('new hash', passHash);

    const stmt = dbController.prepare(`
      INSERT INTO fos_user (username, email, password, roles, enabled)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(username, email, passHash, roles, enabled);
      logger.info(`User ${username} added successfully.`);

      return true;
    } catch (error) {
      logger.error(`Error adding user: ${error.message}`);

      return false;
    }
  }

  async updateUser (user) {
    const { id, username, email, password, roles, enabled } = user;

    let passHash = null;

    if (password) {
      passHash = await this.hashPassword(password);
      logger.info('updated hash', passHash);
    }

    const stmt = dbController.prepare(`
      UPDATE fos_user
      SET username = ?, email = ?, password = COALESCE(?, password), roles = ?, enabled = ?
      WHERE id = ?
    `);

    try {
      const result = stmt.run(username, email, passHash, roles, enabled, id);

      logger.info(`User ${username} updated successfully.`, result);

      if (result.changes === 1) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error updating user: ${error.message}`);

      return false;
    }
  }

  async changePassword (user) {
    const { id, password } = user;

    let passHash = null;

    if (password) {
      passHash = await this.hashPassword(password);
      logger.info('updated hash', passHash);
    }

    const stmt = dbController.prepare(`
      UPDATE fos_user
      SET password = COALESCE(?, password)
      WHERE id = ?
    `);

    try {
      const result = stmt.run(passHash, id);

      logger.info(`Password changed successfully.`, result);

      if (result.changes === 1) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error changing password: ${error.message}`);

      return false;
    }
  }

  async delUser (user) {
    const { id } = user;

    if (!id) {
      return false;
    }

    // Verwende Platzhalter für eine sichere SQL-Abfrage
    const stmt = dbController.prepare(`DELETE FROM fos_user WHERE id = ?`);

    try {
      const result = stmt.run(id);

      if (result.changes === 1) {
        logger.info(`User ${id} erfolgreich gelöscht.`, result);

        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Error adding user: ${error.message}`);

      return false;
    }
  }
}

export default new UserController();
