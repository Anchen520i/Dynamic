const params = getParams($argument);
const provinceName = params.provname || "江苏";
const apiUrls = [
  `https://apis.tianapi.com/oilprice/index?key=231de491563c35731436829ac52aad43&prov=${encodeURIComponent(provinceName)}`,
  `https://apis.tianapi.com/oilprice/index?key=a2bc7a0e01be908881ff752677cf94b7&prov=${encodeURIComponent(provinceName)}`,
  `https://apis.tianapi.com/oilprice/index?key=1bcc67c0114bc39a8818c8be12c2c9ac&prov=${encodeURIComponent(provinceName)}`,
  `https://apis.tianapi.com/oilprice/index?key=3c5ee42145c852de4147264f25b858dc&prov=${encodeURIComponent(provinceName)}`,
  `https://apis.tianapi.com/oilprice/index?key=d718b0f7c2b6d71cb3a9814e90bf847f&prov=${encodeURIComponent(provinceName)}`
];
let currentIndex = 0;

function testNextUrl() {
  if (currentIndex >= apiUrls.length) {
    console.log("All URLs failed");
    $done();
    return;
  }

  const apiUrl = apiUrls[currentIndex];

  $httpClient.get(apiUrl, (error, response, data) => {
    if (error) {
      console.log(`Error for URL ${currentIndex + 1}: ${error}`);
      currentIndex++;
      testNextUrl();
    } else {
      handleResponse(data);
    }
  });
}

function handleResponse(data) {
  const oilPriceData = JSON.parse(data);
  console.log(oilPriceData);

  if (oilPriceData.code === 200) {
    const oilPriceInfo = oilPriceData.result;
    const message = `地区：${oilPriceInfo.prov}\n0号柴油：${oilPriceInfo.p0}元/升\n89号汽油：${oilPriceInfo.p89}元/升\n92号汽油：${oilPriceInfo.p92}元/升\n95号汽油：${oilPriceInfo.p95}元/升\n98号汽油：${oilPriceInfo.p98}元/升\n更新时间：${oilPriceInfo.time}`;

    const body = {
      title: "今日油价",
      content: message,
      provname: params.provname,
      icon: params.icon,
      "icon-color": params.color
    };
    $done(body);
  } else {
    console.log(`请求失败，错误信息：${oilPriceData.msg}`);
    currentIndex++;
    testNextUrl();
  }
}

function getParams(param) {
  return Object.fromEntries(
    param
      .split("&")
      .map((item) => item.split("="))
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );
}

testNextUrl();
