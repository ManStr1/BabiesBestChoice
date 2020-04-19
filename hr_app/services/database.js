const oracledb = require('oracledb');
const dbConfig = require('../config/database.js');
 
async function initialize() {
  const pool = await oracledb.createPool(dbConfig.hrPool);
}
 
module.exports.initialize = initialize;

async function close() {
  await oracledb.getPool().close();
}
 
module.exports.close = close;

function simpleExecute(statement, binds = [], opts = {}) {
  return new Promise(async (resolve, reject) => {
    let conn;
 
    opts.outFormat = oracledb.OBJECT;
    opts.autoCommit = true;
 
    try {
      conn = await oracledb.getConnection();
 
      const result = await conn.execute(statement, binds, opts);

      console.log(result.metaData); // [ { name: 'ITEM_ID' }, { name: 'ITEM_NAME' }, { name: 'ITEM_SIZE' } ]
      console.log(result.rows);     // [ [ '1,2..', 'водолазка', '100' ] ]

      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          console.log(err);
        }
      }
    }
  });
}
 
module.exports.simpleExecute = simpleExecute;

function insertExecute(statement, binds = [], opts = {}) {
  return new Promise(async (resolve, reject) => {
    let conn;
 
    opts.autoCommit = true;
 
    try {
      conn = await oracledb.getConnection();
 
      const result = await conn.execute(statement, binds, opts);

      console.log(result.rowsAffected);

      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      if (conn) {
        try {
          await conn.close();
        } catch (err) {
          console.log(err);
        }
      }
    }
  });
}
 
module.exports.insertExecute = insertExecute;