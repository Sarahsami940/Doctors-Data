var Service = require('node-windows').Service;
var path = require('path');

var svc = new Service({
    name: 'DoctorDirectory',
    description: 'Doctor Directory - Location Management App',
    script: path.join(__dirname, 'node_modules', '.bin', 'tsx'),
    scriptOptions: path.join(__dirname, 'server', 'index.ts'),
    env: [{
        name: "PORT",
        value: "3001"
    }],
    wait: 2,
    grow: 0.5
});

svc.on('install', function () {
    svc.start();
    console.log('Doctor Directory service installed and started!');
    console.log('App running at http://localhost:3001');
});

svc.on('alreadyinstalled', function () {
    console.log('Service is already installed.');
});

svc.on('error', function (err) {
    console.log('Error:', err);
});

svc.install();
