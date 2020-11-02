const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});

module.exports = {
  sleep: (time) => new Promise((resolve) => {
    setTimeout(resolve, time);
  }),
  getLogger: () => logger,
  parseKeyMetadata: (key) => {
    // Key format: {directory}/{groupId}/{playlistId}/{jobId}/{batch}.json
    const keyMetadata = {};
    let choppedKey = key;
    keyMetadata.batch = choppedKey.substring(choppedKey.lastIndexOf('/') + 1, choppedKey.indexOf('.json'));
    choppedKey = choppedKey.substring(0, choppedKey.lastIndexOf('/'));
    keyMetadata.jobId = choppedKey.substring(choppedKey.lastIndexOf('/') + 1, choppedKey.length);
    choppedKey = choppedKey.substring(0, choppedKey.lastIndexOf('/'));
    keyMetadata.playlistId = choppedKey.substring(choppedKey.lastIndexOf('/') + 1, choppedKey.length);
    choppedKey = choppedKey.substring(0, choppedKey.lastIndexOf('/'));
    keyMetadata.groupId = choppedKey.substring(choppedKey.lastIndexOf('/') + 1, choppedKey.length);
    return keyMetadata;
  },
};
