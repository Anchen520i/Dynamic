// Surge Script: Google Search Redirector
// 功能: 在 Google 搜索框中使用前缀来切换搜索引擎
// 例如: "bi chatgpt" -> 跳转 Bing 搜索 "chatgpt"
//       "bd 北京天气" -> 跳转 百度搜索 "北京天气"
//       "gh react"   -> 跳转 GitHub 搜索 "react"

function redirect(url) {
  $done({ response: { status: 302, headers: { Location: url } } });
}

let url = $request.url;
let query = url.match(/[?&]q=([^&]+)/);

if (query) {
  let q = decodeURIComponent(query[1]);

  // 按空格分隔前缀
  let parts = q.split(/\s+/);
  let prefix = parts.shift().toLowerCase();
  let keyword = encodeURIComponent(parts.join(" "));

  switch (prefix) {
    case "bi":
      redirect("https://www.bing.com/search?q=" + keyword);
      break;
    case "bd":
      redirect("https://www.baidu.com/s?wd=" + keyword);
      break;
    case "gh":
      redirect("https://github.com/search?q=" + keyword);
      break;
    case "yt":
      redirect("https://www.youtube.com/results?search_query=" + keyword);
      break;
    default:
      $done({}); // 不处理，正常搜索
  }
} else {
  $done({});
}