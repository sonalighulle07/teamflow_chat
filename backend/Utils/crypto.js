const crypto = require("crypto");
const KEY = process.env.ENCRYPTION_KEY || "12345678901234567890123456789012"; // 32 bytes

function encrypt(text) {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(KEY), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text) {
  try {
    if (!text || typeof text !== "string") return text;

    // must contain ':' separating IV and ciphertext
    if (!text.includes(":")) return text; // already plain text

    const [ivHex, encrypted] = text.split(":");
    if (!ivHex || !encrypted) return text;

    const iv = Buffer.from(ivHex, "hex");
    if (iv.length !== 16) return text; // invalid IV size

    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(KEY), iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.warn("⚠️ Decrypt failed, returning original text:", err.message);
    return text; // fallback safely
  }
}

module.exports = { encrypt, decrypt };
