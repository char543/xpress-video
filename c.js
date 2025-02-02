const express = require('express');
const axios = require('axios');
const basicAuth = require('basic-auth');
const xml2js = require('xml2js');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

const app = express();

app.use(express.json());

require('dotenv').config();

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL;
const NEXTCLOUD_AUTH = { username: process.env.NEXTCLOUD_USERNAME, password: process.env.NEXTCLOUD_PASSWORD };

const DAILY_USERNAME = process.env.DAILY_USERNAME
const DAILY_PASSWORD = process.env.DAILY_PASSWORD
const DAILY_API_BASE = "https://api.dailymotion.com";
let DAILY_ACCESS_TOKEN = null;
let tokenExpirationTime = 0;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET

const scope = 'manage_videos';

// Get Dailymotion Access Token using the 'password' grant type
async function getAccessToken() {
    if (!DAILY_ACCESS_TOKEN || Date.now() >= tokenExpirationTime) {
        console.log('[🔄] Token expired or not available, requesting a new one...');
        try {
            const response = await axios.post('https://api.dailymotion.com/oauth/token', 
                new URLSearchParams({
                    grant_type: 'password',
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    username: DAILY_USERNAME,
                    password: DAILY_PASSWORD,
                    scope: scope,
                }),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }
            );

            DAILY_ACCESS_TOKEN = response.data.access_token;
            tokenExpirationTime = Date.now() + response.data.expires_in * 1000; 
            console.log('[🔑] DMToken:', DAILY_ACCESS_TOKEN);
        } catch (error) {
            console.error('[❌] Error obtaining access token:', error.message);
            if (error.response) {
                console.error('[❌] Detailed error:', error.response.data);
            }
            throw new Error('Failed to fetch Dailymotion access token');
        }
    }
    return DAILY_ACCESS_TOKEN;
}

//get channel id 
async function getChannelId() {
    const response = await axios.get(`${DAILY_API_BASE}/user/${DAILY_USERNAME}`, {
        headers: { Authorization: `Bearer ${DAILY_ACCESS_TOKEN}` },
    });
    console.warn('[🍆] Channel ID:', response.data.id);
    return (response.data.id);
}

//get available channels
async function getAvailableChannels() {
    const channels = await axios.get(`${DAILY_API_BASE}/channels`, {
        headers: { Authorization: `Bearer ${DAILY_ACCESS_TOKEN}` },
    });
    console.log('[🌐] Available Channels:', channels.data);
    return (channels.data)
}

async function getLimits() {
    const limits = await axios.get(`${DAILY_API_BASE}/me/?fields=limits`, {
        headers: { Authorization: `Bearer ${DAILY_ACCESS_TOKEN}` },
    });
    console.log('[🌐] Limits:', limits.data);
    return(limits.data)
}

//return list of videos from nextcloud
app.get('/api/nextcloud/videos', async (req, res) => {
    try {
        console.error('[🌐] Trying NextCloud Request');
        const response = await axios({
            method: 'PROPFIND',
            url: NEXTCLOUD_URL,
            auth: NEXTCLOUD_AUTH,
            headers: { Depth: 1 },
        });

        console.warn('[🌐] Received XML data');
        
        const parser = new xml2js.Parser({ explicitArray: false });
        parser.parseString(response.data, (err, result) => {
            if (err) {
                console.error('[❌] Error parsing XML:', err);
                res.status(500).send("Error parsing XML.");
                return;
            }

            const files = [];
            const responses = result['d:multistatus']['d:response'];

            responses.forEach(file => {
                const href = file['d:href'];
                const props = file['d:propstat']['d:prop'];
                
                if (!props['d:resourcetype']['d:collection']) {
                    const contentType = props['d:getcontenttype'];
                    const name = href.split('/').pop();

                    if (contentType && contentType.startsWith('video/') && !(name.startsWith('.'))) {
                        files.push({
                            name: href.split('/').pop(),
                            path: href, 
                            fullPath: `${NEXTCLOUD_URL}${name}`,
                            size: props['d:getcontentlength'], 
                            type: props['d:getcontenttype'],
                            modified: props['d:getlastmodified'], 
                        });
                    }
                }
            });

            console.log('[📂] Parsed Files:', files);
            res.json(files); 
        });
    } catch (error) {
        console.error('[💩] Error fetching Nextcloud videos:', error);
        res.status(500).send("Error fetching videos.");
    }
});

