/* YouTube for Safari 2.0.0
 * Request parameter for in-stream ads plus display-card cleanup. Playback ad
 * fields are never pruned. No media blocking, page injection, automatic skip,
 * remote service, or certificate-policy changes.
 * The undocumented YouTube parameter is guarded and may stop working.
 */
(function () {
  'use strict';
  var PARAM = 'eAFgAQ';
  var PLAYER_AD_FIELDS = { playerAds: true, adPlacements: true, adSlots: true };
  var AD_RENDERERS = {
    adSlotRenderer: true, displayAdRenderer: true,
    promotedSparklesWebRenderer: true, promotedSparklesTextSearchRenderer: true,
    promotedVideoRenderer: true, promotedVideoItemRenderer: true,
    inFeedAdLayoutRenderer: true, videoMastheadAdV3Renderer: true
  };
  function getHeader(headers, name) {
    var keys = Object.keys(headers || {});
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === name) return String(headers[keys[i]]);
    }
    return '';
  }
  function guarded(value) { return typeof value === 'string' && value.indexOf('YAHI') === 0; }
  function isDisplayAdItem(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    var keys = Object.keys(item);
    if (keys.some(function (key) { return AD_RENDERERS[key]; })) return true;
    var rich = item.richItemRenderer;
    return !!(rich && rich.content && Object.keys(rich.content).some(function (key) {
      return AD_RENDERERS[key];
    }));
  }
  function removeDisplayAds(root) {
    var count = 0, stack = [root], visited = 0;
    while (stack.length) {
      var value = stack.pop();
      if (!value || typeof value !== 'object') continue;
      if (++visited > 150000) throw new Error('structure limit');
      if (Array.isArray(value)) {
        for (var i = value.length - 1; i >= 0; i--) {
          if (isDisplayAdItem(value[i])) { value.splice(i, 1); count++; }
          else stack.push(value[i]);
        }
      } else {
        Object.keys(value).forEach(function (key) {
          if (!PLAYER_AD_FIELDS[key]) stack.push(value[key]);
        });
      }
    }
    return count;
  }
  function jsonEnd(source, start) {
    var depth = 0, quoted = false, escaped = false;
    for (var i = start; i < source.length; i++) {
      var c = source[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (c === '\\') escaped = true;
        else if (c === '"') quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') { if (--depth === 0) return i + 1; }
    }
    return -1;
  }
  function filterJSON(text) {
    var prefix = '';
    var match = /^\)\]\}'\s*\n/.exec(text);
    if (match) { prefix = match[0]; text = text.slice(prefix.length); }
    var obj = JSON.parse(text), count = removeDisplayAds(obj);
    return { body: count ? prefix + JSON.stringify(obj) : prefix + text, count: count };
  }
  function filterHTML(html, csp) {
    var total = 0;
    var body = html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script\s*>)/gi,
      function (whole, opening, code, closing) {
        if (/\b(?:src|integrity)\s*=/i.test(opening)) return whole;
        if (/'sha(?:256|384|512)-/i.test(csp || '')) {
          var nonce = /\bnonce\s*=\s*["']([^"']+)["']/i.exec(opening);
          if (!nonce || (csp || '').indexOf("'nonce-" + nonce[1] + "'") < 0) return whole;
        }
        var type = /\btype\s*=\s*["']([^"']*)["']/i.exec(opening);
        if (type && !/^(?:text|application)\/javascript$|^module$/i.test(type[1])) return whole;
        var assignment = /(?:^|[;\n])\s*(?:(?:var|let|const)\s+)?(?:ytInitialPlayerResponse|ytInitialData|window\s*\[\s*["'](?:ytInitialPlayerResponse|ytInitialData)["']\s*\])\s*=\s*/g;
        var match, edits = [];
        while ((match = assignment.exec(code))) {
          var start = assignment.lastIndex;
          if (code[start] !== '{' && code[start] !== '[') continue;
          var end = jsonEnd(code, start);
          if (end < 0) continue;
          try {
            var result = filterJSON(code.slice(start, end));
            if (result.count) {
              edits.push({ start: start, end: end, body: result.body.replace(/</g, '\\u003c') });
              total += result.count;
            }
          } catch (_) {}
          assignment.lastIndex = end;
        }
        for (var index = edits.length - 1; index >= 0; index--) {
          var edit = edits[index];
          code = code.slice(0, edit.start) + edit.body + code.slice(edit.end);
        }
        return opening + code + closing;
      });
    return { body: body, count: total };
  }
  function responseKind(path) {
    if (path === '/watch' || path === '/' || path === '/results' || path === '/playlist' ||
        /^\/(?:shorts|feed)\//.test(path)) return 'html';
    if (/^\/youtubei\/v1\/(?:player|get_watch|next|browse|search)$/.test(path)) return 'json';
    return null;
  }
  function contentHeader(headers, name) {
    var keys = Object.keys(headers || {});
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === name) return String(headers[keys[i]]);
    }
    return '';
  }
  function withoutHeaders(headers, names) {
    var result = {};
    Object.keys(headers || {}).forEach(function (key) {
      if (!names[key.toLowerCase()]) result[key] = headers[key];
    });
    return result;
  }
  function main() {
    var ua = getHeader($request.headers, 'user-agent');
    if (!/Version\/\d/.test(ua) || !/Safari\//.test(ua) ||
        /(Chrome|Chromium|CriOS|FxiOS|Firefox|Edg|OPR|Android)\//i.test(ua)) return $done({});
    var match = /^https:\/\/www\.youtube\.com(?::443)?(\/[^?#]*)(\?[^#]*)?(#.*)?$/.exec($request.url || '');
    if (!match) return $done({});
    var method = String($request.method || 'GET').toUpperCase();
    if (typeof $response !== 'undefined') {
      var kind = responseKind(match[1]);
      var status = Number(String($response.status || 200).match(/\b\d{3}\b/) || 0);
      if (!kind || status !== 200 || typeof $response.body !== 'string') return $done({});
      var contentType = contentHeader($response.headers, 'content-type');
      if (kind === 'html' && !/^text\/html\b/i.test(contentType)) return $done({});
      if (kind === 'json' && !/^(?:application\/json|text\/json)\b/i.test(contentType)) return $done({});
      var result = kind === 'html' ? filterHTML($response.body,
        contentHeader($response.headers, 'content-security-policy')) : filterJSON($response.body);
      if (!result.count) return $done({});
      var responseHeaders = withoutHeaders($response.headers, {
        'content-length': true, etag: true, 'content-md5': true, digest: true
      });
      console.log('YouTube for Safari 2: display ads removed=' + result.count);
      return $done({ body: result.body, headers: responseHeaders });
    }
    if (match[1] === '/watch' && method === 'GET') {
      var query = (match[2] || '?').slice(1).split('&').filter(Boolean);
      if (!query.some(function (part) { return /^v=[^&]+$/.test(part); })) return $done({});
      var hasParam = false;
      for (var i = 0; i < query.length; i++) {
        if (query[i].split('=')[0] === 'pp') {
          var value = decodeURIComponent(query[i].slice(3));
          if (guarded(value)) return $done({});
          if (value === PARAM) hasParam = true;
        }
      }
      if (hasParam && query.filter(function (part) { return part.split('=')[0] === 'pp'; }).length === 1) return $done({});
      query = query.filter(function (part) { return part.split('=')[0] !== 'pp'; });
      query.push('pp=' + PARAM);
      var origin = $request.url.slice(0, $request.url.indexOf('/watch'));
      console.log('YouTube for Safari 2: watch request adjusted');
      return $done({ url: origin + '/watch?' + query.join('&') + (match[3] || '') });
    }
    if (method !== 'POST' || !/^\/youtubei\/v1\/(player|get_watch|next)$/.test(match[1]) ||
        typeof $request.body !== 'string' || !/^application\/json\b/i.test(getHeader($request.headers, 'content-type'))) return $done({});
    var obj = JSON.parse($request.body);
    if (!obj || !obj.context || !obj.context.client || obj.context.client.clientName !== 'WEB') return $done({});
    var nested = obj.playerRequest;
    var contexts = [obj.playbackContext, nested && nested.playbackContext].filter(function (value) {
      return value && typeof value === 'object' && !Array.isArray(value);
    });
    if (!contexts.length || guarded(obj.params) || guarded(nested && nested.params) ||
        contexts.some(function (context) { return context.adPlaybackContext || guarded(context.params); })) return $done({});
    if (obj.params === PARAM && (!nested || nested.params === PARAM) && contexts.every(function (context) { return context.params === PARAM; })) return $done({});
    obj.params = PARAM;
    if (nested) nested.params = PARAM;
    contexts.forEach(function (context) { context.params = PARAM; });
    var headers = {};
    Object.keys($request.headers || {}).forEach(function (key) {
      if (key.toLowerCase() !== 'content-length') headers[key] = $request.headers[key];
    });
    console.log('YouTube for Safari 2: player request adjusted');
    return $done({ body: JSON.stringify(obj), headers: headers });
  }
  try { main(); } catch (_) { $done({}); }
})();
