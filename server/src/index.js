require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');
const foldersRoutes = require('./routes/folders');
const clipboardRoutes = require('./routes/clipboard');
const { errorHandler } = require('./middleware/errorHandler');
const { authLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Rate limiting for auth endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/clipboard', clipboardRoutes);

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: '请求的接口不存在。' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
