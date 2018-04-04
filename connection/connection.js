'use strict';
let debug = require('debug')('adodb:connection');

const config = require('../config');

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const getProvider = require('../provider');

const parseField = require('./speedup/parseField');
const parseDateFn = require('./speedup/parseDateFn');

const queryFormat = require('./utils').queryFormat;
const stripComments = require('sql-strip-comments');

const eventemitter = require('events').EventEmitter;
const util = require('util');

let states = ['ERROR', 'STARTING', 'READY', 'FIELDS', 'RECORDS', 'LOCALS'].reduce((prev, cur) => {
    prev[cur] = cur;
    return prev;
}, {});

util.inherits(Connection, eventemitter);

function Connection(connectionString) {
    if (!(this instanceof Connection)) {
        throw new Error("Connection w/o new");
    }
    eventemitter.call(this);

    this._connStr = connectionString;
    //this._rlStream = null;

    this._fConnected = false;
    this._endString = config.endString;
    this._errorString = config.errorString;

    this._locals = null;

    this._state = states.STARTING;
    this._lines_arr = [];

    this._fields = null;
    this._recordsStr = null;

    this._queryLock = false;
    this._queryQueue = [];
    this._queryCallback = null;
    this._querySql = null;

    this._fEnding = false;
    this._fConnecting = false;
    this._fReady = false;
}

function Record() {}

Connection.prototype.isIdle = function() {
    const self = this;

    return !self._queryLock && self._fConnected;
};

Connection.prototype._parseRecordsStr = function() {
    const self = this;

    let fields = self._fields;
    let values = self._recordsStr.split('\t');
    values.length = values.length - 1; // last elem always empty

    console.assert(values.length % fields.length === 0);

    let records = [];
    let parseDateTimeFn = parseDateFn(self._locals.sShortDate, self._locals.sTimeFormat);

    let curValueIndex = 0;
    while (curValueIndex < values.length) {
        let record = new Record();
        for (let fieldIndex = 0; fieldIndex < fields.length; fieldIndex++) {
            record[fields[fieldIndex]['Name']] = parseField(
                fields[fieldIndex],
                values[curValueIndex],
                self._locals.sDecimal,
                parseDateTimeFn
            );

            curValueIndex++;
        }
        records.push(record);
    }

    self._records = records;
};

Connection.prototype._setLocals = function(locals) {
    const self = this;

    self._locals = locals;
    debug('set locals: %j', self._locals);

    self._provider.codepageANSI = self._locals.ACP;
    self._provider.codepageOEM = self._locals.OEMCP;
};

Connection.prototype._setState = function(state) {
    const self = this;
    if (self._state !== state) {
        self._lines_arr.length = 0;
        self._state = state;
        debug('set state: %s', self._state);
    }
};

Connection.prototype._step = function(line) {
    const self = this;

    if (line === self._errorString) {
        self._setState(states.ERROR);
        return;
    }

    switch (self._state) {
        case states.ERROR:
            if (line === self._endString) {
                let err = new Error(self._lines_arr.join('\n').trim());
                if (self._queryCallback) {
                    self._queryCallback(err);
                    self._queryCallback = null;
                }
                self.destroy();

                //FIXME непонятно, можно ли убрать
                //self.emit('error', err);
                return;
            }
            break;
        case states.STARTING:
            if (line === 'LOCALS') {
                self._setState(states.LOCALS);
                return;
            }
            break;
        case states.LOCALS:
            if (line === self._endString) {
                self._setLocals(JSON.parse(self._lines_arr.join('\n')));

                self._fReady = true;
                if (self._queryQueue.length > 0) {
                    self._execSQLfromQueue();
                    debug('LOCALS self._queryQueue.length: %d', self._queryQueue.length);
                }

                self._setState(states.READY);
                return;
            }
            break;
        case states.READY:
            if (line === states.FIELDS) {
                self._setState(states.FIELDS);
                return;
            } else if (line === states.RECORDS) {
                self._setState(states.RECORDS);
                return;
            }
            break;
        case states.FIELDS:
            if (line === self._endString) {
                self._fields = JSON.parse(self._lines_arr.join('\n'));

                debug(states.FIELDS + ': %j', self._fields);
                self._setState(states.RECORDS);
                return;
            }
            break;
        case states.RECORDS:
            if (line === self._endString) {
                self._recordsStr = self._lines_arr.join('\n');
                debug(states.RECORDS + ': %s', JSON.stringify(self._recordsStr.split('\t')).slice(0, 1000));

                self._parseRecordsStr();
                // console.log(states.RECORDS + ': parsed: ', self._records);
                if (self._queryCallback) {
                    self._queryCallback(null, self._records, self._fields);
                    self._records = null;
                }

                if (self._queryQueue.length > 0) {
                    self._execSQLfromQueue();
                    debug('RECORDS self._queryQueue.length: %d', self._queryQueue.length);
                } else {
                    self._queryLock = false;

                    if (self._fEnding) {
                        if (self._provider.writable) self._provider.write(self._endString + '\n');
                        self._fConnected = false;
                    }
                }
                self._setState(states.READY);
                return;
            }
            break;
        default:
    }

    // Если строка не обработана, то накапливаем в массиве
    self._lines_arr.push(line);
};

