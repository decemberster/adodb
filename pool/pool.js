'use strict';
const debug = require('debug')('adodb:pool');

const eventemitter = require('events');
const util = require('util');
const cpuCount = require('os').cpus().length;
debug('cpuCount: %s', cpuCount);

const Connection = require('../connection');

util.inherits(Pool, eventemitter);
function Pool(connectionString, opts) {
    eventemitter.call(this);

    const self = this;

    self._connectionString = connectionString;
    self._o = opts || {};

    self._o.ttl = self._o.ttl || 15000; // milliseconds, connection time to live after release;
    self._o.maxConnectionsCount = self._o.maxConnectionsCount || 16; //cpuCount;

    //milliseconds, workaround for https://support.microsoft.com/en-us/kb/274211
    //FIXME непонятно, можно ли убрать
    //self._o.minConnectionCreationInterval = self._o.minConnectionCreationInterval || 10;

    self._idConn = 0;
    self._connCount = 0;

    self._connQueue = [];
    self._maxConnCount = self._o.maxConnectionsCount;

    self._idlePool = {};
    self._fEding = false;
}

Pool.prototype._getConnection = function(callback) {
    const self = this;
    let connection = null;

    let connectionId = null;
    for (let k in self._idlePool)
        if (self._idlePool.hasOwnProperty(k)) {
            connectionId = k;
            break;
        }

    if (connectionId) {
        let connectionInfoObj = self._idlePool[connectionId];

        clearTimeout(connectionInfoObj.suicideId);
        debug('connection reused idle');
        connection = connectionInfoObj.connection;

        delete self._idlePool[connectionId];

        return callback(null, connection);
    } else {
        self._connQueue.unshift({connCallback: callback});

        if (self._connCount < self._maxConnCount) {
            debug('connection creation');

            self._connCount++;
            connection = new Connection(self._connectionString);
            connection.on('error', err => {
                console.error('connection error:', err);
            });
            connection.connect((err, connection) => {
                if (err) return callback(err);
                self._pushConnectionIntoIdlePool(connection);
            });
        }
    }
};

Pool.prototype._getIdConn = function() {
    const self = this;
    return ++self._idConn;
};

Pool.prototype._getNewConnectionInfoObj = function(connection) {
    const self = this;
    function ConnectionInfoObj(connection) {
        this.id = self._getIdConn();
        this.connection = connection;
    }

    return new ConnectionInfoObj(connection);
};

Pool.prototype._pushConnectionIntoIdlePool = function(connection) {
    debug('_pushConnectionIntoIdlePool');
    const self = this;

    if (connection.destroyed) {
        debug('connection is destroyed now, may be because of sql syntax error');
        self._connCount--;
    } else if (self._connQueue.length > 0) {
        let connCallback = self._connQueue.pop().connCallback;
        return connCallback(null, connection);
    } else if (self._fEnding) {
        connection.end();
        self._connCount--;
    } else {
        let connectionInfoObj = self._getNewConnectionInfoObj(connection);
        self._idlePool[connectionInfoObj.id] = connectionInfoObj;
        connectionInfoObj.suicideId = setTimeout(() => {
            debug('suicide connection id: %s', connectionInfoObj.id);

            if (!connection.destroyed) {
                //TODO чтобы в случае синтаксической ошибки в sql соответствующий connection сразу же удалялся из пула
                // connection is not destroyed already because of sql syntax error
                console.assert(connection.isIdle());
                console.assert(self._idlePool[connectionInfoObj.id]);

                connection.end();
            }
            self._connCount--;

            delete self._idlePool[connectionInfoObj.id];
        }, self._o.ttl);
    }
};

Pool.prototype.query = function(sql, values, callback) {
    debug('query, sql: %s', sql);
    debug('query, values: %j', values);
    const self = this;

    if (arguments.length === 2) {
        callback = values;
        values = null;
    }

    self._getConnection((err, connection) => {
        if (err) return callback(err);
        connection.query(sql, values, (err, records, fields) => {
            if (err) debug(err.message);

            if (connection.destroyed) {
                debug('destroyed');
                // delete from pool
                let id = Object.keys(self._idlePool).find(elem => {
                    return self._idlePool[elem].connection === connection;
                });
                if (id) delete self._idlePool[id];
            } else {
                self._pushConnectionIntoIdlePool(connection);
            }

            callback(err, records, fields);
        });
    });
};

Pool.prototype.end = function() {
    debug('end');
    const self = this;

    self._fEnding = true;

    Object.keys(self._idlePool).forEach(connectionId => {
        debug('end connectionId: %s', connectionId);
        let connectionInfoObj = self._idlePool[connectionId];
        clearTimeout(connectionInfoObj.suicideId);

        connectionInfoObj.connection.end();
        self._connCount--;

        delete self._idlePool[connectionId];
    });
};

Pool.prototype.destroy = function() {
    debug('destroy');
    const self = this;

    Object.keys(self._idlePool).forEach(connectionId => {
        let connectionInfoObj = self._idlePool[connectionId];
        clearTimeout(connectionInfoObj.suicideId);
        connectionInfoObj.connection.destroy();

        delete self._idlePool[connectionId];
    });
};

module.exports = Pool;

//TODO корректная обработка ошибок.
// сейчас если при выполнении запроса возникает ошибка, то при pool.end() остается незавершенный процесс

//FIXME завершение всех connection при pool.end()
