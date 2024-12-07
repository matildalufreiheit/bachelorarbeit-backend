const express = require('express');
const cors = require('cors'); 
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const { MeiliSearch } = require('meilisearch');
const bcrypt = require('bcrypt');


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
            GROUP_CONCAT(DISTINCT Art.Art) AS art, -- Arten aus der Tabelle Art
            Institution.URL AS url,
            GROUP_CONCAT(DISTINCT Tags.Tag) AS tags,
            GROUP_CONCAT(DISTINCT Zielgruppe.Name) AS zielgruppen
        FROM Angebot
        LEFT JOIN Institution ON Angebot.InstitutionID = Institution.ID
        LEFT JOIN Angebot_Tags ON Angebot.ID = Angebot_Tags.AngebotID
        LEFT JOIN Tags ON Angebot_Tags.TagID = Tags.ID
        LEFT JOIN Angebote_Zielgruppe ON Angebot.ID = Angebote_Zielgruppe.AngebotID
        LEFT JOIN Zielgruppe ON Angebote_Zielgruppe.ZielgruppeID = Zielgruppe.ID
        LEFT JOIN Angebot_Art ON Angebot.ID = Angebot_Art.AngebotID
        LEFT JOIN Art ON Angebot_Art.ArtID = Art.ID
        GROUP BY Angebot.ID;
    `;

    db.all(query, async (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen der Angebote für MeiliSearch:', err.message);
            res.status(500).json({ error: 'Fehler beim Abrufen der Angebote.', details: err.message });
            return;
        }

        try {
            const documents = rows.map(row => ({
                id: row.id,
                name: row.name,
                beschreibung: row.beschreibung,
                art: row.art ? row.art.split(', ') : [],
                url: row.url,
                tags: row.tags ? row.tags.split(', ') : [],
                zielgruppen: row.zielgruppen ? row.zielgruppen.split(', ') : [],
            }));

            const response = await meiliIndex.addDocuments(documents);
            res.json({ success: true, task: response });
        } catch (error) {
            console.error('Fehler beim Hochladen der Daten zu MeiliSearch:', error);
            res.status(500).json({ error: 'Fehler beim Hochladen der Daten.', details: error.message });
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

//GET!
app.get('/angebote', (req, res) => {
    const query = `
        SELECT 
            Angebot.ID, 
            Angebot.InstitutionID, 
            Institution.Name AS Name, 
            Institution.Beschreibung AS Beschreibung, 
            Institution.URL AS url,
            GROUP_CONCAT(DISTINCT Angebot_Tags.TagID) AS TagIDs,
            GROUP_CONCAT(DISTINCT Angebote_Zielgruppe.ZielgruppeID) AS ZielgruppenIDs,
            GROUP_CONCAT(DISTINCT Art.Art) AS Arten -- Verbindung zu Art.Art
        FROM Angebot
        LEFT JOIN Institution ON Angebot.InstitutionID = Institution.ID
        LEFT JOIN Angebot_Tags ON Angebot.ID = Angebot_Tags.AngebotID
        LEFT JOIN Angebote_Zielgruppe ON Angebot.ID = Angebote_Zielgruppe.AngebotID
        LEFT JOIN Angebot_Art ON Angebot.ID = Angebot_Art.AngebotID
        LEFT JOIN Art ON Angebot_Art.ArtID = Art.ID -- Stelle sicher, dass die Verknüpfung korrekt ist
        GROUP BY Angebot.ID;

    `;
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen der Angebote:', err.message);
            res.status(500).json({ error: 'Fehler beim Abrufen der Angebote.', details: err.message });
            return;
        }
        // Konvertiere Ergebnisse in ein JSON-kompatibles Format
        rows.forEach(row => {
            row.TagIDs = row.TagIDs ? row.TagIDs.split(',').map(Number) : [];
            row.ZielgruppenIDs = row.ZielgruppenIDs ? row.ZielgruppenIDs.split(',').map(Number) : [];
            row.Arten = row.Arten ? row.Arten.split(',') : [];
        });
        res.json({ data: rows });
    });
});

app.get('/angebote/:id', (req, res) => {
    const { id } = req.params;
    const query = `
      SELECT Angebot.*, 
             GROUP_CONCAT(DISTINCT Angebot_Tags.TagID) AS TagIDs, 
             GROUP_CONCAT(DISTINCT Angebote_Zielgruppe.ZielgruppeID) AS ZielgruppenIDs
      FROM Angebot
      LEFT JOIN Angebot_Tags ON Angebot.ID = Angebot_Tags.AngebotID
      LEFT JOIN Angebote_Zielgruppe ON Angebot.ID = Angebote_Zielgruppe.AngebotID
      WHERE Angebot.ID = ?
      GROUP BY Angebot.ID;
    `;
  
    db.get(query, [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Fehler beim Abrufen des Angebots.' });
      }
      res.json({ data: row });
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

app.get('/arten', (req, res) => {
    const query = `SELECT * FROM Art`;
    db.all(query, (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen der Arten:', err.message);
            res.status(500).json({ error: 'Fehler beim Abrufen der Arten.' });
            return;
        }
        res.json({ data: rows });
    });
});


app.get('/institutionen', (req, res) => {
    const query = `SELECT ID, Name FROM Institution`;
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Institutionen.' });
        }
        res.json({ data: rows });
    });
});

app.get('/benutzer', (req, res) => {
    const query = 'SELECT ID, Benutzername, Rolle FROM Benutzer';
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Benutzer.' });
        }
        res.json({ data: rows });
    });
});
  

//PUT

app.put('/update-institution/:id', (req, res) => {
    const institutionId = req.params.id;
    const { name, beschreibung, url, tags, zielgruppen, arten } = req.body;
  
    if (!name || !beschreibung || !url) {
      return res.status(400).json({ error: 'Name, Beschreibung und URL sind erforderlich.' });
    }
  
    db.serialize(() => {
      // Schritt 1: Institution aktualisieren
      db.run(
        `UPDATE Institution SET Name = ?, Beschreibung = ?, URL = ? WHERE ID = ?`,
        [name, beschreibung, url, institutionId],
        function (err) {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Fehler beim Aktualisieren der Institution.' });
          }
  
          // Schritt 2: Tags aktualisieren
          db.run(`DELETE FROM Angebot_Tags WHERE AngebotID IN (SELECT ID FROM Angebot WHERE InstitutionID = ?)`, [institutionId], (err) => {
            if (err) {
              console.error(err.message);
              return res.status(500).json({ error: 'Fehler beim Aktualisieren der Tags.' });
            }
  
            if (tags && tags.length > 0) {
              const tagInsertions = tags.map(
                (tagId) =>
                  new Promise((resolve, reject) => {
                    db.run(
                      `INSERT INTO Angebot_Tags (AngebotID, TagID) SELECT ID, ? FROM Angebot WHERE InstitutionID = ?`,
                      [tagId, institutionId],
                      (err) => {
                        if (err) reject(err);
                        resolve();
                      }
                    );
                  })
              );
  
              Promise.all(tagInsertions).catch((err) => console.error(err.message));
            }
          });
  
          // Schritt 3: Zielgruppen aktualisieren
          db.run(
            `DELETE FROM Angebote_Zielgruppe WHERE AngebotID IN (SELECT ID FROM Angebot WHERE InstitutionID = ?)`,
            [institutionId],
            (err) => {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ error: 'Fehler beim Aktualisieren der Zielgruppen.' });
              }
  
              if (zielgruppen && zielgruppen.length > 0) {
                const zielgruppenInsertions = zielgruppen.map(
                  (zielgruppeId) =>
                    new Promise((resolve, reject) => {
                      db.run(
                        `INSERT INTO Angebote_Zielgruppe (AngebotID, ZielgruppeID) SELECT ID, ? FROM Angebot WHERE InstitutionID = ?`,
                        [zielgruppeId, institutionId],
                        (err) => {
                          if (err) reject(err);
                          resolve();
                        }
                      );
                    })
                );
  
                Promise.all(zielgruppenInsertions).catch((err) => console.error(err.message));
              }
            }
          );
  
          // Schritt 4: Arten aktualisieren
          db.run(`DELETE FROM Angebot_Art WHERE AngebotID IN (SELECT ID FROM Angebot WHERE InstitutionID = ?)`, [institutionId], (err) => {
            if (err) {
              console.error(err.message);
              return res.status(500).json({ error: 'Fehler beim Aktualisieren der Arten.' });
            }
  
            if (arten && arten.length > 0) {
              const artenInsertions = arten.map(
                (artId) =>
                  new Promise((resolve, reject) => {
                    db.run(
                      `INSERT INTO Angebot_Art (AngebotID, ArtID) SELECT ID, ? FROM Angebot WHERE InstitutionID = ?`,
                      [artId, institutionId],
                      (err) => {
                        if (err) reject(err);
                        resolve();
                      }
                    );
                  })
              );
  
              Promise.all(artenInsertions).catch((err) => console.error(err.message));
            }
          });
  
          // Erfolgreiches Update
          res.status(200).json({ message: 'Institution erfolgreich aktualisiert!' });
        }
      );
    });
  });


//POST
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
    const { name, beschreibung, url, tags, zielgruppen, arten } = req.body;
  
    if (!name || !beschreibung || !url) {
      return res.status(400).json({ error: 'Name, Beschreibung, und URL sind erforderlich.' });
    }
  
    db.serialize(() => {
      // Schritt 1: Institution einfügen
      db.run(
        `INSERT INTO Institution (Name, Beschreibung, URL) VALUES (?, ?, ?)`,
        [name, beschreibung, url],
        function (err) {
          if (err) {
            console.error(err.message);
            return res.status(500).json({ error: 'Fehler beim Hinzufügen der Institution.' });
          }
  
          const institutionId = this.lastID;
  
          // Schritt 2: Angebot erstellen und Institution verknüpfen
          db.run(
            `INSERT INTO Angebot (InstitutionID) VALUES (?)`,
            [institutionId],
            function (err) {
              if (err) {
                console.error(err.message);
                return res.status(500).json({ error: 'Fehler beim Hinzufügen des Angebots.' });
              }
  
              const angebotId = this.lastID;
  
              // Schritt 3: Tags verknüpfen
              if (tags && tags.length > 0) {
                const tagInsertions = tags.map(
                  (tagId) =>
                    new Promise((resolve, reject) => {
                      db.run(
                        `INSERT INTO Angebot_Tags (AngebotID, TagID) VALUES (?, ?)`,
                        [angebotId, tagId],
                        (err) => {
                          if (err) reject(err);
                          resolve();
                        }
                      );
                    })
                );
  
                Promise.all(tagInsertions).catch((err) => console.error(err.message));
              }
  
              // Schritt 4: Zielgruppen verknüpfen
              if (zielgruppen && zielgruppen.length > 0) {
                const zielgruppenInsertions = zielgruppen.map(
                  (zielgruppeId) =>
                    new Promise((resolve, reject) => {
                      db.run(
                        `INSERT INTO Angebote_Zielgruppe (AngebotID, ZielgruppeID) VALUES (?, ?)`,
                        [angebotId, zielgruppeId],
                        (err) => {
                          if (err) reject(err);
                          resolve();
                        }
                      );
                    })
                );
  
                Promise.all(zielgruppenInsertions).catch((err) => console.error(err.message));
              }
  
              // Schritt 5: Arten verknüpfen
              if (arten && arten.length > 0) {
                const artenInsertions = arten.map(
                  (artId) =>
                    new Promise((resolve, reject) => {
                      db.run(
                        `INSERT INTO Angebot_Art (AngebotID, ArtID) VALUES (?, ?)`,
                        [angebotId, artId],
                        (err) => {
                          if (err) reject(err);
                          resolve();
                        }
                      );
                    })
                );
  
                Promise.all(artenInsertions).catch((err) => console.error(err.message));
              }
  
              res.status(201).json({
                message: 'Angebot erfolgreich erstellt!',
                institutionId,
                angebotId,
              });
            }
          );
        }
      );
    });
  });


// Benutzer registrieren
app.post('/register', async (req, res) => {
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
app.post('/login', (req, res) => {
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


//DELET
app.delete('/institution/:id', (req, res) => {
    const { id } = req.params;

    const query = `DELETE FROM Institution WHERE ID = ?`;
    db.run(query, [id], function (err) {
        if (err) {
            console.error('Fehler beim Löschen der Institution:', err.message);
            return res.status(500).json({ error: 'Fehler beim Löschen der Institution.' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Institution nicht gefunden.' });
        }

        console.log(`Institution mit ID ${id} erfolgreich gelöscht.`);
        res.json({ success: true, message: `Institution mit ID ${id} erfolgreich gelöscht.` });
    });
});

app.delete('/benutzer/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM Benutzer WHERE ID = ?';
    db.run(query, [id], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Löschen des Benutzers.' });
        }
        res.json({ success: true });
    });
});

app.delete('/tags/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Tags WHERE ID = ?';
  
    db.run(query, [id], function (err) {
      if (err) {
        res.status(500).json({ error: 'Fehler beim Löschen des Tags.' });
        return;
      }
      res.json({ success: true });
    });
});

app.delete('/zielgruppe/:id', (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Zielgruppe WHERE ID = ?';
  
    db.run(query, [id], function (err) {
      if (err) {
        res.status(500).json({ error: 'Fehler beim Löschen der Zielgruppe.' });
        return;
      }
      res.json({ success: true });
    });
});
  
// Server starten
app.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
