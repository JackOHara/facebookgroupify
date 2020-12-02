## Should do
- CDK deployment in Github Actions
- Unit test and build
- Docs
- Write links in fixed size batches
## Would like to do
- Versioning 
- Conventional commits
- Add metadata to logger after it has been created. (Will need to singleton logger)
- Combine logs into stream (Use meta to filter)
- Restructure node apps
- Store Spotify ID that matches Youtube title in DynamoDB to reduce Spotify API calls (if we find we are calling Spotify too often).
- X-Ray tracing through system
- Delete feed nodes as we scroll fb so we can reduce memory required



aws ssm put-parameter \
    --name "/FacebookGroupify/FacebookUsername" \
    --type "String" \
    --value "jack_ohara@live.co.uk" \
    --overwrite
aws ssm put-parameter --name "/FacebookGroupify/FacebookPassword" --type "SecureString" --value "" --overwrite



cdk deploy


