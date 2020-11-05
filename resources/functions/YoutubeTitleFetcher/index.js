const fetch = require('node-fetch');
const utils = require('../../shared/utils.js');
const s3 = require('../../shared/s3.js');

const logger = utils.getLogger();

const fetchTitleMetadataForYoutubeIds = async (youtubeIds) => {
  const youtubeIdTitleMap = {};
  await Promise.all(youtubeIds.map(async (youtubeId) => {
    const metadataUrl = `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${youtubeId}&format=json`;
    await fetch(metadataUrl)
      .then((res) => res.json())
      .then((json) => {
        youtubeIdTitleMap[youtubeId] = json.title;
      }).catch((e) => {
        logger.error(`Unable to fetch metadata for ${youtubeId} : ${metadataUrl} : ${e}`);
      });
  }));
  return youtubeIdTitleMap;
};
const main = async (bucket, key) => {
  const keyMetadata = utils.parseKeyMetadata(key);
  logger.defaultMeta = { ...keyMetadata, bucket };

  const youtubeIds = await s3.getFromS3(bucket, key);
  logger.info(`Processing ${youtubeIds.length} Youtube IDs`);
  const youtubeIdTitleMap = await fetchTitleMetadataForYoutubeIds(youtubeIds);
  logger.info(`Found title metadata for ${Object.keys(youtubeIdTitleMap).length} IDs`);

  if (Object.keys(youtubeIdTitleMap).length > 0) {
    const youtubeIdTitleMapKey = `titles/youtube/${keyMetadata.groupId}/${keyMetadata.playlistId}/${keyMetadata.jobId}/${keyMetadata.batch}.json`;
    await s3.putToS3(bucket, youtubeIdTitleMapKey, youtubeIdTitleMap);
  }
};

// node -e 'require("./index").local("facebookgroupify", "links/288793014548229/3VplcKeh8xdbII33VdS4gH/47c1d219-8cef-49aa-a966-978338276845/1.json")'
exports.local = async (bucket, key) => main(bucket, key);

exports.handler = async (event, context, callback) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  await main(bucket, key);
};
