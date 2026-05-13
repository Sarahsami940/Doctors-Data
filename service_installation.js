var Service = require('node-windows').Service;
var path = require('path'); // Core Node.js module

var svc = new Service({
    name: 'My Node App',
    description: 'A description of my service.',
    // Use path.join to create a valid absolute path to your file
    script: path.join(__dirname, 'app.js')
});

svc.on('install', function () {
    svc.start();
    console.log('Service installed and started!');
});

svc.install();
