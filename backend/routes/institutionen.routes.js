const express = require('express');
const router = express.Router();
const db = require('../config/db')


//GET
router.get('/', (req, res) => {
    const query = `SELECT ID, Name FROM Institution`;
    db.all(query, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Institutionen.' });
        }
        res.json({ data: rows });
    });
});
  
router.get('/:id', (req, res) => {
    const { id } = req.params;

    const query = `SELECT ID, Name FROM Institution WHERE id = ?`;
    db.all(query, [id], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Fehler beim Abrufen der Institutionen.' });
        }
        res.json({ data: rows });
    });
});

//PUT
router.put('/:id', (req, res) => {
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



//POST
router.post('/', (req, res) => {
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



//DELETE
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

router.delete('/name/:instname', (req, res) => {
    const instname  = req.params.instname;

    const query = `DELETE FROM Institution WHERE Name = ?`;
    db.run(query, [instname], function (err) {
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

  
module.exports = router;