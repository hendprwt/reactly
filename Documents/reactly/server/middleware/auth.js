const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  const currentUserAgent = req.header('user-agent');
  const bypassSecret = req.header('X-Internal-Bypass'); // Pintu khusus bot kita

  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || "rahasia_negara");
    
    // Izinkan jika bot kita membawa kode rahasia, jika tidak, cek User-Agent
    if (bypassSecret !== "swarm-bot-2026") {
        if (currentUserAgent && (currentUserAgent.includes('axios') || currentUserAgent.includes('node-fetch'))) {
            return res.status(403).json({ message: "Security Alert: Bot detected!" });
        }
    }

    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid/Expired Token" });
  }
};