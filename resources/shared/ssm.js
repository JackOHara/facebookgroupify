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
};
