const express = require('express');
const router = express.Router();
const db = require('../config/db')
const bcrypt = require('bcrypt')

router.get('/', (req, res) => {
    const query = 'SELECT ID, Benutzername FROM Benutzer';
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Benutzer.' });
        }
        res.json({ data: rows });
    });
});

// Benutzer registrieren
router.post('/register', async (req, res) => {
    const { benutzername, passwort, rolle } = req.body;

    if (!benutzername || !passwort) {
        return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(passwort, 10);
        const query = `INSERT INTO Benutzer (Benutzername, Passwort) VALUES (?, ?)`;

        db.run(query, [benutzername, hashedPassword || 'user'], function (err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ error: 'Benutzername ist bereits vergeben.' });
                }
                return res.status(500).json({ error: 'Fehler beim Erstellen des Benutzers.' });
            }
            res.json({ success: true, id: this.lastID });
        });
    } catch (err) {
        res.status(500).json({ error: 'Fehler beim Hashen des Passworts.' });
    }
});

// Benutzer anmelden
router.post('/login', (req, res) => {
    const { benutzername, passwort } = req.body;

    if (!benutzername || !passwort) {
        return res.status(400).json({ error: 'Benutzername und Passwort sind erforderlich.' });
    }

    const query = `SELECT * FROM Benutzer WHERE Benutzername = ?`;

    db.get(query, [benutzername], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen des Benutzers.' });
        }
        if (!row) {
            return res.status(400).json({ error: 'Ungültiger Benutzername oder Passwort.' });
        }

        const isMatch = await bcrypt.compare(passwort, row.Passwort);
        if (!isMatch) {
            return res.status(400).json({ error: 'Ungültiger Benutzername oder Passwort.' });
        }

        // Authentifizierung erfolgreich
        res.json({ success: true, benutzername: row.Benutzername, rolle: row.Rolle });
    });
});

// Benutzer löschen
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM Benutzer WHERE ID = ?`;
  db.run(query, [id], function (err) {
    if (err) {
      console.error('Fehler beim Löschen des Benutzers:', err.message);
      return res.status(500).json({ error: 'Fehler beim Löschen des Benutzers.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    res.json({ success: true, message: 'Benutzer erfolgreich gelöscht.' });
  });
});

module.exports = router;