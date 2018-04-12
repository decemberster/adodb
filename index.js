'use strict';

const Connection = require('./connection');
const Pool = require('./pool');

function Adodb() {
    this.createConnection = function(connectionString) {
        return new Connection(connectionString);
    };

    this.createPool = function(connectionString) {
        return new Pool(connectionString);
    };
}

module.exports = new Adodb();
