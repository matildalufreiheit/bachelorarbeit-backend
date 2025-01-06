const express = require('express');
const router = express.Router();
const db = require('../config/db')

// router.get('/angebot_tags', (req, res) => {
//     const query = 'SELECT * FROM Angebot_Tags';
//     db.all(query, (err, rows) => {
//       if (err) {
//         //console.error('Fehler beim Abrufen der Angebot_Tags:', err);
//         res.status(500).json({ error: 'Fehler beim Abrufen der Angebot_Tags' });
//         return;
//       }
  
//       //console.log('Daten aus Angebot_Tags:', rows);
//       res.json({ data: rows });
//     });
// });

router.get('/angebot_tags/:angebotId?', (req, res) => {
  const angebotId = req.params.angebotId;

  let query = `SELECT AngebotID, TagID FROM Angebot_Tags`;
  const params = [];

  if (angebotId) {
    query += ` WHERE AngebotID = ?`;
    params.push(angebotId);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Fehler beim Abrufen der Tags:', err.message);
      res.status(500).json({ error: 'Fehler beim Abrufen der Tags.' });
      return;
    }
    res.json({ data: rows });
  });
});



router.get('/angebot_zielgruppe/:angebotId?', (req, res) => {
  const angebotId = req.params.angebotId;

  let query = `SELECT AngebotID, ZielgruppeID FROM Angebote_Zielgruppe`;
  const params = [];

  if (angebotId) {
    query += ` WHERE AngebotID = ?`;
    params.push(angebotId);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Fehler beim Abrufen der Zielgruppen:', err.message);
      res.status(500).json({ error: 'Fehler beim Abrufen der Zielgruppen.' });
      return;
    }
    res.json({ data: rows });
  });
});

router.get('/angebot_art/:angebotId?', (req, res) => {
  const lang = req.query.lang || 'de'; // Standard: Deutsch
  const column = lang === 'en' ? 'Art_EN' : 'Art'; // Spaltenauswahl basierend auf Sprache
  const angebotId = req.params.angebotId; // AngebotID optional

  let query = `
    SELECT Angebot_Art.AngebotID, Angebot_Art.ArtID, ${column} AS Art 
    FROM Angebot_Art
    JOIN Art ON Angebot_Art.ArtID = Art.ID
  `;
  const params = [];

  if (angebotId) {
    query += ` WHERE Angebot_Art.AngebotID = ?`;
    params.push(angebotId);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Fehler beim Abrufen der Angebotsarten:', err.message);
      res.status(500).json({ error: 'Fehler beim Abrufen der Angebotsarten.' });
      return;
    }
    res.json({ data: rows });
  });
});


// router.get('/angebot_zielgruppe', (req, res) => {
//     const query = 'SELECT * FROM Angebote_Zielgruppe';
//     db.all(query, (err, rows) => {
//       if (err) {
//         //console.error('Fehler beim Abrufen der Angebot_Tags:', err);
//         res.status(500).json({ error: 'Fehler beim Abrufen der Angebot_Tags' });
//         return;
//       }
  
//       //console.log('Daten aus Angebot_Tags:', rows);
//       res.json({ data: rows });
//     });
// });

module.exports = router;
