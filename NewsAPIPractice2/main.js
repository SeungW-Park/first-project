let category = ""; // 리펙토링
let keyword = ""; // 리펙토링
const API_KEY = "10941bbbe8284718a639d2bfb6df1fcc";
let newsList = [];
let totalResult = 0;
let page = 1;
let movePage = ""; // 수정 필요
const pageSize = 10;
const groupSize = 5;
let totalPageC;

// UI 작동
let navBarIcon = document.querySelector(".nav-bar-icon");
let navBar = document.querySelector(".nav-bar");
let xMark = document.querySelector(".x-mark");
let searchContainer = document.querySelector(".search-container");
let articleContainer = document.querySelector("#news-board");
let menuButton = document.querySelectorAll(".nav-bar button");
let inputArea = document.querySelector(".input-area");
let searchButton = document.querySelector(".search-button");
let categoryButton = document.querySelectorAll(".nav-bar button");

searchButton.addEventListener("click", setKeywords);
function searchIconActivate() {
  searchContainer.classList.toggle("active");
}

function navBarActivate() {
  navBar.classList.toggle('active');
  navBar.style.animation = "SlideIn 0.3s ease-in-out";
}

function navBarDeActivate() {
  navBar.style.animation = "SlideOut 0.3s ease-in-out";
  navBar.addEventListener("animationend", handleAnimationEnd);
}

function handleAnimationEnd() {
  navBar.classList.toggle('active');
  navBar.removeEventListener("animationend", handleAnimationEnd)
}

// API 조작
const getLatestNews = async () => {
  const url = new URL(
    `https://third-js-project-sw.netlify.app/top-headlines?country=kr&pageSize=${pageSize}&page=${page}${category}${keyword}`
  ); // 리펙토링

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (response.status === 200) {
      if (data.articles.length == 0) {
        throw new Error("No result for this search.");
      }
      newsList = data.articles;
      totalResult = data.totalResults;
      console.log("nnn", newsList);
      Render();
      paginationRender();
      console.log("cate", newsList);
    } else {
      throw new Error(data.message);
    }

  } catch(error) {
    errorRender(error.message);
  }
};

function Render() {
  const resultHTML = newsList?.map(news => {
  let title = news.title.length > 40 ? `${news.title.substring(0, 40)} ...` : news.title;

  let description = news.description ? (news.description.length > 200 ? `${news.description.substring(0, 200)} ...` : news.description) : "내용 없음";

  let urlToImage = news.urlToImage ||  "'./images/imgnotavailable.png'";

  let nameSource = news.source.name || "출처 없음";

  let author = news.author || "기자 정보 없음";

  return `
      <div class="row article">
        <div class="col-lg-4 article-img">
          <img class="img-content" src=${urlToImage}>
        </div>

        <div class="col-lg-8 article-main">
          <div class="title-content">
            <h2 class="article-title">
              ${title}
            </h2>

            <p class="article-content">
              ${description}
            </p>
          </div>

          <div class="article-info">
            ${nameSource} | ${author} | ${moment(news.publishedAt).fromNow()}
          </div>
        </div>
      </div>`
  }).join('');

  articleContainer.innerHTML = resultHTML;
}

const errorRender = (message) => {
  const errorHTML = 
  `<div class="alert alert-danger" role="alert">
  ${message}
  </div>`;

  articleContainer.innerHTML = errorHTML;
}

async function setCategory(cat) { // 리펙토링
  page = 1;
  category = `&category=${cat}`;
  await getLatestNews();
}

async function setKeywords() { // 리펙토링
  if (inputArea.value.trim() === "") {
    alert("검색할 내용을 입력해주세요.");
    return;
  }
  keyword = `&q=${inputArea.value}`;
  inputArea.value = "";
  await getLatestNews();
}

function paginationRender() {
  const totalPage = Math.ceil(totalResult / pageSize);
  totalPageC = totalPage;
  const pageGroup = Math.ceil(page / groupSize);
  let lastPage = Math.min(pageGroup * groupSize, totalPage);
  let firstPage = Math.max(lastPage - (groupSize - 1), 1);
  if (lastPage % 5 !== 0) {
    firstPage = lastPage - 5;
    if (firstPage <= 0) {
      firstPage = 1;
    }
  }


  let paginationHTML = "";
  
  if (totalPage > groupSize && page !== 1) {
    paginationHTML +=
      `<li class="page-item ${pageGroup == 1 ? 'disabled' : ''}"><a class="page-link" onclick="moveNextPage('f')"><<</a></li>
      <li class="page-item ${page == 1 ? 'disabled' : ''}"><a class="page-link" onclick="moveNextPage('-')"><</a></li>`;
  }

  for (let i = firstPage; i <= lastPage; i++) {
    paginationHTML +=
      `<li class="page-item ${i == page ? 'active' : ''}" onclick="moveToPage(${i})"><a class="page-link">
      ${i}
      </a></li>`;
  }

  if (totalPage > groupSize && page !== totalPage) {
    paginationHTML +=
      `<li class="page-item ${page == totalPage ? 'disabled' : ''}"><a class="page-link" onclick="moveNextPage('+')">></a></li>
      <li class="page-item ${(totalPage - groupSize + 1) <= page && totalPage >= page ? 'disabled' : ''}"><a class="page-link" onclick="moveNextPage('l')">>></a></li>`;
  }


  document.querySelector(".pagination").innerHTML = paginationHTML;
}

async function moveToPage(pageNum) {
  page = pageNum;
  await getLatestNews();
}

async function moveNextPage(next) {
  if (next == '-') {
    page--;
    await getLatestNews();
  } else if (next == '+') {
    page ++;
    await getLatestNews();
  } else if (next == 'f') {
    page = 1;
    await getLatestNews();
  } else if (next == 'l') {
    page = totalPageC - groupSize + 1;
    await getLatestNews();
  }
}

getLatestNews();
paginationRender();