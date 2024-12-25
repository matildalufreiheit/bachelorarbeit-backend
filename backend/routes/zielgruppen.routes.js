const express = require('express');
const router = express.Router();
const db = require('../config/db')


router.get('/', (req, res) => {
    const query = 'SELECT * FROM Zielgruppe';
    db.all(query, (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

router.put('/:id', (req, res) => {
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

  
router.post('/', (req, res) => {
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