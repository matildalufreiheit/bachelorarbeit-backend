const express = require('express');
const router = express.Router();
const db = require('../db')


// CRUD-Operationen für Angebote

//GET!
router.get('/angebote', (req, res) => {
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

router.get('/angebote/:id', (req, res) => {
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
router.get('/tags', (req, res) => {
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
router.get('/zielgruppe', (req, res) => {
    const query = 'SELECT * FROM Zielgruppe';
    db.all(query, (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

router.get('/angebot_tags', (req, res) => {
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

router.get('/angebot_zielgruppe', (req, res) => {
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

router.get('/arten', (req, res) => {
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


router.get('/institutionen', (req, res) => {
    const query = `SELECT ID, Name FROM Institution`;
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Institutionen.' });
        }
        res.json({ data: rows });
    });
});

router.get('/benutzer', (req, res) => {
    const query = 'SELECT ID, Benutzername FROM Benutzer';
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Benutzer.' });
        }
        res.json({ data: rows });
    });
});
  

//PUT

router.put('/update-institution/:id', (req, res) => {
  const institutionId = req.params.id;
  const { name, beschreibung, url } = req.body;

  const fieldsToUpdate = [];
  const values = [];

  if (name) {
      fieldsToUpdate.push('Name = ?');
      values.push(name);
  }
  if (beschreibung) {
      fieldsToUpdate.push('Beschreibung = ?');
      values.push(beschreibung);
  }
  if (url) {
      fieldsToUpdate.push('URL = ?');
      values.push(url);
  }

  if (fieldsToUpdate.length === 0) {
      return res.status(400).json({ error: 'Keine gültigen Felder zum Aktualisieren übergeben.' });
  }

  const updateQuery = `UPDATE Institution SET ${fieldsToUpdate.join(', ')} WHERE ID = ?`;
  values.push(institutionId);

  db.run(updateQuery, values, function (err) {
      if (err) {
          console.error('Fehler beim Aktualisieren der Institution:', err.message);
          return res.status(500).json({ error: 'Fehler beim Aktualisieren der Institution.' });
      }

      res.status(200).json({ message: 'Institution erfolgreich aktualisiert!' });
  });
});



router.put('/tags/:id', (req, res) => {
  const { id } = req.params;
  const { tag } = req.body;

  if (!tag) {
      return res.status(400).json({ error: 'Tag darf nicht leer sein.' });
  }

  const query = 'UPDATE Tags SET Tag = ? WHERE ID = ?';
  db.run(query, [tag, id], function (err) {
      if (err) {
          console.error('Fehler beim Aktualisieren des Tags:', err.message);
          return res.status(500).json({ error: 'Fehler beim Aktualisieren des Tags.' });
      }

      if (this.changes === 0) {
          res.status(404).json({ error: 'Tag nicht gefunden.' });
      } else {
          res.json({ success: true, message: `Tag mit ID ${id} erfolgreich aktualisiert.` });
      }
  });
});

router.put('/zielgruppen/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
      return res.status(400).json({ error: 'Zielgruppe darf nicht leer sein.' });
  }

  const query = 'UPDATE Zielgruppe SET Name = ? WHERE ID = ?';
  db.run(query, [name, id], function (err) {
      if (err) {
          console.error('Fehler beim Aktualisieren der Zielgruppe:', err.message);
          return res.status(500).json({ error: 'Fehler beim Aktualisieren der Zielgruppe.' });
      }

      if (this.changes === 0) {
          res.status(404).json({ error: 'Zielgruppe nicht gefunden.' });
      } else {
          res.json({ success: true, message: `Zielgruppe mit ID ${id} erfolgreich aktualisiert.` });
      }
  });
});




//POST
router.post('/tags', (req, res) => {
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
  
router.post('/zielgruppe', (req, res) => {
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

router.post('/institution', (req, res) => {
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

router.post('/angebote', (req, res) => {
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


//DELET
router.delete('/institution/:id', (req, res) => {
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

// Benutzer löschen
router.delete('/benutzer/:id', (req, res) => {
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

router.delete('/tags/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM Tags WHERE ID = ?';

  db.run(query, [id], function (err) {
      if (err) {
          console.error('Fehler beim Löschen des Tags:', err.message);
          res.status(500).json({ error: 'Fehler beim Löschen des Tags.' });
          return;
      }
      if (this.changes === 0) {
          res.status(404).json({ error: 'Tag nicht gefunden.' });
      } else {
          res.json({ success: true, message: `Tag mit ID ${id} erfolgreich gelöscht.` });
      }
  });
});

router.delete('/zielgruppen/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM Zielgruppe WHERE ID = ?';

  db.run(query, [id], function (err) {
      if (err) {
          console.error('Fehler beim Löschen der Zielgruppe:', err.message);
          res.status(500).json({ error: 'Fehler beim Löschen der Zielgruppe.' });
          return;
      }
      if (this.changes === 0) {
          res.status(404).json({ error: 'Zielgruppe nicht gefunden.' });
      } else {
          res.json({ success: true, message: `Zielgruppe mit ID ${id} erfolgreich gelöscht.` });
      }
  });
});
  
module.exports = router;