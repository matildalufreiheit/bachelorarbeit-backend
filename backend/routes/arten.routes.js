const express = require('express');
const router = express.Router();
const db = require('../config/db');

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

    console.log('Query:', query);
    console.log('Parameter:', params);

});
  

// Route für allgemeine Arten (ohne AngebotID)
router.get('/', (req, res) => {
  const lang = req.query.lang || 'de'; // Standard: Deutsch
  const column = lang === 'en' ? 'Art_EN' : 'Art'; // Spaltenauswahl basierend auf Sprache

  const query = `
    SELECT ID, ${column} AS Art 
    FROM Art
    WHERE ${column} IS NOT NULL
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error('Fehler beim Abrufen der allgemeinen Arten:', err.message);
      res.status(500).json({ error: 'Fehler beim Abrufen der allgemeinen Arten.' });
      return;
    }
    res.json({ data: rows });
  });
});

module.exports = router;