//upload video to dailymotion

// app.post('/api/dailymotion/upload', async (req, res) => {
//     const { videos } = req.body;

//     if (!videos || videos.length === 0) {
//         return res.status(400).send('No videos provided for upload.');
//     }

//     try {
//         const token = await getAccessToken();
        
//         const channelId = await getChannelId();

//         const uploadResults = await Promise.all(videos.map(async (video) => {
//             try {
//                 console.log(`[📂] Fetching video from Nextcloud: ${video.fullPath}`);
//                 const videoFile = await axios.get(video.fullPath, {
//                     auth: NEXTCLOUD_AUTH,
//                     responseType: 'arraybuffer',
//                 });

//                 const uploadUrlResponse = await axios.get(`${DAILY_API_BASE}/file/upload`, {
//                     params: { access_token: token },
//                 });

//                 const uploadUrl = uploadUrlResponse.data.upload_url;
//                 console.log('[🌐] Upload URL:', uploadUrl);

//                 const FormData = require('form-data');
//                 const form = new FormData();
//                 form.append('file', Buffer.from(videoFile.data), video.name);

//                 const uploadResponse = await axios.post(uploadUrl, form, {
//                     headers: { ...form.getHeaders() },
//                     maxContentLength: Infinity,
//                     maxBodyLength: Infinity,
//                 });

//                 console.log('Upload Response:', uploadResponse.data);

//                 if (!uploadResponse.data || !uploadResponse.data.url) {
//                     throw new Error('Invalid upload response from Dailymotion');
//                 }

//                 console.log('[✅] Creating and publishing video...');
//                 const publishResponse = await axios.post(
//                     // `${DAILY_API_BASE}/user/${channelId}/videos`,  /////////////////// change this line to hardcode the channel ID
//                     `${DAILY_API_BASE}/me/videos`,
//                     {
//                         url: uploadResponse.data.url,
//                         title: video.name,
//                         channel: 'music',
//                         published: true,
//                         is_created_for_kids: false,
//                     },
//                     {
//                         headers: {
//                             Authorization: `Bearer ${token}`,
//                             'Content-Type': 'application/json',
//                         },
//                     }
//                 );
//                 console.log('PUBLISH RESPONSE', publishResponse);

//                 return publishResponse.data;
//             } catch (error) {
//                 console.error(`[❌] Error uploading video (${video.name}):`, error.message);
//                 console.error('[❌] eroor m8', error.response.data)
//                 return { error: error.message, video: video.name };
//             }
//         }));

//         res.json(uploadResults);
//     } catch (error) {
//         console.error('[❌] Error in upload endpoint:', error.message);
//         res.status(500).send('Error uploading videos.');
//     }
// });

