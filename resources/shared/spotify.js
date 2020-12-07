const SpotifyWebApi = require('spotify-web-api-node');
const utils = require('./utils.js');
const ssm = require('./ssm.js');

let spotifyApi = null;

const logger = utils.getLogger();

const spotifyAuthorization = async (refreshToken) => {
  await spotifyApi.setRefreshToken(refreshToken);
  return spotifyApi.refreshAccessToken().then(
    (data) => {
      logger.info('The Spotify access token has been refreshed!');
      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body.access_token);
    },
    (err) => {
      logger.error('Could not refresh access token', err);
    },
  );
};

const getSpotifyApiClient = async () => {
  if (!spotifyApi) {
    const spotifyClientId = await ssm.getParameter('/FacebookGroupify/SpotifyClientId');
    const spotifyClientSecret = await ssm.getParameter('/FacebookGroupify/SpotifyClientSecret');
    const spotifyRefreshToken = await ssm.getParameter('/FacebookGroupify/SpotifyRefreshToken');
    const spotifyRedirectUri = await ssm.getParameter('/FacebookGroupify/SpotifyRedirectUri');
    spotifyApi = new SpotifyWebApi({
      clientId: spotifyClientId,
      clientSecret: spotifyClientSecret,
      redirectUri: spotifyRedirectUri,
    });
    await spotifyAuthorization(spotifyRefreshToken);
  }
  return spotifyApi;
};

module.exports = {
  getSpotifyApiClient,
};
