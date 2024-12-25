const express = require('express');
const router = express.Router();
const db = require('../config/db')


router.get('/', (req, res) => {
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

module.exports = router;