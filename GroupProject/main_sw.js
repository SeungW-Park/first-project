// 주상우 : SDK Control
const clientId = "b488526ffa804a92b41f45e03760d3ff";
const clientSecret = "7cd6750d4a0a41eba283685a51292362";
const redirectUri = "https://group-project-10.netlify.app";
const authEndpoint = "https://accounts.spotify.com/authorize";
const scopes = ["playlist-read-private", "playlist-read-collaborative", "user-read-playback-state", "user-modify-playback-state", "user-read-currently-playing", "streaming"];

let isPlaying = false;
let currentTrackUri = null;
let currentTrackIndex = -1;
let player;
let deviceId;
let tracksList = [];

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded and parsed");

  const hash = window.location.hash
    .substring(1)
    .split("&")
    .reduce((initial, item) => {
      if (item) {
        const parts = item.split("=");
        initial[parts[0]] = decodeURIComponent(parts[1]);
      }
      return initial;
    }, {});

  console.log("Hash:", hash);

  window.location.hash = "";

  let _token = hash.access_token;
  if (_token) {
    localStorage.setItem("spotify_token", _token);
  } else {
    _token = localStorage.getItem("spotify_token");
  }

  if (_token) {
    console.log("Token found:", _token);
    initializePlayer(_token);
  } else {
    console.log("No token found");
  }

  // 창 크기 조정 시 사이드 메뉴 닫기
  const closeMenu = () => {
    const header = document.getElementById("header");
    if (header) {
      header.classList.remove("on");
    }
  };

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) closeMenu(); // mobile(760px) 변형 시(resizing) 사이드배너가 열린 상태로 view되는걸 방지
  });
});

/**
 * Spotify 플레이어를 초기화
 * @param {string} token - Spotify API 토큰
 */
const initializePlayer = (token) => {
  const script = document.createElement("script");
  script.src = "https://sdk.scdn.co/spotify-player.js";
  script.async = true;

  document.body.appendChild(script);

  window.onSpotifyWebPlaybackSDKReady = () => {
    player = new Spotify.Player({
      name: "Web Playback SDK",
      getOAuthToken: (cb) => {
        cb(token);
      },
      volume: 0.5,
    });

    player.addListener("ready", ({ device_id }) => {
      console.log("Ready with Device ID", device_id);
      deviceId = device_id;
      activateDevice(token, device_id);
      setupPlaybackControls(token); // 플레이어 제어 버튼 이벤트 리스너 추가
    });

    player.addListener("not_ready", ({ device_id }) => {
      console.log("Device ID has gone offline", device_id);
    });

    player.addListener("player_state_changed", (state) => {
      if (!state) {
        return;
      }
      isPlaying = !state.paused;
      currentTrackUri = state.track_window.current_track.uri;
      currentTrackIndex = tracksList.findIndex((track) => track.uri === currentTrackUri);
      updatePlayButton();
      renderCurrentTrack(state.track_window.current_track);
    });

    player.connect().then((success) => {
      if (success) {
        console.log("The Web Playback SDK successfully connected to Spotify!");
      } else {
        console.error("The Web Playback SDK could not connect to Spotify");
      }
    });
  };
};

/**
 * Spotify 디바이스를 활성화
 * @param {string} token - Spotify API 토큰
 * @param {string} deviceId - Spotify 디바이스 ID
 */
const activateDevice = async (token, deviceId) => {
  console.log("Spotify 디바이스를 활성화")
  try {
    await fetch(`https://api.spotify.com/v1/me/player`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: false,
      }),
    });
    console.log("Device activated");
  } catch (error) {
    console.error("Error activating device:", error);
  }
};

/**
 * 특정 트랙 재생
 * @param {string} uri - Spotify 트랙 URI
 * @param {string} token - Spotify API 토큰
 * @param {number} index - 재생 목록에서의 트랙 인덱스
 */
