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

// CRUD-Operationen für Institutionen

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

// CRUD-Operationen für Angebote

// Alle Angebote abrufen
app.get('/angebote', (req, res) => {
    const query = 'SELECT * FROM Angebot';
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Spezifisches Angebot abrufen
app.get('/angebote/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM Angebot WHERE ID = ?';
    db.get(query, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: row });
    });
});

// Neues Angebot hinzufügen
app.post('/angebote', (req, res) => {
    const { InstitutionID, Art, Zielgruppe } = req.body;
    const query = 'INSERT INTO Angebot (InstitutionID, Art, Zielgruppe) VALUES (?, ?, ?)';
    db.run(query, [InstitutionID, Art, Zielgruppe], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Angebot hinzugefügt', id: this.lastID });
    });
});

// Angebot aktualisieren
app.put('/angebote/:id', (req, res) => {
    const { id } = req.params;
    const { InstitutionID, Art, Zielgruppe } = req.body;
    const query = 'UPDATE Angebot SET InstitutionID = ?, Art = ?, Zielgruppe = ? WHERE ID = ?';
    db.run(query, [InstitutionID, Art, Zielgruppe, id], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Angebot aktualisiert', changes: this.changes });
    });
});

// Angebot löschen
app.delete('/angebote/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Angebot WHERE ID = ?';
    db.run(query, [id], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Angebot gelöscht', changes: this.changes });
    });
});

// CRUD-Operationen für Tags

// Alle Tags abrufen
app.get('/tags', (req, res) => {
    const query = 'SELECT * FROM Tags';
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Neuen Tag hinzufügen
app.post('/tags', (req, res) => {
    const { Tag } = req.body;
    const query = 'INSERT INTO Tags (Tag) VALUES (?)';
    db.run(query, [Tag], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Tag hinzugefügt', id: this.lastID });
    });
});

// Tag löschen
app.delete('/tags/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Tags WHERE ID = ?';
    db.run(query, [id], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Tag gelöscht', changes: this.changes });
    });
});

// CRUD-Operationen für Suchbegriffe

// Alle Suchbegriffe abrufen
app.get('/suchbegriffe', (req, res) => {
    const query = 'SELECT * FROM Suchbegriffe';
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Neuen Suchbegriff hinzufügen
app.post('/suchbegriffe', (req, res) => {
    const { Begriff } = req.body;
    const query = 'INSERT INTO Suchbegriffe (Begriff) VALUES (?)';
    db.run(query, [Begriff], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Suchbegriff hinzugefügt', id: this.lastID });
    });
});

// Suchbegriff löschen
app.delete('/suchbegriffe/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Suchbegriffe WHERE ID = ?';
    db.run(query, [id], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Suchbegriff gelöscht', changes: this.changes });
    });
});

// CRUD-Operationen für Zwischentabelle Angebot_Tags

// Tag zu Angebot hinzufügen
app.post('/angebote/:angebotId/tags', (req, res) => {
    const { angebotId } = req.params;
    const { tagId } = req.body;
    const query = 'INSERT INTO Angebot_Tags (AngebotID, TagID) VALUES (?, ?)';
    db.run(query, [angebotId, tagId], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Tag zu Angebot hinzugefügt' });
    });
});

// Tag von Angebot entfernen
app.delete('/angebote/:angebotId/tags/:tagId', (req, res) => {
    const { angebotId, tagId } = req.params;
    const query = 'DELETE FROM Angebot_Tags WHERE AngebotID = ? AND TagID = ?';
    db.run(query, [angebotId, tagId], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Tag von Angebot entfernt' });
    });
});

// CRUD-Operationen für Zwischentabelle Angebot_Suchbegriffe

// Suchbegriff zu Angebot hinzufügen
app.post('/angebote/:angebotId/suchbegriffe', (req, res) => {
    const { angebotId } = req.params;
    const { suchbegriffId } = req.body;
    const query = 'INSERT INTO Angebot_Suchbegriffe (AngebotID, SuchbegriffID) VALUES (?, ?)';
    db.run(query, [angebotId, suchbegriffId], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Suchbegriff zu Angebot hinzugefügt' });
    });
});

// Suchbegriff von Angebot entfernen
app.delete('/angebote/:angebotId/suchbegriffe/:suchbegriffId', (req, res) => {
    const { angebotId, suchbegriffId } = req.params;
    const query = 'DELETE FROM Angebot_Suchbegriffe WHERE AngebotID = ? AND SuchbegriffID = ?';
    db.run(query, [angebotId, suchbegriffId], function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'Suchbegriff von Angebot entfernt' });
    });
});

// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
