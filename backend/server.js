const express = require('express');
const cors = require('cors'); 
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
//const MeiliSearch = require('meilisearch');
const { MeiliSearch } = require('meilisearch');


const app = express();
const PORT = 3000;

//Meilisearch:
const meiliClient = new MeiliSearch({
    host: 'http://127.0.0.1:7700',
    apiKey: 'bSppaUoyGpLKWXd24IRK3FU7fXxak7CeOR5Eu-bOIyw', 
});

// Index-Referenz ??
const meiliIndex = meiliClient.index('angebote');
// Index-Einstellungen aktualisieren
(async () => {
    try {
        await meiliIndex.updateSettings({
            filterableAttributes: ['art', 'tags', 'zielgruppen'],
            searchableAttributes: ['name', 'beschreibung', 'art'],
        });
        console.log('MeiliSearch-Index-Einstellungen erfolgreich aktualisiert.');
    } catch (error) {
        console.error('Fehler beim Aktualisieren der MeiliSearch-Index-Einstellungen:', error);
    }
})();

// CORS-Middleware einbinden
app.use(cors({
    origin: 'http://localhost:4200' // Erlaubt nur Angular-Frontend
}));

// Body parser middleware, um JSON zu verarbeiten
app.use(bodyParser.json());

// Verbindung zur SQLite-Datenbank herstellen
const db = new sqlite3.Database('./ba_Kopie_final.db', (err) => {
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

//Meilisearch:
app.post('/meilisearch/sync', async (req, res) => {
    const query = `
      SELECT 
        Angebot.ID AS id,
        Institution.Name AS name,
        Institution.Beschreibung AS beschreibung,
        Angebot.Art AS art,
        Institution.URL AS url, -- Füge die URL der Institution hinzu
        GROUP_CONCAT(Tags.Tag, ', ') AS tags,
        GROUP_CONCAT(Zielgruppe.Name, ', ') AS zielgruppen
      FROM Angebot
      JOIN Institution ON Angebot.InstitutionID = Institution.ID
      LEFT JOIN Angebot_Tags ON Angebot.ID = Angebot_Tags.AngebotID
      LEFT JOIN Tags ON Angebot_Tags.TagID = Tags.ID
      LEFT JOIN Angebote_Zielgruppe ON Angebot.ID = Angebote_Zielgruppe.AngebotID
      LEFT JOIN Zielgruppe ON Angebote_Zielgruppe.ZielgruppeID = Zielgruppe.ID
      GROUP BY Angebot.ID;
    `;

    db.all(query, async (err, rows) => {
      if (err) {
        res.status(500).json({ error: 'Fehler beim Abrufen der Daten.' });
        return;
      }

      try {
        const documents = rows.map(row => ({
          id: row.id,
          name: row.name,
          beschreibung: row.beschreibung,
          art: row.art,
          url: row.url, // Die URL wird jetzt aus der SQL-Abfrage gefüllt
          tags: row.tags ? row.tags.split(', ') : [],
          zielgruppen: row.zielgruppen ? row.zielgruppen.split(', ') : [],
        }));

        const response = await meiliIndex.addDocuments(documents);
        res.json({ success: true, task: response });
      } catch (error) {
        console.error('Fehler beim Hochladen der Daten zu MeiliSearch:', error);
        res.status(500).json({ error: 'Fehler beim Hochladen der Daten.' });
      }
    });
  });


  app.post('/meilisearch/settings', async (req, res) => {
    try {
        const response = await meiliIndex.updateSettings({
            filterableAttributes: ['art', 'tags', 'zielgruppen'],
            searchableAttributes: ['name', 'beschreibung'],
        });
        res.json({ success: true, task: response });
    } catch (error) {
        console.error('Fehler beim Aktualisieren der MeiliSearch-Index-Einstellungen:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Einstellungen.' });
    }
});

  

app.get('/meilisearch/search', async (req, res) => {
    const query = req.query.q || ''; // Suchstring aus Anfrage
    try {
        const results = await meiliIndex.search(query, {
            limit: 20, // Begrenze die Anzahl der Treffer
        });
        res.json(results);
    } catch (error) {
        console.error('Fehler bei der Suche:', error);
        res.status(500).json({ error: 'Fehler bei der Suche.' });
    }
});


// CRUD-Operationen für Angebote

// Alle Angebote mit verknüpften Institutionen und Tags abrufen und Zielgruppen??
app.get('/angebote', (req, res) => {
    const query = `
        SELECT 
            Angebot.ID, 
            Angebot.InstitutionID, 
            Angebot.Art, 
            Institution.Name, 
            Institution.Beschreibung, 
            Institution.URL,
            GROUP_CONCAT(Angebot_Tags.TagID) AS TagIDs
            
        FROM Angebot
        JOIN Institution ON Angebot.InstitutionID = Institution.ID
        LEFT JOIN Angebot_Tags ON Angebot.ID = Angebot_Tags.AngebotID
        GROUP BY Angebot.ID, Institution.ID;
        LEFT JOIN Angebote_Zielgruppe ON Angebot.ID = Angebote_Zielgruppe.AngebotID
        GROUP BY Angebot.ID, Institution.ID;
    `;
    db.all(query, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Konvertiere die TagIDs in ein Array
        rows.forEach(row => {
            row.TagIDs = row.TagIDs ? row.TagIDs.split(',').map(Number) : [];
        });
        res.json({ data: rows });
    });
});

