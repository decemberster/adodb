'use strict';

const debug = require('debug')('adodb:server');
const config = require('../config');

const configServer = require('./config-server');

const net = require('net');

const getProvider = require('../provider');

let socketCount = 0;

let server = net
    .createServer(socket => {
        debug('create server');

        socketCount++;

        socket.write('Adodb-server works!');

        let socketProvider = null;
        getProvider(
            {
                connString: configServer.connString,
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
        debug('on connection');
    });

server.listen(4023, () => {
    let address = server.address();
    console.log('opened server on %j', address);
});

//TODO установку серверка как тут: https://github.com/AndyGrom/node-deploy-server