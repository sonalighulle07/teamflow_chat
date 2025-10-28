const crypto = require("crypto");

// Use a strong secret key, keep it safe (32 bytes for AES-256)
const SECRET_KEY = "my_super_secret_key_123456789012"; // 32 chars
const ALGORITHM = "aes-256-cbc";

// Encrypt text
function encrypt(text) {
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted; // store IV with encrypted text
}

// Decrypt text
function decrypt(text) {
  const [ivHex, encrypted] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encrypt, decrypt };
