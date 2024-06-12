const ws = new WebSocket('ws://localhost:8366');

const alist = document.querySelector('#alist');
const slist = document.querySelector('#slist');
const tabs = document.querySelector('.tabs')
const atab = document.querySelector('#atab');
const stab = document.querySelector('#stab');
const queryIpt = document.querySelector('#query');
const urlIpt = document.querySelector('#urlipt');
const geniusUrl = document.querySelector('#geniusurl');
const titleIpt = document.querySelector('#titleipt');
const artistIpt = document.querySelector('#artistipt');
const idIpt = document.querySelector('#idipt');
const importBtn = document.querySelector('#importbtn');
const searchBtn = document.querySelector('#searchbtn');
const downloadBtn = document.querySelector('#downloadbtn');
const addBtn = document.querySelector('#addbtn');
const artImg = document.querySelector('#cover');
const state = document.querySelector('#state0');

let singlesTab = false;

let albums = [];
let singles = [];

let globalDataDownload = [];

ws.addEventListener('open', (event) => {
    console.log('Connected to the server');
    ws.send('state idle');
});

ws.addEventListener('message', (event) => {
    if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = () => {
            process(reader.result);
        };
        reader.readAsText(event.data);
    } else {
        console.log(event.data);
        process(event.data);
    }
});

function process(msg) {
    if (msg.startsWith('state ')) state.innerText = msg.substring(6);
    if (msg.startsWith('ask')) {
        const id = prompt(`Enter YouTube ID for ${msg.substring(4)}`, '=');
        ws.send(`tell ${id}`);
    }
}

ws.addEventListener('close', (event) => {
    console.log('Disconnected from the server');
});

queryIpt.onkeyup = (e) => {
    if (e.key === 'Enter') {
        if (singlesTab) searchSingle(queryIpt.value)
        else searchAlbum(queryIpt.value);
    }
}
searchBtn.onclick = () => {
    if (singlesTab) searchSingle(queryIpt.value)
    else searchAlbum(queryIpt.value);
}

downloadBtn.onclick = async () => {
    const data = await gatherData();
    for (let i = 0; i < data.length; i++) {
        bash(`echo ">> ${data[i].artists} - ${data[i].name}"`);
        bash(`ATITLE="${data[i].name}"`);
        bash(`AARTISTS="${listToString(data[i].artists)}"`);
        bash(`AART="${data[i].art}"`);
        bash(`curl -s $AART -o cover.png`);
        bash(`chafa cover.png`);
        for (let j = 0; j < data[i].songs.length; j++) {
            bash(`echo " ${data[i].songs[j].artists} - ${data[i].songs[j].title}"`);
            bash(`TITLE="${data[i].songs[j].title}"`);
            bash(`ARTISTS="${listToString(data[i].songs[j].artists)}"`);
            bash(`ID="${data[i].songs[j].ytid[0]}"`);
            bash(`yt-dlp -xq "https://youtube.com/watch?v=$ID" --audio-format mp3 -o "./$ID.mp3"`);
            bash(`eyeD3 -t "$TITLE" -a "$ARTISTS" -A "$ATITLE" -b "$AARTISTS" -n ${j + 1} --add-image cover.png:FRONT_COVER "./$ID.mp3"`)
        }
    }
    for (let i = 0; i < singles.length; i++) {
        const song = await single(singles[i].name, singles[i].url);
        bash(`echo " ${song.artists} - ${song.title}"`);
        bash(`AART="${singles[i].art}"`);
        bash(`curl -s $AART -o cover.png`);
        bash(`chafa cover.png`);
        bash(`TITLE="${song.title}"`);
        bash(`ARTISTS="${listToString(song.artists)}"`);
        bash(`ID="${song.ytid[0]}"`);
        bash(`yt-dlp -xq "https://youtube.com/watch?v=$ID" --audio-format mp3 -o "./$ID.mp3"`);
        bash(`eyeD3 -t "$TITLE" -a "$ARTISTS" --add-image cover.png:FRONT_COVER "./$ID.mp3"`)
    }
    ws.send('state download completed');
    setTimeout(() => ws.send('state idle'), 1500);
};

addBtn.onclick = () => {
    if (singlesTab) addSingle();
    else addAlbum();
}

stab.onclick = () => {
    singlesTab = true;
    if (!tabs.classList.contains('singled')) tabs.classList.add('singled');
}

atab.onclick = () => {
    singlesTab = false;
    if (tabs.classList.contains('singled')) tabs.classList.remove('singled');
}

urlIpt.onchange = () => {
    artImg.src = urlIpt.value;
}

