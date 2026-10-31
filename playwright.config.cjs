module.exports = {
  testDir: './qa',
  testMatch: '*.spec.cjs',
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4200',
    headless: true,
    viewport: { width: 1536, height: 1000 },
  },
  reporter: 'list',
  webServer: {
    command: 'npm start -- --host 127.0.0.1',
    url: 'http://127.0.0.1:4200',
    reuseExistingServer: true,
    timeout: 120000,
  },
};
