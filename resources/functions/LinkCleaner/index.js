const utils = require('../../shared/utils.js');
const s3 = require('../../shared/s3.js');

const logger = utils.getLogger();

const parseIdFromLink = (link, prependingMatcher) => {
  const prependingMatcherEndIndex = link.indexOf(prependingMatcher) + prependingMatcher.length;
  const slicedLink = link.substring(prependingMatcherEndIndex, link.length);
  const id = slicedLink.substring(0, slicedLink.indexOf('%'));
  return id;
};

const fetchIdsFromLinks = async (links) => {
  const youtubeIds = new Set();
  const spotifyIds = new Set();
  while (links.length > 0) {
    const link = links.pop();
    if (link.includes('youtu.be')) {
      const youtubeId = parseIdFromLink(link, 'youtu.be%2F');
      youtubeIds.add(youtubeId);
    } else if (link.includes('youtube.com')) {
      const youtubeId = parseIdFromLink(link, 'youtube.com%2Fwatch%3Fv%3D');
      youtubeIds.add(youtubeId);
    } else if (link.includes('open.spotify.com')) {
      const spotifyId = parseIdFromLink(link, 'open.spotify.com%2Ftrack%2F');
      spotifyIds.add(spotifyId);
    }
  }
  return {
    youtubeIds: Array.from(youtubeIds),
    spotifyIds: Array.from(spotifyIds),
  };
};

const main = async (bucket, key) => {
  const keyMetadata = utils.parseKeyMetadata(key);
  const links = await s3.getFromS3(bucket, key);

  logger.info(`Processing ${links.length} links`);
  const ids = await fetchIdsFromLinks(Array.from(links));

  logger.info(`Parsed ${ids.spotifyIds.length + ids.youtubeIds.length} IDs from links`);
  if (ids.spotifyIds.length > 0) {
    const spotifyIdsKey = `ids/spotify/spotifyGenerated/${keyMetadata.groupId}/${keyMetadata.playlistId}/${keyMetadata.jobId}/${keyMetadata.batch}.json`;
    await s3.putToS3(bucket, spotifyIdsKey, ids.spotifyIds);
  }
  if (ids.youtubeIds.length > 0) {
    const youtubeIdsKey = `ids/youtube/${keyMetadata.groupId}/${keyMetadata.playlistId}/${keyMetadata.jobId}/${keyMetadata.batch}.json`;
    await s3.putToS3(bucket, youtubeIdsKey, ids.youtubeIds);
  }
};

// node -e 'require("./index").local("facebookgroupify", "links/288793014548229/3VplcKeh8xdbII33VdS4gH/47c1d219-8cef-49aa-a966-978338276845/1.json")'
exports.local = async (bucket, key) => main(bucket, key);

exports.handler = async (event, context, callback) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  await main(bucket, key);
};
