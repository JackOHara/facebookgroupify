const { filterBracketContent, filterBadKeywords, badKeywords } = require('../../shared/matchingUtils');

const TEST_TITLE = 'Artist - name';
const TEST_TITLE_CLEAN = 'Artist name';

describe('Bad Keyword Filtering', () => {
  test('Bad keywords are removed from title', () => {
    let badKeywordTitle = TEST_TITLE;
    badKeywords.forEach((badKeyword) => { badKeywordTitle += ` ${badKeyword}`; });
    const titleWithBadKeywordsFiltered = filterBadKeywords(badKeywordTitle);
    expect(titleWithBadKeywordsFiltered).toBe(TEST_TITLE_CLEAN);
  });
  test('Title with no bad keywords remains unchanged', () => {
    const titleWithBadKeywordsFiltered = filterBadKeywords(TEST_TITLE);
    expect(titleWithBadKeywordsFiltered).toBe(TEST_TITLE_CLEAN);
  });
});

describe('Bracket Content Filtering', () => {
  test('Non whitelisted bracket content is removed', () => {
    const title = `${TEST_TITLE} (random)`;
    const titleWithBracketContentFiltered = filterBracketContent(title);
    expect(titleWithBracketContentFiltered).toBe(TEST_TITLE);
  });

  test('Multiple non whitelisted bracket content is removed', () => {
    const title = `${TEST_TITLE} (cool) (uh oh)`;
    const titleWithBracketContentFiltered = filterBracketContent(title);
    expect(titleWithBracketContentFiltered).toBe(TEST_TITLE);
  });

  test('Blacklisted bracket content is removed', () => {
    const title = `${TEST_TITLE} (official video)`;
    const titleWithBracketContentFiltered = filterBracketContent(title);
    expect(titleWithBracketContentFiltered).toBe(TEST_TITLE);
  });

  test('Multiple blacklisted bracket content is removed', () => {
    const title = 'Artist (video) - name (official video)';
    const titleWithBracketContentFiltered = filterBracketContent(title);
    expect(titleWithBracketContentFiltered).toBe(TEST_TITLE);
  });

  test('Blacklisted content overrides whitelisted content in brackets', () => {
    const title = `${TEST_TITLE} (remix video)`;
    const titleWithBracketContentFiltered = filterBracketContent(title);
    expect(titleWithBracketContentFiltered).toBe(TEST_TITLE);
  });

  test('Content without brackets remain unchanged', () => {
    const titleWithBracketContentFiltered = filterBracketContent(TEST_TITLE);
    expect(titleWithBracketContentFiltered).toBe(TEST_TITLE);
  });

  test('Square bracket content is processed', () => {
    const title = `${TEST_TITLE} [ayy lmao]`;
    const titleWithBracketContentFiltered = filterBracketContent(title);
    expect(titleWithBracketContentFiltered).toBe(TEST_TITLE);
  });

  test('Only one opening bracket does not effect content', () => {
    const title = 'Artist - name [ayy lmao';
    const titleWithBracketContentFiltered = filterBracketContent(title);
    expect(titleWithBracketContentFiltered).toBe(title);
  });
  test('Different brackets within brackets are respected', () => {
    const title = 'Artist - name [ayy remix( uh oh )]';
    const expectedTitle = 'Artist - name [ayy remix ]';
    const titleWithBracketContentFiltered = filterBracketContent(title);
    expect(titleWithBracketContentFiltered).toBe(expectedTitle);
  });

  test('Content of outside bracket is respected', () => {
    const title = 'Artist - name (ayy ( uh remix oh ))';
    const titleWithBracketContentFiltered = filterBracketContent(title);
    expect(titleWithBracketContentFiltered).toBe(title);
  });
});
