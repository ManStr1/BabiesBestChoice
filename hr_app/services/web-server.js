const http = require('http');
const express = require('express');
const webServerConfig = require('../config/web-server.js');
const database = require('./database.js');
const morgan = require('morgan');
const bodyParser = require('body-parser');   
const fetch = require('node-fetch');                                   
const app = express();
let httpServer;
let usernames = [];



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
  var user = "";

  try {
    const ip = await fetchExam();
    user = usernames.find(item => item.ip == ip.ip);
  
  } catch (err) {
    console.log(err);
  }
  
  if (user != undefined) {

    sql = `SELECT user_role FROM users WHERE user_name = :c`;
    var roles = await database.simpleExecute(sql, [user.username], {});

    res.render('index', { categories: await getCategories(), message: "", roles: roles.rows});
  } else {
    res.render('index', { categories: await getCategories(), message: "", roles: [{USER_ROLE: ""}]});
  }
  
})

app.get('/login', function(req, res) {
  res.render('basepage', {message: ""});
})

app.post('/login', async function (req, res) {
  var sql = `SELECT user_name, user_password FROM users WHERE user_name = :c AND user_password = :d`;
  var user = await database.simpleExecute(sql, [req.body.user_name, req.body.user_password], {});

  if (user.rows[0] != null) {

    const ip = await fetchExam();
    ip.username = req.body.user_name;
    usernames.push(ip);
    console.log(usernames);

    sql = `SELECT user_role FROM users WHERE user_name = :c`;
    var roles = await database.simpleExecute(sql, [ip.username], {});

    res.render('index', {message: "You logged in", categories: await getCategories(), roles: roles.rows});

  } else {
    res.render('basepage', {message: "Incorrect login or password"});
  }
  
})

app.get('/logout', async function(req, res) {

  try {
    const ip = await fetchExam();
    var user = usernames.find(item => item.ip == ip.ip);
    var index = usernames.indexOf(user);
    console.log(usernames.splice(index, 1));
    
  } catch (err) {
    console.log(err);
  }

  res.render('index', { categories: await getCategories(), message: "", roles: [{USER_ROLE: ""}]});
})

app.get('/:category_name/:item_articul', async function(req, res) {

  var sql = `SELECT * FROM articuls WHERE articul_name = :c`;
  var find_item = await database.simpleExecute(sql, [req.params.item_articul], {});

  if (find_item.rows[0] == null) {

    var message = "Page Not Found";
    res.render('not_found', {categories: await getCategories(), message: message});

  } else {

    sql = `SELECT item_name, item_description, item_price, item_number, articul 
              FROM items 
              WHERE category_id = (SELECT category_id FROM categories WHERE category_name = :c) 
                    AND articul = :v`;

    var item = await database.simpleExecute(sql, [req.params.category_name, req.params.item_articul], {});

    sql = `SELECT image_name FROM images WHERE ITEM_ARTICUL = :c`;
    var images = await database.simpleExecute(sql, [req.params.item_articul],{});

    sql = `SELECT item_size FROM items NATURAL JOIN categories WHERE articul = :c AND category_name = :v GROUP BY item_size ORDER BY item_size`;
    var sizes = await database.simpleExecute(sql, [req.params.item_articul, req.params.category_name], {});

    sql = `SELECT item_color FROM items NATURAL JOIN categories WHERE articul = :c AND category_name = :v GROUP BY item_color`;
    var colors = await database.simpleExecute(sql, [req.params.item_articul, req.params.category_name], {});

    res.render('item', {items: item.rows, categories: await getCategories(), images: images.rows, sizes: sizes.rows, colors: colors.rows});
  }

})

