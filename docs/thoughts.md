## Random thoughts
- Update github actions so it doesn't deploy on docs updates (lol)
- Optimise the pipeline. Reuse id-titles retrieved from Youtube (speed + reduced chance of Youtube limiting us + deleted Youtube links would be valid if we already had the title). Build replayability of cloudwatch event triggers (current replay method of re-PUTTING everything is costly). Find FB scraper alternative.
- Store Spotify ID that matches Youtube title in DynamoDB to reduce Spotify API calls (if we find we are calling Spotify too often).
- Delete feed nodes as we scroll fb so we can reduce memory required and scrape for longer.
- to get soundcloud metadata simply load the page and it is in the title
- use commit hash for deployment rollbacks for handiness
- eslint on PR



cdk deploy