const playTrack = async (uri, token, index) => {
  if (!token) {
    token = localStorage.getItem("spotify_token");
    if (!token) {
      console.error("No token available");
      return;
    }
  }
  if (!deviceId) {
    console.error("No active device available");
    return;
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [uri],
      }),
    });

    if (response.ok) {
      console.log("Track is playing");
      currentTrackUri = uri;
      currentTrackIndex = index;
      isPlaying = true; // 상태 업데이트
      updatePlayButton(); // 플레이 버튼 업데이트
      getCurrentPlayingTrack(token);

      // 재생 중인 트랙의 아이콘 상태를 업데이트
      document.querySelectorAll(".song-play i").forEach(icon => {
        icon.classList.remove("fa-pause");
        icon.classList.add("fa-play");
      });
      const currentPlayButton = document.querySelectorAll(".song-item")[index].querySelector(".song-play i");
      if (currentPlayButton) {
        currentPlayButton.classList.remove("fa-play");
        currentPlayButton.classList.add("fa-pause");
      }
    } else {
      console.error("Error playing track:", response.statusText);
    }
  } catch (error) {
    console.error("Error playing track:", error);
  }
};

/**
 * 현재 재생 중인 트랙을 Spotify에서 가져오기
 * @param {string} token - Spotify API 토큰
 */
const getCurrentPlayingTrack = async (token) => {
  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/currently-playing`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Currently playing:", data);
    if (data && data.item) {
      currentTrackUri = data.item.uri;
      currentTrackIndex = tracksList.findIndex((track) => track.uri === currentTrackUri);
      renderCurrentTrack(data.item);
    }
  } catch (error) {
    console.error("Error fetching current playing track:", error);
  }
};

/**
 * 현재 재생 중인 트랙 정보 렌더링
 * @param {Object} track - 현재 재생 중인 트랙에 대한 정보가 포함된 객체
 */
const renderCurrentTrack = (track) => {
  const bottomLine = document.getElementById("bottom-line");
  if (!bottomLine) {
    console.error("No bottom-line element found");
    return;
  }

  const { name, album, artists, duration_ms } = track;
  const minutes = Math.floor(duration_ms / 60000);
  const seconds = ((duration_ms % 60000) / 1000).toFixed(0);
  const duration = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  const currentTrackHTML = `<div class="lyrics-controls">
            <div class="lyrics-info">
              <img src="${album.images[0].url}" alt="Album Art" class="lyrics-view">
              <div class="title-artist">
                <div class="lyrics-title">${name}</div>
                <div class="lyrics-artist">${artists.map((artist) => artist.name).join(", ")}</div>
                <div class="lyrics-album">${album.name}</div>
              </div>
            </div>
            <div class="button-combined">
              <button class="lyrics-prev"><span class="skip">이전곡</span><i class="fa-solid fa-backward"></i></button>
              <button class="lyrics-play"><span class="skip">재생버튼</span><i class="fa-solid fa-${isPlaying ? "pause" : "play"}"></i></button>
              <button class="lyrics-next"><span class="skip">다음곡</span><i class="fa-solid fa-forward"></i></button>
            </div>
            <div class="lyrics-duration">${duration}</div>
        </div>`;

  bottomLine.innerHTML = currentTrackHTML;
  setupPlaybackControls(localStorage.getItem("spotify_token"));
};

/**
 * 재생, 일시 정지, 다음, 이전 트랙에 대한 재생 제어 설정
 * @param {string} token - Spotify API 토큰
 */
const setupPlaybackControls = (token) => {
  const playButton = document.querySelector(".lyrics-play");
  playButton.addEventListener("click", () => togglePlayback(token));
  document.querySelector(".lyrics-next").addEventListener("click", () => playNextTrack(token));
  document.querySelector(".lyrics-prev").addEventListener("click", () => playPreviousTrack(token));
};

/**
 * 재생 상태 토글 (재생/일시 정지)
 * @param {string} token - Spotify API 토큰
 */
const togglePlayback = async (token) => {
  if (isPlaying) {
    await pausePlayback(token);
  } else {
    if (currentTrackUri) {
      await playTrack(currentTrackUri, token, currentTrackIndex);
    } else {
      const firstTrackButton = document.querySelector(".song-play");
      if (firstTrackButton) {
        firstTrackButton.click();
      }
    }
  }
  isPlaying = !isPlaying;
  updatePlayButton();
};

/**
 * 재생/일시 정지 버튼 아이콘 업데이트
 */
const updatePlayButton = () => {
  const playButtonIcon = document.querySelector(".lyrics-play i");
  if (playButtonIcon) {
    playButtonIcon.classList.toggle("fa-play", !isPlaying);
    playButtonIcon.classList.toggle("fa-pause", isPlaying);
  }
};

/**
 * 재생 일시 정지
 * @param {string} token - Spotify API 토큰
 */
const pausePlayback = async (token) => {
  if (!deviceId) {
    console.error("No active device available");
    return;
  }

  try {
    await fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    isPlaying = false; // 상태 업데이트
    console.log("Playback paused");
    updatePlayButton(); // 플레이 버튼 업데이트

    // 모든 재생 버튼 아이콘을 초기화
    document.querySelectorAll(".song-play i").forEach(icon => {
      icon.classList.remove("fa-pause");
      icon.classList.add("fa-play");
    });
  } catch (error) {
    console.error("Error pausing playback:", error);
  }
};

/**
 * 다음 트랙으로 건너뛰기
 * @param {string} token - Spotify API 토큰
 */
const skipToNext = async (token) => {
  if (!deviceId) {
    console.error("No active device available");
    return;
  }

  try {
    await fetch(`https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log("Skipped to next track");
  } catch (error) {
    console.error("Error skipping to next track:", error);
  }
};

