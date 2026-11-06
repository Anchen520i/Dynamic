/* Surge iOS / Mac generic panel script. No MITM, profile writes or third-party API.
 * Requested artwork: https://raw.githubusercontent.com/Vaerios/Nyora/refs/heads/Surge/traffic_circle.svg
 * Native Surge panels accept SF Symbols; use the closest supported traffic-circle glyph.
 * Data source: the subscription server's Subscription-Userinfo response header.
 * $argument is the COMPLETE subscription URL, not a query-string argument table.
 * Never log the URL, response body, credentials or raw network errors.
 */
(function () {
  "use strict";
  var DAY = 86400000;
  var completed = false;
  var timer;
  var panelName = typeof $input !== "undefined" && $input.panelName
    ? String($input.panelName) : "机场流量";
  var raw = typeof $argument === "string" ? $argument.trim() : "";

  function done(panel) {
    if (completed) return;
    completed = true;
    // Surge cancels pending timers on completion. clearTimeout is WebView-only.
    if (timer && typeof clearTimeout === "function") clearTimeout(timer);
    $done(panel);
  }

  function info(title, content, color) {
    return {title: title, content: content, icon: "arrow.up.arrow.down.circle.fill",
      "icon-color": color || "#007AFF"};
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function dateText(ms) {
    var d = new Date(ms);
    if (!isFinite(d.getTime())) return "日期无效";
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function bytes(n) {
    if (!isFinite(n) || n < 0) return "未提供";
    var units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
    var i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return (i === 0 ? n.toFixed(0) : n.toFixed(2)) + " " + units[i];
  }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function header(headers, key) {
    var found = null;
    if (Array.isArray(headers)) {
      headers.forEach(function (h) {
        if (h && String(h.field).toLowerCase() === key) found = h.value;
      });
    } else if (headers && typeof headers === "object") {
      Object.keys(headers).forEach(function (k) {
        if (k.toLowerCase() === key) found = headers[k];
      });
    }
    if (Array.isArray(found)) found = found.join("; ");
    return typeof found === "string" ? found : null;
  }

  function parse(value) {
    if (!value) return null;
    var result = {};
    value.split(";").forEach(function (part) {
      var m = /^\s*(upload|download|total|expire)\s*=\s*(\d+(?:\.\d+)?)\s*$/i.exec(part);
      if (!m) return;
      var n = Number(m[2]);
      if (isFinite(n) && n >= 0 && n <= 9007199254740991) result[m[1].toLowerCase()] = n;
    });
    // Expiration-only or partial responses are useful, but never invent missing counters.
    return Object.keys(result).length ? result : null;
  }

  function cacheKey(url) {
    // Two independent 32-bit hashes identify a URL without storing it in cache.
    var a = 5381, b = 52711;
    for (var i = 0; i < url.length; i++) {
      a = ((a * 33) ^ url.charCodeAt(i)) >>> 0;
      b = ((b * 31) + url.charCodeAt(i)) >>> 0;
    }
    return "AirportUsage_v1_" + a.toString(16) + "_" + b.toString(16);
  }
  var key;
  function readCache() {
    if (!key || typeof $persistentStore === "undefined") return null;
    try {
      var c = JSON.parse($persistentStore.read(key) || "null");
      if (!c || c.version !== 1 || !isFinite(c.updatedAt) || !c.usage) return null;
      // Validate cached counters, too; ignore corrupted or manually changed values.
      var fields = Object.keys(c.usage);
      if (!fields.length || fields.some(function (k) {
        return ["upload", "download", "total", "expire"].indexOf(k) < 0 ||
          typeof c.usage[k] !== "number" || !isFinite(c.usage[k]) || c.usage[k] < 0;
      })) return null;
      return c;
    } catch (_) { return null; }
  }
  function writeCache(usage) {
    var c = {version: 1, updatedAt: Date.now(), usage: usage};
    if (typeof $persistentStore !== "undefined") {
      try { $persistentStore.write(JSON.stringify(c), key); } catch (_) {}
    }
    return c;
  }

  // User options: color = emoji stepped colors; text = compact monochrome.
  var PANEL_OPTIONS = {barStyle: "color", barSegments: 10, phraseRotationMinutes: 30};
  // Exactly 50 unique phrases: 10 remaining-quota bands, 5 phrases per band.
  var TRAFFIC_MESSAGES = [
  {
    "minRemaining": 90,
    "texts": [
      "流量满仓，快乐开张",
      "这点消耗，套餐都没醒",
      "仓库堆满，下载不慌",
      "流量管够，快乐起飞",
      "才刚热身，别急着省"
    ]
  },
  {
    "minRemaining": 80,
    "texts": [
      "流量多，使劲造吧",
      "家底很厚，随便溜达",
      "放心冲，余额稳得很",
      "这点用量，洒洒水啦",
      "流量还富，快乐加倍"
    ]
  },
  {
    "minRemaining": 70,
    "texts": [
      "余粮充足，心态放松",
      "下载可以，别太离谱",
      "钱包会痛，流量还行",
      "继续浪，套餐扛得住",
      "流量小富，快乐不误"
    ]
  },
  {
    "minRemaining": 60,
    "texts": [
      "还有大半，问题不大",
      "流量很稳，人先别飘",
      "别怕，仓库还有存货",
      "快乐继续，余额在线",
      "高清自由，还能拥有"
    ]
  },
  {
    "minRemaining": 50,
    "texts": [
      "余额过半，底气还在",
      "流量中场，休息一下",
      "上半场稳，下半场省",
      "能浪，但别浪出天际",
      "家底尚在，悠着点嗨"
    ]
  },
  {
    "minRemaining": 40,
    "texts": [
      "开始省点，别装大款",
      "流量在瘦，你还在冲",
      "还能快乐，记得节制",
      "下载一时爽，月底泪两行",
      "还没破产，先别庆祝"
    ]
  },
  {
    "minRemaining": 30,
    "texts": [
      "余粮见底前，先收收手",
      "别乱点，流量会心疼",
      "快乐打折，省着点用",
      "流量不多，气势别大",
      "低调上网，高调省粮"
    ]
  },
  {
    "minRemaining": 20,
    "texts": [
      "余额不厚，操作要秀",
      "能省就省，别硬撑场",
      "流量钱包，开始漏风",
      "别开大招，蓝条不多",
      "月底吃土，提前预习"
    ]
  },
  {
    "minRemaining": 10,
    "texts": [
      "省流模式，正式上岗",
      "每个字节，都有尊严",
      "流量紧张，快乐限量",
      "别浪了，套餐在求饶",
      "最后的倔强，是不看视频"
    ]
  },
  {
    "minRemaining": 0,
    "texts": [
      "卧槽，没流量直接萎了",
      "流量快没了，人也蔫了",
      "余额告急，快乐停机",
      "再点下载，就得吃土",
      "省着点吧，真没多少了"
    ]
  }
];

  function usageBar(percent) {
    var size = Math.max(5, Math.min(16, Math.floor(PANEL_OPTIONS.barSegments) || 10));
    var clamped = Math.max(0, Math.min(100, percent));
    var filled = Math.round(clamped / 100 * size);
    var palette = ["🟦", "🟩", "🟨", "🟧", "🟥"];
    var bar = "";
    for (var i = 0; i < size; i++) {
      if (PANEL_OPTIONS.barStyle === "text") bar += i < filled ? "▰" : "▱";
      else bar += i < filled ? palette[Math.min(4, Math.floor(i / size * 5))] : "⬜";
    }
    return bar + "  " + percent.toFixed(1) + "%";
  }

  function trafficMessage(remainingPercent) {
    if (remainingPercent <= 0) return TRAFFIC_MESSAGES[9].texts[0];
    var band = TRAFFIC_MESSAGES[9];
    for (var i = 0; i < TRAFFIC_MESSAGES.length; i++) {
      if (remainingPercent >= TRAFFIC_MESSAGES[i].minRemaining) { band = TRAFFIC_MESSAGES[i]; break; }
    }
    var minutes = Math.max(1, Number(PANEL_OPTIONS.phraseRotationMinutes) || 30);
    var slot = Math.floor(Date.now() / (minutes * 60000)) % band.texts.length;
    return band.texts[slot];
  }

  function render(c, failure) {
    var u = c.usage;
    var knownUsed = has(u, "upload") && has(u, "download");
    var used = knownUsed ? u.upload + u.download : null;
    var limited = has(u, "total") && u.total > 0;
    var remaining = limited && knownUsed ? Math.max(0, u.total - used) : null;
    var usedPercent = limited && knownUsed ? used / u.total * 100 : null;
    var remainingPercent = remaining !== null ? remaining / u.total * 100 : null;
    var color = "#298AFF";
    var badge = "订阅信息";
    if (remaining !== null) {
      badge = remaining <= 0 ? (used > u.total ? "流量已超额" : "流量已用尽") : remainingPercent <= 10 ? "流量告急" : remainingPercent <= 20 ? "注意用量" : "余量充足";
      if (remaining <= 0) color = "#FF453A";
      else if (remainingPercent <= 20) color = "#FF9F0A";
    }

    // Exactly five content lines for valid cached/live data. Percent and bar BOTH show USED quota.
    var lines = [
      "已用 " + (knownUsed ? bytes(used) : "未提供完整计数") + " / 总量 " + (limited ? bytes(u.total) : "额度未明确"),
      usedPercent !== null ? usageBar(usedPercent) : "使用进度：信息不足",
      remainingPercent !== null ? trafficMessage(remainingPercent) : "流量信息不完整，暂不判断余量"
    ];
    if (!has(u, "expire")) {
      lines.push("到期：接口未提供");
    } else if (u.expire === 0) {
      lines.push("到期：接口未设置（expire=0）");
    } else {
      var end = u.expire >= 1000000000000 ? u.expire : u.expire * 1000;
      var d = new Date(end);
      var diff = end - Date.now();
      if (!isFinite(d.getTime())) lines.push("到期：日期无效");
      else {
        var tail = diff <= 0 ? "已到期" : diff < DAY ? "不足 1 天" : "剩余 " + Math.ceil(diff / DAY) + " 天";
        lines.push("到期 " + d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()) + " · " + tail);
        if (diff <= 0) { badge = "套餐已到期"; color = "#FF453A"; }
        else if (diff <= 7 * DAY && remaining !== 0) { badge = "即将到期"; color = "#FF9F0A"; }
      }
    }
    lines.push((failure ? "缓存 " : "更新 ") + dateText(c.updatedAt) + (failure ? " · 刷新失败" : ""));
    if (failure) {
      badge = "离线缓存";
      var status = /HTTP \d+/.exec(failure);
      if (status) badge += " " + status[0];
      if (color !== "#FF453A") color = "#FF9F0A";
    }
    return {title: panelName + " · " + badge, content: lines.join("\n"),
      icon: "arrow.up.arrow.down.circle.fill", "icon-color": color};
  }

  function fail(message) {
    if (completed) return;
    var c = readCache();
    if (c) done(render(c, message));
    else done(info(panelName, message + "\n请检查原始订阅链接及机场接口。", "#FF9500"));
  }

  // Keep the entire URL, including '&' and '=' in its query token.
  if (/^https?%3a/i.test(raw)) {
    try { raw = decodeURIComponent(raw); } catch (_) {}
  }
  if (!/^https?:\/\/[^\s"<>]+$/i.test(raw) || raw.indexOf("{{{") >= 0) {
    done(info(panelName, "请在模块参数 subscription_url 中填写完整的原始订阅链接。", "#FF9500"));
    return;
  }
  key = cacheKey(raw);
  timer = setTimeout(function () { fail("请求超时"); }, 11000);
  var ua = "Surge/" + (typeof $environment !== "undefined" && $environment["surge-version"]
    ? $environment["surge-version"] : "5.0");

  function request(method) {
    var options = {url: raw, headers: {"User-Agent": ua}, timeout: method === "head" ? 4 : 5,
      "auto-cookie": false};
    try {
      $httpClient[method](options, function (error, response) {
        if (completed) return;
        try {
          var status = response ? Number(response.status) : 0;
          var usage = !error && status >= 200 && status < 300
            ? parse(header(response.headers, "subscription-userinfo")) : null;
          if (usage) { done(render(writeCache(usage))); return; }
          // Some providers only attach metadata to GET or reject HEAD altogether.
          if (method === "head") { request("get"); return; }
          if (error || !status) fail("网络连接失败");
          else if (status < 200 || status >= 300) fail("订阅服务器返回 HTTP " + status);
          else fail("响应未提供有效 Subscription-Userinfo，无法读取流量／到期信息");
        } catch (_) { fail("订阅信息解析失败"); }
      });
    } catch (_) {
      if (method === "head") request("get");
      else fail("网络请求无法执行");
    }
  }
  request("head");
})();
