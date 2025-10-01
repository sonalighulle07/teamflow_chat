const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.get('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token missing' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      const errorType = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      return res.status(403).json({ error: errorType });
    }

    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };

