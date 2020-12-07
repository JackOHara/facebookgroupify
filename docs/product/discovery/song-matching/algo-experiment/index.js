const SpotifyWebApi = require('spotify-web-api-node');
const SpotifyService = require('../../../../../resources/shared/spotify-service');

const getSpotifyService = async () => {
  const clientId = await ssm.getParameter('/FacebookGroupify/SpotifyClientId');
  const clientSecret = await ssm.getParameter('/FacebookGroupify/SpotifyClientSecret');
  const redirectUri = await ssm.getParameter('/FacebookGroupify/SpotifyRedirectUri');
  const refreshToken = await ssm.getParameter('/FacebookGroupify/SpotifyRefreshToken');
  const spotifyWebApi = new SpotifyWebApi({
    clientId,
    clientSecret,
    redirectUri,
  });
  const spotifyService = new SpotifyService(spotifyWebApi);
  await spotifyService.initialise(refreshToken);
  return spotifyService;
};

const glob = require('glob');
const util = require('util');
const fs = require('fs').promises;

const globPromise = util.promisify(glob);
const getAllTitles = async () => {
  const allTitles = await globPromise('./data/**/*.json').then(async (files) => {
    const titles = new Set();
    for (let f = 0; f < files.length; f += 1) {
      const file = files[f];
      await fs.readFile(file, { encoding: 'utf8' })
        .then(async (rawdata) => {
          const titleValues = Object.values(JSON.parse(rawdata));
          for (let i = 0; i < titleValues.length; i += 1) {
            titles.add(titleValues[i]);
          }
        })
        .catch((error) => console.log(error));
    }

    return Array.from(titles);
  });
  return allTitles;
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
const NAME_SIMILARITY_THRESHOLD = 0.68;
const ARTIST_SIMILARITY_THRESHOLD = 0.75;
const stringSimilarity = require('string-similarity');
const ssm = require('../../../../../resources/shared/ssm.js');

const similar = (title, found) => stringSimilarity.compareTwoStrings(title.toLowerCase(), found.toLowerCase());

/* maybe remove duplicate artist name in string returned
    write function to remove all brackets and contents where it contains killer keyword
*/

const removeBadBrackets = (title) => {
  const brackets = {
    '{': '}',
    '(': ')',
    '[': ']',
  };
  let cleanedTitle = title;
  const whitelist = ['feat', 'remix', 'mix', 'extend', 'instrumental', 'vip', 'radio', 'edit', 'rework', 'edition', 'dub', 'version', 'club', 'edit', 'explicit', 'vocal', 'bass', 'cover', 'retouch'];
  const blacklist = ['video'];
  for (const openingBracket of Object.keys(brackets)) {
    const closingBracket = brackets[openingBracket];
    for (let i = 0; i < title.length; i += 1) {
      if (title.charAt(i) === openingBracket) {
        for (let j = i + 1; j < title.length; j += 1) {
          if (title.charAt(j) === closingBracket) {
            const contents = (title.substring(i, j + 1));
            let shouldRemove = true;
            for (let w = 0; w < whitelist.length; w++) {
              if (contents.toLowerCase().includes(whitelist[w])) {
                shouldRemove = false;
                break;
              }
            }
            for (let b = 0; b < blacklist.length; b++) {
              if (contents.toLowerCase().includes(blacklist[b])) {
                shouldRemove = true;
                break;
              }
            }

            if (shouldRemove) {
              cleanedTitle = cleanedTitle.replace(contents, ' ');
            }
            break;
          }
        }
      }
    }
  }
  return cleanedTitle;
};

const cleanTitle = (title) => {
  let cleanedTitle = title;

  cleanedTitle = removeBadBrackets(cleanedTitle);

  cleanedTitle = cleanedTitle

    .replaceAll('&', ' ')
    .replaceAll('(', ' ')
    .replaceAll(')', ' ')
    .replaceAll('+', ' ')
    .replaceAll('{', ' ')
    .replaceAll('}', ' ')
    .replaceAll('[', ' ')
    .replaceAll(']', ' ')
    .replaceAll('featuring.', ' ')
    .replaceAll('featuring', ' ')
    .replaceAll('feat.', ' ')
    .replaceAll('feat', ' ')
    .replaceAll('ft.', ' ')
    .replaceAll('ft', ' ')
    .replaceAll('"', ' ')
    .replaceAll('-', ' ')
    .replaceAll('~', ' ')
    .replaceAll('(Official Audio)', '')
    .replaceAll('(Official Music Video)', '')
    .replaceAll('(Official Video)', '')
    .replaceAll('(HD)', '')
    .replaceAll('ᴴᴰ', ' ')
    .replaceAll('.', ' ')
    .replaceAll('!', ' ')
    .replaceAll('?', ' ')
    .replaceAll('’', ' ')
    .replaceAll(',', ' ')
    .replaceAll('|', ' ')
    .trim();

  cleanedTitle = cleanedTitle.replace(/ +(?= )/g, '');

  return cleanedTitle;
};

/*
output the best result for each to excel, sort by score. use that to decide similarity
0.68 threshold for similarity
*/
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
// aws s3 cp s3://facebookgroupify/titles/youtube/ . --recursive   
(async () => {
  const titles = await getAllTitles();
  const spotifyService = await getSpotifyService();
  const results = [];
  for (let i = 0; i < titles.length; i += 1) {
    const originalTitle = titles[i];

    const cleanedTitle = cleanTitle(originalTitle);
    if (cleanedTitle.split(' ').length <= 1) {
      continue;
    } else if (cleanedTitle.split(' ').length <= 4) {
      if (!cleanedTitle.includes('|') || !cleanedTitle.includes('-')) {
        continue;
      }
    }
    const foundSongs = await spotifyService.searchTrackByTitle(`"${cleanedTitle}"`);
    if (foundSongs.length === 0) {
      continue;
    }
    for (let f = 0; f < foundSongs.length; f += 1) {
      let similarString = foundSongs[f].name;
      for (let a = 0; a < foundSongs[f].artists.length; a += 1) {
        if (!similarString.includes(foundSongs[f].artists[a])) {
          similarString = `${foundSongs[f].artists[a]} ${similarString}`;
        }
      }
      similarString = cleanTitle(similarString);
      const similarity = similar(cleanedTitle, similarString);
      foundSongs[f].similarity = similarity;
      foundSongs[f].similarString = similarString;
      foundSongs[f].cleanedTitle = cleanedTitle;
      foundSongs[f].originalTitle = originalTitle;
    }

    let bestSong = null;
    for (let foundIndex = 0; foundIndex < foundSongs.length; foundIndex += 1) {
      if (bestSong == null) {
        bestSong = foundSongs[foundIndex];
      } else if (foundSongs[foundIndex].similarity > bestSong.similarity) {
        bestSong = foundSongs[foundIndex];
      }
    }
    delete bestSong.id;
    delete bestSong.artists;
    delete bestSong.name;
    delete bestSong.id;
    results.push(bestSong);
    
  }
  console.log(results);
  const csvWriter = createCsvWriter({
    path: 'results.csv',
    header: [
      { id: 'originalTitle', title: 'Original Title' },
      { id: 'similarString', title: 'Similarity String Title' },
      { id: 'similarity', title: 'Similarity' },
      { id: 'cleanedTitle', title: 'Cleaned Title' },
    ],
  });
  csvWriter.writeRecords(results)
    .then(() => {
        console.log('...Done');
    });
//   const trackResult = await spotifyService.searchTrackByTitle('vegyn - blue verb');
//   const artistResult = await spotifyService.searchTrackByArtistAndName('vegyn', '  blue verb');
//   console.log(trackResult);
//   console.log(artistResult);
})();
