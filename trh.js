/**
 * TRH Worker v1.4.1
 * Полный файл
 *
 * Маршруты:
 *  - GET /health
 *  - GET /resolve?url=<video_or_get_file_url>&format=json|redirect
 *      format=json     -> JSON с деталями
 *      format=redirect -> 302 на финальный mp4
 *
 * Примеры:
 *  /resolve?url=https://trahkino.me/video/432835/&format=json
 *  /resolve?url=https://trahkino.me/get_file/.../432835_360p.mp4/?rnd=123&format=redirect
 */

var VERSION = "1.4.1";
var MAX_REDIRECTS = 8;
var REQUEST_TIMEOUT_MS = 20000;

// Разрешённые хосты источника/редиректа
var ALLOWED_HOSTS = [
  "trahkino.me",
  ".trahkino.me",
  "tkvids.com",
  ".tkvids.com"
];

addEventListener("fetch", function (event) {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  try {
    var url = new URL(request.url);

    if (url.pathname === "/health") {
      return jsonResponse(200, {
        ok: true,
        version: VERSION,
        ts: new Date().toISOString()
      });
    }

    if (url.pathname === "/resolve") {
      return await handleResolve(request);
    }

    return jsonResponse(404, {
      ok: false,
      error: "Not found",
      version: VERSION
    });
  } catch (err) {
    return jsonResponse(500, {
      ok: false,
      error: "Unhandled error",
      details: safeError(err),
      version: VERSION
    });
  }
}

async function handleResolve(request) {
  var reqUrl = new URL(request.url);
  var input = (reqUrl.searchParams.get("url") || "").trim();
  var format = (reqUrl.searchParams.get("format") || "json").toLowerCase();

  if (!input) {
    return jsonResponse(400, {
      ok: false,
      error: "Missing query param: url",
      version: VERSION
    });
  }

  var parsed;
  try {
    parsed = new URL(input);
  } catch (e) {
    return jsonResponse(400, {
      ok: false,
      error: "Invalid url",
      version: VERSION
    });
  }

  if (!isAllowedHost(parsed.hostname)) {
    return jsonResponse(403, {
      ok: false,
      error: "Host is not allowed",
      host: parsed.hostname,
      version: VERSION
    });
  }

  var result;
  if (isVideoPageUrl(parsed)) {
    result = await resolveFromVideoPage(input);
  } else if (isGetFileUrl(parsed)) {
    result = await resolveFromGetFile(input, null);
  } else {
    return jsonResponse(400, {
      ok: false,
      error: "Unsupported URL. Expected /video/{id}/ or /get_file/...",
      version: VERSION
    });
  }

  if (!result.ok) {
    return jsonResponse(result.statusCode || 502, {
      ok: false,
      version: VERSION,
      error: result.error || "Resolve failed",
      trace: result.trace || []
    });
  }

  if (format === "redirect") {
    return Response.redirect(result.finalUrl, 302);
  }

  return jsonResponse(200, {
    ok: true,
    version: VERSION,
    input: input,
    sourceType: result.sourceType,
    videoPageUrl: result.videoPageUrl || null,
    getFileUrl: result.getFileUrl || null,
    normalizedGetFileUrl: result.normalizedGetFileUrl || null,
    finalUrl: result.finalUrl,
    finalHost: safeHost(result.finalUrl),
    status: result.finalStatus,
    contentType: result.contentType || null,
    trace: result.trace || []
  });
}

/**
 * Главный сценарий: video page -> get_file -> final mp4
 * При 410: рефреш страницы и повторная сборка get_file
 */
async function resolveFromVideoPage(videoPageUrl) {
  var trace = [];
  var pass = 0;
  var lastError = null;

  while (pass < 2) {
    pass += 1;
    trace.push("pass#" + pass + ": fetch video page");

    var page = await fetchVideoPage(videoPageUrl);
    if (!page.ok) {
      return fail(502, "Cannot load video page", trace, page.error);
    }

    var getFileUrl = extractGetFileUrl(page.html, videoPageUrl);
    if (!getFileUrl) {
      return fail(502, "get_file URL not found on page", trace);
    }

    var resolved = await resolveFromGetFile(getFileUrl, videoPageUrl);
    trace = trace.concat(resolved.trace || []);

    if (resolved.ok) {
      resolved.sourceType = "video_page";
      resolved.videoPageUrl = videoPageUrl;
      resolved.getFileUrl = getFileUrl;
      return resolved;
    }

    // Важный фикс 1.4.1: при 410 делаем рефреш токена через повторный парсинг страницы
    if (resolved.errorCode === "TOKEN_EXPIRED_410" && pass < 2) {
      trace.push("410 detected -> refresh page token and retry");
      continue;
    }

    lastError = resolved.error || "Resolve from get_file failed";
    break;
  }

  return fail(502, lastError || "Resolve failed", trace);
}

/**
 * Сценарий: get_file -> redirects -> final mp4
 * ВАЖНО: только GET, без HEAD
 */
async function resolveFromGetFile(getFileUrl, sourceReferer) {
  var trace = [];
  var normalized = normalizeGetFileUrl(getFileUrl);
  trace.push("get_file(original): " + getFileUrl);
  trace.push("get_file(normalized): " + normalized);

  var current = normalized;
  var i = 0;

  while (i < MAX_REDIRECTS) {
    i += 1;

    var u;
    try {
      u = new URL(current);
    } catch (e) {
      return fail(502, "Bad redirect URL", trace, safeError(e));
    }

    if (!isAllowedHost(u.hostname)) {
      return fail(403, "Redirect to not allowed host: " + u.hostname, trace);
    }

    var hdrs = buildDomainHeaders(current, sourceReferer);
    // Критично: GET (не HEAD)
    var resp = await fetchWithTimeout(current, {
      method: "GET",
      redirect: "manual",
      headers: hdrs
    }, REQUEST_TIMEOUT_MS);

    trace.push("hop#" + i + " " + current + " -> status " + resp.status);

    // 3xx редирект
    if (isRedirectStatus(resp.status)) {
      var loc = resp.headers.get("location");
      if (!loc) {
        return fail(502, "Redirect without Location header", trace);
      }
      current = absolutizeUrl(current, loc);
      // нормализация на каждом шаге
      current = normalizeGetFileUrl(current);
      continue;
    }

    // 410 = протухший токен
    if (resp.status === 410) {
      return {
        ok: false,
        statusCode: 410,
        errorCode: "TOKEN_EXPIRED_410",
        error: "Token expired (410) on get_file",
        trace: trace
      };
    }

    // Успешный ответ с видео
    var ctype = (resp.headers.get("content-type") || "").toLowerCase();
    if ((resp.status === 200 || resp.status === 206) && ctype.indexOf("video/mp4") !== -1) {
      return {
        ok: true,
        sourceType: "get_file",
        getFileUrl: getFileUrl,
        normalizedGetFileUrl: normalized,
        finalUrl: current,
        finalStatus: resp.status,
        contentType: ctype,
        trace: trace
      };
    }

    // Иногда CDN отдает 200/206 без content-type, но URL уже mp4
    if ((resp.status === 200 || resp.status === 206) && /\.mp4(\?|$)/i.test(current)) {
      return {
        ok: true,
        sourceType: "get_file",
        getFileUrl: getFileUrl,
        normalizedGetFileUrl: normalized,
        finalUrl: current,
        finalStatus: resp.status,
        contentType: ctype || null,
        trace: trace
      };
    }

    // Иные ответы — ошибка
    return fail(502, "Unexpected response status/content-type", trace, {
      status: resp.status,
      contentType: ctype
    });
  }

  return fail(508, "Too many redirects", trace);
}

async function fetchVideoPage(videoPageUrl) {
  try {
    var headers = buildDomainHeaders(videoPageUrl, null);
    headers.set("accept", "text/html,application/xhtml+xml");

    var resp = await fetchWithTimeout(videoPageUrl, {
      method: "GET",
      redirect: "follow",
      headers: headers
    }, REQUEST_TIMEOUT_MS);

    if (resp.status < 200 || resp.status >= 300) {
      return { ok: false, error: "Video page HTTP " + resp.status };
    }

    var html = await resp.text();
    return { ok: true, html: html };
  } catch (e) {
    return { ok: false, error: safeError(e) };
  }
}

function extractGetFileUrl(html, baseUrl) {
  // 1) прямой URL
  var m = html.match(/https?:\/\/[^"'\\s<>]+\/get_file\/[^"'\\s<>]+/i);
  if (m && m[0]) {
    return absolutizeUrl(baseUrl, m[0]);
  }

  // 2) относительный путь
  var m2 = html.match(/["'](\/get_file\/[^"']+)["']/i);
  if (m2 && m2[1]) {
    return absolutizeUrl(baseUrl, m2[1]);
  }

  return null;
}

/**
 * Фикс 1.4.1:
 *   ..._360p.mp4/   -> ..._360p.mp4
 *   ...movie.mp4/?a -> ...movie.mp4?a
 */
function normalizeGetFileUrl(raw) {
  if (!raw) return raw;

  var out = raw.trim();

  // убираем лишний слеш сразу после .mp4
  out = out.replace(/(\.mp4)\/(\?|$)/i, "$1$2");

  // иногда бывает двойной слеш перед query
  out = out.replace(/\?+/, "?");

  return out;
}

function buildDomainHeaders(targetUrl, sourceReferer) {
  var u = new URL(targetUrl);
  var origin = u.protocol + "//" + u.host + "/";
  var headers = new Headers();

  headers.set("user-agent", "Mozilla/5.0 (compatible; TRHWorker/" + VERSION + ")");
  headers.set("accept", "*/*");
  headers.set("accept-language", "ru,en;q=0.9");
  headers.set("cache-control", "no-cache");
  headers.set("pragma", "no-cache");
  headers.set("range", "bytes=0-0");

  // Реферер по домену назначения (важно для CDN)
  if (sourceReferer) {
    try {
      var sr = new URL(sourceReferer);
      headers.set("referer", sr.protocol + "//" + sr.host + "/");
      headers.set("origin", sr.protocol + "//" + sr.host);
    } catch (e) {
      headers.set("referer", origin);
      headers.set("origin", u.protocol + "//" + u.host);
    }
  } else {
    headers.set("referer", origin);
    headers.set("origin", u.protocol + "//" + u.host);
  }

  return headers;
}

function isVideoPageUrl(u) {
  return /\/video\/\d+\/?$/i.test(u.pathname);
}

function isGetFileUrl(u) {
  return /\/get_file\//i.test(u.pathname);
}

function isRedirectStatus(code) {
  return code === 301 || code === 302 || code === 303 || code === 307 || code === 308;
}

function isAllowedHost(host) {
  host = (host || "").toLowerCase();

  for (var i = 0; i < ALLOWED_HOSTS.length; i++) {
    var rule = ALLOWED_HOSTS[i];
    if (rule.charAt(0) === ".") {
      var suffix = rule.slice(1);
      if (host === suffix || host.endsWith("." + suffix)) return true;
    } else {
      if (host === rule) return true;
    }
  }

  return false;
}

function absolutizeUrl(base, maybeRelative) {
  try {
    return new URL(maybeRelative).toString();
  } catch (e) {
    return new URL(maybeRelative, base).toString();
  }
}

function fetchWithTimeout(url, init, timeoutMs) {
  var controller = new AbortController();
  var timer = setTimeout(function () {
    controller.abort("timeout");
  }, timeoutMs || REQUEST_TIMEOUT_MS);

  var reqInit = init || {};
  reqInit.signal = controller.signal;

  return fetch(url, reqInit).finally(function () {
    clearTimeout(timer);
  });
}

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch (e) {
    return null;
  }
}

function fail(statusCode, error, trace, details) {
  return {
    ok: false,
    statusCode: statusCode || 502,
    error: error || "Error",
    details: details || null,
    trace: trace || []
  };
}

function safeError(err) {
  if (!err) return "unknown";
  if (typeof err === "string") return err;
  return err.message || String(err);
}

function jsonResponse(status, obj) {
  return new Response(JSON.stringify(obj, null, 2), {
    status: status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
