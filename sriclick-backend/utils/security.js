const crypto = require('crypto');

exports.generateAPIToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

exports.hashData = (data) => {
  return crypto.createHash('sha256')
    .update(data)
    .digest('hex');
};
