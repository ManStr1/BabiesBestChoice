const http = require('http');
const express = require('express');
const webServerConfig = require('../config/web-server.js');
const database = require('./database.js');
const morgan = require('morgan');
const bodyParser = require('body-parser');                                            //!
var artists;
const app = express();
let httpServer;
 
function initialize() {
  return new Promise((resolve, reject) => {

    httpServer = http.createServer(app);

    app.use(morgan('combined'));
 
    httpServer.listen(webServerConfig.port)
      .on('listening', () => {
        console.log(`Web server listening on localhost:${webServerConfig.port}`);
 
        resolve();
      })
      .on('error', err => {
        reject(err);
      });
  });
}
 
module.exports.initialize = initialize;
app.use(bodyParser.json());                                     //!
app.use(bodyParser.urlencoded({extended: true}));               //!
app.use(express.static('./public'))                                     //!!

app.get('/:id', async (req, res) => {                                            //!
  var sql = `SELECT item_id, item_name, item_size FROM ` + req.params.id;
  var result = await database.simpleExecute(sql, {});

  res.send(result.rows);
});

app.get('/artists/:id', async function (req, res) {                                   //!
  const result = await database.simpleExecute(`SELECT item_id, item_name, item_size FROM items WHERE item_id = :idbv`, [req.params.id], { maxRows:1 });
  res.send(result.rows[0]);
})

app.put('/artists/:id', function(req, res) {                                        //!
  //database.simpleExecute('SELECT item_id, item_name from items where item_id = ' + Number(req.params.id) + '');
  console.log(req.params);
  var artist = artists.find(function (artist1) {
    return artist1.id === Number(req.params.id)
  });
  artist.name = req.body.name;
  res.send(artist);
})

app.delete('/artists/:id', function (req, res) {                                    //!
  artists = artists.filter( function (artist) {
    return artist.id !== Number(req.params.id);
  });
  res.send(artists);
}) 

function close() {
  return new Promise((resolve, reject) => {
    httpServer.close((err) => {
      if (err) {
        reject(err);
        return;
      }
 
      resolve();
    });
  });
}
 
module.exports.close = close;