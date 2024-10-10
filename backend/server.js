const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Body parser middleware, um JSON zu verarbeiten
app.use(bodyParser.json());

// Verbindung zur SQLite-Datenbank herstellen
const db = new sqlite3.Database('./ba.db', (err) => {
    if (err) {
        console.error('Fehler beim Verbinden zur Datenbank:', err);
    } else {
        console.log('Verbunden zur SQLite-Datenbank');
    }
});

// API-Routen
app.get('/', (req, res) => {
    res.send('Willkommen bei der REST API für Institutionen und Angebote!');
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});

// Alle Institutionen abrufen
app.get('/institutionen', (req, res) => {
    const query = 'SELECT * FROM Institution';
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Spezifische Institution abrufen
app.get('/institutionen/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM Institution WHERE ID = ?';
    db.get(query, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: row });
    });
});

// Neue Institution hinzufügen
app.post('/institutionen', (req, res) => {
    const { Name, Beschreibung, URL } = req.body;
    const query = 'INSERT INTO Institution (Name, Beschreibung, URL) VALUES (?, ?, ?)';
    db.run(query, [Name, Beschreibung, URL], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Institution hinzugefügt', id: this.lastID });
    });
});

// Institution aktualisieren
app.put('/institutionen/:id', (req, res) => {
    const { id } = req.params;
    const { Name, Beschreibung, URL } = req.body;
    const query = 'UPDATE Institution SET Name = ?, Beschreibung = ?, URL = ? WHERE ID = ?';
    db.run(query, [Name, Beschreibung, URL, id], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Institution aktualisiert', changes: this.changes });
    });
});

// Institution löschen
app.delete('/institutionen/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Institution WHERE ID = ?';
    db.run(query, [id], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Institution gelöscht', changes: this.changes });
    });
});
