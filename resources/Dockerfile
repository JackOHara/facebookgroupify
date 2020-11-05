## Base

FROM node:12.16-slim

RUN apt-get update && apt-get install -yq libgconf-2-4


RUN apt install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY scraper_service/package*.json ./

RUN npm install --only=production && npm install puppeteer
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

ENTRYPOINT [ "node", "scraper_service/src/index.js" ]

# docker build -t jackohara/link-scraper .  
#  docker run -e AWS_ACCESS_KEY_ID="$(aws configure get aws_access_key_id)" -e AWS_SECRET_ACCESS_KEY="$(aws configure get aws_secret_access_key)" jackohara/link-scraper
# docker tag jackohara/link-scraper 454150630938.dkr.ecr.us-east-1.amazonaws.com/link-scraper
# docker push 454150630938.dkr.ecr.us-east-1.amazonaws.com/link-scraper
# # aws cloudformation create-stack --stack-name testfargateay --template-body file://fargate2.yaml  --capabilities CAPABILITY_IAM  --parameters ParameterKey=BucketName,ParameterValue=johara-test-bucket5 ParameterKey=VPC,ParameterValue=vpc-279c9e5d  
