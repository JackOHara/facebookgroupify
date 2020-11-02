const cdk = require('@aws-cdk/core');
const service = require('./facebookgroupify');

class Stack extends cdk.Stack {
  /**
   *
   * @param {cdk.Construct} scope
   * @param {string} id
   * @param {cdk.StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, props);
    new service.FacebookGroupify(this, service.FacebookGroupify.name);
  }
}

module.exports = { Stack }
