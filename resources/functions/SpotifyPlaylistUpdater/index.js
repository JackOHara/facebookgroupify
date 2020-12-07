const pLimit = require('p-limit');

const utils = require('../../shared/utils.js');
const s3 = require('../../shared/s3.js');
const ddb = require('../../shared/dynamoDb.js');

const logger = utils.getLogger();
const limit = pLimit(1);

const chunks = (array, size) => {
  const results = [];
  while (array.length) {
    results.push(array.splice(0, size));
  }
  return results;
};

const SpotifyService = require('../../shared/spotify-service.js');
const { getSpotifyApiClient } = require('../../shared/spotify');

const main = async (bucket, key) => {
  const keyMetadata = utils.parseKeyMetadata(key);
  logger.defaultMeta = { ...keyMetadata, bucket };

  const spotifyIds = await s3.getFromS3(bucket, key);
  logger.info(`Adding ${spotifyIds.length} songs from Facebook group ${keyMetadata.groupId} to playlist ${keyMetadata.playlistId}`);

  const spotifyClient = await getSpotifyApiClient();
  const spotifyService = new SpotifyService(spotifyClient);

  const spotifyIdsNotInPlaylist = [];
  await Promise.all(spotifyIds.map(async (spotifyId) => {
    const inPlaylist = await ddb.doesTrackExistInPlaylist(keyMetadata.playlistId, spotifyId);
    if (!inPlaylist) {
      spotifyIdsNotInPlaylist.push(spotifyId);
    } else {
      logger.info(`Playlist/Track ${keyMetadata.playlistId}/${spotifyId} already exists in playlist`);
    }
  }));

  const spotifyIdBatches = chunks(spotifyIdsNotInPlaylist, 50);
  await Promise.all(spotifyIdBatches.map(async (spotifyIdBatch) => {
    await spotifyService.insertTracksIntoPlaylist(keyMetadata.playlistId, spotifyIdBatch)
      .then(async () => {
        logger.info(`Batch inserted into ${keyMetadata.playlistId}`);
      }).then(async () => {
        await Promise.all(spotifyIdBatch.map(async (spotifyId) => {
          await ddb.putPlaylistTrackInTable(keyMetadata.playlistId, spotifyId);
        }));
      }).catch(async (error) => {
        logger.error(`Somthing went wrong during batch insertion ${error}`);
        await Promise.all(spotifyIdBatch.map(async (spotifyId) => {
          const inPlaylist = await ddb.doesTrackExistInPlaylist(keyMetadata.playlistId, spotifyId);
          if (!inPlaylist) {
            await spotifyService.insertTrackIntoPlaylist(keyMetadata.playlistId, spotifyId)
              .then(async () => {
                await Promise.all(spotifyIdBatch.map(async () => {
                  await ddb.putPlaylistTrackInTable(keyMetadata.playlistId, spotifyId);
                }));
              });
          } else {
            logger.info(`Playlist/Track ${keyMetadata.playlistId}/${spotifyId} already exists in playlist`);
          }
        }));
      });
  }));

  logger.info('Spotify playlist update complete');
};
// 4KKkRiBsA6mFxHEvU9DXeL
// node -e 'require("./index").local("facebookgroupify", "s3://facebookgroupify/ids/spotify/spotifyGenerated/FourFourMag/4KKkRiBsA6mFxHEvU9DXeL/e9f702ed-30fd-43cc-ab50-60bbe4a5262a/batch-1.json")'
exports.local = async (bucket, key) => main(bucket, key);

exports.handler = async (event, context, callback) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  await main(bucket, key);
};