app.post('/api/dailymotion/upload', async (req, res) => {
    const localVideoDirectory = path.join(__dirname, 'videos');

    try {
        const videos = fs.readdirSync(localVideoDirectory)
            .filter(file => file.endsWith('.mp4') || file.endsWith('.mkv') || file.endsWith('.avi'))
            .map(file => ({
                name: file,
                path: path.join(localVideoDirectory, file),
                normalizedName: file.replace(/\.[^/.]+$/, '').toLowerCase(),
            }));

        if (!videos.length) {
            return res.status(400).send('No video files found in the local directory.');
        }

        console.log('[📂] Found Local Videos:', videos);

        const token = await getAccessToken();

        const existingVideosResponse = await axios.get(`${DAILY_API_BASE}/me/videos`, {
            params: { fields: 'title', access_token: token },
        });

        const existingVideoTitles = existingVideosResponse.data.list.map(video =>
            video.title.toLowerCase().trim()
        );
        console.log('[📂] Existing Dailymotion Videos:', existingVideoTitles);

        const videosToUpload = videos.filter(video =>
            !existingVideoTitles.includes(video.normalizedName)
        );
        console.log('[📂] Videos to Upload:', videosToUpload);

        if (!videosToUpload.length) {
            return res.status(200).send('All videos are already uploaded.\n');
        }

        const uploadResults = await Promise.all(videosToUpload.map(async (video) => {
            try {
                console.log(`[📂] Preparing to upload video: ${video.name}`);

                const uploadUrlResponse = await axios.get(`${DAILY_API_BASE}/file/upload`, {
                    params: { access_token: token },
                });

                const uploadUrl = uploadUrlResponse.data.upload_url;
                console.log('[🌐] Upload URL:', uploadUrl);

                const videoData = fs.readFileSync(video.path);
                const form = new FormData();
                form.append('file', videoData, video.name);

                const uploadResponse = await axios.post(uploadUrl, form, {
                    headers: { ...form.getHeaders() },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                });

                console.log('[✅] Video Uploaded:', uploadResponse.data);

                const videoUrl = uploadResponse.data.url;
                const videoName = uploadResponse.data.name;

                console.warn('[🌐] Video URL for Publishing:', videoUrl);
                console.warn('[🌐] Video Name for Publishing:', videoName);

                const publishResponse = await axios.post(
                    `${DAILY_API_BASE}/me/videos`,
                    {
                        url: videoUrl,
                        title: videoName,
                        channel: 'music',
                        published: 'true',
                        is_created_for_kids: 'false',
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                    }
                );

                console.log('[✅] Video Published:', publishResponse.data);

                return publishResponse.data;
            } catch (error) {
                console.error(`[❌] Error processing video (${video.name}):`, error.response?.data || error.message);
                return { error: error.message, video: video.name };
            }
        }));

        res.json(uploadResults);
    } catch (error) {
        console.error('[❌] Error in upload endpoint:', error.message);
        res.status(500).send('Error uploading videos.');
    }
});

app.get('/gallery', async (req, res) => {
    try {
        const token = await getAccessToken();
        const videosResponse = await axios.get(`${DAILY_API_BASE}/me/videos`, {
            params: { fields: "id,title,thumbnail_url", access_token: token },
        });

        const videos = videosResponse.data.list.map(video => ({ 
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnail_url,
            url: `https://www.dailymotion.com/video/${video.id}`,
        }));

        res.json(videos);
    } catch (error) {
        console.error("[❌] Error fetching Dailymotion videos:", error.message);
        res.status(500).send("Error fetching videos.");
    }
});

(async () => {
    try {
        // const videosResponse = await axios.get('http://localhost:3000/api/nextcloud/videos'); //commented out for testing
        // const videos = videosResponse.data; // testing, put back...
        // console.log('[📂] Videos fetched from Nextcloud:', videos); // testing

        // const uploadResponse = await axios.post('http://localhost:3000/api/dailymotion/upload', {
        //     videos,
        // }, {
        //     headers: { 'Content-Type': 'application/json' },
        // }); // testing

        const token = await getAccessToken();        
        const channelId = await getChannelId();
        // const availableChannels = await getAvailableChannels();
        const limits = await getLimits();

        if (token && channelId) {
            console.warn('[*] Logging Token & Channel:' + token, channelId + '\n');

            const testVideosResponse = await axios.get('http://localhost:3000/gallery');
            const videos = testVideosResponse.data;
            console.warn('[*] Videos fetched from DM:', videos);
        }
        // console.log('[💚] Upload Results:', uploadResponse.data); //testing
    } catch (error) {
        console.error('[❌] Error in fetch/upload workflow:', error);
    }
})();

// Start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
