const stringSimilarity = require('string-similarity');
const pLimit = require('p-limit');

const utils = require('../../shared/utils.js');
const s3 = require('../../shared/s3.js');
const spotify = require('../../shared/spotify.js');

const logger = utils.getLogger();
const limit = pLimit(1);

const NAME_SIMILARITY_THRESHOLD = 0.7;
const ARTIST_SIMILARITY_THRESHOLD = 0.75;

const determineSimilarityScore = (songName, songArtist, foundName, foundArtists) => {
  let bestArtistSimilarity = 0;
  for (let artistIndex = 0; artistIndex < foundArtists.length; artistIndex += 1) {
    const artistSimilarity = stringSimilarity.compareTwoStrings(
      foundArtists[artistIndex].toLowerCase().trim(), songArtist.toLowerCase().trim(),
    );
    if (artistSimilarity > bestArtistSimilarity) {
      bestArtistSimilarity = artistSimilarity;
    }
  }

  const trackNameSimilarity = stringSimilarity.compareTwoStrings(
    foundName.toLowerCase().trim(), songName.toLowerCase().trim(),
  );
  if (trackNameSimilarity > NAME_SIMILARITY_THRESHOLD
    && bestArtistSimilarity > ARTIST_SIMILARITY_THRESHOLD) {
    return (bestArtistSimilarity + trackNameSimilarity) / 2;
  }
  return 0;
};

const findBestMatchingTrack = (songName, songArtist, tracks) => {
  let mostSimilarId;
  let mostSimilarScore = 0;
  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex += 1) {
    const foundName = tracks[trackIndex].name;
    const foundArtists = tracks[trackIndex].artists.map((artist) => artist.name);
    const similarityScore = determineSimilarityScore(songName, songArtist, foundName, foundArtists);
    if (similarityScore > mostSimilarScore) {
      mostSimilarId = tracks[trackIndex].id;
      mostSimilarScore = similarityScore;
    }
  }
  return mostSimilarId;
};

const parseSongNameAndArtistFromTitle = (songTitle) => {
  let splitCharacter = null;
  if (songTitle.indexOf('-') > -1) {
    splitCharacter = '-';
  } else if (songTitle.indexOf('–') > -1) {
    splitCharacter = '–';
  } else if (songTitle.indexOf('|') > -1) {
    splitCharacter = '|';
  }
  if (!splitCharacter) return null;

  const songArtist = songTitle.substring(0, songTitle.indexOf(splitCharacter)).trim();
  const songName = songTitle
    .substring(songTitle.indexOf(splitCharacter) + 1, songTitle.length)
    .replace(/\s*\[.*?\]\s*/g, '')
    .replace('(Official Music Video)', '')
    .replace('(Official Video)', '')
    .replace('(HD)', '')
    .trim();
  return { songName, songArtist };
};

const findSongOnSpotify = async (songTitle) => {
  const songDetails = parseSongNameAndArtistFromTitle(songTitle);
  if (songDetails) {
    const tracks = await spotify.searchTrack(songDetails.songName, songDetails.songArtist);
    const spotifyId = findBestMatchingTrack(songDetails.songName, songDetails.songArtist, tracks);
    if (spotifyId) {
      logger.info(`Found matching Spotify track for: ${songTitle}`);
      return spotifyId;
    }
    logger.info(`Unable to find matching Spotify track for: ${songTitle}`);
    return null;
  }
  logger.warn(`Unable to generate search term for: ${songTitle}`);
  return null;
};

const findSpotifyMatches = async (titles) => {
  const spotifyIds = new Set();
  await Promise.all(titles.map((title) => limit(async () => {
    const spotifyId = await findSongOnSpotify(title)
      .catch((error) => logger.error('Unable to search on Spotify: ', error));
    if (spotifyId) {
      spotifyIds.add(spotifyId);
    }
  })));
  return Array.from(spotifyIds);
};

const main = async (bucket, key) => {
  const keyMetadata = utils.parseKeyMetadata(key);
  const youtubeTitles = await s3.getFromS3(bucket, key);
  await spotify.initialise();

  logger.info(`Processing ${Object.keys(youtubeTitles).length} Youtube titles`);
  const matches = await findSpotifyMatches(Object.values(youtubeTitles));
  logger.info(`Found matching Spotify tracks for ${matches.length} Youtube titles`);

  if (matches.length > 0) {
    const matchesKey = `ids/spotify/youtubeGenerated/${keyMetadata.groupId}/${keyMetadata.playlistId}/${keyMetadata.jobId}/${keyMetadata.batch}.json`;
    await s3.putToS3(bucket, matchesKey, matches);
  }
};

// node -e 'require("./index").local("facebookgroupify", "titles/youtube/288793014548229/3VplcKeh8xdbII33VdS4gH/47c1d219-8cef-49aa-a966-978338276845/3.json")'
exports.local = async (bucket, key) => main(bucket, key);

exports.handler = async (event, context, callback) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
  await main(bucket, key);
};