/**
 * 이전 트랙으로 건너뛰기
 * @param {string} token - Spotify API 토큰
 */
const skipToPrevious = async (token) => {
  if (!deviceId) {
    console.error("No active device available");
    return;
  }

  try {
    const response = await fetch(`https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      console.log("Skipped to previous track");
    } else {
      console.error("Error skipping to previous track:", response.statusText);
    }
  } catch (error) {
    console.error("Error skipping to previous track:", error);
  }
};

/**
 * 재생 목록에서 다음 트랙 재생
 * @param {string} token - Spotify API 토큰
 */
const playNextTrack = (token) => {
  console.info("다음곡을 재생")
  if (currentTrackIndex < tracksList.length - 1) {
    currentTrackIndex++;
    playTrack(tracksList[currentTrackIndex].uri, token, currentTrackIndex);
  } else {
    console.log("This is the last track in the playlist.");
  }
};

/**
 * 재생 목록에서 이전 트랙 재생
 * @param {string} token - Spotify API 토큰
 */
const playPreviousTrack = (token) => {
  if (currentTrackIndex > 0) {
    currentTrackIndex--;
    playTrack(tracksList[currentTrackIndex].uri, token, currentTrackIndex);
  } else {
    console.log("This is the first track in the playlist.");
  }
};

/**
 * Preview URL을 사용하여 트랙 재생
 * @param {string} previewUrl - Spotify 트랙의 미리보기 URL
 */
const playPreview = (previewUrl) => {
  const audio = new Audio(previewUrl);
  audio.play();
};


// 박승원 : UI Control
let scrollPage = 1;
let isLoading = false;
let numberOfSearchedItems;
let result = new Array();
let resultHTML = '';
let isMainScreen = true;

let resultInfo_Name;

//2.5초마다 메인화면 lp판 돌리기
document.addEventListener('DOMContentLoaded', (event) => {
  const lpBoard = document.querySelector('.lp-board');
  const albumJacket1 = document.querySelector('.album-jacket1');

  let jacketUrlList = [
    './img/bp_jk.webp', './img/bp2_jk.webp',
    './img/bts_jk.webp', './img/bts2_jk.webp',
    './img/d6_jk.webp', './img/d62_jk.webp',
    './img/nm_jk.webp', './img/nm2_jk.webp',
    './img/svt_jk.webp', './img/svt2_jk.webp',
    './img/tws_jk.webp', './img/tws2_jk.webp'
  ]

  let currentIndex = 0;

  function changeAlbumJacket() {
    currentIndex = (currentIndex + 1) % jacketUrlList.length;
    albumJacket1.style.background = `url(${jacketUrlList[currentIndex]}) no-repeat center / cover`;
  }

  setInterval(changeAlbumJacket, 2500);

  animationContent = 'rotateLP 5s linear infinite';
  lpBoard.style.animation = animationContent;

  //초기 이미지 세팅
  albumJacket1.style.background = `url(${jacketUrlList[currentIndex]}) no-repeat center / cover`;
})

//로고 클릭 시 메인화면으로 전환
const mainLogo = document.querySelector('.logo');
mainLogo.addEventListener('click', () => {
  const mainAnimation = document.querySelector('.main-animation');
  const musicTitle = document.querySelector('.music_title');
  const songList = document.querySelector('.song-list');

  mainAnimation.style.display = 'flex';
  musicTitle.style.display = 'none';
  songList.style.display = 'none';
})

//로딩화면
const buttonLoad = document.querySelector('.buttonload');

// 렌더링 화면 가져오기
const songList = document.querySelector('.song-list');

// 스크롤 이벤트리스너
songList.addEventListener('scroll', () => {
  const scrollPos = songList.clientHeight + songList.scrollTop;
  const totalHeight = songList.scrollHeight;

  if (scrollPos >= (totalHeight * 0.9)) {
    if (!isLoading) {
      scrollPage++;
      renderNextPage(scrollPage);
    }
  }
})


// 검색 카테고리 선택 시 selectedValue의 값 변경
const selectElement = document.querySelector('#search-option');

let selectedValue = 'track';

selectElement.addEventListener('change', (event) => {
  selectedValue = event.target.value;
  console.log('selected:', selectedValue);
})


// 검색창 focus 시 엔터이벤트리스너
const searchInput = document.querySelector('.search-input');

// 엔터 계속 누르고 있으면 계속 검색되는 것을 막기 위한 bool 변수
let isSearched = false;

searchInput.addEventListener('keydown', (event) => {
  if (event.keyCode == 13 && !isSearched) {
    searchTracksByInput();
    isSearched = true;
  }
});
searchInput.addEventListener('keyup', () => {
  isSearched = false;
})

// 토큰 받아오는 함수, 클라이언트 크리덴셜 방식(스트리밍은 불가, 조회만 가능)
async function getToken() {
  const result = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
    },
    body: "grant_type=client_credentials",
  });

  const data = await result.json();
  return data.access_token;
}

// keyword('블랙핑크' 등)를 이용하여 검색하면
// json(객체 배열) return
// type = 'album', 'artist', 'track', 'show',
//        'episode', 'playlist'
async function searchItems(keyword, page) {
  const token = await getToken();
  let limit = 10;
  let offset = (page - 1) * 10;
  console.log("offset", offset);
  let searchType = selectedValue;

  if (numberOfSearchedItems < offset) {
    return;
  }

  let searchURL = new URL(`https://api.spotify.com/v1/search?q=${keyword}&market=KR&limit=${limit}&offset=${offset}&type=${searchType}&include_external=audio`);

  const result = await fetch(searchURL, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const data = await result.json();
  console.log("searchItems", data);

  numberOfSearchedItems = data[`${searchType}s`].total;

  console.log("total", data[`${searchType}s`].total);
  console.log("items", data[`${searchType}s`].items);
  return data[`${searchType}s`].items;
}

let searchValue;

// 검색창에 입력한 값 받아서 배열로 변환
async function searchTracksByInput() {
  scrollPage = 1;

  searchValue = document.querySelector(".search-input").value;
  document.querySelector(".search-input").value = "";

  if (searchValue == "") {
    alert("검색어를 입력해 주세요.");
    return;
  }

  songList.scrollTo(0, 0);
  buttonLoad.style.display = 'block';

  result = await searchItems(searchValue, 1);
  tracksList = result.map((item) => ({
    uri: item.uri,
    track: item,
  }));

  // "KEYWORD" 검색결과 로 music title 변경
  const musicTitle = document.querySelector('.music_title');

  musicTitle.textContent = `"${searchValue}" 검색결과`;

  //.song-list에 렌더링
  renderBySearch();
}

searchInput.addEventListener("keydown", (event) => {
  if (event.keyCode == 13 && !isSearched) {
    searchTracksByInput();
    isSearched = true;
  }
});
searchInput.addEventListener("keyup", () => {
  isSearched = false;
});

// 검색 결과를 페이지별로 렌더링하고, 이전 결과를 유지하면서 새로운 결과를 추가하는 함수
async function renderBySearch(page = 1) {
    resultHTML = ""; // 첫 페이지일 경우 결과 HTML 초기화

  const resultInfo = result.map((item, i) => {
    const durationInMinutes = Math.floor(Number(item.duration_ms) / 1000 / 60);
    const durationInSeconds = Math.floor((Number(item.duration_ms) / 1000) % 60);
    const formattedSeconds = durationInSeconds < 10 ? `0${durationInSeconds}` : durationInSeconds;

    return {
      albumJacketUrl: `${selectedValue == 'track' ? item.album.images[1].url : item.images[1].url}`,
      songName: item.name,
      artist: `${selectedValue == 'artist' ? item.genres[0] : item.artists[0].name}`,
      totalTime: `${(selectedValue == 'track') ? durationInMinutes + ":" + formattedSeconds : ''}`,
      uri: `${(selectedValue == 'track') ? item.uri : ''}`,
    };
  });

  // 각각의 item 렌더링
  resultInfo.forEach((item, i) => {
    if (selectedValue == 'track') {
      console.log("앨범 x");
      resultHTML += `<div class="song-item" data-uri="${item.uri}"> 
                          <div class="song-info">
                              <img src="${item.albumJacketUrl}" alt="Album Art" width="75">
                              <div class="song-details">
                                  <div class="song-title">${item.songName.length > 15 ? item.songName.substring(0, 15) + ' ...' : item.songName}</div>
                                  <div class="song-artist">${item.artist.length > 15 ? item.artist.substring(0, 15) + ' ...' : item.artist}</div>
                              </div>
                          </div>
                          <div class="song-controls">
                              <div class="song-duration">${item.totalTime}</div>
                              <button class="song-play"><i class="fa-solid fa-play"></i></button>
                          </div>
                      </div>`;
    } else {
      console.log("앨범 o");
      resultHTML += `<div class="song-item">
                          <div class="song-info">
                              <img src="${item.albumJacketUrl}" alt="Album Art" width="75">
                              <div class="song-details">
                                  <div class="song-title">${item.songName.length > 15 ? item.songName.substring(0, 15) + ' ...' : item.songName}</div>
                                  <div class="song-artist">${item.artist.length > 15 ? item.artist.substring(0, 15) + ' ...' : item.artist}</div>
                              </div>
                          </div>
                          <div class="song-controls">
                              <button class="view-details" onclick="getRelatedSongs()"><i class="fa-solid fa-magnifying-glass"><span class="skip">상세 검색</span></i></button>
                          </div>
                      </div>`;
    }
  });

  const musicTitle = document.querySelector('.music_title');
  const mainAnimation = document.querySelector('.main-animation');

  mainAnimation.style.display = 'none';
  musicTitle.style.display = 'block';
  songList.style.display = 'block';
  songList.innerHTML = resultHTML; // 결과를 songList에 추가

  songList.scrollTo(0, 0); // 스크롤을 맨 위로 초기화

  isLoading = false; // 로딩 상태 초기화
  buttonLoad.style.display = 'none'; // 로딩 버튼 숨기기

  // tracksList 업데이트
  tracksList = resultInfo.map((item) => ({ uri: item.uri, track: item }));

  // 스크롤 후 데이터 수신 시 이벤트 리스너 추가
  addEventListenersToSongs(); // 각 노래 아이템에 이벤트 리스너 추가
}


// 무한 스크롤을 통해 다음 페이지의 검색 결과를 렌더링하는 함수
async function renderNextPage(page) {
  isLoading = true;
  buttonLoad.style.display = 'block'; // 로딩 버튼 표시

  const newItems = await searchItems(searchValue, page);

  if (!newItems) {
    buttonLoad.innerText = '마지막 검색 결과입니다.';
    setTimeout(() => {
      buttonLoad.style.display = 'none';
      buttonLoad.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Loading';
    }, 1200);
    return;
  }

  result = result.concat(newItems); // 새로운 아이템을 기존 결과에 추가
  tracksList = result.map((item) => ({
    uri: item.uri,
    track: item,
  }));

  renderBySearch(page); // 결과를 다시 렌더링
}
// 모든 song-item 요소들에 마우스 이벤트 리스너 추가
function addEventListenersToSongs() {
  let songItems = document.querySelectorAll(".song-item");

  songItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      item.classList.add("active");
    });

    item.addEventListener("mouseleave", () => {
      item.classList.remove("active");
    });

    // 곡명, 장르명 검색일때만 활성화
    if (selectedValue == 'track' || selectedValue == 'genre') {
      // 각 song-item 내의 song-play 버튼 선택
      let playBtn = item.querySelector(".song-play");

      // song-play 버튼에 클릭 이벤트 리스너 추가
      playBtn.addEventListener("click", async () => {
        console.log("재생/일시 정지");
        const token = localStorage.getItem("spotify_token");
        const uri = item.getAttribute("data-uri");

        console.info("재생 토큰: ", token);
        console.info("재생 url: ", uri);

        // 기존의 재생 로직을 재생/일시 정지 로직으로 변경
        if (token && uri) {
          console.log("재생/일시 정지 실행");
          const index = Array.from(songItems).indexOf(item);
          if (currentTrackUri === uri && isPlaying) {
            console.log("리스트에서 현재 트랙이 재생 중이면 일시 정지")
            await pausePlayback(token);  // 재생 중지
            isPlaying = false; // 상태 업데이트
            updatePlayButton(); // 버튼 상태 업데이트
          } else {
            console.log("리스트에서 현재 트랙이 재생 중이 아니면 재생")
            await playTrack(uri, token, index);  // 재생
            isPlaying = true; // 상태 업데이트
            currentTrackUri = uri; // 현재 트랙 URI 업데이트
            currentTrackIndex = index; // 현재 트랙 인덱스 업데이트
            updatePlayButton(); // 버튼 상태 업데이트
          }
        }

        // 모든 재생 버튼 아이콘을 초기화
        document.querySelectorAll(".song-play i").forEach(icon => {
          icon.classList.remove("fa-pause");
          icon.classList.add("fa-play");
        });

        // 현재 재생 중인 트랙의 아이콘을 업데이트
        let icon = playBtn.querySelector("i");
        if (isPlaying) {
          icon.classList.remove("fa-play");
          icon.classList.add("fa-pause");
        } else {
          icon.classList.remove("fa-pause");
          icon.classList.add("fa-play");
        }
      });
    }
  });
}

