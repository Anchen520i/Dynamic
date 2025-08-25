// redirect-search.js

// $1 = 引擎代号 (bi / bd)
// $2 = 搜索关键词
let engine = $1;
let keyword = decodeURIComponent($2);  // 还原 URL 编码，防止乱码
let redirectUrl;

if (engine === "bi") {
  redirectUrl = `https://www.bing.com/search?q=${encodeURIComponent(keyword)}&setmkt=zh-CN&setlang=zh-CN`;
} else if (engine === "bd") {
  redirectUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}&ie=utf-8`;
}

if (redirectUrl) {
  $done({ response: { status: 302, headers: { Location: redirectUrl } } });
} else {
  $done({});
}