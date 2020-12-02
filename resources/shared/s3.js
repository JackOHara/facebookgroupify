const AWS = require('aws-sdk');
const sharedUtil = require('./utils.js');

const logger = sharedUtil.getLogger();

const s3 = new AWS.S3({ apiVersion: '2006-03-01', region: 'eu-west-1' });

module.exports = {
  putToS3: async (bucket, key, data) => {
    const stringifiedData = JSON.stringify(data, null, 2);
    const params = {
      Bucket: bucket,
      Key: key,
      Body: stringifiedData,
    };
    const putObjectPromise = s3.putObject(params).promise();
    return putObjectPromise.then(() => {
      logger.info(`Successfully uploaded to s3://${bucket}/${key}`);
    }).catch((err) => {
      logger.error(`Error uploading to s3://${bucket}/${key} : ${err}`);
    });
  },
  getFromS3: async (bucket, key) => {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    const data = (await (s3.getObject(params).promise())).Body.toString('utf-8');
    return JSON.parse(data);
  },
};
