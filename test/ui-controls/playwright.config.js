const path = require('node:path');
module.exports = {
  testDir: __dirname, testMatch: 'select.spec.js', workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:3098' },
  outputDir: path.join(__dirname, 'results'),
  webServer: {
    command: 'node node_modules/next/dist/bin/next dev test/ui-controls --webpack -H 127.0.0.1 -p 3098',
    cwd: path.resolve(__dirname, '../..'), url: 'http://127.0.0.1:3098',
    reuseExistingServer: false, timeout: 120000,
  },
};
