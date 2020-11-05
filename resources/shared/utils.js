const winston = require('winston');

let logger;

const getLogger = (meta) => {
  if (Object.keys(meta) > 0 || !logger) {
    logger = winston.createLogger({
      level: 'info',
      defaultMeta: meta,
      format: winston.format.combine(
        winston.format.json(),
        winston.format.timestamp(),
      ),
      transports: [
        new winston.transports.Console(),
      ],
    });
  }
  logger.format = winston.format.combine(
    winston.format.json(),
    winston.format.timestamp(),
  );
  return logger;
};

module.exports = {
  sleep: (time) => new Promise((resolve) => {
    setTimeout(resolve, time);
  }),
  getLogger: () => getLogger({}),
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
