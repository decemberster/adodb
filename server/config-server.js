'use strict';
const path = require('path');

let filePath = path.resolve(__dirname + '/../test/media/Northwind2003.mdb');

module.exports = {
    connString: 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + filePath
};