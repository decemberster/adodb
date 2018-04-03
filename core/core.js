'use strict';
/**
 * Windows specific code
 */

const debug = require('debug')('adodb:core');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const spawn = require('child_process').spawn;

let script = path.join(__dirname, 'scripts/adodb.js'),
    sysroot = process.env['systemroot'] || process.env['windir'];
let x64 = true;
try {
    fs.accessSync(path.join(sysroot, 'SysWOW64'), fs.F_OK);
} catch (err) {
    if (err.code === 'ENOENT') {
        x64 = false;
    } else {
        throw err;
    }
}
let cscriptPath = path.join(sysroot, x64 ? 'SysWOW64' : 'System32', 'cscript.exe');

util.inherits(Core, EventEmitter);
function Core(connString, endString) {
    if (!(this instanceof Core)) {
        throw new Error("Can't Core w/o new");
    }

    console.assert(!!connString && !!endString);

    EventEmitter.call(this);
    let self = this;

    let coreProc = null;

    self.stdout = null;
    self.stdin = null;
    self.stderr = null;

    self.spawn = function(callback) {
        debug('spawning %s, %s; connString: %s, endString: %s', cscriptPath, script, connString, endString);

        coreProc = spawn(cscriptPath, [script, '//E:JScript', '//Nologo', connString, endString]);

        self.stdout = coreProc.stdout;
        self.stdin = coreProc.stdin;
        self.stderr = coreProc.stderr;

        coreProc.on('error', err => {
            debug('error: %s', err.message);
            self.emit('error', err);
        });

        coreProc.on('close', (code, signal) => {
            debug('close, code: %s, signal: %s', code, signal);
            self.emit('close', code, signal);
        });

        callback(null, self);
    };

    self.kill = function() {
        debug('kill');
        try {
            coreProc.kill();
        } catch (err) {}
    };
    self.killed = function() {
        return coreProc.killed;
    };
}

module.exports = Core;

//TODO передачу вместо endStr и errorStr строки для кодирования, чтобы endStr = END + <код> и errorStr = ERROR + <код>
