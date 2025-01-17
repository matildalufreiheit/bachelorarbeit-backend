const { MeiliSearch } = require('meilisearch');
const db = require('./db');

require('dotenv').config();

if(process.env.NODE_ENV=='production') 
{
    //Meilisearch auf VM starten:
    meiliClient = new MeiliSearch({
        host: 'http://localhost:7700',
        apiKey: 'bSppaUoyGpLKWXd24IRK3FU7fXxak7CeOR5Eu-bOIyw',      // vm
    });
}
else
{
    //Meilisearch lokal starten:
    meiliClient = new MeiliSearch({
        host: 'http://localhost:7700',
        apiKey: 'bSppaUoyGpLKWXd24IRK3FU7fXxak7CeOR5Eu-bOIyw',   // MF Mac lokal
        //apiKey: 'yUseq7A-Cug6VjNIGytyZeOEGD5dseYiT7zmuag5oLs'       // Testgeraet lokal
    });
}

const meiliIndex = meiliClient.index('angebote');

const query = `
SELECT 
    Angebot.ID AS id,
    Institution.Name AS name,
    Institution.Beschreibung AS beschreibung,
    GROUP_CONCAT(DISTINCT Art.Art) AS art,
    Institution.URL AS url,
    GROUP_CONCAT(DISTINCT Tags.Tag) AS tags,
    GROUP_CONCAT(DISTINCT Zielgruppe.Name) AS zielgruppen,
    GROUP_CONCAT(DISTINCT Suchbegriffe.Begriff) AS suchbegriffe -- Suchbegriffe hinzufügen
FROM Angebot
LEFT JOIN Institution ON Angebot.InstitutionID = Institution.ID
LEFT JOIN Angebot_Tags ON Angebot.ID = Angebot_Tags.AngebotID
LEFT JOIN Tags ON Angebot_Tags.TagID = Tags.ID
LEFT JOIN Angebote_Zielgruppe ON Angebot.ID = Angebote_Zielgruppe.AngebotID
LEFT JOIN Zielgruppe ON Angebote_Zielgruppe.ZielgruppeID = Zielgruppe.ID
LEFT JOIN Angebot_Art ON Angebot.ID = Angebot_Art.AngebotID
LEFT JOIN Art ON Angebot_Art.ArtID = Art.ID
LEFT JOIN Angebot_Suchbegriffe ON Angebot.ID = Angebot_Suchbegriffe.AngebotID -- Verbindungstabelle
LEFT JOIN Suchbegriffe ON Angebot_Suchbegriffe.SuchbegriffID = Suchbegriffe.ID -- Suchbegriffe
GROUP BY Angebot.ID;
`;


db.all(query, async (err, rows) => {
    if (err) {
        console.error('Fehler beim Abrufen der Angebote für MeiliSearch:', err.message);
        res.status(500).json({ error: 'Fehler beim Abrufen der Angebote.', details: err.message });
        return;
    }

    this.documents = rows.map(row => ({
        id: row.id,
        name: row.name,
        beschreibung: row.beschreibung,
        art: row.art ? row.art.split(', ') : [],
        url: row.url,
        tags: row.tags ? row.tags.split(', ') : [],
        zielgruppen: row.zielgruppen ? row.zielgruppen.split(', ') : [],
        suchbegriffe: row.suchbegriffe ? row.suchbegriffe.split(', ') : [] // Suchbegriffe einfügen
    }));

    console.log('documents : ', this.documents);
    
    const response = await meiliClient.index('angebote').addDocuments(this.documents).then( res => console.log('Response from meili : ', res))
    console.log('Response from MeiliSearch:', response);

    await meiliIndex.updateSettings({
        filterableAttributes: ['art', 'tags', 'zielgruppen'],
        searchableAttributes: ['name', 'beschreibung', 'art', 'suchbegriffe'],
    });
    console.log('MeiliSearch-Index-Einstellungen erfolgreich aktualisiert.');

});

module.exports = meiliIndex;




