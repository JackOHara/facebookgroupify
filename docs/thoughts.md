## Random thoughts
- Store Spotify ID that matches Youtube title in DynamoDB to reduce Spotify API calls (if we find we are calling Spotify too often).
- Delete feed nodes as we scroll fb so we can reduce memory required and scrape for longer.



aws ssm put-parameter \
    --name "/FacebookGroupify/FacebookUsername" \
    --type "String" \
    --value "jack_ohara@live.co.uk" \
    --overwrite
aws ssm put-parameter --name "/FacebookGroupify/FacebookPassword" --type "SecureString" --value "" --overwrite



cdk deploy
