'use strict';
const path = require('path');

const Service = require('node-windows').Service;

const svc = new Service({
    name: 'adodb-server',
    script: path.join(__dirname, './server.js')
});

svc.on('start', function() {
    console.log('The service started.');
});

svc.start();
