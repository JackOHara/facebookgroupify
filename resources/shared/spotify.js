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

const getSpotifyApi = async () => {
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
  initialise: async () => {
    await getSpotifyApi();
  },
  insertTrackIntoPlaylist: async (playlistId, trackId) => {
    const spotify = await getSpotifyApi();
    spotify.addTracksToPlaylist(playlistId, [`spotify:track:${trackId}`])
      .then(logger.info(`Playlist/Track ${playlistId}/${trackId} added to playlist`));
  },
  insertTracksIntoPlaylist: async (playlistId, trackIds) => {
    const spotify = await getSpotifyApi();
    const fullSpotifyTrackIds = trackIds.map((trackId) => `spotify:track:${trackId}`);
    await spotify.addTracksToPlaylist(playlistId, fullSpotifyTrackIds)
      .then(logger.info(`Added ${fullSpotifyTrackIds.length} into playlist ${playlistId}`));
  },
  searchTrack: async (songName, songArtist) => {
    const spotify = await getSpotifyApi();
    const searchTerm = `track:${songName} artist:${songArtist}`;
    return spotify.searchTracks(searchTerm).then((data) => data.body.tracks.items);
  },
};
