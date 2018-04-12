'use strict';

const path = require('path');
const mdbPath = path.resolve(__dirname + '/test/media/Northwind2003.mdb');
const connStr = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + mdbPath;

const ADODB = require('./index');

const pool = ADODB.createPool(connStr);


pool.query('SELECT * FROM Categories;', (err, data) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log(data);
    }

    pool.end();
});

