Goal
- More accuracy
- More content

A trade off may be needed between content and accuracy.

Refactor spotify and song search class first

How do we evaluate effectiveness?
Return a two maps. One of found songs. One of not found songs but with the best found.
Percent found. 
Manual QA titles and check to see if there are any easy improvements

play about with fuzzy matching threshold

Algo idea

//fuzzy match on our search term
const songTitle
const songArtist
const songName

found = search(songArtist, songName)

if(found = null) {
    remove junk from song name
    search again
    if(search is null)
    search(songTitle)
    if(Search is null){
        remove junk from title.
    }
}


## Result
Found that using a general search versus a specific artist track search yields many more results. That and along with a combination of removing certain characters and "bad" keywords really increased the amount found. "bad" keywords are words that will kill the search, a common one in youtube videos for example is "Official Video". Removing it returns results for most songs. 

Ran the new and improved algo over all data collected so far (1000+) and sorted the results by the similarity score (how similar our search term is to the song found) and that allowed me set a threshold where 99% of everything above it (in my dataset) is correct. The threshold is now 0.68. As soon as the score goes belows that there is a massive drop in accuracy of matches. 
