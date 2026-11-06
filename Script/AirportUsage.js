/* Surge iOS / Mac generic panel script. No MITM, profile writes or third-party API.
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
    return {title: title, content: content, icon: "chart.pie.fill",
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

  function render(c, failure) {
    var u = c.usage;
    var knownUsed = has(u, "upload") && has(u, "download");
    var used = knownUsed ? u.upload + u.download : null;
    var limited = has(u, "total") && u.total > 0;
    var remaining = limited && knownUsed ? Math.max(0, u.total - used) : null;
    var percent = limited && knownUsed ? used / u.total * 100 : null;
    var color = "#34C759";
    var title = panelName;
    var lines = [];
    if (remaining !== null) title += " · 剩余 " + bytes(remaining);
    lines.push("已用 " + (knownUsed ? bytes(used) : "未提供完整计数") +
      " / " + (limited ? bytes(u.total) : "额度未明确"));
    if (percent !== null) {
      var count = Math.max(0, Math.min(10, Math.round(percent / 10)));
      lines.push(new Array(count + 1).join("▰") + new Array(11 - count).join("▱") +
        " " + percent.toFixed(1) + "%" + (used > u.total ? "（已超额）" : ""));
      if (remaining <= 0) color = "#FF3B30";
      else if (remaining / u.total <= 0.1) color = "#FF9500";
    }
    lines.push("↑ " + (has(u, "upload") ? bytes(u.upload) : "未提供") +
      "  ↓ " + (has(u, "download") ? bytes(u.download) : "未提供"));
    if (!has(u, "expire")) {
      lines.push("到期：接口未提供");
    } else if (u.expire === 0) {
      lines.push("到期：接口未设置（expire=0）");
    } else {
      // Standard headers use Unix seconds; tolerate providers using milliseconds.
      var end = u.expire >= 1000000000000 ? u.expire : u.expire * 1000;
      var diff = end - Date.now();
      var tail = diff <= 0 ? "已到期" : diff < DAY ? "不足 1 天" : "剩余 " + Math.ceil(diff / DAY) + " 天";
      lines.push("到期 " + dateText(end) + "（" + tail + "）");
      if (diff <= 0) color = "#FF3B30";
      else if (diff <= 7 * DAY && color !== "#FF3B30") color = "#FF9500";
    }
    lines.push((failure ? "缓存于 " : "更新于 ") + dateText(c.updatedAt));
    if (failure) { lines.push("本次刷新失败：" + failure); color = "#FF9500"; }
    return info(title, lines.join("\n"), color);
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
