'use strict';

const debug = require('debug')('adodb:connection:utils');
const strip = require('sql-strip-comments');

//http://shamansir.github.io/JavaScript-Garden/#types.typeof
function is(type, obj) {
    let clas = Object.prototype.toString.call(obj).slice(8, -1);
    return obj !== undefined && obj !== null && clas === type;
}

function fmtSQLDate(value){
    if (is('Date', value)) {
        let year = value.getFullYear(),
            month = value.getMonth() + 1,
            day = value.getDate(),
            hours = value.getHours(),
            minutes = value.getMinutes(),
            seconds = value.getSeconds();

        value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    return value;
}

// http://stackoverflow.com/questions/7744912/making-a-javascript-string-sql-friendly
function escapeSql (val) {
    if (is(val) === 'String') {
        val = val.replace(/[\0\n\r\b\t\\'"\x1a]/g, function (s) {
            switch (s) {
                case "\0":
                    return "\\0";
                case "\n":
                    return "\\n";
                case "\r":
                    return "\\r";
                case "\b":
                    return "\\b";
                case "\t":
                    return "\\t";
                case "\x1a":
                    return "\\Z";
                case "'":
                    return "''";
                case '"':
                    return '""';
                default:
                    return "\\" + s;
            }
        });
    }

    return val;
}

// named parameters
function queryFormat (sql, values) {
    sql = strip(sql);

    // if (!values) return sql;

    //TODO не заменять параметры внутри текстовых литералов
    return sql.replace(/:(\w+)/g, function (txt, key) {
        let res;
        if (values && values.hasOwnProperty(key)) {
            if (
                (values[key] === null)
                || (values[key] === undefined)
                || (values[key] != values[key]) // is NaN
            ) {
                res = 'NULL';
            } else if (is('Date', values[key])) {
                res = `#${fmtSQLDate(values[key])}#`;
            } else {
                res = escapeSql(values[key]);
                if (is('String', res)) {
                    res = "'" + res + "'"
                }
            }

            debug('Подстановка параметра %s = %s', txt, res);
            return res;
        }
        debug('Неопределенный параметр %s', txt);
        return txt;
    });
}

module.exports = {queryFormat: queryFormat};