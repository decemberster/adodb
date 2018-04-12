'use strict';
const path = require('path');
const Service = require('node-windows').Service;

const svc = new Service({
    name: 'adodb-server',
    description: 'The Node.js adodb service',
    script: path.join(__dirname, './server.js'),
    env: [
        {
            name: 'NODE_ENV',
            value: 'production'
        },
        {
            name: 'ADODB_PATH',
            value: process.cwd()
        }
    ]
});

svc.on('install', function() {
    console.log('service installed.');
    svc.start();
});

svc.on('alreadyinstalled', function() {
    console.log('This service is already installed.');
});

svc.on('start', function() {
    console.log(svc.name + ' started!');
});

svc.install();
