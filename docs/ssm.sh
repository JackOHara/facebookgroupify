
aws ssm put-parameter \
    --name "/FacebookGroupify/SpotifyClientId" \
    --type "String" \
    --value "" \
    --overwrite
aws ssm put-parameter \
    --name "/FacebookGroupify/SpotifyClientSecret" \
    --type "SecureString" \
    --value "" \
    --overwrite
aws ssm put-parameter \
    --name "/FacebookGroupify/SpotifyRefreshToken" \
    --type "SecureString" \
    --value "" \
    --overwrite

aws ssm put-parameter --cli-input-json '{
  "Name": "/FacebookGroupify/SpotifyRedirectUri",
  "Value": "http://localhost:3000/login",
  "Type": "String",
  "Overwrite": true
}'