// Nur Tags abrufen, die nicht NULL sind
app.get('/tags', (req, res) => {
    const query = 'SELECT * FROM Tags WHERE Tag IS NOT NULL';
    db.all(query, (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Nur Tags abrufen, die nicht NULL sind
app.get('/zielgruppe', (req, res) => {
    const query = 'SELECT * FROM Zielgruppe';
    db.all(query, (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

app.get('/angebot_tags', (req, res) => {
    const query = 'SELECT * FROM Angebot_Tags';
    db.all(query, (err, rows) => {
      if (err) {
        //console.error('Fehler beim Abrufen der Angebot_Tags:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Angebot_Tags' });
        return;
      }
  
      //console.log('Daten aus Angebot_Tags:', rows);
      res.json({ data: rows });
    });
  });

  app.get('/angebote_zielgruppe', (req, res) => {
    const query = 'SELECT * FROM Angebote_Zielgruppe';
    db.all(query, (err, rows) => {
      if (err) {
        //console.error('Fehler beim Abrufen der Angebot_Tags:', err);
        res.status(500).json({ error: 'Fehler beim Abrufen der Angebot_Tags' });
        return;
      }
  
      //console.log('Daten aus Angebot_Tags:', rows);
      res.json({ data: rows });
    });
  });

  // Bestehende Angebotsarten abrufen
app.get('/angebotsarten', (req, res) => {
    const query = 'SELECT DISTINCT Art FROM Angebot WHERE Art IS NOT NULL';
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Angebotsarten.' });
        }
        res.json({ data: rows });
    });
});


  app.post('/tags', (req, res) => {
    const { tag } = req.body;
  
    if (!tag) {
      return res.status(400).json({ error: 'Tag darf nicht leer sein.' });
    }
  
    const query = 'INSERT INTO Tags (Tag) VALUES (?)';
    db.run(query, [tag], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Hinzufügen des Tags.' });
      }
      res.json({ id: this.lastID, tag });
    });
  });
  
  app.post('/zielgruppe', (req, res) => {
    const { name } = req.body;
  
    if (!name) {
      return res.status(400).json({ error: 'Zielgruppe darf nicht leer sein.' });
    }
  
    const query = 'INSERT INTO Zielgruppe (Name) VALUES (?)';
    db.run(query, [name], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Hinzufügen der Zielgruppe.' });
      }
      res.json({ id: this.lastID, name });
    });
  });

  app.post('/institution', (req, res) => {
    const { name, description, url } = req.body;
  
    if (!name || !description || !url) {
      return res.status(400).json({ error: 'Name, Beschreibung und URL sind erforderlich.' });
    }
  
    const query = 'INSERT INTO Institution (Name, Beschreibung, URL) VALUES (?, ?, ?)';
    db.run(query, [name, description, url], function (err) {
      if (err) {
        console.error('Fehler beim Erstellen der Institution:', err.message);
        return res.status(500).json({ error: 'Fehler beim Erstellen der Institution.' });
      }
      res.json({ success: true, id: this.lastID });
    });
  });

  app.post('/angebote', (req, res) => {
    const { name, beschreibung, art, url, tags, zielgruppen, institution } = req.body;

    db.serialize(() => {
        // Institution einfügen, falls nicht vorhanden
        const institutionQuery = `INSERT OR IGNORE INTO Institution (Name, Beschreibung, URL) VALUES (?, ?, ?)`;
        db.run(institutionQuery, [institution.name, institution.beschreibung, institution.url], function (err) {
            if (err) {
                return res.status(500).json({ error: 'Fehler beim Einfügen der Institution' });
            }

            // Angebot hinzufügen
            const angebotQuery = `INSERT INTO Angebot (InstitutionID, Art) VALUES (?, ?)`;
            const institutionId = this.lastID;
            db.run(angebotQuery, [institutionId, art], function (err) {
                if (err) {
                    return res.status(500).json({ error: 'Fehler beim Einfügen des Angebots' });
                }

                const angebotId = this.lastID;

                // Tags zur Tabelle Angebot_Tags hinzufügen
                const tagQueries = tags.map(tagId => {
                    return new Promise((resolve, reject) => {
                        const tagQuery = `INSERT INTO Angebot_Tags (AngebotID, TagID) VALUES (?, ?)`;
                        db.run(tagQuery, [angebotId, tagId], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                });

                // Zielgruppen zur Tabelle Angebote_Zielgruppe hinzufügen
                const zielgruppenQueries = zielgruppen.map(zielgruppenId => {
                    return new Promise((resolve, reject) => {
                        const zielgruppenQuery = `INSERT INTO Angebote_Zielgruppe (AngebotID, ZielgruppeID) VALUES (?, ?)`;
                        db.run(zielgruppenQuery, [angebotId, zielgruppenId], (err) => {
                            if (err) reject(err);
                            else resolve();
                        });
                    });
                });

                Promise.all([...tagQueries, ...zielgruppenQueries])
                    .then(() => res.json({ success: true, angebotId }))
                    .catch(error => res.status(500).json({ error }));
            });
        });
    });
});

  
// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
