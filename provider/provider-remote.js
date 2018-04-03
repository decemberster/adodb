'use strict';

const debug = require('debug')('adodb:provider-remote');
const config = require('../config');
const net = require('net');
const util = require('util');

const Duplex = require('stream').Duplex;

util.inherits(Provider, Duplex);

function Provider(options) {
    debug('new Provider');
    if (!(this instanceof Provider)) {
        throw new Error("Can't Provide w/o new");
    }
    Duplex.call(this, options);

    var self = this;

    let host = options.host;
    let port = options.port;

    let endString = options.endString;
    let errorString = options.errorString;
    let codepageOEM = options.codepageOEM;
    let codepageANSI = options.codepageANSI;

    console.assert(!!host && !!port && !!endString && !!errorString);

    self.codepageOEM = codepageOEM || 866;
    self.codepageANSI = codepageANSI || 1251;

    self._endString = endString;
    self._errorString = errorString;

    self._endStdOut = false;
    self._endStdErr = false;

    self._socket = net.createConnection({host: host, port: port}, () => {
        debug('connected to server');

        let options = JSON.stringify({
            endString: config.endString,
            errorString: config.errorString
        });

        setImmediate(() => {
            debug('ready');
            self.emit('ready');
        });
    });

    self._socket
        .on('error', err => {
            debug('socket error: %s', err.message);
            self.push(new Buffer(errorString + '\n', 'utf8'));
            self.push(new Buffer(err.message + '\n', 'utf8'));
            self.push(new Buffer(endString + '\n', 'utf8'));
            self.emit('error', err);
        })
        .on('close', (code, signal) => {
            debug('socket close, code: %s, signal: %s', code, signal);
            self.emit('close', code, signal);
        })
        .on('data', data => {
            //debug('data: %s', data);
            if (!self.push(data)) {
                self._socket.pause();
            }
        })
        .on('readable', () => {
            self.read(0);
        })
        .on('end', () => {
            self.push(null);
        });

    self.on('error', err => {
        debug('ProviderRemote error:', err.message);
        //console.error(err.stack);
        self.push(new Buffer(errorString + '\n', 'utf8'));
        self.push(new Buffer(err.message + '\n', 'utf8'));
        self.push(new Buffer(endString + '\n', 'utf8'));
    });
}

Provider.prototype._read = function(size) {
    var self = this;
    //debug('_read');

    self._socket.resume();
};

Provider.prototype._write = function(chunk, encoding, done) {
    var self = this;
    debug('_write: %s', chunk.toString().trim());

    if (!self._socket.write(chunk)) {
        self.cork();
        self.once('drain', () => {
            self.uncork();
        });
    }

    done();
};

Provider.prototype.kill = function() {
    var self = this;
    debug('kill');

    self._socket.end();
    self._socket.destroy();
    self._socket.unref();
};

module.exports = Provider;

//TODO Все ошибки передавать через потоки.