app.post('/search_result', async function(req, res) {

  if (req.body.search_item == "") res.render('index.ejs', {categories: await getCategories()});
  else {

    var sql = `SELECT item_name, item_price, category_name, producer_name, articul
    FROM items NATURAL JOIN categories NATURAL JOIN producers 
    WHERE LOWER(item_name) LIKE LOWER(:c)
    GROUP BY (item_name, item_price, category_name, producer_name, articul)`;

    var items = await database.simpleExecute(sql, ['%' + req.body.search_item + '%'], {});
    
    if (items.rows[0] == null) {

      var message = "No results for \"" + req.body.search_item + "\".";
      res.render('not_found', {categories: await getCategories(), message: message});

    } else {

      var message = "Results on \"" + req.body.search_item + "\" search";
  
      sql = `SELECT item_articul, image_name FROM images WHERE item_articul = ANY(SELECT articul FROM items WHERE LOWER(item_name) LIKE LOWER(:c))`;
      var images = await database.simpleExecute(sql, ['%' + req.body.search_item + '%'], {});
  
      res.render('items_by_category', { items: items.rows, categories: await getCategories(), images: images.rows, message: message, panel: false});

    }

  }
  
})

app.get('/admin_menu', async function(req, res) {

  try {
    const ip = await fetchExam();
    user = usernames.find(item => item.ip == ip.ip);
  } catch (err) {
    console.log(err);
  }

  if (user != undefined) {

    var sql =`SELECT * FROM categories`;
    var categories = await database.simpleExecute(sql, {});

    var sql = `SELECT user_role FROM users WHERE user_name = :c`;
    result = await database.simpleExecute(sql, [user.username], {});

    if (result.rows[0].USER_ROLE == "Admin") {
 
      sql = `SELECT * FROM view_items`;
      var items = await database.simpleExecute(sql, {});

      sql = `SELECT articul, item_size FROM items GROUP BY (articul, item_size)`;
      var items_size = await database.simpleExecute(sql, {});
      
      sql = `SELECT articul, item_color FROM items GROUP BY (articul, item_color)`;
      var items_color = await database.simpleExecute(sql, {});

      sql = `SELECT * FROM producers`;
      var producers = await database.simpleExecute(sql, {});

      sql = `SELECT articul_name FROM articuls`;
      var articuls = await database.simpleExecute(sql, {});

      sql = `SELECT item_articul, image_name FROM images ORDER BY image_name DESC`;
      var images = await database.simpleExecute(sql, {});

      sql = `SELECT user_id, user_name, user_role FROM users`;
      var users = await database.simpleExecute(sql, {});

      sql = `SELECT user_role FROM users GROUP BY user_role`;
      var roles = await database.simpleExecute(sql, {});

      res.render('admin_page', {items: items.rows, items_size: items_size.rows, items_color: items_color.rows, 
                          categories: categories.rows, producers: producers.rows, articuls: articuls.rows, 
                          images: images.rows, users: users.rows, roles: roles.rows});
    } else {

      var message = "This category is empty or not found";
      res.render('not_found', {categories: await getCategories(), message: message});

    }
  } else {

    var message = "This category is empty or not found";
    res.render('not_found', {categories: await getCategories(), message: message});
  }
})

