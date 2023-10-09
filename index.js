const fs = require('fs');
const yts = require('yt-search');

async function processFile(filename) {
  try {
    const fileContent = fs.readFileSync(filename, 'utf-8');
    const lines = fileContent.split('\n');

    let i = 0;
    for (const line of lines) {
      if (line.trim() === '') continue;

      const jsonResult = await gSearch(line);
      const cleanedData = format(jsonResult);
      if (cleanedData.length == 0) {
        manual(line);
      } else {
        const song = cleanedData[0];
        const length = await getLength(song.id);
        const ids = await ySearch(line, length);
        if (ids.length == 0) halfManual(song.title, song.artists, song.art);
        else log(song.title, song.artists, song.art, ids[0]);
      }
      i++;
      print(`${i}/${lines.length}`);
    }
  } catch (error) {
    console.error('Error reading the file:', error);
  }
}

async function gSearch(q) {
  const req = await fetch(`https://genius.com/api/search/multi?per_page=5&q=${q}`);
  const res = await req.json()
  let s = 1;
  for (let i = 0; i < res.response.sections.length; i++) {
    if (res.response.sections[i].type == 'song') {
      s = i;
      break;
    }
  }
  return res.response.sections[s].hits;
}

function format(dirtySongs) {
  const formattedSongs = [];

  for (const song of dirtySongs) {
    const title = song.result.title;
    const artists = [song.result.primary_artist.name];

    if (song.result.featured_artists && song.result.featured_artists.length > 0) {
      const featuredArtists = song.result.featured_artists.map(artist => artist.name);
      artists.push(...featuredArtists);
    }

    const art = song.result.song_art_image_url;
    const id = song.result.id;

    const formattedSong = {
      title,
      artists,
      art,
      id
    };

    formattedSongs.push(formattedSong);
  }

  return formattedSongs;
}

async function getLength(id) {
  const req = await fetch(`https://genius.com/songs/${id}/apple_music_player`);
  const res = await req.text();
  const length = res.split('duration&quot;:')[1].split(',')[0];
  return Number.parseFloat(length);
}

async function ySearch(q, targetSecs) {
  const vids = await yts(q);
  let filtered = vids.videos.filter((vid) => {
    const secs = Number(vid.timestamp.split(':')[0] * 60) + Number(vid.timestamp.split(':')[1]);
    let diff = targetSecs - secs;
    if (diff < 0) diff = -diff;
    return diff < 3;
  });
  if (filtered.length == 0) return [];
  return [ filtered[0].videoId ];
}

function manual(line) {
  bash(`echo "Manual Entry for ${line}"`)
  bash(`echo "################################################"`);
  bash(`read -p "Title: " TITLE`);
  bash(`read -p "Artists: " ARTISTS`);
  bash(`read -p "Art: " ART`);
  bash(`read -p "ID: " ID`);
  bash(`echo "################################################"`);
  bash(`curl -s $ART -o cover.png`);
  bash(`echo "$TITLE"`);
  bash(`echo "$ARTISTS"`);
  bash(`chafa cover.png`);
  bash(`echo "$ID"`);
  bash(`yt-dlp -xq $ID --audio-format mp3 -o $ID.mp3`);
  bash(`eyeD3 --title "$TITLE" --artist "$ARTISTS" --add-image cover.png:FRONT_COVER "$ID.mp3"`)
  bash(`echo "################################################"`);
}

function halfManual(title, artists, art) {
  bash(`echo "Manual Entry for ${artists[0]} - ${title}"`)
  bash(`echo "################################################"`);
  bash(`read -p "ID: " ID`);
  bash(`echo "################################################"`);
  bash(`curl -s ${art} -o cover.png`);
  bash(`echo "${title}"`);
  bash(`echo "${listToString(artists)}"`);
  bash(`chafa cover.png`);
  bash(`echo "$ID"`);
  bash(`yt-dlp -xq $ID --audio-format mp3 -o $ID.mp3`);
  bash(`eyeD3 --title "${title}" --artist "${listToString(artists)}" --add-image cover.png:FRONT_COVER "$ID.mp3"`)
  bash(`echo "################################################"`);
}

function log(title, artists, art, id) {
  bash(`curl -s ${art} -o cover.png`);
  bash(`echo "${title}"`);
  bash(`echo "${listToString(artists)}"`);
  bash(`chafa cover.png`);
  bash(`echo "${id}"`);
  bash(`yt-dlp -xq ${id} --audio-format mp3 -o ${id}.mp3`);
  bash(`eyeD3 --title "${title}" --artist "${listToString(artists)}" --add-image cover.png:FRONT_COVER "${id}.mp3"`)
  bash(`echo "################################################"`);
}

function listToString(list) {
  if (list.length == 0) return '';
  if (list.length == 1) return list[0];
  if (list.length == 2) return `${list[0]} & ${list[1]}`;
  let final = list[0];
  for (let i = 1; i < list.length - 1; i++) {
    final += ', ';
    final += list[i];
  }
  final += ' & ';
  final += list[list.length - 1];
  return final;
}

processFile('songs.txt');

function print(info) {
  console.warn(info);
}

function bash(cmd) {
  console.log(cmd);
}
