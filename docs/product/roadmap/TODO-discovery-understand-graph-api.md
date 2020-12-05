## Understand the Graph API

During initial discovery work I found that I could not use the Facebook Graph API with my credentials to retreive post information from Facebook groups. This is why I chose to use to scrape groups using Puppeteer. The Puppeteer code is not ideal. It has security issues as it uses a Facebook username and password. It has reliability issues as it navigates and scrapes Facebook using CSS selectors which may change at any time (we are at the mercy of Facebook). It faces potential locking/bans from Facebook, they actively try and detect if the user accessing Facebook is a bot/hacker of some kind. Scalability is also a concern, imagine trying to scrape 500 groups in parallel. Facebook would almost certainly detect that something dodgy is going on. 

People who can use the Graph API to retrieve posts from a FB group are administrators of that group.

We should discover if there are any other ways to retrieve FB group posts through the API.
We should consider what would be the implications if we limited the app to only administrators of groups. 
We should discover if administrators can give us the required credentials to use the API (like an app token, not username password)