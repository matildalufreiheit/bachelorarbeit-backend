const express = require('express');
const router = express.Router();
const db = require('../config/db')
const { intiMeiliclient } = require('../config/meiliclient')


// CRUD-Operationen für Angebote

//GET!
router.get('/', (req, res) => {
  const lang = req.query.lang || 'de'; // Standard: Deutsch
  const nameColumn = lang === 'en' ? 'Institution.Name_EN' : 'Institution.Name';
  const descriptionColumn = lang === 'en' ? 'Institution.Description_EN' : 'Institution.Beschreibung';
  const urlColumn = lang === 'en' ? 'Institution.URL_EN' : 'Institution.URL';
  const artColumn = lang === 'en' ? 'Art.Art_EN' : 'Art.Art'; // Spaltenauswahl für Arten

  const query = `
      SELECT 
          Angebot.ID, 
          Angebot.InstitutionID, 
          ${nameColumn} AS Name, 
          ${descriptionColumn} AS Beschreibung, 
          ${urlColumn} AS url,
          GROUP_CONCAT(DISTINCT Angebot_Tags.TagID) AS TagIDs,
          GROUP_CONCAT(DISTINCT Angebote_Zielgruppe.ZielgruppeID) AS ZielgruppenIDs,
          GROUP_CONCAT(DISTINCT ${artColumn}) AS Arten, 
          GROUP_CONCAT(DISTINCT Suchbegriffe.Begriff) AS Suchbegriffe 

      FROM Angebot
      LEFT JOIN Institution ON Angebot.InstitutionID = Institution.ID
      LEFT JOIN Angebot_Tags ON Angebot.ID = Angebot_Tags.AngebotID
      LEFT JOIN Angebote_Zielgruppe ON Angebot.ID = Angebote_Zielgruppe.AngebotID
      LEFT JOIN Angebot_Art ON Angebot.ID = Angebot_Art.AngebotID
      LEFT JOIN Art ON Angebot_Art.ArtID = Art.ID -- Stelle sicher, dass die Verknüpfung korrekt ist
      LEFT JOIN Angebot_Suchbegriffe ON Angebot.ID = Angebot_Suchbegriffe.AngebotID -- NEU
      LEFT JOIN Suchbegriffe ON Angebot_Suchbegriffe.SuchbegriffID = Suchbegriffe.ID -- NEU
      GROUP BY Angebot.ID;
  `;

  console.log(`Executing Query for language ${lang}: ${query}`); // Debugging-Log

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
          row.Suchbegriffe = row.Suchbegriffe ? row.Suchbegriffe.split(',') : []; // NEU
      });
      res.json({ data: rows });
  });
});



router.get('/:id', (req, res) => {
  const { id } = req.params;
  const lang = req.query.lang || 'de'; // Standard: Deutsch
  const nameColumn = lang === 'en' ? 'Institution.Name_EN' : 'Institution.Name';
  const descriptionColumn = lang === 'en' ? 'Institution.Description_EN' : 'Institution.Beschreibung';
  const urlColumn = lang === 'en' ? 'Institution.URL_EN' : 'Institution.URL';
  const artColumn = lang === 'en' ? 'Art.Art_EN' : 'Art.Art';

  const query = `
      SELECT 
          Angebot.ID, 
          Angebot.InstitutionID, 
          ${nameColumn} AS Name, 
          ${descriptionColumn} AS Beschreibung, 
          ${urlColumn} AS url,
          GROUP_CONCAT(DISTINCT Angebot_Tags.TagID) AS TagIDs,
          GROUP_CONCAT(DISTINCT Angebote_Zielgruppe.ZielgruppeID) AS ZielgruppenIDs,
          GROUP_CONCAT(DISTINCT ${artColumn}) AS Arten,
          GROUP_CONCAT(DISTINCT Suchbegriffe.Begriff) AS Suchbegriffe
      FROM Angebot
      LEFT JOIN Institution ON Angebot.InstitutionID = Institution.ID
      LEFT JOIN Angebot_Tags ON Angebot.ID = Angebot_Tags.AngebotID
      LEFT JOIN Angebote_Zielgruppe ON Angebot.ID = Angebote_Zielgruppe.AngebotID
      LEFT JOIN Angebot_Art ON Angebot.ID = Angebot_Art.AngebotID
      LEFT JOIN Art ON Angebot_Art.ArtID = Art.ID
      LEFT JOIN Angebot_Suchbegriffe ON Angebot.ID = Angebot_Suchbegriffe.AngebotID -- NEU
      LEFT JOIN Suchbegriffe ON Angebot_Suchbegriffe.SuchbegriffID = Suchbegriffe.ID -- NEU
      WHERE Angebot.ID = ?
      GROUP BY Angebot.ID;
  `;

  console.log(`Executing Query for language ${lang}: ${query}`); // Debugging-Log

  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Fehler beim Abrufen des Angebots:', err.message);
      return res.status(500).json({ error: 'Fehler beim Abrufen des Angebots.', details: err.message });
    }

    if (!row) {
      return res.status(404).json({ error: 'Angebot nicht gefunden.' });
    }

    // Konvertiere die IDs zu Arrays
    row.TagIDs = row.TagIDs ? row.TagIDs.split(',').map(Number) : [];
    row.ZielgruppenIDs = row.ZielgruppenIDs ? row.ZielgruppenIDs.split(',').map(Number) : [];
    row.Arten = row.Arten ? row.Arten.split(',') : [];
    row.Suchbegriffe = row.Suchbegriffe ? row.Suchbegriffe.split(',') : []; // NEU
    res.json({ data: row });
  });
});

