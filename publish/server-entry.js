// IIS entry point - wraps the TypeScript server for iisnode
// This file is used when deploying via IIS with iisnode module
const { execSync } = require('child_process');
const path = require('path');

// Set port from IIS named pipe
process.env.PORT = process.env.PORT || process.env.IISNODE_HTTP_PIPE || 3001;

// Run the TypeScript server using tsx
require('child_process').fork(
    path.join(__dirname, 'node_modules', '.bin', 'tsx'),
    [path.join(__dirname, 'server', 'index.ts')],
    { stdio: 'inherit' }
);
