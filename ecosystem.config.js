module.exports = {
  apps: [{
    name: 'toolbox',
    cwd: './server',
    script: 'src/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      JWT_SECRET: 'change-me-to-a-random-secret'
    }
  }]
};
