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
  var sql = `SELECT item_name, item_description, item_price, item_size, item_color FROM items NATURAL JOIN categories WHERE category_name = :c`;
  var items_by_category = await database.simpleExecute(sql, [req.params.category_name], {});
  res.render('items_by_category', {items: items_by_category.rows});
})   

app.get('/items', async (req, res) => {                                            
  var sql = `SELECT item_id, item_name, item_size FROM items`;
  var result = await database.simpleExecute(sql, {});

  res.send(result.rows);
});

app.get('/items/:id', async function (req, res) {                                  
  const result = await database.simpleExecute(`SELECT item_id, item_name, item_size FROM items WHERE item_id = :idbv`, [req.params.id], { maxRows:1 });
  res.send(result.rows[0]);
})

app.post('/users', (req, res) => {
  const user_name = req.body.create_user_name;
  const user_password = req.body.create_user_password;

  const result = database.simpleExecute(`INSERT INTO users(user_name, user_password) VALUES (:a, :b)`, [user_name, user_password], {});

  res.send(result);
})

app.get('/users', async (req, res) => {                                            
  var sql = `SELECT user_id, user_name, user_password, user_role FROM users`;
  var result = await database.simpleExecute(sql, {});

  res.render('users', { title: 'User Details', items: result.rows});
});



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