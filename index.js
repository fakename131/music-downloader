const fs = require('fs').promises;
const path = require('path');
const express = require('express');
const yts = require('yt-search');
const WebSocket = require('ws');

const cacheDir = path.join(__dirname, 'cache');

const webPort = 8365;
const wssPort = 8366;

const app = express();
const wss = new WebSocket.Server({ port: wssPort });
let ws;

let cb = undefined;

wss.on('listening', () => {
  console.warn(`Live server started at :${wssPort}`);
})

wss.on('connection', (wsc) => {
  ws = wsc;
  console.warn('Client connected');

  wsc.on('message', (message) => {
    if (message.toString().startsWith('state')) wsc.send(message);
    if (message.toString().startsWith('tell')) {
      if (message.toString().startsWith('tell')) {
        cb(message.toString().substring(6));
        cb = undefined;
      }
    }
    if (message.toString().startsWith('bash ')) console.log(message.toString().substring(5));
  });

  wsc.on('close', () => {
    console.warn('Client disconnected');
  });
});

app.use(express.static('public'));

app.get('/search/:query', async (req, res) => {
  ws.send('state searching');
  const genius = await fetch(`https://genius.com/api/search/multi?per_page=5&q=${req.params['query']}`);
  const json = await genius.json();
  let s = 1;
  for (let i = 0; i < json.response.sections.length; i++) {
    if (json.response.sections[i].type == 'album') {
      s = i;
      break;
    }
  }
  res.json(json.response.sections[s].hits);
});

app.get('/ssearch/:query', async (req, res) => {
  ws.send('state s searching');
  const genius = await fetch(`https://genius.com/api/search/multi?per_page=5&q=${req.params['query']}`);
  const json = await genius.json();
  let s = 1;
  for (let i = 0; i < json.response.sections.length; i++) {
    if (json.response.sections[i].type == 'song') {
      s = i;
      break;
    }
  }
  res.json(json.response.sections[s].hits);
});

app.get('/songs/:name/:album', async (req, res) => {
  const albumKey = Buffer.from(req.params.album, 'utf8').toString('base64');

  try {
    const cachedResponse = await getCachedResponse(albumKey);

    if (cachedResponse) {
      res.json(cachedResponse);
    } else {
      ws.send(`state ${req.params['name']} > tracklist`);
      const songs = [];
      const genius = await fetch(req.params['album']);
      const html = await genius.text();
      const tracklisthtml = html.split('text_label text_label--gray u-half_bottom_margin')[1].split('column_layout-column_span column_layout-column_span--secondary')[0];
      const trackshtml = tracklisthtml.split('chart_row-content"');
      for (let i = 1; i < trackshtml.length; i++) {
        songs[songs.length] = await song(req.params['name'], `${i}/${trackshtml.length - 1}`, trackshtml[i].split('href="')[1].split('"')[0]);
      }
      await cacheResponse(albumKey, songs);
      res.json(songs);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/song/:name/:song', async (req, res) => {
  ws.send(`state ${req.params['name']}`);
  const single = await song(req.params['name'], `1/1`, req.params['song']);
  res.json(single);
});

async function song(name, frac, url) {
  const lyrics = await fetch(url);
  const lyricText = await lyrics.text();
  const gid = lyricText.split('song_id","values":["')[1].split('"]}')[0];
  ws.send(`state ${name} > ${frac}`);
  const song = await fetch(`https://genius.com/api/songs/${gid}`);
  const songJson = await song.json();
  ws.send(`state ${name} > ${frac} > title`);
  const title = songJson.response.song.title;
  ws.send(`state ${name} > ${frac} > artists`);
  const artists = [...songJson.response.song.primary_artist.name.split(/, | & /)];
  if (songJson.response.song.featured_artists && songJson.response.song.featured_artists.length > 0) {
    const featuredArtists = songJson.response.song.featured_artists.map(artist => artist.name);
    artists.push(...featuredArtists);
  }
  for (let i = 0; i < artists.length; i++) artists[i] = artists[i].replace('$', '\\$');
  ws.send(`state ${name} > ${frac} > length`);
  const length = await getLength(gid);
  ws.send(`state ${name} > ${frac} > youtube search`);
  const ytid = await getYTID(`${artists[0]} - ${title}`, length);
  if (ytid.length == 0) {
    ws.send(`ask ${artists[0]} - ${title}`);
    ytid[0] = await new Promise((resolve, reject) => cb = resolve);
  }
  return {
    title: title.replace('$', '\\$'),
    artists,
    length,
    ytid,
    gid
  }
}

async function getLength(id) {
  const req = await fetch(`https://genius.com/songs/${id}/apple_music_player`);
  const res = await req.text();
  try {
    const length = res.split('duration&quot;:')[1].split(',')[0];
    return Number.parseFloat(length);
  } catch (e) {
    return 9864; // high number
  }
}

async function getYTID(q, targetSecs) {
  const vids = await yts(q);
  let filtered = vids.videos.filter((vid) => {
    const secs = Number(vid.timestamp.split(':')[0] * 60) + Number(vid.timestamp.split(':')[1]);
    let diff = targetSecs - secs;
    if (diff < 0) diff = -diff;
    return diff < 3;
  });
  if (filtered.length == 0) return [];
  return [filtered[0].videoId];
}

System = { out: { println: console.warn } }

System.out.println("I am going to lick ur balks little boy and then exagerate the swagger of a teen struggling with a home life. Why might this faithful teen be struggling ong ong. Its because his father left when he was 5 to 'ontain the milk' to this day he was never seen to this day after supposedly posting on the opular appp tiktok that he was a male pornstar at this point. now, everyday, the teen edges to his dad as a sign of rememberence")
// penis penis penis penis penis penis vagina penis boobies pejis pejis pejis 
// -Joseph Russo

async function getCachedResponse(cacheKey) {
  try {
    const filePath = path.join(cacheDir, `${cacheKey}.json`);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function cacheResponse(cacheKey, data) {
  try {
    const filePath = path.join(cacheDir, `${cacheKey}.json`);
    await fs.writeFile(filePath, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to cache response for ${cacheKey}: ${error.message}`);
  }
}

app.listen(webPort, () => {
  console.warn(`HTTP server started at :${webPort}`);
});
