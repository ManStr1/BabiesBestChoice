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

app.get('/:category_name', async function(req, res) {

  var sql = `SELECT category_name FROM categories WHERE category_name = :c`;
  var find_category = await database.simpleExecute(sql, [req.params.category_name], {});

  sql = `SELECT category_name FROM categories`;
  var categories = await database.simpleExecute(sql, {});

  if (find_category.rows[0] == null) {

    var message = "Page Not Found";
    res.render('not_found', {categories: categories.rows, message: message});

  } else {
    var sql = `SELECT item_name, item_price, producer_name, category_name, articul 
    FROM items NATURAL JOIN categories NATURAL JOIN producers 
    WHERE category_name = :c 
    GROUP BY (item_name, item_price, category_name, producer_name, articul)`;

    var items_by_category = await database.simpleExecute(sql, [req.params.category_name], {});

    sql = `SELECT item_articul, image_name FROM images`;
    var images = await database.simpleExecute(sql, {});

    res.render('items_by_category', {items: items_by_category.rows, categories: categories.rows, images: images.rows, message: ""});
  }

})   

app.get('/:category_name/:item_articul', async function(req, res) {

  var sql = `SELECT * FROM articuls WHERE articul_name = :c`;
  var find_item = await database.simpleExecute(sql, [req.params.item_articul], {});

  sql = `SELECT category_name FROM categories`;
  var categories = await database.simpleExecute(sql, {});

  if (find_item.rows[0] == null) {

    var message = "Page Not Found";
    res.render('not_found', {categories: categories.rows, message: message});

  } else {

    sql = `SELECT item_name, item_description, item_price, item_number, articul 
              FROM items 
              WHERE category_id = (SELECT category_id FROM categories WHERE category_name = :c) 
                    AND articul = :v`;

    var item = await database.simpleExecute(sql, [req.params.category_name, req.params.item_articul], {});

    sql = `SELECT IMAGE_NAME FROM IMAGES WHERE ITEM_ARTICUL = :c`;
    var images = await database.simpleExecute(sql, [req.params.item_articul],{});

    sql = `SELECT item_size FROM items NATURAL JOIN categories WHERE articul = :c AND category_name = :v GROUP BY item_size ORDER BY item_size`;
    var sizes = await database.simpleExecute(sql, [req.params.item_articul, req.params.category_name], {});

    sql = `SELECT item_color FROM items NATURAL JOIN categories WHERE articul = :c AND category_name = :v GROUP BY item_color`;
    var colors = await database.simpleExecute(sql, [req.params.item_articul, req.params.category_name], {});

    res.render('item', {items: item.rows, categories: categories.rows , images: images.rows, sizes: sizes.rows, colors: colors.rows});
  }

})

app.post('/search_result', async function(req, res) {

  sql = `SELECT category_name FROM categories`;
  var categories = await database.simpleExecute(sql, {});

  if (req.body.search_item == "") res.render('index.ejs', {categories: categories.rows});
  else {

    var sql = `SELECT item_name, item_price, category_name, producer_name, articul
    FROM items NATURAL JOIN categories NATURAL JOIN producers 
    WHERE LOWER(item_name) LIKE LOWER(:c)
    GROUP BY (item_name, item_price, category_name, producer_name, articul)`;

    var items = await database.simpleExecute(sql, ['%' + req.body.search_item + '%'], {});
    
    if (items.rows[0] == null) {

      var message = "No results for \"" + req.body.search_item + "\".";
      res.render('not_found', {categories: categories.rows, message: message});

    } else {

      var message = "Results on \"" + req.body.search_item + "\" search";
  
      sql = `SELECT item_articul, image_name FROM images WHERE item_articul = ANY(SELECT articul FROM items WHERE LOWER(item_name) LIKE LOWER(:c))`;
      var images = await database.simpleExecute(sql, ['%' + req.body.search_item + '%'], {});
  
      res.render('items_by_category', { items: items.rows, categories: categories.rows, images: images.rows, message: message});

    }

  }
  
})

app.get('/:c/:v/*', async function(req, res) {
  sql = `SELECT category_name FROM categories`;
  var categories = await database.simpleExecute(sql, {});

  var message = "Page Not Found";
  res.render('not_found', {categories: categories.rows, message: message});
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