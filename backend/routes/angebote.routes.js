const express = require('express');
const router = express.Router();
const db = require('../config/db')


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
          GROUP_CONCAT(DISTINCT ${artColumn}) AS Arten -- Verbindung zu Art.Art_EN oder Art.Art
      FROM Angebot
      LEFT JOIN Institution ON Angebot.InstitutionID = Institution.ID
      LEFT JOIN Angebot_Tags ON Angebot.ID = Angebot_Tags.AngebotID
      LEFT JOIN Angebote_Zielgruppe ON Angebot.ID = Angebote_Zielgruppe.AngebotID
      LEFT JOIN Angebot_Art ON Angebot.ID = Angebot_Art.AngebotID
      LEFT JOIN Art ON Angebot_Art.ArtID = Art.ID -- Stelle sicher, dass die Verknüpfung korrekt ist
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
      });
      res.json({ data: rows });
  });
});



router.get('/:id', (req, res) => {
  const { id } = req.params;
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

router.post('/', (req, res) => {
  const { name, beschreibung, url, name_en, beschreibung_en, url_en, tags, zielgruppen, arten } = req.body;

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

        console.log(`Institution und Angebot mit ID ${id} erfolgreich gelöscht.`);
        res.json({ success: true, message: `Institution und Angebot mit ID ${id} erfolgreich gelöscht.`});
    });
  });
});

module.exports = router;