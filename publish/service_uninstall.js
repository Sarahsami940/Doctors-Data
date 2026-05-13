var Service = require('node-windows').Service;
var path = require('path');

var svc = new Service({
    name: 'DoctorDirectory',
    description: 'Doctor Directory - Location Management App',
    script: path.join(__dirname, 'node_modules', '.bin', 'tsx'),
    scriptOptions: path.join(__dirname, 'server', 'index.ts'),
});

svc.on('uninstall', function () {
    console.log('Doctor Directory service uninstalled.');
});

svc.uninstall();
