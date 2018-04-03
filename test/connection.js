'use strict';

const assert = require('assert');
const path = require('path');

const mdbPath = path.resolve(__dirname + '/media/Northwind2003.mdb');
const connStr = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + mdbPath;

describe('Pool', function() {
    it('Pool создается и уничтожается', function() {
        const Pool = require('../pool/pool');
        let options = {
            ttl: 15000, // connection time to leave after release
            maxConnectionsCount: 16
        };

        let pool = new Pool(connStr, options);
        pool.end();
    });

    it('Pool выполняет sql-запрос', function(done) {
        const Pool = require('../pool/pool');
        let options = {
            ttl: 15000, // time to leave after connection release
            maxConnectionsCount: 16
        };

        let pool = new Pool(connStr, options);
        pool.query('SELECT 1+1 AS NUM;', (err, data) => {
            if (err) {
                done(err);
            } else {
                let fErr = false;
                try {
                    assert.deepEqual(data, [{NUM: 2}]);
                } catch (err) {
                    fErr = true;
                    done(err);
                }
                if (!fErr) done(null);
            }
            pool.end();
        });
    });
});

describe('Connection', function() {
    it('parseDateFn правильно парсит даты', function() {
        const parseDateFn = require('../connection/speedup/parseDateFn');

        let d1, d2;

        d1 = parseDateFn('yyyy-MM-dd', 'H:m:s')('2018-01-05 12:34:56').toString();
        d2 = new Date('2018-01-05 12:34:56').toString();
        assert.equal(d1, d2);

        d1 = parseDateFn('dd-MM-yyyy', 'H:m:s')('05-01-2018 12:34:56').toString();
        d2 = new Date('2018-01-05 12:34:56').toString();
        assert.equal(d1, d2);

        d1 = parseDateFn('dd/MM/yyyy', 'H:m:s')('05/01/2018 12:34:56').toString();
        d2 = new Date('2018-01-05 12:34:56').toString();
        assert.equal(d1, d2);

        d1 = parseDateFn('dd.MM.yyyy', 'H:m:s')('05.01.2018 12:34:56').toString();
        d2 = new Date('2018-01-05 12:34:56').toString();
        assert.equal(d1, d2);

        d1 = parseDateFn('MM.dd.yyyy', 'H:m:s')('01.05.2018 12:34:56').toString();
        d2 = new Date('2018-01-05 12:34:56').toString();
        assert.equal(d1, d2);

        d1 = parseDateFn('MM-dd-yyyy', 'H:m:s')('01-05-2018 12:34:56').toString();
        d2 = new Date('2018-01-05 12:34:56').toString();
        assert.equal(d1, d2);

        d1 = parseDateFn('MM/dd/yyyy', 'H:m:s')('01/05/2018 12:34:56').toString();
        d2 = new Date('2018-01-05 12:34:56').toString();
        assert.equal(d1, d2);

        d1 = parseDateFn('MM\dd\yyyy', 'H:m:s')('01\\05\\2018 12:34:56').toString();
        d2 = '01\\05\\2018 12:34:56'; // can`t parse this format
        assert.equal(d1, d2);
    });

    it('Connection создается и уничтожается', function() {
        const Connection = require('../connection/connection');

        let connection = new Connection(connStr);

        connection.connect((err, connection) => {
            if (err) return console.error(err.message);

            connection.end();
        });
    });

    it('Правильно выполняется SQL-запрос с integer, string, float', function(done) {
        const Connection = require('../connection/connection');

        let connection = new Connection(connStr);

        connection.query('SELECT 2*2 AS intValue, "string" AS strValue, 3.14151926 AS floatValue;', (err, data) => {
            if (err) return done(err);

            try {
                assert.deepEqual(data, [{floatValue: 3.14151926, intValue: 4, strValue: 'string'}]);
            } catch (err) {
                connection.end();
                return done(err);
            }
            connection.end();
            done(null);
        });
    });

    it('Правильно выполняется SQL-запрос с datetime', function(done) {
        const Connection = require('../connection/connection');

        let connection = new Connection(connStr);

        connection.query('SELECT #2018-01-01 00:00:00# AS dateValue;', (err, data) => {
            if (err) return done(err);

            try {
                assert.deepEqual(data[0]['dateValue'].getTime(), new Date('2018-01-01 00:00:00').getTime());
            } catch (err) {
                connection.end();
                return done(err);
            }
            connection.end();
            done(null);
        });
    });

    it('Правильно обрабатываются синтаксические ошибки в SQL-запросе', function(done) {
        const Connection = require('../connection/connection');

        let connection = new Connection(connStr);

        connection.query('syntax error', err => {
            if (err) {
                //console.log(err.message);
                if (err.message.indexOf('Microsoft JET Database Engine') >= 0) {
                    done(null);
                } else {
                    done(err);
                }
            } else {
                done(new Error());
            }
            connection.end();
        });
    });

    it('Правильно выполняется SQL-запрос из файла', function(done) {
        const Connection = require('../connection/connection');
        let connection = new Connection(connStr);

        let filepath = path.join(__dirname, 'media/sql.sql');
        connection.query( filepath, (err, data) => {
            if (err) {
                done(err);
            } else {
                let fErr = false;
                try {
                    assert.deepEqual(data, [{"Ok": "Ok"}])
                } catch (err) {
                    fErr = true;
                    done(err)
                }

                if (!fErr) done(null);
            }
            connection.end();
        });
    });

    it('Правильно выполняется подстановка именованных параметров', function (done) {
        const Connection = require('../connection/connection');
        let connection = new Connection(connStr);

        connection.query('SELECT :intValue AS intValue, :floatValue AS floatValue, :stringValue AS stringValue, :dateValue AS DateValue',
            {intValue: 42, floatValue: Math.PI, stringValue: 'arghhhhh', dateValue: new Date('2018-01-01 00:00:00')}, (err, data) => {
            if (err) return done(err);

            let fErr = false;
            try {
                assert.deepEqual(data,
                    [ {"DateValue": new Date('2018-01-01 00:00:00'), "floatValue": Math.PI, "intValue": 42, "stringValue": "arghhhhh"} ]);
            } catch (err) {
                fErr = true;
                done(err)
            }

            if (!fErr) done(null);

            connection.end();
        });
    })

});
