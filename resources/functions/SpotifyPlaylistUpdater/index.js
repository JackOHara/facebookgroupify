const pLimit = require('p-limit');

const utils = require('../../shared/utils.js');
const s3 = require('../../shared/s3.js');
const ddb = require('../../shared/dynamoDb.js');
const spotify = require('../../shared/spotify.js');

const logger = utils.getLogger();
const limit = pLimit(1);

const chunks = (array, size) => {
  const results = [];
  while (array.length) {
    results.push(array.splice(0, size));
  }
  return results;
};

const main = async (bucket, key) => {
  const keyMetadata = utils.parseKeyMetadata(key);
  logger.defaultMeta = { ...keyMetadata, bucket };

  const spotifyIds = await s3.getFromS3(bucket, key);
  logger.info(`Adding ${spotifyIds.length} songs from Facebook group ${keyMetadata.groupId} to playlist ${keyMetadata.playlistId}`);

  await spotify.initialise();

  const spotifyIdsNotInPlaylist = [];
  await Promise.all(spotifyIds.map(async (spotifyId) => {
    const inPlaylist = await ddb.doesTrackExistInPlaylist(keyMetadata.playlistId, spotifyId);
    if (!inPlaylist) {
      spotifyIdsNotInPlaylist.push(spotifyId);
    } else {
      logger.info(`Playlist/Track ${keyMetadata.playlistId}/${spotifyId} already exists in playlist`);
    }
  }));

  spotifyIdBatches = chunks(spotifyIdsNotInPlaylist, 50);
  await Promise.all(spotifyIdBatches.map(async (spotifyIdBatch) => {
    await spotify.insertTracksIntoPlaylist(keyMetadata.playlistId, spotifyIdBatch).then(async () => {
      logger.info(`Batch inserted into ${keyMetadata.playlistId}`);
    }).catch(async () => {
      await Promise.all(spotifyIdBatch.map(async (spotifyId) => {
        await spotify.insertTrackIntoPlaylist(keyMetadata.playlistId, spotifyId);
      }));
    });
  }));

  logger.info('Spotify playlist update complete');
};

// node -e 'require("./index").local("facebookgroupify", "titles/youtube/288793014548229/3VplcKeh8xdbII33VdS4gH/47c1d219-8cef-49aa-a966-978338276845/3.json")'
exports.local = async (bucket, key) => main(bucket, key);

exports.handler = async (event, context, callback) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  await main(bucket, key);
};