app.post('/create_item', async function(req, res) {

  if (req.body.articul != "" && req.body.name != "" && 
      req.body.description != "" && req.body.price != "" && 
      req.body.size != "" && req.body.number != "" && 
      req.body.discount != "" && req.body.color != "" && 
      req.body.category != "" && req.body.producer != "") { 
        
        sql = `SELECT articul_name FROM articuls WHERE articul_name = :c`;
        var articul = await database.simpleExecute(sql, [req.body.articul], {});
      
        if (articul.rows[0] == null) {
      
            sql = `INSERT INTO ARTICULS(ARTICUL_NAME) VALUES (:c)`;
            articul = await database.simpleExecute(sql, [req.body.articul], {});
            console.log("Articul created " + articul);
      
            sql = `SELECT articul_name FROM articuls WHERE articul_name = :c`;
            articul = await database.simpleExecute(sql, [req.body.articul], {});


            sql = `SELECT category_id FROM categories WHERE category_name = :c`;
            var category = await database.simpleExecute(sql, [req.body.category], {});
          
            if (category.rows[0] == null) {
              sql = `INSERT INTO CATEGORIES(CATEGORY_NAME) VALUES (:c)`;
              category = await database.simpleExecute(sql, [req.body.category], {});
              console.log("Category created: ");
              console.log(category);
          
              sql = `SELECT category_id FROM categories WHERE category_name = :c`;
              category = await database.simpleExecute(sql, [req.body.category], {});
          
            } else {
              console.log("Category already exist");
            }
          
            sql = `SELECT producer_id FROM producers WHERE producer_name = :c`;
            var producer = await database.simpleExecute(sql, [req.body.producer], {});
          
            if (producer.rows[0] == null) {
              sql = `INSERT INTO PRODUCERS(PRODUCER_NAME) VALUES (:c)`;
              producer = await database.simpleExecute(sql, [req.body.producer], {});
              console.log("Producer created: ");
              console.log(producer);
          
              sql = `SELECT producer_id FROM producers WHERE producer_name = :c`;
              producer = await database.simpleExecute(sql, [req.body.producer], {});
          
            } else {
              console.log("Producer already exist");
            }
          
            var sizes = req.body.size.split(",");
          
            for (size of sizes) {
              sql = `INSERT INTO ITEMS(ITEM_NAME, ITEM_DESCRIPTION, ITEM_PRICE, ITEM_SIZE, ITEM_NUMBER, ITEM_DISCOUNT, ITEM_COLOR, CATEGORY_ID, PRODUCER_ID, ARTICUL) 
                      VALUES (:a, :b, :c, :d, :e, :f, :g, :h, :i, :j)`;
              
              var result = await database.simpleExecute(sql, [req.body.name, req.body.description, req.body.price, 
                                                              size, req.body.number, req.body.discount, req.body.color, category.rows[0].CATEGORY_ID, 
                                                            producer.rows[0].PRODUCER_ID, articul.rows[0].ARTICUL_NAME]);
              console.log(result);

            }

            res.render('not_found', {categories: await getCategories(), message: "Done!"});
          
        } else {
      
          var message = "This articul is already used";
          res.render('not_found', {categories: await getCategories(), message: message});
        }
      
  } else {
    res.render('not_found', {categories: await getCategories(), message: "Not all fields filled"});
  }

})

app.post('/change_user', async function(req, res) {

  if (req.body.userid != "") {
    var sql = `UPDATE users SET user_role = :c WHERE user_id = :d`;
    var result = await database.simpleExecute(sql, [req.body.userrole, req.body.userid], {});
    console.log(result); 
    res.render('not_found', {categories: await getCategories(), message: "Done!"});
  } else {
    res.render('not_found', {categories: await getCategories(), message: "Id incorrect"});
  }
  
})

app.post('/create_images', async function(req, res) {
  console.log(req.body.itemarticul);
  console.log(req.body.itemimages);

  var images = req.body.itemimages.split(",");

  if (req.body.itemarticul != "" && req.body.itemimages != "") {

    for (var image of images) {
      var sql = `INSERT INTO images(ITEM_ARTICUL, IMAGE_NAME) VALUES (:c, :v)`;
      var result = await database.simpleExecute(sql, [req.body.itemarticul, image], {});
      console.log(result); 
    }
    
    res.render('not_found', {categories: await getCategories(), message: "Done!"});
  } else {
    res.render('not_found', {categories: await getCategories(), message: "Id incorrect"});
  }
  
})

app.post('/delete_item', async function(req, res) {

  if (req.body.itemarticul != "") {
    var sql = `DELETE FROM items WHERE articul = :c`;
    var result = await database.simpleExecute(sql, [req.body.itemarticul], {});

    sql = `DELETE FROM images WHERE item_articul = :c`
    result = await database.simpleExecute(sql, [req.body.itemarticul],{});

    sql = `DELETE FROM articuls WHERE articul_name = :c`;
    result = await database.simpleExecute(sql, [req.body.itemarticul],{});
    console.log(result);

    res.render('not_found', {categories: await getCategories(), message: "Done!"});
  } else {
    res.render('not_found', {categories: await getCategories(), message: "Id incorrect"});
  }
  
})

