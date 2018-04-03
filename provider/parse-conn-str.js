'use strict';

function parseConnStr(connStr) {
    let opts = {};

    function startedWith(str, s) {
        str = str.trim().toLowerCase();
        s = s.toLowerCase();

        return (str.slice(0,s.length) === s)
    }

    let isRemote = startedWith(connStr, 'Provider=Adodb-server');

    if (isRemote) {
        opts.remote = true;

        let params = connStr.split(';').reduce((prev, cur) => {
            let paramName, paramValue;
            let d = cur.trim().split('=');
            paramName = d[0].toLowerCase().trim();
            paramValue = d[1].trim();
            prev[paramName] = paramValue;

            return prev;
        }, {});

        opts.host = params.host;
        opts.port = params.port;
    } else {
        opts.remote = false;
        opts.connStr = connStr;
    }

    return opts;
}

module.exports = parseConnStr;
