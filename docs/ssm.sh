
aws ssm put-parameter \
    --name "/FacebookGroupify/FacebookUsername" \
    --type "String" \
    --value "jack_ohara@live.co.uk" \
    --overwrite
aws ssm put-parameter --name "/FacebookGroupify/FacebookPassword" --type "SecureString" --value "Ayimalegendinit44" --overwrite
