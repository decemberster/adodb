'use strict';

// 1) создает экземпляры core не чаще чем minCoreCreationInterval
// 2) выполняет spawn

const debug = require('debug')('adodb:core:factory');
const Core = require('./core');
const config = require('../config');

const queue = [];
let lock = false;

//milliseconds, workaround for https://support.microsoft.com/en-us/kb/274211
// 2018-03-20: ссылка не работает, но можно найти в google kb274211
let minCoreCreationInterval = config.minCoreCreationInterval;

function getCore(connString, endString, callback) {
    if (lock) {
        debug('waiting');
        let coreQueryObj = {
            connString: connString,
            endString: endString,
            callback: callback
        };
        queue.unshift(coreQueryObj);
    } else {
        let core = new Core(connString, endString);
        core.spawn((err, core) => {
            if (err) return callback(err);

            lock = true;
            callback(null, core);
            setTimeout(() => {
                debug('end wait');
                lock = false;
                if (queue.length > 0) {
                    let coreQueryObj = queue.pop();
                    getCore(coreQueryObj.connString, coreQueryObj.endString, coreQueryObj.callback);
                }
            }, minCoreCreationInterval);
        });
    }
}

module.exports = getCore;