app.get('/:category_name', async function(req, res) {

  var sql = `SELECT category_name FROM categories WHERE category_name = :c`;
  var find_category = await database.simpleExecute(sql, [req.params.category_name], {});

  if (find_category.rows[0] == null) {

    var message = "This category is empty or not found";
    res.render('not_found', {categories: await getCategories(), message: message});

  } else {
    var sql = `SELECT item_name, item_price, producer_name, category_name, articul 
    FROM items NATURAL JOIN categories NATURAL JOIN producers 
    WHERE category_name = :c 
    GROUP BY (item_name, item_price, category_name, producer_name, articul)`;

    var items_by_category = await database.simpleExecute(sql, [req.params.category_name], {});

    if (items_by_category.rows[0] == null) {
      res.render('not_found', {categories: await getCategories(), message:"This category is empty or not found"});
    } else {
      sql = `SELECT item_articul, image_name FROM images`;
      var images = await database.simpleExecute(sql, {});
  
      res.render('items_by_category', {items: items_by_category.rows, categories: await getCategories(), images: images.rows, message: "", panel: true});
    }

    
  }

})   

app.post('/:category_name', async function(req, res) {

  var sql = `SELECT * FROM items WHERE category_id = (SELECT category_id FROM categories WHERE category_name = :c )`;
  var find_category = await database.simpleExecute(sql, [req.params.category_name], {});

  if (find_category.rows[0] != null) {

    var sort_size = req.body.sort_size;
    var sort_price_from = req.body.sort_price_from;
    var sort_price_to = req.body.sort_price_to;

    if (sort_size == "") sort_size= "*";
    if (sort_price_from == "") sort_price_from = 1;
    if (sort_price_to == "") sort_price_to = 300000;

    var new_sql = `SELECT item_name, item_price, producer_name, category_name, articul 
    FROM items NATURAL JOIN categories NATURAL JOIN producers
    WHERE category_name = :c `;

    sql = `SELECT item_articul, image_name FROM images`;
    var images = await database.simpleExecute(sql, {}); 

    var items;

    if (sort_size == "*") {

      new_sql += `AND item_price BETWEEN :f AND :t GROUP BY (item_name, item_price, category_name, producer_name, articul)`;

      if (req.body.radio == 'price_up') new_sql += ` ORDER BY item_price ASC`;
      else if (req.body.radio == 'price_down') new_sql += ` ORDER BY item_price DESC`;

      items = await database.simpleExecute(new_sql, [req.params.category_name, sort_price_from, sort_price_to], {});

      if (items.rows[0] == null) {

        var message = "No results for price between " + sort_price_from + " and " + sort_price_to;
        res.render('not_found', {categories: await getCategories(), message: message});

      } else {

        var message = "Results for price between " + sort_price_from + " and " + sort_price_to;
        res.render('items_by_category', {items: items.rows, categories: await getCategories(), images:images.rows, message: message, panel: true});  

      }

    } else {
      
      new_sql += `AND item_size = :s AND item_price BETWEEN :f AND :t GROUP BY (item_name, item_price, category_name, producer_name, articul)`;

      if (req.body.radio == 'price_up') new_sql += ` ORDER BY item_price ASC`;
      else if (req.body.ratio == 'price_down') new_sql += ` ORDER BY item_price DESC`;
      
      items = await database.simpleExecute(new_sql, [req.params.category_name, sort_size, sort_price_from, sort_price_to], {});

      if (items.rows[0] == null) {

        var message = "No results for \"" + sort_size + "\" size, and price between " + sort_price_from + " and " + sort_price_to;
        res.render('not_found', {categories: await getCategories(), message: message});

      } else {

        var message = "Results for \"" + sort_size + "\" size, and price between " + sort_price_from + " and " + sort_price_to;
        res.render('items_by_category', {items: items.rows, categories: await getCategories(), images:images.rows, message: message, panel: true});  

      }
      
    } 
    
  } else {
    var message = "This category is empty or not found";
    res.render('not_found', {categories: await getCategories(), message: message});
  }

})

app.get('/:c/:v/*', async function(req, res) {
  var message = "Page Not Found";
  res.render('not_found', {categories: await getCategories(), message: message});
})

async function fetchExam() {
  try {
      const response = await fetch(`https://api.ipify.org/?format=json`, {
          method: 'GET',
          credentials: 'same-origin'
      });
      const exam = await response.json();
      return exam;
  } catch (error) {
      console.error(error);
  }
}

async function getCategories() {
  var sql = `SELECT category_name FROM categories WHERE category_id = ANY(SELECT category_id FROM items GROUP BY category_id HAVING COUNT(articul) > 0)`;
  var categories = await database.simpleExecute(sql, {});

  return categories.rows;
}

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