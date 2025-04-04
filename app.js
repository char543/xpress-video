const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

const YT_API_KEY = process.env.YT_API_KEY;
const YT_PLAYLIST_ID = process.env.YT_PLAYLIST_ID;

app.get('/gallery', async (req, res) => {
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: {
        part: 'snippet',
        playlistId: YT_PLAYLIST_ID,
        maxResults: 12,
        key: YT_API_KEY
      }
    });

    const videos = response.data.items.map(item => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`
    }));

    res.json(videos);
  } catch (error) {
    console.error("Error fetching YouTube videos:", error.message);
    res.status(500).send("Error fetching videos.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});