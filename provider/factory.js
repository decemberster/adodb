'use strict';

const debug = require('debug')('adodb:provider:factory');
const ProviderLocal = require('./provider-local');
const ProviderRemote = require('./provider-remote');
const parseConnStr = require('./parse-conn-str');

function getProvider(options, callback) {
    debug('getProvider');

    debug(options.connString);
    let opts = parseConnStr(options.connString);
    debug(opts);

    let provider;
    if (opts.remote === true) {
        debug('remote');
        options.remote = true;
        options.host = opts.host;
        options.port = opts.port;

        provider = new ProviderRemote(options);
    } else {
        debug('local');
        provider = new ProviderLocal(options);
    }

    function errorBeforeReadyFn (err) {
        debug('error');
        callback(err);
    }

    provider.once('error', errorBeforeReadyFn);

    provider.once('ready', () => {
        debug('ready');
        provider.removeListener('error',errorBeforeReadyFn);
        callback(null, provider);
    });

}



module.exports = getProvider;
