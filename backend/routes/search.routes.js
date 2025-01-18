const express = require('express');
const router = express.Router();
const meiliIndex = require('../config/meiliclient')


router.get('/search', async (req, res) => {
    const query = req.query.q || ''; // Suchstring aus Anfrage
    try {
        const results = await meiliIndex.search(query, {
            limit: 20, // Begrenze die Anzahl der Treffer
        });
        console.log('meilisearch results : ', results)
        
        if (results.hits.length === 0) {
            // Kein Ergebnis -> Standardangebot zurückgeben
            const defaultOffer = {
                id: '6',
                name: 'Allgemeine Studienberatung',
                url: 'https://www.tu.berlin/go2726/',
            };
            return res.json({
                hits: [defaultOffer], // Das Standardangebot in einem Trefferformat
                totalHits: 1, // Zeigt an, dass ein Treffer (das Standardangebot) geliefert wurde
            });
        }
        res.json(results);
    } catch (error) {
        console.error('Fehler bei der Suche:', error);
        res.status(500).json({ error: 'Fehler bei der Suche.' });
    }
});

module.exports = router;