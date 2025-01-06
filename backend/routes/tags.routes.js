const express = require('express');
const router = express.Router();
const db = require('../config/db')

// GET Tags mit beiden Spalten
router.get('/', (req, res) => {
    const lang = req.query.lang || 'de'; // Standard: Deutsch
    const preferredColumn = lang === 'en' ? 'Tag_EN' : 'Tag'; // Spalte für die bevorzugte Sprache

    const query = `
        SELECT 
            ID, 
            Tag, 
            Tag_EN, 
            ${preferredColumn} AS PreferredTag 
        FROM Tags
        WHERE ${preferredColumn} IS NOT NULL
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Fehler beim Abrufen der Tags:', err.message);
            res.status(500).json({ error: 'Fehler beim Abrufen der Tags.' });
            return;
        }
        res.json({ data: rows });
    });
});



// PUT
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { de, en } = req.body;
  
    if (!de || !en) {
      return res.status(400).json({ error: 'Sowohl deutscher als auch englischer Name sind erforderlich.' });
    }
  
    const query = 'UPDATE Tags SET Tag = ?, Tag_EN = ? WHERE ID = ?';
    db.run(query, [de, en, id], function (err) {
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
  

// POST
router.post('/', (req, res) => {
    const { de, en } = req.body;

    if (!de || !en) {
        return res.status(400).json({ error: 'Sowohl der deutsche als auch der englische Name des Tags sind erforderlich.' });
    }

    const query = 'INSERT INTO Tags (Tag, Tag_EN) VALUES (?, ?)';
    db.run(query, [de, en], function (err) {
        if (err) {
            console.error('Fehler beim Hinzufügen des Tags:', err.message);
            return res.status(500).json({ error: 'Fehler beim Hinzufügen des Tags.' });
        }
        res.json({ success: true, id: this.lastID });
    });
});




//DELETE
router.delete('/:id', (req, res) => {
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

  
module.exports = router;