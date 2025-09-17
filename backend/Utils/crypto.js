const crypto = require('crypto');

const secret = process.env.CRYPTO_SECRET || 'secret_key';

const encrypt = (text) => {
    const cipher = crypto.createCipher('aes-256-cbc', secret);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

const decrypt = (text) => {
    const decipher = crypto.createDecipher('aes-256-cbc', secret);
    let decrypted = decipher.update(text, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
};

module.exports = { encrypt, decrypt };
