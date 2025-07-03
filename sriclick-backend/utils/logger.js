const fs = require('fs');
const path = require('path');

const logStream = fs.createWriteStream(
  path.join(__dirname, '../logs/app.log'), 
  { flags: 'a' }
);

exports.log = (message) => {
  const timestamp = new Date().toISOString();
  logStream.write(`[${timestamp}] ${message}\n`);
  console.log(message);
};
