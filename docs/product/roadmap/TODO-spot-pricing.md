## Spot Pricing

Today the group scraping runs in ECS and they are triggered by a scheduled job. There are no requirements for the scraping jobs to run at any particular time. 

To minimise cost we should utilise spot instances. This may require handling a graceful shut down.
Also consider that we may be running apps too long. Look at puppeteer non headless mode and understand better how it works