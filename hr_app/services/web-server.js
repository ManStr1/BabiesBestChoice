const http = require('http');
const express = require('express');
const webServerConfig = require('../config/web-server.js');
const database = require('./database.js');
const morgan = require('morgan');
const bodyParser = require('body-parser');                                       
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

app.use(bodyParser.json());                                     
app.use(bodyParser.urlencoded({extended: true}));               
app.use(express.static('./public'))                                     
app.set('view engine', 'ejs');



app.get('/', async function (req, res) {
  var sql = `SELECT category_name FROM categories`;
  var categories = await database.simpleExecute(sql, {});
  res.render('index', { categories: categories.rows });
})

app.get('/categories/:category_name', async function(req, res) {

  var sql = `SELECT item_name, item_price, producer_name, articul FROM items NATURAL JOIN categories NATURAL JOIN producers 
              WHERE category_name = :c 
              GROUP BY (item_name, item_price, producer_name, articul)`;

  var items_by_category = await database.simpleExecute(sql, [req.params.category_name], {});


  var sql2 = `SELECT category_name FROM categories`;
  var categories = await database.simpleExecute(sql2, {});

  var sql3 = `SELECT ITEM_ARTICUL, IMAGE_NAME FROM IMAGES`;
  var images = await database.simpleExecute(sql3, {});

  res.render('items_by_category', {items: items_by_category.rows, categories: categories.rows, images: images.rows});
  
})   

app.get('/categories/:category_name/:item_articul', async function(req, res) {
  
  var sql = `SELECT item_name, item_description, item_price, item_size, item_number, item_color FROM items NATURAL JOIN categories WHERE articul = :c AND category_name = :v`;
  var item = await database.simpleExecute(sql, [req.params.item_articul, req.params.category_name], {});

  var sql2 = `SELECT category_name FROM categories`;
  var categories = await database.simpleExecute(sql2, {});

  var sql3 = `SELECT IMAGE_NAME FROM IMAGES WHERE ITEM_ARTICUL = :c`;
  var images = await database.simpleExecute(sql3, [req.params.item_articul],{});

  res.render('item', {items: item.rows, categories: categories.rows , images: images.rows})

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