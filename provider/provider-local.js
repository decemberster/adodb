'use strict';

const debug = require('debug')('adodb:provider-local');

const iconv = require('iconv-lite');
const util = require('util');
const getCore = require('../core');

const Duplex = require('stream').Duplex;

util.inherits(Provider, Duplex);

function Provider(options) {
    if (!(this instanceof Provider)) {
        throw new Error("Can't Provide w/o new");
    }
    Duplex.call(this, options);

    const self = this;

    let connString = options.connString;
    let endString = options.endString;
    let errorString = options.errorString;
    let codepageOEM = options.codepageOEM;
    let codepageANSI = options.codepageANSI;

    console.assert(!!connString && !!endString && !!errorString);

    self.codepageOEM = codepageOEM || 866;
    self.codepageANSI = codepageANSI || 1251;

    self._connString = connString;
    self._endString = endString;
    self._errorString = errorString;

    self._endStdOut = false;
    self._endStdErr = false;

    getCore(self._connString, self._endString, (err, core) => {
        if (err) return console.error(err.message);

        self._core = core;

        core
            .on('error', err => {
                debug('core error: %s', err.message);
                self.emit('error', err);
            })
            .on('close', (code, signal) => {
                debug('core close, code: %s, signal: %s', code, signal);
                self.emit('close', code, signal);
            });

        core.stdout
            .on('data', data => {
                data = new Buffer(iconv.decode(data, self.codepageANSI), 'utf8');
                debug('data: %s', data);
                if (!self.push(data)) {
                    self._core.stdout.pause();
                }
            })
            .on('end', () => {
                self._endStdOut = true;
                if (self._endStdErr) {
                    self.push(null);
                }
            })
            .on('readable', () => {
                self.read(0);
            })
            .on('error', err => {
                console.error('Provider._engine.stdout error', err);
            });

        self._stderrBuf = [];
        core.stderr
            .on('data', buf => {
                debug('stderr: %s', buf.toString().trim());
                self._stderrBuf.push(buf);
            })
            .on('end', () => {
                let data = iconv.decode(Buffer.concat(self._stderrBuf), self.codepageOEM);

                debug('stderr end: %s', data.trim());
                if (data.trim().length > 0) {
                    self.push(new Buffer(errorString + '\n', 'utf8'));
                    self.push(new Buffer(data.trim() + '\n', 'utf8'));
                    self.push(new Buffer(endString + '\n', 'utf8'));
                }
                self._endStdErr = true;
                if (self._endStdOut) {
                    self.push(null);
                }
            })
            .on('error', err => {
                console.error('Provider._engine.stderr error', err);
            });

        core.stdin.on('error', err => {
            console.error('Provider._engine.stdin error', err);
        });

        setImmediate(() => {
            debug('ready');
            self.emit('ready');
        });
    });
}

Provider.prototype._read = function() {
    const self = this;

    self._core.stdout.resume();
    self._core.stderr.resume();
};

Provider.prototype._write = function(chunk, encoding, done) {
    const self = this;
    debug('write: %s', chunk.toString().trim());

    if (!self._core.stdin.write(iconv.encode(chunk, self.codepageANSI))) {
        self.cork();
        self.once('drain', () => {
            self.uncork();
        });
    }

    done();
};

Provider.prototype.kill = function() {
    const self = this;
    debug('kill');
    self._core.kill();
};

Provider.prototype.killed = function() {
    const self = this;
    debug('kill');
    return self._core.killed();
};

module.exports = Provider;
