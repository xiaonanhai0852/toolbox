require('dotenv').config({ path: './server/.env' });

module.exports = {
  apps: [{
    name: 'toolbox',
    cwd: './server',
    script: 'src/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3000,
      JWT_SECRET: process.env.JWT_SECRET
    }
  }]
};
