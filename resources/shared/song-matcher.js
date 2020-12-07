const { filterBracketContent, filterBadKeywords, calculateSimilarity } = require('./matchingUtils');
const utils = require('./utils.js');

const logger = utils.getLogger();

class SongMatcher {
  constructor(spotifyService) {
    this.spotifyService = spotifyService;
  }

  async findMatch(title) {
    if (!(title.includes('-') || title.includes('–') || title.includes('|'))) {
      if (title.split(' ').length < 4) {
        logger.info(`${title} : does not contain enough information to search confidentally`);
        return null;
      }
    }
    const cleanedTitle = filterBadKeywords(filterBracketContent(title));

    if (cleanedTitle.split(' ').length <= 1) {
      logger.info(`${title} was reduced to ${cleanedTitle} and does not contain enough information to search confidentally`);
      return null;
    }
    const foundSongs = await this.spotifyService.searchTrackByTitle(`"${cleanedTitle}"`);

    for (let i = 0; i < foundSongs.length; i += 1) {
      // Build and clean a song title from found songs similar to how the search title was done
      let foundTitle = foundSongs[i].name;
      for (let j = 0; j < foundSongs[i].artists.length; j += 1) {
        if (!foundTitle.toLowerCase().includes(foundSongs[i].artists[j].toLowerCase())) {
          foundTitle = `${foundSongs[i].artists[j]} ${foundTitle}`;
        }
      }
      foundTitle = filterBadKeywords(filterBracketContent(foundTitle));
      const similarity = calculateSimilarity(cleanedTitle, foundTitle);
      foundSongs[i].similarity = similarity;
    }

    let bestSong = null;
    for (let foundIndex = 0; foundIndex < foundSongs.length; foundIndex += 1) {
      if (bestSong == null) {
        bestSong = foundSongs[foundIndex];
      } else if (foundSongs[foundIndex].similarity > bestSong.similarity) {
        bestSong = foundSongs[foundIndex];
      }
    }
    if (!bestSong) {
      logger.info(`Nothing was found for ${title}    -     ${cleanedTitle}`);
    }
    return bestSong;
  }
}

module.exports = SongMatcher;
