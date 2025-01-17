const express = require('express');
const cors = require('cors'); 
const bodyParser = require('body-parser');
const https = require('node:https');
const fs = require('node:fs');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');

// Routen
const angeboteRoutes = require('./routes/angebote.routes')
const artenRoutes = require('./routes/arten.routes')
const institutionenRoutes = require('./routes/institutionen.routes')
const nmRoutes = require('./routes/nm.routes')
const searchRoutes = require('./routes/search.routes')
const tagsRoutes = require('./routes/tags.routes')
const userRoutes = require('./routes/user.routes')
const zielgruppenRoutes = require('./routes/zielgruppen.routes')
const swaggerDocument = require('./swagger.json');

const app = express();
const PORT = 3000;


// Body parser middleware, um JSON zu verarbeiten
app.use(bodyParser.json());
app.use(cors());
app.use('/angebote', angeboteRoutes);
app.use('/arten', artenRoutes);
app.use('/benutzer', userRoutes);
app.use('/institutionen', institutionenRoutes);
app.use('/nm', nmRoutes);
app.use('/meilisearch', searchRoutes)
app.use('/tags', tagsRoutes);
app.use('/zielgruppen', zielgruppenRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

if(process.env.NODE_ENV=='production') 
{
  // Server auf VM starten
  const privkeyLink = fs.readlinkSync('/etc/letsencrypt/live/vm021.qu.tu-berlin.de/privkey.pem')
  const fullchainLink = fs.readlinkSync('/etc/letsencrypt/live/vm021.qu.tu-berlin.de/fullchain.pem')
  const https_options = {
    key: fs.readFileSync('/etc/letsencrypt/live/vm021.qu.tu-berlin.de/' + privkeyLink),
    cert: fs.readFileSync('/etc/letsencrypt/live/vm021.qu.tu-berlin.de/' + fullchainLink)
  }

  https.createServer(https_options, app).listen(PORT, (error) => {
    if(error) {
      console.log('server error', error)
    } else {
      console.log(`Backend läuft auf Port ${PORT}`);
    }
  })
}
else  // development
{
  // Server lokal starten
  app.listen(PORT, () => {
      console.log(`Server läuft auf Port ${PORT}`);
  });
} 

