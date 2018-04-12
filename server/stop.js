'use strict';
const path = require('path');

const Service = require('node-windows').Service;

const svc = new Service({
    name: 'adodb-server',
    script: path.join(__dirname, './server.js')
});

svc.on('stop', function() {
    console.log('The service stopped.');
});

svc.stop();