router.post('/', (req, res) => {
  const { name, beschreibung, url, name_en, beschreibung_en, url_en, tags, zielgruppen, arten, suchebegriffe } = req.body;
  if (!name || !beschreibung || !url || !name_en || !beschreibung_en || !url_en) {
    return res.status(400).json({ error: 'Alle Felder müssen ausgefüllt sein.' });
  }

  db.serialize(() => {
    // Schritt 1: Institution einfügen
    db.run(
      `INSERT INTO Institution (Name, Beschreibung, URL, Name_EN, Description_EN, URL_EN) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, beschreibung, url, name_en, beschreibung_en, url_en],
      function (err) {
        if (err) {
          console.error('Fehler beim Hinzufügen der Institution:', err.message);
          return res.status(500).json({ error: 'Fehler beim Hinzufügen der Institution.' });
        }

        const institutionId = this.lastID;
        console.log('institutionsID: ', institutionId)
        // Schritt 2: Angebot erstellen und Institution verknüpfen
        db.run(
          `INSERT INTO Angebot (InstitutionID) VALUES (?)`,
          [institutionId],
          function (err) {
            if (err) {
              console.error('Fehler beim Hinzufügen des Angebots:', err.message);
              return res.status(500).json({ error: 'Fehler beim Hinzufügen des Angebots.' });
            }
            const angebotId = this.lastID;
            console.log('angebotID: ', angebotId)
            // Schritt 3: Tags verknüpfen
            if (tags && tags.length > 0) {
              const tagInsertions = tags.map((tagId) =>
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
              const zielgruppenInsertions = zielgruppen.map((zielgruppeId) =>
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
              const artenInsertions = arten.map((artId) =>
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
            // Schritt 6: Suchbegriffe verknüpfen
            if (suchebegriffe && suchebegriffe.length > 0) {
              const begriffe = suchebegriffe.map((begriff) => begriff.trim()); // Begriffe trimmen
              console.log('Suchbegriffe, die verarbeitet werden:', begriffe); // Debugging

            
              const suchbegriffPromises = begriffe.map(
                (begriff) =>
                  new Promise((resolve, reject) => {
                    // Füge den Begriff ein, falls er noch nicht existiert
                    db.run(
                      `INSERT OR IGNORE INTO Suchbegriffe (Begriff) VALUES (?)`,
                      [begriff],
                      function (err) {
                        if (err) {
                          console.error('Fehler beim Einfügen in Suchbegriffe:', err.message);
                          reject(err); // Fehler zurückgeben
                        } else {
                          console.log(`Begriff eingefügt oder existiert bereits: ${begriff}`);
            
                          // Hole die ID des Begriffs
                          db.get(
                            `SELECT ID FROM Suchbegriffe WHERE Begriff = ?`,
                            [begriff],
                            (err, row) => {
                              if (err) {
                                console.error('Fehler beim Abrufen der Suchbegriff-ID:', err.message);
                                reject(err); // Fehler zurückgeben
                              } else {
                                const suchbegriffId = row.ID;
                                console.log('Gefundene Suchbegriff-ID:', suchbegriffId); // Debugging

                                // Füge die Verknüpfung in Angebot_Suchbegriffe ein
                                db.run(
                                  `INSERT INTO Angebot_Suchbegriffe (AngebotID, SuchbegriffID) VALUES (?, ?)`,
                                  [angebotId, suchbegriffId],
                                  (err) => {
                                    if (err) {
                                      console.error(
                                        'Fehler beim Verknüpfen von Angebot und Suchbegriff:',
                                        err.message
                                      );
                                      reject(err); // Fehler zurückgeben
                                    } else {
                                      console.log(
                                        `Verknüpfung erstellt: AngebotID ${angebotId}, SuchbegriffID ${suchbegriffId}`
                                      );
                                      resolve();
                                    }
                                  }
                                );
                              }
                            }
                          );
                        }
                      }
                    );
                  })
              );
            
              Promise.all(suchbegriffPromises)
                .then(() => {
                  intiMeiliclient();
                  console.log('Alle Suchbegriffe erfolgreich verarbeitet.');
                })
                .catch((err) => {
                  console.error('Fehler beim Verarbeiten der Suchbegriffe:', err.message);
                });
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


router.put('/:id', (req, res) => {
  const { id } = req.params; // ID des Angebots
  const {
    Name,
    Beschreibung,
    URL,
    Name_EN,
    Beschreibung_EN, 
    URL_EN,
    Tags = [],
    Zielgruppen = [],
    Arten = [],
    Suchebegriffe = []
  } = req.body;

  // Validierung: Alle erforderlichen Felder prüfen
  if (!Name || !Beschreibung || !URL || !Name_EN || !Beschreibung_EN || !URL_EN) {
    return res.status(400).json({
      error: 'Alle Felder (Name, Beschreibung, url, Name_en, Beschreibung_en, url_en) sind erforderlich.',
    });
  }

  db.serialize(() => {
    // 1. Institution aktualisieren
    db.run(
      `UPDATE Institution SET Name = ?, Beschreibung = ?, URL = ?, Name_EN = ?, Description_EN = ?, URL_EN = ? WHERE ID = ?`,
      [Name, Beschreibung, URL, Name_EN, Beschreibung_EN, URL_EN, id],
      function (err) {
        if (err) {
          console.error('Fehler beim Aktualisieren der Institution:', err.message);
          return res.status(500).json({ error: 'Fehler beim Aktualisieren der Institution.' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Institution nicht gefunden.' });
        }

        console.log(`Institution mit ID ${id} erfolgreich aktualisiert.`);

        // 2. Tags aktualisieren
        let tagInsertions = []; // Deklaration außerhalb des Callbacks

        db.run(`DELETE FROM Angebot_Tags WHERE AngebotID = ?`, [id], function (err) {
          if (err) {
            console.error('Fehler beim Löschen der bestehenden Tags:', err.message);
            return res.status(500).json({ error: 'Fehler beim Löschen der bestehenden Tags.' });
          }

          // Nach dem Löschen der bestehenden Einträge, neue Einträge hinzufügen
          tagInsertions = Tags.map((tagId) =>
            new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO Angebot_Tags (AngebotID, TagID) VALUES (?, ?)`,
                [id, tagId],
                (err) => (err ? reject(err) : resolve())
              );
            })
          );
        });

        // 3. Zielgruppen aktualisieren
        let zielgruppenInsertions = []; // Deklaration außerhalb des Callbacks

        db.run(`DELETE FROM Angebote_Zielgruppe WHERE AngebotID = ?`, [id], function (err) {
          if (err) {
            console.error('Fehler beim Löschen der bestehenden Zielgruppen:', err.message);
            return res.status(500).json({ error: 'Fehler beim Löschen der bestehenden Zielgruppen.' });
          }

          // Nach dem Löschen der bestehenden Einträge, neue Einträge hinzufügen
          zielgruppenInsertions = Zielgruppen.map((zielgruppeId) =>
            new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO Angebote_Zielgruppe (AngebotID, ZielgruppeID) VALUES (?, ?)`,
                [id, zielgruppeId],
                (err) => (err ? reject(err) : resolve())
              );
            })
          );
        });

        // 4. Arten aktualisieren
        let artenInsertions = []; // Deklaration außerhalb des Callbacks

        db.run(`DELETE FROM Angebot_Art WHERE AngebotID = ?`, [id], function (err) {
          if (err) {
            console.error('Fehler beim Löschen der bestehenden Arten:', err.message);
            return res.status(500).json({ error: 'Fehler beim Löschen der bestehenden Arten.' });
          }

          // Neue Einträge einfügen
          artenInsertions = Arten.map((art) =>
            new Promise((resolve, reject) => {
              db.run(
                `INSERT INTO Angebot_Art (AngebotID, ArtID) VALUES (?, ?)`,
                [id, art],
                (err) => (err ? reject(err) : resolve())
              );
            })
          );
        });
        db.run(`DELETE FROM Angebot_Suchbegriffe WHERE AngebotID = ?`, [id], function (err) {
          if (err) {
            console.error('Fehler beim Löschen der bestehenden Suchbegriffe:', err.message);
            return res.status(500).json({ error: 'Fehler beim Löschen der bestehenden Suchbegriffe.' });
          }
        
          if (Suchebegriffe && Suchebegriffe.length > 0) {
            const begriffe = Suchebegriffe.map((begriff) => begriff.trim()); // Begriffe trimmen
        
            const suchbegriffInsertions = begriffe.map(
              (begriff) =>
                new Promise((resolve, reject) => {
                  // Füge den Begriff ein, falls er noch nicht existiert
                  db.run(
                    `INSERT OR IGNORE INTO Suchbegriffe (Begriff) VALUES (?)`,
                    [begriff],
                    function (err) {
                      if (err) {
                        console.error('Fehler beim Einfügen in Suchbegriffe:', err.message);
                        reject(err);
                      } else {
                        console.log(`Begriff eingefügt oder existiert bereits: ${begriff}`);
        
                        // Hole die ID des Begriffs
                        db.get(
                          `SELECT ID FROM Suchbegriffe WHERE Begriff = ?`,
                          [begriff],
                          (err, row) => {
                            if (err) {
                              console.error('Fehler beim Abrufen der Suchbegriff-ID:', err.message);
                              reject(err);
                            } else {
                              const suchbegriffId = row.ID;
        
                              // Füge die Verknüpfung in Angebot_Suchbegriffe ein
                              db.run(
                                `INSERT INTO Angebot_Suchbegriffe (AngebotID, SuchbegriffID) VALUES (?, ?)`,
                                [id, suchbegriffId],
                                (err) => {
                                  if (err) {
                                    console.error(
                                      'Fehler beim Verknüpfen von Angebot und Suchbegriff:',
                                      err.message
                                    );
                                    reject(err);
                                  } else {
                                    console.log(
                                      `Verknüpfung erstellt: AngebotID ${id}, SuchbegriffID ${suchbegriffId}`
                                    );
                                    resolve();
                                  }
                                }
                              );
                            }
                          }
                        );
                      }
                    }
                  );
                })
            );
        
            Promise.all(suchbegriffInsertions)
              .then(() => {
                intiMeiliclient();
                console.log('Alle Suchbegriffe erfolgreich aktualisiert.');
              })
              .catch((err) => {
                console.error('Fehler beim Aktualisieren der Suchbegriffe:', err.message);
              });
          }
        });        

        // 5. Änderungen speichern
        Promise.all([...tagInsertions, ...zielgruppenInsertions, ...artenInsertions])
          .then(() => {
            res.status(200).json({ message: 'Angebot erfolgreich aktualisiert!' });
          })
          .catch((err) => {
            console.error('Fehler beim Aktualisieren der Verknüpfungen:', err.message);
            res.status(500).json({ error: 'Fehler beim Aktualisieren der Verknüpfungen.' });
          });
      }
    );
  });
});


router.delete('/:id', (req, res) => {
  const id = req.params.id;

  db.serialize(() => {
    db.run('DELETE FROM Institution WHERE ID = ?', [id], function (errInst) {
        if (errInst) {
            console.error('Fehler beim Löschen der Institution:', errInst.message);
            return res.status(500).json({ error: 'Fehler beim Löschen der Institution.' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Institution nicht gefunden.' });
        }

        db.run('DELETE FROM Angebot WHERE ID = ?', [id], function (errAng) {
          if (errAng) {
              console.error('Fehler beim Löschen der Institution:', errAng.message);
              return res.status(500).json({ error: 'Fehler beim Löschen der Institution.' });
          }
  
          if (this.changes === 0) {
              return res.status(404).json({ error: 'Angebot nicht gefunden.' });
          }
  
          console.log(`Angebot mit ID ${id} erfolgreich gelöscht.`);
        });

        db.run('DELETE FROM Angebot_Art WHERE AngebotID = ?', [id], () => {});
        db.run('DELETE FROM Angebot_Suchbegriffe WHERE AngebotID = ?', [id], () => {});
        db.run('DELETE FROM Angebot_Tags WHERE AngebotID = ?', [id], () => {});
        db.run('DELETE FROM Angebote_Zielgruppe WHERE AngebotID = ?', [id], () => {});

        intiMeiliclient();
        console.log(`Institution und Angebot mit ID ${id} erfolgreich gelöscht.`);
        res.json({ success: true, message: `Institution und Angebot mit ID ${id} erfolgreich gelöscht.`});
    });
  });
});

module.exports = router;