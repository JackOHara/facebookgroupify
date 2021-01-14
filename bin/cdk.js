#!/usr/bin/env node

const cdk = require('@aws-cdk/core');
const { Stack } = require('../lib/stack');

const app = new cdk.App();
new Stack(app, 'FacebookGroupify', {
  env: {
    account: '454150630938',
    region: 'eu-west-1',
  },
});
