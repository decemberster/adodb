'use strict';

const assert = require('assert');
const path = require('path');

const mdbPath = path.resolve(__dirname + '/media/Northwind2003.mdb');
const connStr = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + mdbPath;

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

        d1 = parseDateFn('MM\\dd\\yyyy', 'H:m:s')('01\\05\\2018 12:34:56').toString();
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

    it('Правильно выполняется SQL-запрос с integer, string, float, boolean', function(done) {
        const Connection = require('../connection/connection');

        let connection = new Connection(connStr);

        connection.query(
            'SELECT 2*2 AS intValue, "string" AS strValue, 3.14151926 AS floatValue, ' +
                '1=1 AS trueValue, 1=0 AS falseValue;',
            (err, data) => {
                if (err) return done(err);

                try {
                    assert.deepEqual(data, [
                        {floatValue: 3.14151926, intValue: 4, strValue: 'string', trueValue: -1, falseValue: 0}
                    ]);
                } catch (err) {
                    connection.end();
                    return done(err);
                }
                connection.end();
                done(null);
            }
        );
    });

    it('Правильно выполняется SQL-запрос с boolean', function(done) {
        const Connection = require('../connection/connection');

        let connection = new Connection(connStr);

        connection.query(
            'SELECT ProductID, Discontinued FROM Products WHERE ProductID IN (1, 5);',
            (err, data, fields) => {
                if (err) return done(err);

                try {
                    assert.deepEqual(fields, [
                        {Name: 'ProductID', Type: 3, Precision: 10, NumericScale: 255},
                        {
                            Name: 'Discontinued',
                            Type: 11,
                            Precision: 255,
                            NumericScale: 255
                        }
                    ]);
                    assert.deepEqual(data, [{ProductID: 1, Discontinued: false}, {ProductID: 5, Discontinued: true}]);
                } catch (err) {
                    connection.end();
                    return done(err);
                }
                connection.end();
                done(null);
            }
        );
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

    it('Правильно выполняется SQL-запрос с null', function(done) {
        const Connection = require('../connection/connection');

        let connection = new Connection(connStr);

        connection.query(
            // Если запрос возвращает значение логического выражения, то тип поля будет adSmallInt (2), а не adBoolean (11).
            // Но если запрос возвращает значение логического поля, то тип поля будет adBoolean (11)
            //
            // Для числового поля в случае значения NULL возвращается значение 0.
            // Для текстового поля в случае значения NULL возвращается пустая строка
            //
            // Типы полей: https://msdn.microsoft.com/ru-ru/library/ms675318(v=vs.85).aspx

            'SELECT cr.CustomerID, cr.EmployeeID, ord.OrderID AS NumericNull, ord.OrderDate AS DateNull, ord.ShipName AS StringNull, IIF(ord.OrderID IS NULL, FALSE, TRUE) AS booleanValue FROM Orders ord RIGHT JOIN (SELECT CustomerID, EmployeeID FROM Customers, Employees) cr  ON (ord.CustomerID = cr.Customers.CustomerID AND ord.EmployeeID = cr.EmployeeID) WHERE cr.CustomerID="ALFKI" AND cr.EmployeeID IN (1, 2) ORDER BY cr.CustomerID, cr.EmployeeID;',
            (err, data, fields) => {
                if (err) return done(err);

                try {
                    assert.deepEqual(data, [
                        {
                            CustomerID: 'ALFKI',
                            EmployeeID: 1,
                            NumericNull: 10952,
                            DateNull: new Date('1998-03-16 00:00:00'),
                            StringNull: 'Alfreds Futterkiste',
                            booleanValue: -1
                        },
                        {
                            CustomerID: 'ALFKI',
                            EmployeeID: 1,
                            NumericNull: 10835,
                            DateNull: new Date('1998-01-15 00:00:00'),
                            StringNull: 'Alfreds Futterkiste',
                            booleanValue: -1
                        },
                        {
                            CustomerID: 'ALFKI',
                            EmployeeID: 2,
                            NumericNull: 0,
                            DateNull: null,
                            StringNull: '',
                            booleanValue: 0
                        }
                    ]);
                } catch (err) {
                    connection.end();
                    return done(err);
                }
                connection.end();
                done(null);
            }
        );
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
        connection.query(filepath, (err, data) => {
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
            connection.end();
        });
    });

    it('Правильно выполняется подстановка именованных параметров', function(done) {
        const Connection = require('../connection/connection');
        let connection = new Connection(connStr);

        connection.query(
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

                connection.end();
            }
        );
    });
});
