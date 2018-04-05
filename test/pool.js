'use strict';

const assert = require('assert');
const path = require('path');

const mdbPath = path.resolve(__dirname + '/media/Northwind2003.mdb');
const connStr = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + mdbPath;

describe('Pool', function() {
    it('Pool создается и уничтожается', function() {
        const Pool = require('../pool/pool');
        let pool = new Pool(connStr);
        pool.end();
    });

    it('Pool выполняет sql-запрос', function(done) {
        const Pool = require('../pool/pool');
        let pool = new Pool(connStr);
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

    it('Правильно выполняется SQL-запрос с integer, string, float, boolean', function(done) {
        const Pool = require('../pool/pool');
        let pool = new Pool(connStr);

        pool.query(
            'SELECT 2*2 AS intValue, "string" AS strValue, 3.14151926 AS floatValue, ' +
                'cBool(1=1) AS trueValue, cBool(1=0) AS falseValue;',
            (err, data) => {
                if (err) return done(err);

                try {
                    assert.deepEqual(data, [
                        {falseValue: 0, floatValue: 3.14151926, intValue: 4, strValue: 'string', trueValue: -1}
                    ]);
                } catch (err) {
                    pool.end();
                    return done(err);
                }
                pool.end();
                done(null);
            }
        );
    });

//TODO проверку запросов, возвращающих null

    it('Правильно выполняется SQL-запрос с datetime', function(done) {
        const Pool = require('../pool/pool');
        let pool = new Pool(connStr);

        pool.query('SELECT #2018-01-01 00:00:00# AS dateValue;', (err, data) => {
            if (err) return done(err);

            try {
                assert.deepEqual(data[0]['dateValue'].getTime(), new Date('2018-01-01 00:00:00').getTime());
            } catch (err) {
                pool.end();
                return done(err);
            }
            pool.end();
            done(null);
        });
    });

    it('Правильно обрабатываются синтаксические ошибки в SQL-запросе', function(done) {
        const Pool = require('../pool/pool');
        let pool = new Pool(connStr);

        pool.query('syntax error', err => {
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
            pool.end();
        });
    });

    it('Правильно выполняется SQL-запрос из файла', function(done) {
        const Pool = require('../pool/pool');
        let pool = new Pool(connStr);

        let filepath = path.join(__dirname, 'media/sql.sql');
        pool.query(filepath, (err, data) => {
            if (err) {
                done(err);
            } else {
                let fErr = false;
                try {
                    assert.deepEqual(data, [{Ok: 'Ok'}]);
                } catch (err) {
                    fErr = true;
                    done(err);
                }

                if (!fErr) done(null);
            }
            pool.end();
        });
    });

    it('Правильно выполняется подстановка именованных параметров', function(done) {
        const Pool = require('../pool/pool');
        let pool = new Pool(connStr);

        pool.query(
            'SELECT :intValue AS intValue, :floatValue AS floatValue, :stringValue AS stringValue, :dateValue AS DateValue',
            {intValue: 42, floatValue: Math.PI, stringValue: 'arghhhhh', dateValue: new Date('2018-01-01 00:00:00')},
            (err, data) => {
                if (err) return done(err);

                let fErr = false;
                try {
                    assert.deepEqual(data, [
                        {
                            DateValue: new Date('2018-01-01 00:00:00'),
                            floatValue: Math.PI,
                            intValue: 42,
                            stringValue: 'arghhhhh'
                        }
                    ]);
                } catch (err) {
                    fErr = true;
                    done(err);
                }

                if (!fErr) done(null);

                pool.end();
            }
        );
    });

    it('Правильно выполняется SQL-запрос с комментариями', function(done) {
        const Pool = require('../pool/pool');
        let pool = new Pool(connStr);

        let sql = '/* check removing comments */SELECT 1 AS NUM1, -- number 1\n 2 AS NUM2 -- number 2';

        pool.query(sql, (err, data) => {
            if (err) {
                done(err);
            } else {
                let fErr = false;
                try {
                    assert.deepEqual(data, [{NUM1: 1, NUM2: 2}]);
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
