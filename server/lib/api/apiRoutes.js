import logger from '../logger.js';
import authMiddleware from '../middleware/authMiddleware.js';
import loginController from './loginController.js';
import sessionController from './sessionController.js';
import userController from './userController.js';
import registerController from './registerController.js';
import eventController from './eventController.js';

const apiRoutes = {
  init (app, config) {
    sessionController.init(config);

    // API-Routen
    app.post('/api/login', async (req, res) => {
      const { username, password } = req.body;

      // Überprüfe Benutzername und Passwort
      const user = await loginController.loginUser(username, password);

      if (user) {
        // session erzeugen
        const token = sessionController.addSession(user);

        // Setze das Token als HTTP-Only Cookie
        res.cookie('session_token', token, {
          httpOnly: true, // Cookie nicht durch JavaScript im Browser zugreifbar
          secure: true, // Setze dies auf true, wenn du HTTPS verwendest
          maxAge: 30 * 24 * 60 * 60 * 1000, // Cookie-Lebensdauer: 30 Tage (passt zu JWT expiresIn '30d')
          sameSite: 'strict' // Schützt vor CSRF-Angriffen
        });

        // Erfolgsnachricht senden
        res.json({ user });
      } else {
        // Falsche Zugangsdaten
        logger.error('Ungültiger Benutzername oder Passwort', username);
        res.status(401).json({ message: 'Ungültiger Benutzername oder Passwort' });
      }
    });

    // Logout-Route (GET)
    app.get('/api/logout', (req, res) => {
      logger.info('/api/logout');
      const token = req.cookies.session_token;

      sessionController.removeSession(token);

      res.clearCookie('session_token', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict'
      });
      res.json({ message: 'Erfolgreich abgemeldet' });
    });

    // getSession (GET)
    app.get('/api/getSession', (req, res) => {
      const token = req.cookies.session_token;

      if (token) {
        const session = sessionController.getSessionByToken(token);

        if (session?.user) {
          // abfragen ob der user aktiv ist
          const userEnabled = userController.getUserEnabled(session.user);

          session.user.enabled = userEnabled;
        }

        res.json({ user: session?.user });
      } else {
        res.json({ message: 'Keine session vorhanden' });
      }
    });

    // alle Register abrufen
    app.get('/api/getRegisterList', authMiddleware.check('benutzer'), async (req, res) => {
      try {
        const registereList = await registerController.getRegister();

        res.json({ registereList });
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    });

    app.post('/api/setUserRegisterId', authMiddleware.check('benutzer'), async (req, res) => {
      try {
        const io = await registerController.setUserRegisterId(req.body.user);

        res.json({ io });
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    });

    // gibt die Benutzerliste zurück
    app.get('/api/getUserList', authMiddleware.check('admin'), (req, res) => {
      const token = req.cookies.session_token;

      logger.info('/api/getUserList', token);

      const users = userController.getUsers();

      if (token) {
        res.json({ users });
      } else {
        res.json({ message: 'Keine session vorhanden' });
      }
    });

    // legt einen neuen User an
    app.post('/api/adduser', authMiddleware.check('admin'), async (req, res) => {
      logger.fatal('/api/adduser req.body', req.body);

      // Neuen Benutzer anlegen
      const newUser = await userController.addUser(req.body);

      if (newUser) {
        // Erfolgsnachricht senden
        res.json({ newUser });
      } else {
        res.status(401).json({ message: 'Fehler beim anlegen des neuen Users' });
      }
    });

    // Benutzer ändern
    app.post('/api/updateUser', authMiddleware.check('admin'), async (req, res) => {
      logger.fatal('/api/updateUser req.body', req.body);

      // Benutzer ändern
      const result = await userController.updateUser(req.body);

      if (result) {
        // Erfolgsnachricht senden
        res.json({ result });
      } else {
        res.status(401).json({ message: 'Fehler beim ändern des Users' });
      }
    });

    // Benutzer ändern
    app.post('/api/changePassword', authMiddleware.check('benutzer'), async (req, res) => {
      logger.fatal('/api/changePassword req.body', req.body);

      // Benutzer ändern
      const result = await userController.changePassword(req.body);

      if (result) {
        // Erfolgsnachricht senden
        res.json({ result });
      } else {
        res.status(401).json({ message: 'Fehler beim ändern des Passworts' });
      }
    });

    // löscht einen User
    app.post('/api/deluser', authMiddleware.check('admin'), async (req, res) => {
      logger.fatal('/api/deluser req.body', req.body);

      // Benutzer löschen
      const delUser = await userController.delUser(req.body);

      if (delUser) {
        // Erfolgsnachricht senden
        res.json({ delUser: true });
      } else {
        // Fehler beim löschen
        res.status(401).json({ message: 'Fehler beim löschen des Users' });
      }
    });

    app.get('/api/getEvent/:eventId', authMiddleware.check('benutzer'), async (req, res) => {
      try {
        const event = await eventController.getEvent(req.params.eventId);

        res.json({ event });
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    });

    app.get('/api/getEvents', authMiddleware.check('benutzer'), async (req, res) => {
      try {
        const list = await eventController.getList();

        res.json({ list });
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    });

    app.get('/api/getEventParticipation/:userId', authMiddleware.check('benutzer'), async (req, res) => {
      try {
        const participation = await eventController.getParticipation(req.params.userId);

        res.json({ participation });
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    });

    app.get('/api/getEventParticipations/:eventId', authMiddleware.check('benutzer'), async (req, res) => {
      try {
        const data = await eventController.getParticipations(req.params.eventId);

        res.json({ data });
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    });

    app.post('/api/setEventParticipation', authMiddleware.check('benutzer'), async (req, res) => {
      try {
        const result = await eventController.setParticipation(req.body);

        res.json({ result });
      } catch (error) {
        res.status(401).json({ message: error.message });
      }
    });

    // Statistik über einen Zeitraum (?from=YYYY-MM-DD&to=YYYY-MM-DD)
    app.get('/api/getStatistics', authMiddleware.check('benutzer'), async (req, res) => {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const from = req.query.from || `${year}-01-01`;
        const to = req.query.to || `${year}-12-31`;

        const statistics = await eventController.getStatistics(from, to);

        res.json({ statistics });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // löscht ein Event
    app.post('/api/deleteEvent/:eventId', authMiddleware.check('admin'), async (req, res) => {
      try {
        logger.fatal('/api/deleteEvent req.params', req.params);
        const io = await eventController.deleteEvent(req.params.eventId);

        res.json({ io });
      } catch (error) {
        res.status(501).json({ message: error.message });
      }
    });

    // Event hinzufügen
    app.post('/api/addEvent', authMiddleware.check('admin'), async (req, res) => {
      try {
        logger.fatal('/api/addEvent', req.body);
        const io = await eventController.addEvent(req.body);

        res.json({ io });
      } catch (error) {
        res.status(501).json({ message: error.message });
      }
    });
  }
};

export default apiRoutes;
