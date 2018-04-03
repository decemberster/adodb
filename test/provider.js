'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const mdbPath = path.resolve(__dirname+'/media/Northwind2003.mdb');
const connStr = 'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' + mdbPath;
const endStr = 'END{ea3afd54-bb63-4d3d-aab3-0e7d4eeb696d}';
const errorStr = 'ERROR{ea3afd54-bb63-4d3d-aab3-0e7d4eeb696d}';

describe('Provider', function () {
    it('parse-conn-str правильно разбирает строку подключения', function () {
        const parseConnStr = require('../provider/parse-conn-str');
        let cStr = connStr;

        assert.deepEqual(parseConnStr(cStr), {remote: false, connStr: cStr});

        cStr = 'provider=adodb-server;    Host = localhost;  Port=   4023';
        assert.deepEqual(parseConnStr(cStr), {remote: true, host:'localhost', port:4023});
    });

    it('С помощью фабрики создан и уничтожен экземпляр Provider-local', function (done) {
        const getProvider = require('../provider');

        let options = {
            connString: connStr,
            endString: endStr,
            errorString: errorStr
        };

        getProvider(options, (err, provider) => {
            if (err) return done(err);

            provider.kill();
            if (provider.killed()) {
                done(null)
            } else {
                done(new Error())
            }
        })
    });

    it('Экземпляр Provider-local при создании пишет в поток правильные connStr и endStr', function (done) {
        const getProvider = require('../provider');
        const readline = require('readline');

        let options = {
            connString: connStr,
            endString: endStr,
            errorString: errorStr
        };

        getProvider(options, (err, provider) => {
            if (err) return done(err);

            const rl = readline.createInterface({
                input: provider
            });

            rl.on('line', (line) => {
                if (parseProviderOut(line)) close();
            });

            let provConnStr = null, provEndStr = null;

            function parseProviderOut (line) {
                if (line.slice(0, 9) === 'connStr: ') {
                    provConnStr = line.slice('connStr: '.length).trim();
                } else if (line.slice(0, 8) === 'endStr: ') {
                    provEndStr = line.slice('endStr: '.length).trim();
                }

                return (!!provConnStr && !!provEndStr);
            }

            function close(){
                provider.kill();
                if (provider.killed() && (provConnStr === connStr) && (provEndStr === endStr) ) {
                    done(null)
                } else {
                    done(new Error())
                }
            }

        })
    });

});