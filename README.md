# music-downloader
Hackiest music downloader you've ever seen

# Dependencies
yt-search (npm)

eyeD3 (pip)

yt-dlp (pip)

chafa (brew)

```
npm i yt-search
pip install eyeD3
pip install yt-dlp
brew install chafa
```

# Usage

$ `node index.js > /FOLDER_WHERE_YOU_WANT_TO_STORE_MUSIC/download.sh`

$ `cd FOLDER_WHERE_YOU_WANT_TO_STORE_MUSIC`

\# `chmod +x download.sh`

$ `./download.sh`

# Manual Entries

If you listen to a lot of music that doesn't have words, you many need to either fill out manual entries while running download.sh, or edit download.sh before you run it. A manual entry consists of:
|Field|Usage|
|-|-|
|Title|Title of the song|
|Artists| Artists who made the song (seperated by commas except for the last one which is seperated by an `&`)|
|Art|URL of the album cover or song artwork|
|ID|YouTube video id of the song (try not to use music videos as those sometimes have other audio and not just the song)|