Connection.prototype._execSQLfromQueue = function() {
    const self = this;

    debug('execSQLfromQueue self._queryQueue.length: %d', self._queryQueue.length);

    console.assert(self._queryQueue.length > 0);

    let query = self._queryQueue.pop();
    self._querySql = query.sql;
    self._queryCallback = query.callback;

    self._sendSQL(query.sql);
};

Connection.prototype._sendSQL = function(sql) {
    debug('send sql: %s', sql);
    const self = this;
    self._provider.write('SQL\n');

    self._provider.write(sql + '\n');
    self._provider.write(self._endString + '\n');

    self._queryLock = true;
};

Connection.prototype._readLine = function(line) {
    const self = this;
    self._step(line);

    debug('line: %s', line.slice(0, 100));
};

Connection.prototype.query = function (sql, values, callback) {
    debug('query, sql: %s', sql);
    const self = this;

    if (arguments.length === 2) {
        callback = values;
        values = null;
    }

    if (sql.slice(-4).toLowerCase() === '.sql') {
        sql = path.resolve(sql);
        fs.readFile(sql,'utf8', (err, sqlText) => {
            if (err) return callback(err);

            self.query(sqlText, values, callback)
        });
        return;
    }

    sql = stripComments(sql);
    sql = queryFormat(sql, values);

    debug('SQL: %s', sql);

    if (self._fEnding) {
        let err = new Error('Ending connection can not query');
        return callback(err);
    }

    if (self._fConnected) {
        if (self._queryLock || !self._fReady || self._queryQueue.length > 0) {
            self._queryQueue.unshift({sql: sql, callback: callback});
            debug('query enqueue, sql: %s, self._queryQueue.length: %d', sql, self._queryQueue.length);
        } else {
            self._querySql = sql;
            self._queryCallback = callback;

            self._sendSQL(sql);
        }
    } else {
        self._queryQueue.unshift({sql: sql, callback: callback});
        debug('query enqueue, sql: %s, self._queryQueue.length: %d', sql, self._queryQueue.length);

        if (!self._fConnecting) {
            self.connect((err) => {
                if (err) {
                    debug('ERROR');

                    //FIXME непонятно, можно ли убрать
                    //self.destroy();
                }
            });
        }
    }
};

Connection.prototype.destroy = function() {
    debug('destroy');
    const self = this;

    self.destroyed = true;

    if (self._fConnected || self._fConnecting) {
        self._provider.kill();
        self._fConnected = false;

        if (self._queryCallback) {
            let err = new Error('Connection was destroyed while executing sql: ' + self._querySql);
            self._queryCallback(err);
        }

        while (self._queryQueue.length > 0) {
            let query = self._queryQueue.pop();
            let err = new Error('Connection was destroyed before execution of sql: ' + query.sql);
            query.callback(err);
        }
    }
};

// gracefully close connection
Connection.prototype.end = function() {
    const self = this;
    debug('end');

    setImmediate(() => {
        self._fEnding = true;
        if (self._fConnected) {
            if (self._queryQueue.length === 0 && !self._queryLock) {
                if (self._provider.writable) self._provider.write(self._endString + '\n');
            }
        }
    });
};

// function NOP() {}

Connection.prototype.connect = function(callback) {
    debug('connect');
    const self = this;

    self._fConnecting = true;

    getProvider(
        {
            connString: self._connStr,
            endString: self._endString,
            errorString: self._errorString
        },
        (err, provider) => {
            debug('getProvider');
            if (err) return callback(err);

            self._provider = provider;

            self._provider
                .on('error', err => {
                    debug('provider error: %s', err.message);

                    //FIXME непонятно, можно ли убрать
                    //self.emit('error', err);
                })
                .on('close', (code, signal) => {
                    debug('provider close, code: %s, signal: %s', code, signal);
                    if (code !== 0 && self._lines_arr.length > 0) {
                        console.log('stdOut:\n', self._lines_arr.join('n'));
                    }
                    self.emit('close', code);
                    self._fConnected = false;
                });

            self._rlStream = readline
                .createInterface({
                    input: self._provider
                })
                .on('line', line => {
                    self._readLine(line);
                });

            process.nextTick(() => {
                debug('start');
                self._fConnecting = false;
                self._fConnected = true;

                self.emit('open');
                callback(null, self);
            });
        }
    );
};

module.exports = Connection;

//TODO options allowComments, multipleStatements, speedUp ( Recordset.GetString() instead of Recordset.MoveNext() );

//TODO кроме records, возвращать fields;

//TODO считать время выполнения запроса;

//TODO корректную обработку синтаксических ошибок.
// Сейчас в случае синтаксической ошибки в запросе Сore останавливается, а соответсвующий Сonnection не значет об этом
