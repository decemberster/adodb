'use strict';

const debug = require('debug')('adodb:server');
const config = require('../config');

const configServer = require('./config-server');

const net = require('net');

const getProvider = require('../provider');

const fs = require('fs');
const path = require('path');
const intercept = require('intercept-stdout');

let adodbPath = process.env['ADODB_PATH'];
console.log('ADODB_PATH: ' + adodbPath);

if (!adodbPath) adodbPath = process.cwd();

const configFile = path.join(adodbPath, 'adodb-config.json');

const stdLog = fs.createWriteStream(path.join(adodbPath, 'stdout.log'));
const errLog = fs.createWriteStream(path.join(adodbPath, 'stderr.log'));

const unhook_intercept = intercept(
    function(txt) {
        stdLog.write(txt);
    },
    function(txt) {
        errLog.write(txt);
    }
);

console.log('config file:', configFile);

fs.readFile(configFile, (err, data) => {
    let options;
    if (err) {
        if (err.code !== 'ENOENT') {
            throw err;
        }
        fs.readFile(path.join(__dirname, '../adodb-config.template.json'), (err, data) => {
            if (err) throw err;

            options = JSON.parse(data);
            if (!options.connString) {
                options.connString =
                    'Provider=Microsoft.Jet.OLEDB.4.0;Data Source=' +
                    path.resolve(path.join(__dirname, '../test/media/Northwind2003.mdb')).replace('/', '\\');
                debug(options.connString);
            }

            fs.writeFile(configFile, JSON.stringify(options, null, 2), err => {
                if (err) throw err;

                startServer(options);
            });
        });
        debug(err.message);
    } else {
        options = JSON.parse(data);
        startServer(options);
    }
});

function startServer(options) {
    debug('options: %j', options);

    let socketCount = 0;

    let server = net
        .createServer(socket => {
            debug('create server');

            socketCount++;

            // socket.write('Adodb-server works!');

            let socketProvider = null;
            getProvider(
                {
                    connString: options.connString,
                    endString: config.endString,
                    errorString: config.errorString
                },
                (err, provider) => {
                    if (err) return socket.write(err.message);
                    if (socket.destroyed) {
                        // на случай, если создание провайдера помещено в очередь, и произошел обрыв связи
                        console.log('socket.destroyed', socket.destroyed);
                        provider.kill();
                        return;
                    }
                    console.log(
                        'New connection, address:',
                        socket.remoteAddress + ', port:' + socket.remotePort,
                        ', family: ',
                        socket.remoteFamily,
                        ', socketCount:',
                        socketCount
                    );

                    provider.pipe(socket);
                    socket.pipe(provider);

                    socketProvider = provider;
                }
            );

            socket.on('data', data => {
                debug('RECIEVED: %s', data.toString());
            });

            socket.on('error', err => {
                console.error('server socket error:', err.message);
                //console.error(err.stack)
            });

            socket.on('close', had_error => {
                socketCount--;
                console.log('Connection closed, had_error:', had_error, ', open sockets:', socketCount);
                if (had_error) {
                    //console.log('socketProvider:', socketProvider);
                    if (!!socketProvider) {
                        console.log('killing socketProvider');
                        socketProvider.kill();
                    }
                }
            });
        })
        .on('error', err => {
            throw err;
        })
        .on('connection', socket => {
            debug('on connection, socket: %j', socket);
        });

    server.listen(options.port, () => {
        let address = server.address();
        console.log('opened server on %j', address);
    });
}

// TODO установку сервера как тут: https://github.com/AndyGrom/node-deploy-server
