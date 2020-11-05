const puppeteer = require('puppeteer');

const { v4: uuidv4 } = require('uuid');
const properties = require('./properties');
const facebookGroupHandler = require('./facebook');
const utils = require('../../shared/utils.js');
const s3 = require('../../shared/s3.js');
const ssm = require('../../shared/ssm.js');

const logger = utils.getLogger();

const getDefaultBrowser = async (headless) => {
  const browser = await puppeteer.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = browser.defaultBrowserContext();
  context.overridePermissions('https://www.facebook.com', []);
  return browser;
};
const getDefaultPage = async (browser) => {
  const page = await browser.newPage();
  await page.setViewport({
    width: 800,
    height: 800,
    deviceScaleFactor: 1,
  });
  await page.setDefaultNavigationTimeout(100000);
  return page;
};

(async () => {
  const groupId = process.env.GROUP_ID;
  const playlistId = process.env.PLAYLIST_ID;
  const runLength = Number(process.env.RUN_LENGTH);
  const bucket = process.env.BUCKET_NAME;
  const jobId = uuidv4();
  logger.defaultMeta = {
    groupId, playlistId, bucket, jobId,
  };

  if (!groupId || !playlistId || !runLength || !bucket) {
    logger.warn('Invalid groupId/playlistId/runLength/bucket parameters received. Exiting');
    process.exit(0);
  }

  const browser = await getDefaultBrowser(properties.headless);
  const page = await getDefaultPage(browser);
  page.deleteCookie();
  const cookies = await ssm.getParameter('/FacebookGroupify/FacebookCookies')
    .then((facebookCookies) => JSON.parse(facebookCookies))
    .catch((error) => {
      logger.error(`Unable to fetch Facebook cookies: ${error}`);
      return {};
    });

  if (cookies && Object.keys(cookies).length) {
    await facebookGroupHandler.loginWithSession(cookies, page).catch(async (error) => {
      logger.error(`Unable to login using session: ${error}`);
      const username = await ssm.getParameter('/FacebookGroupify/FacebookUsername');
      const password = await ssm.getParameter('/FacebookGroupify/FacebookPassword');
      await facebookGroupHandler.loginWithCredentials(username, password, page);
    });
  } else {
    const username = await ssm.getParameter('/FacebookGroupify/FacebookUsername');
    const password = await ssm.getParameter('/FacebookGroupify/FacebookPassword');
    await facebookGroupHandler.loginWithCredentials(username, password, page);
  }
  await page.cookies().then(async (freshCookies) => {
    await ssm.writeParameter('/FacebookGroupify/FacebookCookies', JSON.stringify(freshCookies, null, 2), true);
  });

  const links = await facebookGroupHandler.get(groupId, page, runLength);

  logger.info(`Found ${links.length} links in group ${groupId}`);

  const linksKey = `links/${groupId}/${playlistId}/${jobId}/batch_1.json`;
  if (links.length > 0) {
    await s3.putToS3(bucket, linksKey, links);
  }
})().then(() => {
  logger.info('Scraping complete');
  process.exit(0);
}).catch((error) => {
  logger.error('Fatal error in link-scraper: ', error);
  process.exit(1);
});
