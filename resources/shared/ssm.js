const AWS = require('aws-sdk');
const sharedUtil = require('./utils.js');

const logger = sharedUtil.getLogger();
AWS.config.update({
  region: 'eu-west-1',
});
const ssm = new AWS.SSM();

module.exports = {
  getParameter: async (parameterName) => {
    logger.debug(`Getting parameter for ${parameterName}`);
    const params = {
      Name: parameterName,
      WithDecryption: true,
    };
    const result = await ssm.getParameter(params).promise();
    return result.Parameter.Value;
  },
  writeParameter: async (parameterName, parameterValue, encrypt) => {
    logger.debug(`Writing parameter for ${parameterName}`);
    const parameterType = encrypt ? 'SecureString' : 'String';
    const params = {
      Name: parameterName,
      Value: parameterValue,
      Type: parameterType,
      Overwrite: true,
    };
    await ssm.putParameter(params).promise();
  },
};
