const stringSimilarity = require('string-similarity');
const utils = require('./utils');

const whitelist = ['feat', 'remix', 'mix', 'extend', 'instrumental', 'vip', 'radio', 'edit', 'rework', 'edition', 'dub', 'version', 'club', 'edit', 'explicit', 'vocal', 'bass', 'cover', 'retouch'];
const blacklist = ['video', 'official audio'];
const brackets = {
  '{': '}',
  '(': ')',
  '[': ']',
};
const badKeywords = [
  '&', '(', ')', '{', '}', ']', '[', '+', 'featuring.', 'featuring',
  'feat.', 'feat', 'ft.', 'ft', '"', '-', '–', '~', 'Official Audio', 'Official Music Video',
  'Official Video', 'HD', 'ᴴᴰ', '.', '!', '?', '’', ',', '|',
];

const calculateSimilarity = (title, found) => stringSimilarity.compareTwoStrings(title.toLowerCase(), found.toLowerCase());

const filterBadKeywords = (title) => {
  let cleanedTitle = title;
  for (let i = 0; i < badKeywords.length; i += 1) {
    cleanedTitle = utils.replaceAll(cleanedTitle, badKeywords[i], ' ');
  }
  return cleanedTitle.trim().replace(/ +(?= )/g, '');
};

const filterBracketContent = (title) => {
  let cleanedTitle = title;
  Object.keys(brackets).forEach((openingBracket) => {
    const closingBracket = brackets[openingBracket];
    for (let i = 0; i < title.length; i += 1) {
      if (title.charAt(i) === openingBracket) {
        let bracketsOpenCount = 0;
        for (let j = i + 1; j < title.length; j += 1) {
          if (title.charAt(j) === openingBracket) {
            bracketsOpenCount += 1;
          }
          if (title.charAt(j) === closingBracket && bracketsOpenCount > 0) {
            bracketsOpenCount -= 1;
          }
          if (title.charAt(j) === closingBracket && bracketsOpenCount === 0) {
            const bracketContents = (title.substring(i, j + 1));
            let shouldRemove = true;

            for (let w = 0; w < whitelist.length; w += 1) {
              if (bracketContents.toLowerCase().includes(whitelist[w])) {
                shouldRemove = false;
                break;
              }
            }
            for (let b = 0; b < blacklist.length; b += 1) {
              if (bracketContents.toLowerCase().includes(blacklist[b])) {
                shouldRemove = true;
                break;
              }
            }
            if (shouldRemove) {
              cleanedTitle = cleanedTitle.replace(bracketContents, ' ');
            }
            break;
          }
        }
      }
    }
  });
  return cleanedTitle.trim().replace(/ +(?= )/g, '');
};

module.exports = {
  calculateSimilarity,
  filterBracketContent,
  filterBadKeywords,
  badKeywords,
};
