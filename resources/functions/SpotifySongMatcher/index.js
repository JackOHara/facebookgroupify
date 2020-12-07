const stringSimilarity = require('string-similarity');
const pLimit = require('p-limit');

const utils = require('../../shared/utils.js');
const s3 = require('../../shared/s3.js');
const spotify = require('../../shared/spotify.js');

let logger = utils.getLogger();
const limit = pLimit(1);

const ALLOWED_THRESHOLD = 0.68;

const findSpotifyMatches = async (songMatcher, titles) => {
  const spotifyIds = new Set();
  await Promise.all(titles.map((title) => limit(async () => {
    const match = await songMatcher.findMatch(title)
      .catch((error) => logger.error('Unable to find song match: ', error));
    if (match && match.similarity >= ALLOWED_THRESHOLD) {
      logger.info(`A good ${match.similarity} similarity was found for ${title}`);
      spotifyIds.add(match.id);
    } else if (match && match.similarity <= ALLOWED_THRESHOLD) {
      logger.info(`A bad ${match.similarity} similarity was found for ${title}`);
    }
  })));
  return Array.from(spotifyIds);
};

const SpotifyService = require('../../shared/spotify-service.js');
const SongMatcher = require('../../shared/song-matcher.js');
const { getSpotifyApiClient } = require('../../shared/spotify.js');

// node -e 'require("./index").local("facebookgroupify", "titles/youtube/288793014548229/3VplcKeh8xdbII33VdS4gH/47c1d219-8cef-49aa-a966-978338276845/3.json")'
const main = async (bucket, key) => {
  const keyMetadata = utils.parseKeyMetadata(key);
  logger = utils.getLogger();
  logger.defaultMeta = { ...keyMetadata, bucket };

  const youtubeTitles = await s3.getFromS3(bucket, key);

  const spotifyClient = await getSpotifyApiClient();
  const spotifyService = new SpotifyService(spotifyClient);
  const songMatcher = new SongMatcher(spotifyService);
  logger.info(`Processing ${Object.keys(youtubeTitles).length} Youtube titles`);
  const matches = await findSpotifyMatches(songMatcher, Object.values(youtubeTitles));
  logger.info(`Found matching Spotify tracks for ${matches.length} Youtube titles`);

  if (matches.length > 0) {
    const matchesKey = `ids/spotify/youtubeGenerated/${keyMetadata.groupId}/${keyMetadata.playlistId}/${keyMetadata.jobId}/${keyMetadata.batch}.json`;
    await s3.putToS3(bucket, matchesKey, matches);
  }
};

//node -e 'require("./index").local("facebookgroupify", "titles/youtube/FourFourMag/7dzrLIhOzsBTZApRHTRlUy/ceedee01-c57e-46da-bd4e-f4fbdbffa09b/batch-1.json")' 
exports.local = async (bucket, key) => main(bucket, key);

exports.handler = async (event, context, callback) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  await main(bucket, key);
};
