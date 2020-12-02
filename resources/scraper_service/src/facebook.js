const utils = require('../../shared/utils.js');
const s3 = require('../../shared/s3.js');

const logger = utils.getLogger();

const BATCH_SIZE = 500;

const scroll = async (page) => {
  const previousHeight = await page.evaluate('document.body.scrollHeight');
  await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
  // await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
  await page.waitForTimeout(500);
};

const isLoggedIn = async (page) => {
  await page.goto('https://facebook.com', {
    waitUntil: 'networkidle2',
  });
  await page.waitForSelector('div[role=feed]');
};
const promiseWithTimeout = (timeoutMs, promise) => Promise.race([
  promise(),
  new Promise((resolve, reject) => setTimeout(() => reject(), timeoutMs)),
]);
module.exports = {
  loginWithSession: async (cookies, page) => {
    logger.info('Logging into Facebook using cookies');
    await page.setCookie(...cookies);
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' });
    await isLoggedIn(page).catch((error) => {
      logger.error('App is not logged into Facebook');
      throw error;
    });
  },

  loginWithCredentials: async (username, password, page) => {
    logger.info('Logging into Facebook using credentials for', username);
    await page.goto('https://facebook.com', {
      waitUntil: 'networkidle2',
    });
    await page.waitForSelector('#email');
    await page.type('#email', username);
    await page.type('#pass', password);

    const cookieBanner = 'div[data-testid="cookie-policy-banner"]';
    if (await page.$(cookieBanner) !== null) {
      logger.info('Facebook cookie banner found');
      await page.evaluate((selector) => {
        const elements = document.querySelectorAll(selector);
        for (let i = 0; i < elements.length; i += 1) {
          elements[i].parentNode.removeChild(elements[i]);
        }
      }, cookieBanner);
    }

    await page.click('button[name=login]');
    await page.waitForNavigation();
    await isLoggedIn(page).catch((error) => {
      logger.error('App is not logged into Facebook');
      throw error;
    });
  },

  get: async (groupId, playlistId, bucket, jobId, page, runLength) => {
    // https://stackoverflow.com/a/50869650 delete posts on the dom as we scroll
    const startTime = Date.now();
    const groupUrl = `https://www.facebook.com/groups/${groupId}?sorting_setting=CHRONOLOGICAL`;
    await page.goto(groupUrl);
    logger.info(`Navigating to ${groupUrl}`);
    await page.waitForSelector('div[data-pagelet=GroupFeed]');
    const links = new Set();
    const timeout = runLength * 60 * 1000;

    let batch = 1;
    let retriesLeft = 20;

    await promiseWithTimeout(timeout, async () => {
      while (Date.now() - startTime < timeout) {
        try {
          await scroll(page).catch((err) => logger.warn('Unable to scroll: ', err));
          const feed = await page.$('div[role=feed]');
          const hrefsOnPage = await feed.evaluate(() => Array.from(document.getElementsByTagName('a'), (a) => a.href)
            .filter((link) => {
              if (link.includes('youtube') || link.includes('youtu.be') || link.includes('soundcloud') || link.includes('spotify') || link.includes('bandcamp')) {
                return true;
              }
              return false;
            }));

          // If scrolling isn't providing more content then assume it has reached the end of the page
          const linksSize = links.size;
          hrefsOnPage.forEach((item) => links.add(item));
          if (linksSize === links.size) {
            retriesLeft -= 1;
            if (retriesLeft === 0) {
              logger.info('No more content found on FB group');
              break;
            }
          } else {
            retriesLeft = 10;
          }
        } catch (error) {
          logger.error(`Error scraping facebook group ${error}`);
        }

        logger.info(`Total links: ${links.size}`);

        if (links.size > BATCH_SIZE * batch) {
          const linksKey = `links/${groupId}/${playlistId}/${jobId}/batch-${batch.toString()}.json`;
          const linkBatch = Array.from(links).slice(((batch - 1) * BATCH_SIZE), ((batch) * BATCH_SIZE));
          await s3.putToS3(bucket, linksKey, linkBatch);
          logger.info(`Wrote batch of ${BATCH_SIZE} to s3://${bucket}/${linksKey}`);
          batch += 1;
        }
      }

      const linksKey = `links/${groupId}/${playlistId}/${jobId}/batch-${batch.toString()}.json`;
      const linkBatch = Array.from(links).slice(((batch - 1) * BATCH_SIZE), links.size - 1);
      await s3.putToS3(bucket, linksKey, linkBatch);
      logger.info(`Wrote batch of ${BATCH_SIZE} to s3://${bucket}/${linksKey}`);
    });

    return Array.from(links);
  },
};
