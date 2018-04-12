'use strict';

const program = require('commander');
const version = require('../package').version;

program.version(version);

program
    .command('run')
    .description('run adodb server')
    .action(function() {
        // console.log('************* command run');
        require('./server');
    });

program
    .command('install')
    .description('install adodb as service')
    .action(function() {
        // console.log('************* command install');
        require('./install');
    });

program
    .command('uninstall')
    .description('uninstall adodb service')
    .action(function() {
        // console.log('************* command uninstall');
        require('./uninstall');
    });

program
    .command('start')
    .description('start adodb service')
    .action(function() {
        //console.log('************* command start');
        require('./start');
    });

program
    .command('stop')
    .description('stop adodb service')
    .action(function() {
        //console.log('************* command stop');
        require('./stop');
    });

program
    .command('restart')
    .description('restart adodb service')
    .action(function() {
        //console.log('************* command restart');
        require('./restart');
    });

program.parse(process.argv);
