const AWS = require('aws-sdk');
const sharedUtil = require('./utils.js');

const ddb = new AWS.DynamoDB({
  apiVersion: '2012-08-10',
});
const logger = sharedUtil.getLogger();

const TABLE_NAME = 'FacebookGroupify-DuplicateTable';
module.exports = {
  doesTrackExistInPlaylist: async (playlistId, trackId) => {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        PlaylistId: {
          S: playlistId,
        },
        TrackId: {
          S: trackId,
        },
      },
    };

    const getItemPromise = ddb.getItem(params).promise();
    return getItemPromise.then((data) => {
      if (Object.keys(data).length > 0) {
        return true;
      }
      return false;
    }).catch((err) => {
      logger.error('Unable to query DynamoDB: ', err);
      return false;
    });
  },
  putPlaylistTrackInTable: async (playlistId, trackId) => {
    const params = {
      TableName: TABLE_NAME,
      Item: {
        PlaylistId: {
          S: playlistId,
        },
        TrackId: {
          S: trackId,
        },
      },
    };
    const putItemPromise = ddb.putItem(params).promise();
    await putItemPromise.catch((err) => {
      logger.error(`Track/Playlist combo ${trackId}/${playlistId} unable to be inserted into DynamoDB: \n${err}`);
    });
  },
};
