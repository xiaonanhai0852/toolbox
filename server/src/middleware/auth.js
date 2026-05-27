const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('警告: JWT_SECRET 环境变量未设置，请在 .env 文件中配置');
}

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '访问被拒绝，请先登录。' });
  }

  const token = header.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET || 'dev-only-fallback');
    req.user = { userId: decoded.userId, username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: '登录已过期，请重新登录。' });
  }
}

module.exports = { auth, JWT_SECRET };