async function searchAlbum(query) {
    const req = await fetch(`/search/${query}`);
    const res = await req.json();
    const name = res[0].result.name;
    const artists = res[0].result.artist.name.split(/, | & /);
    for (let i = 0; i < artists.length; i++) artists[i] = artists[i].replace('$', '\\$');
    const art = res[0].result.cover_art_url;
    const id = res[0].result.id;
    const url = res[0].result.url;
    urlIpt.value = art;
    urlIpt.onchange();
    geniusUrl.value = url;
    titleIpt.value = name;
    artistIpt.value = JSON.stringify(artists);
    idIpt.value = id;
    queryIpt.value = '';
    ws.send('state idle');
}

async function searchSingle(query) {
    const req = await fetch(`/ssearch/${query}`);
    const res = await req.json();
    const name = res[0].result.title;
    const artists = [res[0].result.primary_artist.name];
    for (let i = 0; i < res[0].result.featured_artists; i++) artists.add(res[0].result.featured_artists[i].name);
    for (let i = 0; i < artists.length; i++) artists[i] = artists[i].replace('$', '\\$');
    const art = res[0].result.song_art_image_url;
    const id = res[0].result.id;
    const url = res[0].result.url;
    urlIpt.value = art;
    urlIpt.onchange();
    geniusUrl.value = url;
    titleIpt.value = name;
    artistIpt.value = JSON.stringify(artists);
    idIpt.value = id;
    queryIpt.value = '';
    ws.send('state idle');
}

function addAlbum() {
    let art = urlIpt.value;
    let url = geniusUrl.value;
    let name = titleIpt.value;
    let artists = JSON.parse(artistIpt.value);
    let id = idIpt.value;
    alist.innerHTML += `<div id="a${id}" class="album"><img src="${art}"></img><div class="text"><p class="title">${name}</p><p class="artist">${listToString(artists)}</p></div><button onclick="removeAlbum(${id})">Remove</button></div>`;
    albums[albums.length] = {
        name: name.replace('$', '\\$'),
        artists,
        art,
        id,
        url
    }
}

function addSingle() {
    let art = urlIpt.value;
    let url = geniusUrl.value;
    let name = titleIpt.value;
    let artists = JSON.parse(artistIpt.value);
    let id = idIpt.value;
    slist.innerHTML += `<div id="s${id}" class="album"><img src="${art}"></img><div class="text"><p class="title">${name}</p><p class="artist">${listToString(artists)}</p></div><button onclick="removeSingle(${id})">Remove</button></div>`;
    singles[singles.length] = {
        name: name.replace('$', '\\$'),
        artists,
        art,
        id,
        url
    }
}

function removeAlbum(id) {
    for (let i = 0; i < albums.length; i++) {
        if (albums[i].id == id) {
            albums.splice(i, 1);
            document.querySelector(`#a${id}`).remove();
            break;
        }
    }
}

function removeSingle(id) {
    for (let i = 0; i < albums.length; i++) {
        if (albums[i].id == id) {
            albums.splice(i, 1);
            document.querySelector(`#s${id}`).remove();
            break;
        }
    }
}

async function gatherData() {
    globalDataDownload = [];
    if (albums.length > 16) {
        ws.send('state querying songs');
        for (let i = 0; i < albums.length; i++) {
            globalDataDownload[globalDataDownload.length] = {
                name: albums[i].name,
                artists: albums[i].artists,
                art: albums[i].art,
                id: albums[i].id,
                url: albums[i].url,
                songs: await getSongsFromAlbum(albums[i].name, albums[i].url)
            }
        }
        ws.send('state idle');
    } else {
        await downloadParallel(albums);
    }
    return globalDataDownload;
}

async function downloadParallel(albums) {
    const promises = [];
    for (let i = 0; i < albums.length; i++) {
        promises[i] = downloadOne(albums[i], i);
    }
    await Promise.all(promises);
}

async function downloadOne(album, i) {
    globalDataDownload[i] = {
        name: album.name,
        artists: album.artists,
        art: album.art,
        id: album.id,
        url: album.url,
        songs: await getSongsFromAlbum(album.name, album.url)
    }
}

async function getSongsFromAlbum(name, url) {
    const req = await fetch(`/songs/${encodeURIComponent(name)}/${encodeURIComponent(url)}`);
    return await req.json();
}

async function single(name, url) {
    const req = await fetch(`/song/${encodeURIComponent(name)}/${encodeURIComponent(url)}`);
    return await req.json();
}

function bash(cmd) {
    ws.send(`bash ${cmd}`);
}

function listToString(list) {
    console.log(list);
    let json = JSON.stringify(list)
    json = json.replace('"Tyler","The Creator"', '"Tyler, The Creator"');
    list = JSON.parse(json);
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