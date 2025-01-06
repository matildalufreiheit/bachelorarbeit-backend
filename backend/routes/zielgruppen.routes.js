const express = require('express');
const router = express.Router();
const db = require('../config/db')


router.get('/', (req, res) => {
    const lang = req.query.lang || 'de'; // Standard: Deutsch
    const column = lang === 'en' ? 'Zielgruppe_EN' : 'Name'; // Spaltenauswahl basierend auf Sprache
  
    const query = `
      SELECT 
        ID, 
        Name, 
        Zielgruppe_EN, 
        ${column} AS PreferredTag 
      FROM Zielgruppe
      WHERE ${column} IS NOT NULL
    `;
  
    db.all(query, (err, rows) => {
      if (err) {
        console.error('Fehler beim Abrufen der Zielgruppen:', err.message);
        res.status(500).json({ error: 'Fehler beim Abrufen der Zielgruppen.' });
        return;
      }
      console.log('Geladene Zielgruppen:', rows); // Debugging
      res.json({ data: rows });
    });
  });
  
  router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { de, en } = req.body;
  
    if (!de || !en) {
      return res.status(400).json({ error: 'Sowohl der deutsche als auch der englische Name sind erforderlich.' });
    }
  
    const query = 'UPDATE Zielgruppe SET Name = ?, Zielgruppe_EN = ? WHERE ID = ?';
    db.run(query, [de, en, id], function (err) {
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
  
  
router.post('/', (req, res) => {
    const { de, en } = req.body;

    if (!de || !en) {
        return res.status(400).json({ error: 'Sowohl der deutsche als auch der englische Name der Zielgruppe sind erforderlich.' });
    }

    const query = 'INSERT INTO Zielgruppe (Name, Zielgruppe_EN) VALUES (?, ?)';
    db.run(query, [de, en], function (err) {
        if (err) {
            console.error('Fehler beim Hinzufügen der Zielgruppe:', err.message);
            return res.status(500).json({ error: 'Fehler beim Hinzufügen der Zielgruppe.' });
        }
        res.json({ success: true, id: this.lastID });
    });
});


router.delete('/:id', (req, res) => {
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