const utils = require('./utils.js');

const logger = utils.getLogger();

const extractRelevantTrackInfoFromResponse = (items) => {
  const reducedItems = [];
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    const item = items[itemIndex];
    const reducedItem = {};
    reducedItem.id = item.id;
    reducedItem.name = item.name;
    reducedItem.artists = [];
    for (let artistIndex = 0; artistIndex < item.artists.length; artistIndex += 1) {
      const artist = item.artists[artistIndex];
      reducedItem.artists.push(artist.name);
    }
    reducedItems.push(reducedItem);
  }
  return reducedItems;
};

class SpotifyService {
  constructor(spotifyApi) {
    this.spotifyApi = spotifyApi;
  }

  async insertTrackIntoPlaylist(playlistId, trackId) {
    return this.spotifyApi.addTracksToPlaylist(playlistId, [`spotify:track:${trackId}`])
      .then(logger.info(`Playlist/Track ${playlistId}/${trackId} added to playlist`));
  }

  async insertTracksIntoPlaylist(playlistId, trackIds) {
    const fullSpotifyTrackIds = trackIds.map((trackId) => `spotify:track:${trackId}`);
    return this.spotifyApi.addTracksToPlaylist(playlistId, fullSpotifyTrackIds)
      .then(logger.info(`Added ${fullSpotifyTrackIds.length} into playlist ${playlistId}`));
  }

  async searchTrackByArtistAndName(songArtist, songName) {
    const searchTerm = `track:${songName} artist:${songArtist}`;
    return this.spotifyApi.searchTracks(searchTerm)
      .then((data) => extractRelevantTrackInfoFromResponse(data.body.tracks.items));
  }

  async searchTrackByTitle(songTitle) {
    const searchTerm = `"${songTitle}"`;
    return this.spotifyApi.searchTracks(searchTerm)
      .then((data) => extractRelevantTrackInfoFromResponse(data.body.tracks.items));
  }
}

module.exports = SpotifyService;