async function getRelatedSongs() {

}

//TOP 50 받아와서 렌더링하는 함수
async function getDomesticTop(page = 1) {
  const top50Uri = '37i9dQZF1DWT9uTRZAYj0c';
  const newRlsUri = '37i9dQZF1DXe5W6diBL5N4';
  isSearchedByButton = true;
  let tempSelected = selectedValue;
  selectedValue = 'track';

  isLoading = true;
  buttonLoad.style.display = 'block';

  const token = await getToken();

  let searchURL = new URL(`https://api.spotify.com/v1/playlists/${top50Uri}/tracks`);

  const searched = await fetch(searchURL, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const data = await searched.json();
  const dataItems = data.items;

  console.log("total", data.items.length);
  console.log("searchItems", dataItems);

  result = dataItems.map((item) => {
    return item.track
  })

  // "KEYWORD" 검색결과 로 music title 변경
  const musicTitle = document.querySelector('.music_title');

  musicTitle.textContent = 'TOP 50';

  renderBySearch();
  selectedValue = tempSelected;
}

async function getNewRelease(page = 1) {
  const top50Uri = '37i9dQZF1DWT9uTRZAYj0c';
  const newRlsUri = '37i9dQZF1DXe5W6diBL5N4';
  isSearchedByButton = true;
  let tempSelected = selectedValue;
  selectedValue = 'track';

  isLoading = true;
  buttonLoad.style.display = 'block';

  const token = await getToken();

  let searchURL = new URL(`https://api.spotify.com/v1/playlists/${newRlsUri}/tracks`);

  const searched = await fetch(searchURL, {
    method: "GET",
    headers: { Authorization: "Bearer " + token },
  });

  const data = await searched.json();
  const dataItems = data.items;

  console.log("total", data.items.length);
  console.log("searchItems", dataItems);

  result = dataItems.map((item) => {
    return item.track
  })

  // "KEYWORD" 검색결과 로 music title 변경
  const musicTitle = document.querySelector('.music_title');

  musicTitle.textContent = 'New Release';

  renderBySearch();
  selectedValue = tempSelected;
}

//돋보기 화면일 경우 클릭하면 검색창 아래로 전시
const searchIcon = document.querySelector('.search-sm-initial');
const searchTotal = document.querySelector('.search');

searchIcon.addEventListener('click', () => {
  searchTotal.classList.toggle('active');
});