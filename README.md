# bachelorarbeit-backend

## install

```
cd bachelorarbeit-backend
npm i
```

## run

•⁠  ⁠for development and local run ⁠ `node server.js⁠`
•⁠  ⁠for production (on server) run ⁠ `NODE_ENV=production node server.js`

•⁠  ⁠⁠ `meilisearch` ⁠ must have been started
•⁠  ⁠to start ⁠ `meilisearch` ⁠ locally, run ⁠ `./meilisearch--master-key="<master-key>"` ⁠ (or, if you want to set a path to where the meilisearch files should be stored: ⁠ `./meilisearch --db-path /path/to/meilifiles --master-key="<master-key>"` ⁠)

## configuration

•⁠  ⁠in ⁠ `server.js` ⁠ set ⁠ API_URL ⁠ to backend url (port ⁠ `3000` ⁠)
•⁠  ⁠in ⁠ `config/meiliclient.js` ⁠ set ⁠ 'host' ⁠ to meilisearch server (port ⁠ `7700` ⁠)

## databases

•⁠  ⁠⁠ `ba_Kopie_final.db` ⁠ is sglite3-database containing all the data
•⁠  ⁠⁠ `meilifiles` ⁠ conatains all the MeiliSearch data (see ⁠ `indexes` ⁠ and ⁠ `tasks` ⁠)