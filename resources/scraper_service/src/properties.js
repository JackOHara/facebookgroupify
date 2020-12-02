module.exports = {
  headless: true,
  groupId: process.env.GROUP_ID,
  playlistId: process.env.PLAYLIST_ID,
  runLength: Number(process.env.RUN_LENGTH),
  bucket: process.env.BUCKET_NAME,
};
