const express = require('express');
const router = express.Router();
const db = require('../config/db')


router.get('/', (req, res) => {
    const lang = req.query.lang || 'de'; // Standard: Deutsch
    const column = lang === 'en' ? 'Art_EN' : 'Art'; // Spaltenauswahl basierend auf Sprache

    const query = `SELECT ID, ${column} AS Art FROM Art WHERE ${column} IS NOT NULL`;

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