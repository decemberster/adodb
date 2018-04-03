"use strict";
const path = require('path');
var Service = require('node-windows').Service;

var svc = new Service({
    name: 'adodb-server',
    description: 'The node.js adodb service',
    script: path.join(__dirname,'./server.js'),
    env:{
        name: "NODE_ENV",
        value: "production"
    }

});

svc.on('install',function(){
    console.log('service installed.');
    svc.start();
});

svc.on('alreadyinstalled',function(){
    console.log('This service is already installed.');
});

svc.on('start',function(){
    console.log(svc.name+' started!');
});

svc.install();