const express = require('express');
const router = express.Router();
const db = require('../config/db')

// GET Tags mit Sprachunterstützung
router.get('/', (req, res) => {
    const lang = req.query.lang || 'de'; // Standard: Deutsch
    const column = lang === 'en' ? 'Tag_EN' : 'Tag'; // Spalte basierend auf Sprache

    const query = `SELECT ID, ${column} AS Tag FROM Tags WHERE ${column} IS NOT NULL`;

    db.all(query, (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});


// PUT
router.put('/:id', (req, res) => {
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

// POST
router.post('/', (req, res) => {
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