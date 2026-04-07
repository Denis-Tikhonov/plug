// =============================================================================
// AdultJS Plugin for Lampa (Android TV)
// VERSION: 3.0.1
// CHANGELOG:
//   v1.0.0 — Оригинальная версия
//   v1.1.0 — Добавлен источник TrahKino (trahkino.me)
//   v1.2.0 — Добавлен источник UkDevilz (w0w.ukdevilz.com)
//             Добавлен механизм fallback_host для всех источников
//             Добавлено поле version и maintenance в конфиги источников
//             Изменено название плагина: ru -> "Adult JS"
//             Зарезервирована разметка для последующего добавления источников
//   v3.0.0 — Реструктуризация кода согласно стандарту разделов
//             Версия вынесена в название компонента настроек
//             В настройках оставлен один пункт: Предпросмотр при наведении
//   v3.0.1 — Исправлен StreamLinks XVideos: добавлен перебор регулярок HLS
//             (сайт сменил одинарные кавычки на двойные в setVideoHLS)
// ROLLBACK:   git checkout v3.0.0 -- AdultJS.txt
// =============================================================================
"use strict";

// =============================================================================
// SECTION 2: СЛУЖЕБНЫЙ КОД (полифилы) — НЕ РЕДАКТИРОВАТЬ
// =============================================================================

function _toConsumableArray(e) {
  return _arrayWithoutHoles(e) || _iterableToArray(e) || _unsupportedIterableToArray(e) || _nonIterableSpread()
}
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
}
function _iterableToArray(e) {
  if ("undefined" != typeof Symbol && null != e[Symbol.iterator] || null != e["@@iterator"]) return Array.from(e)
}
function _arrayWithoutHoles(e) {
  if (Array.isArray(e)) return _arrayLikeToArray(e)
}
function _slicedToArray(e, t) {
  return _arrayWithHoles(e) || _iterableToArrayLimit(e, t) || _unsupportedIterableToArray(e, t) || _nonIterableRest()
}
function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
}
function _iterableToArrayLimit(e, t) {
  var a = null == e ? null : "undefined" != typeof Symbol && e[Symbol.iterator] || e["@@iterator"];
  if (null != a) {
    var n, r, i, o, s = [], l = !0, c = !1;
    try {
      if (i = (a = a.call(e)).next, 0 === t) {
        if (Object(a) !== a) return;
        l = !1
      } else
        for (; !(l = (n = i.call(a)).done) && (s.push(n.value), s.length !== t); l = !0);
    } catch (e) { c = !0, r = e }
    finally {
      try {
        if (!l && null != a.return && (o = a.return(), Object(o) !== o)) return
      } finally { if (c) throw r }
    }
    return s
  }
}
function _arrayWithHoles(e) {
  if (Array.isArray(e)) return e
}
function _createForOfIteratorHelper(e, t) {
  var a = "undefined" != typeof Symbol && e[Symbol.iterator] || e["@@iterator"];
  if (!a) {
    if (Array.isArray(e) || (a = _unsupportedIterableToArray(e)) || t && e && "number" == typeof e.length) {
      a && (e = a);
      var n = 0, r = function() {};
      return {
        s: r,
        n: function() { return n >= e.length ? { done: !0 } : { done: !1, value: e[n++] } },
        e: function(e) { throw e },
        f: r
      }
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
  }
  var i, o = !0, s = !1;
  return {
    s: function() { a = a.call(e) },
    n: function() { var e = a.next(); return o = e.done, e },
    e: function(e) { s = !0, i = e },
    f: function() {
      try { o || null == a.return || a.return() }
      finally { if (s) throw i }
    }
  }
}
function _unsupportedIterableToArray(e, t) {
  if (e) {
    if ("string" == typeof e) return _arrayLikeToArray(e, t);
    var a = {}.toString.call(e).slice(8, -1);
    return "Object" === a && e.constructor && (a = e.constructor.name),
      "Map" === a || "Set" === a ? Array.from(e) :
      "Arguments" === a || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(a) ? _arrayLikeToArray(e, t) : void 0
  }
}
function _arrayLikeToArray(e, t) {
  (null == t || t > e.length) && (t = e.length);
  for (var a = 0, n = Array(t); a < t; a++) n[a] = e[a];
  return n
}
function _typeof(e) {
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ?
    function(e) { return typeof e } :
    function(e) { return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e },
    _typeof(e)
}
function _regenerator() {
  var e, t, a = "function" == typeof Symbol ? Symbol : {},
    n = a.iterator || "@@iterator",
    r = a.toStringTag || "@@toStringTag";
  function i(a, n, r, i) {
    var l = n && n.prototype instanceof s ? n : s,
      c = Object.create(l.prototype);
    return _regeneratorDefine2(c, "_invoke", function(a, n, r) {
      var i, s, l, c = 0, u = r || [], p = !1,
        d = {
          p: 0, n: 0, v: e, a: h, f: h.bind(e, 4),
          d: function(t, a) { return i = t, s = 0, l = e, d.n = a, o }
        };
      function h(a, n) {
        for (s = a, l = n, t = 0; !p && c && !r && t < u.length; t++) {
          var r, i = u[t], h = d.p, m = i[2];
          a > 3 ? (r = m === n) && (l = i[(s = i[4]) ? 5 : (s = 3, 3)], i[4] = i[5] = e) :
            i[0] <= h && ((r = a < 2 && h < i[1]) ? (s = 0, d.v = n, d.n = i[1]) :
              h < m && (r = a < 3 || i[0] > n || n > m) && (i[4] = a, i[5] = n, d.n = m, s = 0))
        }
        if (r || a > 1) return o;
        throw p = !0, n
      }
      return function(r, u, m) {
        if (c > 1) throw TypeError("Generator is already running");
        for (p && 1 === u && h(u, m), s = u, l = m; (t = s < 2 ? e : l) || !p;) {
          i || (s ? s < 3 ? (s > 1 && (d.n = -1), h(s, l)) : d.n = l : d.v = l);
          try {
            if (c = 2, i) {
              if (s || (r = "next"), t = i[r]) {
                if (!(t = t.call(i, l))) throw TypeError("iterator result is not an object");
                if (!t.done) return t;
                l = t.value, s < 2 && (s = 0)
              } else 1 === s && (t = i.return) && t.call(i),
                s < 2 && (l = TypeError("The iterator does not provide a '" + r + "' method"), s = 1);
              i = e
            } else if ((t = (p = d.n < 0) ? l : a.call(n, d)) !== o) break
          } catch (t) { i = e, s = 1, l = t }
          finally { c = 1 }
        }
        return { value: t, done: p }
      }
    }(a, r, i), !0), c
  }
  var o = {};
  function s() {}
  function l() {}
  function c() {}
  t = Object.getPrototypeOf;
  var u = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, (function() { return this })), t),
    p = c.prototype = s.prototype = Object.create(u);
  function d(e) {
    return Object.setPrototypeOf ? Object.setPrototypeOf(e, c) :
      (e.__proto__ = c, _regeneratorDefine2(e, r, "GeneratorFunction")),
      e.prototype = Object.create(p), e
  }
  return l.prototype = c,
    _regeneratorDefine2(p, "constructor", c),
    _regeneratorDefine2(c, "constructor", l),
    l.displayName = "GeneratorFunction",
    _regeneratorDefine2(c, r, "GeneratorFunction"),
    _regeneratorDefine2(p),
    _regeneratorDefine2(p, r, "Generator"),
    _regeneratorDefine2(p, n, (function() { return this })),
    _regeneratorDefine2(p, "toString", (function() { return "[object Generator]" })),
    (_regenerator = function() { return { w: i, m: d } })()
}
function _regeneratorDefine2(e, t, a, n) {
  var r = Object.defineProperty;
  try { r({}, "", {}) } catch (e) { r = 0 }
  _regeneratorDefine2 = function(e, t, a, n) {
    if (t) r ? r(e, t, { value: a, enumerable: !n, configurable: !n, writable: !n }) : e[t] = a;
    else {
      var i = function(t, a) {
        _regeneratorDefine2(e, t, (function(e) { return this._invoke(t, a, e) }))
      };
      i("next", 0), i("throw", 1), i("return", 2)
    }
  }, _regeneratorDefine2(e, t, a, n)
}
function asyncGeneratorStep(e, t, a, n, r, i, o) {
  try { var s = e[i](o), l = s.value } catch (e) { return void a(e) }
  s.done ? t(l) : Promise.resolve(l).then(n, r)
}
function _asyncToGenerator(e) {
  return function() {
    var t = this, a = arguments;
    return new Promise((function(n, r) {
      var i = e.apply(t, a);
      function o(e) { asyncGeneratorStep(i, n, r, o, s, "next", e) }
      function s(e) { asyncGeneratorStep(i, n, r, o, s, "throw", e) }
      o(void 0)
    }))
  }
}
function ownKeys(e, t) {
  var a = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter((function(t) { return Object.getOwnPropertyDescriptor(e, t).enumerable }))), a.push.apply(a, n)
  }
  return a
}
function _objectSpread(e) {
  for (var t = 1; t < arguments.length; t++) {
    var a = null != arguments[t] ? arguments[t] : {};
    t % 2 ? ownKeys(Object(a), !0).forEach((function(t) { _defineProperty(e, t, a[t]) })) :
      Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(a)) :
      ownKeys(Object(a)).forEach((function(t) { Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(a, t)) }))
  }
  return e
}
function _defineProperty(e, t, a) {
  return (t = _toPropertyKey(t)) in e ?
    Object.defineProperty(e, t, { value: a, enumerable: !0, configurable: !0, writable: !0 }) :
    e[t] = a, e
}
function _classCallCheck(e, t) {
  if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")
}
function _defineProperties(e, t) {
  for (var a = 0; a < t.length; a++) {
    var n = t[a];
    n.enumerable = n.enumerable || !1, n.configurable = !0, "value" in n && (n.writable = !0),
      Object.defineProperty(e, _toPropertyKey(n.key), n)
  }
}
function _createClass(e, t, a) {
  return t && _defineProperties(e.prototype, t), a && _defineProperties(e, a),
    Object.defineProperty(e, "prototype", { writable: !1 }), e
}
function _toPropertyKey(e) {
  var t = _toPrimitive(e, "string");
  return "symbol" == _typeof(t) ? t : t + ""
}
function _toPrimitive(e, t) {
  if ("object" != _typeof(e) || !e) return e;
  var a = e[Symbol.toPrimitive];
  if (void 0 !== a) {
    var n = a.call(e, t || "default");
    if ("object" != _typeof(n)) return n;
    throw new TypeError("@@toPrimitive must return a primitive value.")
  }
  return ("string" === t ? String : Number)(e)
}

// =============================================================================
// MAIN CLOSURE
// =============================================================================
!function() {

  // ===========================================================================
  // SECTION 3: РЕДАКТИРУЕМЫЕ ИСТОЧНИКИ — HARDCODED
  // HTTP-клиент, утилиты, модели данных, парсеры: BongaCams, XVideos,
  // XNXX, SpankBang, Chaturbate, EPorner
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // FALLBACK HOST RESOLVER
  // Для добавления fallback к источнику — добавьте поле fallback_host в P[].
  // [FALLBACK_HOOK] — здесь можно добавить HEAD-запрос к host.
  // ---------------------------------------------------------------------------
  function resolveFallbackHost(cfg) { return cfg.host; }

  // ---------------------------------------------------------------------------
  // HTTP CLIENT
  // ---------------------------------------------------------------------------
  var _hc = function() {
    function e() { _classCallCheck(this, e) }
    return _createClass(e, null, [{
      key: "ensureHeaders",
      value: function(e) {
        var t = e ? _objectSpread({}, e) : {};
        return t["user-agent"] || t["User-Agent"] ||
          (t["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"),
          t
      }
    }, {
      key: "Get",
      value: (function() {
        var _get = _asyncToGenerator(_regenerator().m((function t(a, n, r) {
          var i, o, s, l, c;
          return _regenerator().w((function(t) {
            for (;;) switch (t.n) {
              case 0:
                if (!e.isAndroid) { t.n = 1; break }
                return t.a(2, e.Native(a));
              case 1:
                return i = e.ensureHeaders(n), o = { method: "GET", headers: i }, t.n = 2, fetch(a, o);
              case 2:
                if (s = t.v, null == r) { t.n = 4; break }
                return t.n = 3, s.arrayBuffer();
              case 3:
                return l = t.v, c = new TextDecoder(r), t.a(2, c.decode(l));
              case 4:
                return t.n = 5, s.text();
              case 5:
                return t.a(2, t.v)
            }
          }), t)
        })));
        return function(e, a, n) { return _get.apply(this, arguments) }
      }())
    }, {
      key: "Native",
      value: function(t, a, n) {
        return new Promise((function(r, i) {
          var o = new window.Lampa.Reguest;
          o.native(t, (function(e) {
            "object" === _typeof(e) ? r(JSON.stringify(e)) : r(e), o.clear()
          }), i, a, { dataType: "text", timeout: 8e3, headers: e.ensureHeaders(n) })
        }))
      }
    }]);
  }();
  _hc.isAndroid = "undefined" != typeof window &&
    void 0 !== window.Lampa &&
    void 0 !== window.Lampa.Platform &&
    "function" == typeof window.Lampa.Platform.is &&
    window.Lampa.Platform.is("android");
  var l = _hc;

  // ---------------------------------------------------------------------------
  // UTILS
  // ---------------------------------------------------------------------------
  var c = function() {
    return _createClass((function e() { _classCallCheck(this, e) }), null, [{
      key: "extract",
      value: function(e, t) {
        var a, n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 1,
          r = (null === (a = e.match(t)) || void 0 === a ? void 0 : a[n]) || null;
        return r && "" !== r.trim() ? r.trim() : null
      }
    }])
  }();

  // ---------------------------------------------------------------------------
  // DATA MODELS
  // ---------------------------------------------------------------------------
  var u = _createClass((function e(t, a, n, r, i, o, s, l, c) {
    _classCallCheck(this, e),
      this.name = t, this.video = a, this.picture = n, this.preview = r,
      this.time = i, this.quality = o, this.json = s, this.related = l, this.model = c
  }));

  var p = _createClass((function e(t, a, n, r) {
    _classCallCheck(this, e),
      this.title = t, this.playlist_url = a,
      n && (this.search_on = n), r && (this.submenu = r)
  }));

  var h = _createClass((function e(t, a) {
    _classCallCheck(this, e),
      a ? (this.total_pages = 1, this.list = t.recomends) :
          (this.qualitys = t.qualitys, this.recomends = t.recomends)
  }));

  var m = _createClass((function e(t, a) {
    _classCallCheck(this, e), this.qualitys = t, this.recomends = a
  }));

  // ---------------------------------------------------------------------------
  // SOURCE: bongacams.com — ukr.bongacams.com
  // ---------------------------------------------------------------------------
  var _BongaCamsClass = function() {
    function e() { _classCallCheck(this, e) }
    return _createClass(e, [{
      key: "Invoke",
      value: (function() {
        var _inv = _asyncToGenerator(_regenerator().m((function e(t) {
          var a;
          return _regenerator().w((function(e) {
            for (;;) switch (e.n) {
              case 0:
                return e.n = 1, l.Get(t.replace("?pg=1", "").replace("pg=", "page="));
              case 1:
                return a = e.v, e.a(2, { menu: this.Menu(t), list: this.Playlist(a) })
            }
          }), e, this)
        })));
        return function(e) { return _inv.apply(this, arguments) }
      }())
    }, {
      key: "Playlist",
      value: function(e) {
        var t = [];
        return e && 0 !== e.length ? (
          e.split(/class="(ls_thumb js-ls_thumb|mls_item mls_so_)"/).forEach((function(e) {
            var a = c.extract(e, /data-chathost="([^"]+)"/);
            if (a) {
              var n = c.extract(e, /data-esid="([^"]+)"/);
              if (n) {
                var r = c.extract(e, /this.src='\/\/([^']+\.(jpg))'/);
                if (r || (r = c.extract(e, /src="\/\/([^"]+)"/)), r) {
                  var i = c.extract(e, /lst_topic lst_data">(.*?)</);
                  i || (i = a);
                  var o = null;
                  e.includes("__hd_plus __rt") ? o = "HD+" : e.includes("__hd __rtl") && (o = "HD"),
                    t.push(new u(i,
                      "https://" + n + ".bcvcdn.com/hls/stream_" + a + "/public-aac/stream_" + a + "/chunks.m3u8",
                      "https://" + r, null, null, o, !1, !1, null))
                }
              }
            }
          })), t) : t
      }
    }, {
      key: "Menu",
      value: function(t) {
        var a = e.host + "/",
          n = [
            new p("Новые", a + "new-models"),
            new p("Пары", a + "couples"),
            new p("Девушки", a + "female"),
            new p("Русские модели", a + "female/tags/russian"),
            new p("Парни", a + "male"),
            new p("Транссексуалы", a + "trans")
          ],
          r = n.find((function(e) { return t.includes(e.playlist_url.replace(a, "")) }));
        return [new p("Сортировка: " + (r ? r.title : "Новые"), "submenu", void 0, n)]
      }
    }]);
  }();
  _BongaCamsClass.host = "https://ukr.bongacams.com";
  var d = _BongaCamsClass;

  // ---------------------------------------------------------------------------
  // SOURCE: xvideos.com — www.xv-ru.com
  // [v3.0.1] StreamLinks: добавлен перебор регулярок для извлечения HLS-URL
  //          Сайт изменил синтаксис: одинарные кавычки → двойные в setVideoHLS
  // ---------------------------------------------------------------------------
  var _XVideosClass = function() {
    function e() { _classCallCheck(this, e) }
    return _createClass(e, [{
      key: "Invoke",
      value: (function() {
        var _inv = _asyncToGenerator(_regenerator().m((function t(a) {
          var n, r, i, o, s, pg, url, html;
          return _regenerator().w((function(t) {
            for (;;) switch (t.n) {
              case 0:
                if (!a.includes("/video")) { t.n = 2; break }
                return t.n = 1, l.Get(a);
              case 1:
                return n = t.v, t.a(2, new h(this.StreamLinks(n), a.includes("&related")));
              case 2:
                return r = new URL(a, e.host),
                  i = r.searchParams.get("search") || "",
                  o = r.searchParams.get("sort") || "",
                  s = r.searchParams.get("c") || "",
                  pg = parseInt(r.searchParams.get("pg") || "1", 10),
                  url = this.buildUrl(e.host, i, o, s, pg),
                  t.n = 3, l.Get(url);
              case 3:
                return html = t.v, t.a(2, { menu: this.Menu(o, s), list: this.Playlist(html) });
              case 4:
                return t.a(2)
            }
          }), t, this)
        })));
        return function(e) { return _inv.apply(this, arguments) }
      }())
    }, {
      key: "buildUrl",
      value: function(e, t, a, n, r) {
        return t ? "".concat(e, "/?k=").concat(encodeURIComponent(t), "&p=").concat(r) :
          n ? "".concat(e, "/c/s:").concat("top" === a ? "rating" : "uploaddate", "/").concat(n, "/").concat(r) :
          "top" === a ? "".concat(e, "/best/").concat(this.getLastMonth(), "/").concat(r) :
          "".concat(e, "/new/").concat(r)
      }
    }, {
      key: "getLastMonth",
      value: function() {
        var e = new Date;
        return e.setMonth(e.getMonth() - 1), e.toISOString().slice(0, 7)
      }
    }, {
      key: "Playlist",
      value: function(t) {
        if (!t) return [];
        for (var a = t.split('<div id="video'), n = [], r = 1; r < a.length; r++) {
          var i = a[r],
            o = /<a href="\/(video[^"]+|search-video\/[^"]+)" title="([^"]+)"/.exec(i);
          if (o && o[1] && o[2] || (o = /<a href="\/(video[^"]+)"[^>]+>([^<]+)/.exec(i)) && o[1] && o[2]) {
            var s  = c.extract(i, /<span class="video-hd-mark">([^<]+)<\/span>/),
              dur  = c.extract(i, /<span class="duration">([^<]+)<\/span>/),
              img  = c.extract(i, /data-src="([^"]+)"/),
              prev = (img = img ?
                (img = (img = img
                  .replace(/\/videos\/thumbs([0-9]+)\//, "/videos/thumbs$1lll/"))
                  .replace(/\.THUMBNUM\.(jpg|png)$/i, ".1.$1"))
                  .replace("thumbs169l/", "thumbs169lll/")
                  .replace("thumbs169ll/", "thumbs169lll/") : "")
                  .replace(/\/thumbs[^/]+\//, "/videopreview/");
            prev = (prev = prev.replace(/\/[^/]+$/, "")).replace(/-[0-9]+$/, ""),
              n.push(new u(o[2], "".concat(e.host, "/").concat(o[1]),
                img, prev + "_169.mp4", dur || null, s || null, !0, !0, null))
          }
        }
        return n
      }
    }, {
      key: "Menu",
      value: function(t, a) {
        var n, r = e.host,
          i = [new p("Поиск", r, "search_on")],
          o = new p(
            "Сортировка: ".concat("like" === t ? "Понравившиеся" : "top" === t ? "Лучшие" : "Новое"),
            "submenu", void 0,
            [new p("Новое", r + "?c=".concat(a)), new p("Лучшие", r + "?sort=top&c=".concat(a))]
          );
        i.push(o);
        var s = [
          new p("Все",                   r + "?sort=".concat(t)),
          new p("Азиат",                 r + "?sort=".concat(t, "&c=Asian_Woman-32")),
          new p("Анал",                  r + "?sort=".concat(t, "&c=Anal-12")),
          new p("Арабки",                r + "?sort=".concat(t, "&c=Arab-159")),
          new p("Бисексуалы",            r + "?sort=".concat(t, "&c=Bi_Sexual-62")),
          new p("Блондинки",             r + "?sort=".concat(t, "&c=Blonde-20")),
          new p("Большие Попы",          r + "?sort=".concat(t, "&c=Big_Ass-24")),
          new p("Большие Сиськи",        r + "?sort=".concat(t, "&c=Big_Tits-23")),
          new p("Большие яйца",          r + "?sort=".concat(t, "&c=Big_Cock-34")),
          new p("Брюнетки",              r + "?sort=".concat(t, "&c=Brunette-25")),
          new p("В масле",               r + "?sort=".concat(t, "&c=Oiled-22")),
          new p("Веб камеры",            r + "?sort=".concat(t, "&c=Cam_Porn-58")),
          new p("Гэнгбэнг",              r + "?sort=".concat(t, "&c=Gangbang-69")),
          new p("Зияющие отверстия",     r + "?sort=".concat(t, "&c=Gapes-167")),
          new p("Зрелые",                r + "?sort=".concat(t, "&c=Mature-38")),
          new p("Индийский",             r + "?sort=".concat(t, "&c=Indian-89")),
          new p("Испорченная семья",     r + "?sort=".concat(t, "&c=Fucked_Up_Family-81")),
          new p("Кончает внутрь",        r + "?sort=".concat(t, "&c=Creampie-40")),
          new p("Куколд / Горячая Жена", r + "?sort=".concat(t, "&c=Cuckold-237")),
          new p("Латинки",               r + "?sort=".concat(t, "&c=Latina-16")),
          new p("Лесбиянки",             r + "?sort=".concat(t, "&c=Lesbian-26")),
          new p("Любительское порно",    r + "?sort=".concat(t, "&c=Amateur-65")),
          new p("Мамочки. МИЛФ",         r + "?sort=".concat(t, "&c=Milf-19")),
          new p("Межрассовые",           r + "?sort=".concat(t, "&c=Interracial-27")),
          new p("Минет",                 r + "?sort=".concat(t, "&c=Blowjob-15")),
          new p("Нижнее бельё",          r + "?sort=".concat(t, "&c=Lingerie-83")),
          new p("Попки",                 r + "?sort=".concat(t, "&c=Ass-14")),
          new p("Рыжие",                 r + "?sort=".concat(t, "&c=Redhead-31")),
          new p("Сквиртинг",             r + "?sort=".concat(t, "&c=Squirting-56")),
          new p("Соло",                  r + "?sort=".concat(t, "&c=Solo_and_Masturbation-33")),
          new p("Сперма",                r + "?sort=".concat(t, "&c=Cumshot-18")),
          new p("Тинейджеры",            r + "?sort=".concat(t, "&c=Teen-13")),
          new p("Фемдом",                r + "?sort=".concat(t, "&c=Femdom-235")),
          new p("Фистинг",               r + "?sort=".concat(t, "&c=Fisting-165")),
          new p("Черные Женщины",        r + "?sort=".concat(t, "&c=bbw-51")),
          new p("Черный",                r + "?sort=".concat(t, "&c=Black_Woman-30")),
          new p("Чулки,колготки",        r + "?sort=".concat(t, "&c=Stockings-28")),
          new p("ASMR",                  r + "?sort=".concat(t, "&c=ASMR-229"))
        ];
        return i.push(new p(
          "Категория: ".concat(
            (null === (n = s.find((function(e) { return e.playlist_url.endsWith("c=".concat(a)) }))) || void 0 === n
              ? void 0 : n.title) || "все"),
          "submenu", void 0, s)), i
      }
    }, {
      key: "StreamLinks",
      value: function(t) {
        // [v3.0.1] Перебор вариантов синтаксиса setVideoHLS:
        //   - одинарные кавычки (старый формат)
        //   - двойные кавычки (новый формат xv-ru.com)
        //   - универсальная регулярка с пробелами вокруг скобок
        var a = c.extract(t, /html5player\.setVideoHLS$'([^']+)'$/)
              || c.extract(t, /html5player\.setVideoHLS$"([^"]+)"$/)
              || c.extract(t, /setVideoHLS\s*$\s*['"]([^'"]+)['"]\s*$/);
        if (!a) {
          console.warn("AdultJS XVideos: HLS URL не найден на странице");
          return new m({}, []);
        }
        var n = [], r = c.extract(t, /video_related=([^\n\r]+);window/);
        if (r && r.startsWith("[") && r.endsWith("]")) try {
          var i, o = _createForOfIteratorHelper(JSON.parse(r));
          try {
            for (o.s(); !(i = o.n()).done;) {
              var s = i.value;
              if (s.tf && s.u && s.if) {
                var prev = s.if.replace(/\/thumbs[^/]+\//, "/videopreview/");
                prev = (prev = prev.replace(/\/[^/]+$/, "")).replace(/-[0-9]+$/, ""),
                  n.push(new u(s.tf, "".concat(e.host).concat(s.u),
                    s.if, prev + "_169.mp4", s.d || "", null, !0, !0, null))
              }
            }
          } catch (e) { o.e(e) } finally { o.f() }
        } catch (e) {}
        return new m({ auto: a }, n)
      }
    }]);
  }();
  _XVideosClass.host = "https://www.xv-ru.com";
  var g = _XVideosClass;

  // ---------------------------------------------------------------------------
  // SOURCE: xnxx.com — www.xnxx-ru.com
  // ---------------------------------------------------------------------------
  var _XnxxClass = function() {
    function e() { _classCallCheck(this, e) }
    return _createClass(e, [{
      key: "Invoke",
      value: (function() {
        var _inv = _asyncToGenerator(_regenerator().m((function t(a) {
          var n, r, i, o, s, html;
          return _regenerator().w((function(t) {
            for (;;) switch (t.n) {
              case 0:
                if (!a.includes("/video-")) { t.n = 2; break }
                return t.n = 1, l.Get(a);
              case 1:
                return n = t.v, t.a(2, new h(this.StreamLinks(n), a.includes("&related")));
              case 2:
                return r = new URL(a, e.host),
                  i = r.searchParams.get("search") || "",
                  o = parseInt(r.searchParams.get("pg") || "1", 10),
                  s = this.buildUrl(e.host, i, o),
                  t.n = 3, l.Get(s);
              case 3:
                return html = t.v, t.a(2, { menu: this.Menu(), list: this.Playlist(html) });
              case 4:
                return t.a(2)
            }
          }), t, this)
        })));
        return function(e) { return _inv.apply(this, arguments) }
      }())
    }, {
      key: "buildUrl",
      value: function(e, t, a) {
        if (t) return "".concat(e, "/search/").concat(encodeURIComponent(t), "/").concat(a);
        var n = new Date; n.setMonth(n.getMonth() - 1);
        return "".concat(e, "/best/").concat(n.toISOString().slice(0, 7), "/").concat(a)
      }
    }, {
      key: "Playlist",
      value: function(t) {
        if (!t) return [];
        for (var a = t.split('<div id="video_'), n = [], r = 1; r < a.length; r++) {
          var i = a[r],
            o = /<a href="\/(video-[^"]+)" title="([^"]+)"/.exec(i),
            s = c.extract(i, /<span class="superfluous"> - <\/span>([^<]+)<\/span>/);
          if (o && o[1] && o[2]) {
            var dur  = c.extract(i, /<\/span>([^<]+)<span class="video-hd">/),
              img    = c.extract(i, /data-src="([^"]+)"/),
              prev   = (img = img ? img.replace(".THUMBNUM.", ".1.") : "")
                         .replace(/\/thumbs[^/]+\//, "/videopreview/");
            prev = (prev = prev.replace(/\/[^/]+$/, "")).replace(/-[0-9]+$/, ""),
              n.push(new u(o[2], "".concat(e.host, "/").concat(o[1]),
                img, prev + "_169.mp4", dur || null, s || null, !0, !0, null))
          }
        }
        return n
      }
    }, {
      key: "Menu",
      value: function() {
        return [new p("Поиск", e.host + "/xnx", "search_on")]
      }
    }, {
      key: "StreamLinks",
      value: function(t) {
        var a = c.extract(t, /html5player\.setVideoHLS$'([^']+)'$/)
              || c.extract(t, /html5player\.setVideoHLS$"([^"]+)"$/)
              || c.extract(t, /setVideoHLS\s*$\s*['"]([^'"]+)['"]\s*$/);
        if (!a) return new m({}, []);
        var n = [], r = c.extract(t, /video_related=([^\n\r]+);window/);
        if (r && r.startsWith("[") && r.endsWith("]")) try {
          var i, o = _createForOfIteratorHelper(JSON.parse(r));
          try {
            for (o.s(); !(i = o.n()).done;) {
              var s = i.value;
              s.tf && s.u && s.i &&
                n.push(new u(s.tf, "".concat(e.host).concat(s.u), s.i, null, "", null, !0, !0, null))
            }
          } catch (e) { o.e(e) } finally { o.f() }
        } catch (e) {}
        return new m({ auto: a }, n)
      }
    }]);
  }();
  _XnxxClass.host = "https://www.xnxx-ru.com";
  var y = _XnxxClass;

  // ---------------------------------------------------------------------------
  // SOURCE: spankbang.com — ru.spankbang.com
  // ---------------------------------------------------------------------------
  var _SpankBangClass = function() {
    function e() { _classCallCheck(this, e) }
    return _createClass(e, [{
      key: "Invoke",
      value: (function() {
        var _inv = _asyncToGenerator(_regenerator().m((function t(a) {
          var n, r, i, o, s, url, html;
          return _regenerator().w((function(t) {
            for (;;) switch (t.n) {
              case 0:
                if (!/\/video\//.test(a)) { t.n = 2; break }
                return t.n = 1, l.Get(a);
              case 1:
                return n = t.v, t.a(2, new h(this.StreamLinks(n), a.includes("&related")));
              case 2:
                return r = new URL(a, e.host),
                  i = r.searchParams.get("search") || "",
                  o = r.searchParams.get("sort") || "",
                  s = parseInt(r.searchParams.get("pg") || "1", 10),
                  url = this.buildUrl(e.host, i, o, s),
                  t.n = 3, l.Get(url);
              case 3:
                return html = t.v, t.a(2, { menu: this.Menu(o), list: this.Playlist(html) });
              case 4:
                return t.a(2)
            }
          }), t, this)
        })));
        return function(e) { return _inv.apply(this, arguments) }
      }())
    }, {
      key: "buildUrl",
      value: function(e, t, a, n) {
        var r = "".concat(e, "/");
        return t ? r += "s/".concat(encodeURIComponent(t), "/").concat(n, "/") :
          (r += "".concat(a || "new_videos", "/").concat(n, "/"),
           "most_popular" === a && (r += "?p=m")), r
      }
    }, {
      key: "Playlist",
      value: function(t) {
        if (!t) return [];
        for (var a = t.split('class="video-item responsive-page"'), n = [], r = 1; r < a.length; r++) {
          var i = a[r],
            o = /<a href="\/([^\"]+)" title="([^"]+)"/.exec(i);
          if (o && o[1] && o[2]) {
            var s   = c.extract(i, /<span class="video-badge h">([^<]+)<\/span>/),
              dur   = c.extract(i, /<span class="video-badge l">([^<]+)<\/span>/),
              img   = c.extract(i, /data-src="([^"]+)"/);
            img = img ? img.replace(/\/w:[0-9]00\//, "/w:300/") : "";
            var prev = c.extract(i, /data-preview="([^"]+)"/);
            n.push(new u(o[2], "".concat(e.host, "/").concat(o[1]),
              img, prev || null, dur || null, s || null, !0, !0, null))
          }
        }
        return n
      }
    }, {
      key: "Menu",
      value: function(t) {
        var a = e.host + "/sbg";
        return [
          new p("Поиск", a, "search_on"),
          new p("Сортировка: ".concat(t || "новое"), "submenu", void 0, [
            new p("Новое", a),
            new p("Трендовое", a + "?sort=trending_videos"),
            new p("Популярное", a + "?sort=most_popular")
          ])
        ]
      }
    }, {
      key: "StreamLinks",
      value: function(e) {
        for (var t, a = {}, n = /'([0-9]+)(p|k)': ?$'(https?:\/\/[^']+)'/g; null !== (t = n.exec(e));) {
          var r = "k" === t[2] ? 2160 : parseInt(t[1], 10);
          a["".concat(r, "p")] = t[3]
        }
        return new m(a, this.Playlist(e))
      }
    }]);
  }();
  _SpankBangClass.host = "https://ru.spankbang.com";
  var v = _SpankBangClass;

  // ---------------------------------------------------------------------------
  // SOURCE: chaturbate.com — chaturbate.com
  // ---------------------------------------------------------------------------
  var _ChaturbateClass = function() {
    function e() { _classCallCheck(this, e) }
    return _createClass(e, [{
      key: "Invoke",
      value: (function() {
        var _inv = _asyncToGenerator(_regenerator().m((function t(a) {
          var n, r, i, o, s, html;
          return _regenerator().w((function(t) {
            for (;;) switch (t.n) {
              case 0:
                if (n = new URL(a, e.host), !a.includes("baba=")) { t.n = 2; break }
                return t.n = 1, this.StreamLinks(n.searchParams.get("baba"));
              case 1:
                return s = t.v, t.a(2, new h(s, !1));
              case 2:
                return r = n.searchParams.get("sort") || "",
                  i = parseInt(n.searchParams.get("pg") || "1", 10),
                  o = this.buildUrl(e.host, r, i),
                  t.n = 3, l.Get(o);
              case 3:
                return html = t.v, t.a(2, { menu: this.Menu(r), list: this.Playlist(html) });
              case 4:
                return t.a(2)
            }
          }), t, this)
        })));
        return function(e) { return _inv.apply(this, arguments) }
      }())
    }, {
      key: "buildUrl",
      value: function(e, t, a) {
        var n = e + "/api/ts/roomlist/room-list/?enable_recommendations=false&limit=90";
        return t && (n += "&genders=".concat(t)), a > 1 && (n += "&offset=".concat(90 * a)), n
      }
    }, {
      key: "Playlist",
      value: function(t) {
        if (!t) return [];
        for (var a = t.split("display_age"), n = [], r = 1; r < a.length; r++) {
          var i = a[r];
          if (i.includes('"current_show":"public"')) {
            var o = c.extract(i, /"username":"([^"]+)"/);
            if (o) {
              var s = c.extract(i, /"img":"([^"]+)"/);
              s && (s = s.replace(/\\/g, ""),
                n.push(new u(o.trim(), "".concat(e.host, "?baba=").concat(o.trim()),
                  s, null, null, null, !0, !1, null)))
            }
          }
        }
        return n
      }
    }, {
      key: "Menu",
      value: function(t) {
        var a, n = e.host + "/chu",
          r = [
            new p("Лучшие", n),
            new p("Девушки", n + "?sort=f"),
            new p("Пары", n + "?sort=c"),
            new p("Парни", n + "?sort=m"),
            new p("Транссексуалы", n + "?sort=t")
          ],
          i = (null === (a = r.find((function(e) { return e.playlist_url.endsWith("=".concat(t)) }))) || void 0 === a
            ? void 0 : a.title) || "Лучшие";
        return [new p("Сортировка: ".concat(i), "submenu", void 0, r)]
      }
    }, {
      key: "StreamLinks",
      value: (function() {
        var _sl = _asyncToGenerator(_regenerator().m((function t(a) {
          var n, r;
          return _regenerator().w((function(t) {
            for (;;) switch (t.n) {
              case 0:
                if (a) { t.n = 1; break }
                return t.a(2, new m({}, []));
              case 1:
                return t.n = 2, l.Get("".concat(e.host, "/").concat(a, "/"));
              case 2:
                if (n = t.v, r = c.extract(n, /(https?:\/\/[^ ]+\/playlist\.m3u8)/)) { t.n = 3; break }
                return t.a(2, new m({}, []));
              case 3:
                return t.a(2, new m({ auto: r.replace(/\\u002D/g, "-").replace(/\\/g, "") }, []))
            }
          }), t)
        })));
        return function(e) { return _sl.apply(this, arguments) }
      }())
    }]);
  }();
  _ChaturbateClass.host = "https://chaturbate.com";
  var b = _ChaturbateClass;

  // ---------------------------------------------------------------------------
  // SOURCE: eporner.com — www.eporner.com
  // ---------------------------------------------------------------------------
  var _EpornerClass = function() {
    function e() { _classCallCheck(this, e) }
    return _createClass(e, [{
      key: "Invoke",
      value: (function() {
        var _inv = _asyncToGenerator(_regenerator().m((function t(a) {
          var n, r, i, o, s, url, html, res, isRel;
          return _regenerator().w((function(t) {
            for (;;) switch (t.n) {
              case 0:
                if (!a.includes("/video")) { t.n = 2; break }
                return t.n = 1, this.StreamLinks(e.host, a);
              case 1:
                return res = t.v, isRel = a.includes("&related"), t.a(2, new h(res, isRel));
              case 2:
                return n = new URL(a, e.host),
                  r = n.searchParams.get("search") || "",
                  i = n.searchParams.get("sort") || "",
                  o = n.searchParams.get("c") || "",
                  s = parseInt(n.searchParams.get("pg") || "1", 10),
                  url = this.buildUrl(e.host, r, i, o, s),
                  t.n = 3, l.Get(url);
              case 3:
                return html = t.v, t.a(2, { menu: this.Menu(r, i, o), list: this.Playlist(html) });
              case 4:
                return t.a(2)
            }
          }), t, this)
        })));
        return function(e) { return _inv.apply(this, arguments) }
      }())
    }, {
      key: "buildUrl",
      value: function(e, t, a, n, r) {
        var i = "".concat(e, "/");
        return t ?
          (i += "search/".concat(encodeURIComponent(t), "/"),
           r > 1 && (i += "".concat(r, "/")),
           a && (i += "".concat(a, "/"))) :
          n ?
          (i += "cat/".concat(n, "/"), r > 1 && (i += "".concat(r, "/"))) :
          (r > 1 && (i += "".concat(r, "/")), a && (i += "".concat(a, "/"))),
          i
      }
    }, {
      key: "Playlist",
      value: function(t) {
        if (!t) return [];
        var a = t;
        a.includes('class="toptopbelinset"') && (a = a.split('class="toptopbelinset"')[1]);
        a.includes('class="relatedtext"')     && (a = a.split('class="relatedtext"')[1]);
        for (var n = a.split(/<div class="mb (hdy)?"/), r = [], i = 1; i < n.length; i++) {
          var o = n[i],
            s = /<p class="mbtit">\s*<a href="\/([^"]+)">([^<]+)<\/a>/i.exec(o);
          if (s && s[1] && s[2]) {
            var hd   = c.extract(o, /<div class="mvhdico"([^>]+)?><span>([^"<]+)/, 2),
              img    = c.extract(o, / data-src="([^"]+)"/);
            img || (img = c.extract(o, /<img src="([^"]+)"/));
            var id   = c.extract(o, /data-id="([^"]+)"/),
              prev   = img && id ? img.replace(/\/[^/]+$/, "") + "/".concat(id, "-preview.webm") : null,
              dur    = c.extract(o, /<span class="mbtim"([^>]+)?>([^<]+)<\/span>/, 2);
            r.push(new u(s[2], "".concat(e.host, "/").concat(s[1]),
              img || "", prev, dur || null, hd || null, !0, !0, null))
          }
        }
        return r
      }
    }, {
      key: "Menu",
      value: function(t, a, n) {
        var r, i = e.host, o = [new p("Поиск", i, "search_on")];
        if (t) return (o.push(new p("Сортировка: ".concat(a || "новинки"), "submenu", void 0, [
          new p("Новинки",        i + "?search=".concat(encodeURIComponent(t))),
          new p("Топ просмотра",  i + "?sort=most-viewed&search=".concat(encodeURIComponent(t))),
          new p("Топ рейтинга",   i + "?sort=top-rated&search=".concat(encodeURIComponent(t))),
          new p("Длинные ролики", i + "?sort=longest&search=".concat(encodeURIComponent(t))),
          new p("Короткие ролики",i + "?sort=shortest&search=".concat(encodeURIComponent(t)))
        ])), o);
        n || o.push(new p("Сортировка: ".concat(a || "новинки"), "submenu", void 0, [
          new p("Новинки",        i),
          new p("Топ просмотра",  i + "?sort=most-viewed"),
          new p("Топ рейтинга",   i + "?sort=top-rated"),
          new p("Длинные ролики", i + "?sort=longest"),
          new p("Короткие ролики",i + "?sort=shortest")
        ]));
        var s = [
          new p("Все", i),
          new p("4K UHD", i + "?c=4k-porn"),          new p("60 FPS", i + "?c=60fps"),
          new p("Amateur", i + "?c=amateur"),          new p("Anal", i + "?c=anal"),
          new p("Asian", i + "?c=asian"),              new p("ASMR", i + "?c=asmr"),
          new p("BBW", i + "?c=bbw"),                  new p("BDSM", i + "?c=bdsm"),
          new p("Big Ass", i + "?c=big-ass"),          new p("Big Dick", i + "?c=big-dick"),
          new p("Big Tits", i + "?c=big-tits"),        new p("Bisexual", i + "?c=bisexual"),
          new p("Blonde", i + "?c=blonde"),            new p("Blowjob", i + "?c=blowjob"),
          new p("Bondage", i + "?c=bondage"),          new p("Brunette", i + "?c=brunette"),
          new p("Bukkake", i + "?c=bukkake"),          new p("Creampie", i + "?c=creampie"),
          new p("Cumshot", i + "?c=cumshot"),          new p("Double Penetration", i + "?c=double-penetration"),
          new p("Ebony", i + "?c=ebony"),              new p("Fat", i + "?c=fat"),
          new p("Fetish", i + "?c=fetish"),            new p("Fisting", i + "?c=fisting"),
          new p("Footjob", i + "?c=footjob"),          new p("For Women", i + "?c=for-women"),
          new p("Gay", i + "?c=gay"),                  new p("Group Sex", i + "?c=group-sex"),
          new p("Handjob", i + "?c=handjob"),          new p("Hardcore", i + "?c=hardcore"),
          new p("Hentai", i + "?c=hentai"),            new p("Homemade", i + "?c=homemade"),
          new p("Hotel", i + "?c=hotel"),              new p("Housewives", i + "?c=housewives"),
          new p("Indian", i + "?c=indian"),            new p("Interracial", i + "?c=interracial"),
          new p("Japanese", i + "?c=japanese"),        new p("Latina", i + "?c=latina"),
          new p("Lesbian", i + "?c=lesbians"),         new p("Lingerie", i + "?c=lingerie"),
          new p("Massage", i + "?c=massage"),          new p("Masturbation", i + "?c=masturbation"),
          new p("Mature", i + "?c=mature"),            new p("MILF", i + "?c=milf"),
          new p("Nurses", i + "?c=nurse"),             new p("Office", i + "?c=office"),
          new p("Older Men", i + "?c=old-man"),        new p("Orgy", i + "?c=orgy"),
          new p("Outdoor", i + "?c=outdoor"),          new p("Petite", i + "?c=petite"),
          new p("Pornstar", i + "?c=pornstar"),        new p("POV", i + "?c=pov-porn"),
          new p("Public", i + "?c=public"),            new p("Redhead", i + "?c=redhead"),
          new p("Shemale", i + "?c=shemale"),          new p("Sleep", i + "?c=sleep"),
          new p("Small Tits", i + "?c=small-tits"),    new p("Squirt", i + "?c=squirt"),
          new p("Striptease", i + "?c=striptease"),    new p("Students", i + "?c=students"),
          new p("Swinger", i + "?c=swingers"),         new p("Teen", i + "?c=teens"),
          new p("Threesome", i + "?c=threesome"),      new p("Toys", i + "?c=toys"),
          new p("Uncategorized", i + "?c=uncategorized"), new p("Uniform", i + "?c=uniform"),
          new p("Vintage", i + "?c=vintage"),          new p("Webcam", i + "?c=webcam")
        ];
        return o.push(new p(
          "Категория: ".concat(
            (null === (r = s.find((function(e) { return e.playlist_url.endsWith("c=".concat(n)) }))) || void 0 === r
              ? void 0 : r.title) || "все"),
          "submenu", void 0, s)), o
      }
    }, {
      key: "StreamLinks",
      value: (function() {
        var _sl = _asyncToGenerator(_regenerator().m((function ep(t, a) {
          var n, r, i, o, s, xhrUrl, xhrRes, qualitys, rx, match;
          return _regenerator().w((function(e) {
            for (;;) switch (e.n) {
              case 0:
                if (a) { e.n = 1; break }
                return e.a(2, new m({}, []));
              case 1:
                return e.n = 2, l.Get(a);
              case 2:
                if (n = e.v) { e.n = 3; break }
                return e.a(2, new m({}, []));
              case 3:
                if (r = c.extract(n, /vid ?= ?'([^']+)'/),
                    i = c.extract(n, /hash ?= ?'([^']+)'/),
                    r && i) { e.n = 4; break }
                return e.a(2, new m({}, []));
              case 4:
                return o = "".concat(t, "/xhr/video/").concat(r, "?hash=")
                    .concat(this.convertHash(i), "&domain=")
                    .concat(t.replace(/^https?:\/\//, ""), "&fallback=false&embed=false&supportedFormats=dash,mp4&_=")
                    .concat(Math.floor(Date.now() / 1e3)),
                  e.n = 5, l.Get(o);
              case 5:
                if (s = e.v) { e.n = 6; break }
                return e.a(2, new m({}, []));
              case 6:
                qualitys = {};
                rx = /"src":\s*"(https?:\/\/[^/]+\/[^"]+-([0-9]+p)\.mp4)",/g;
                while (null !== (match = rx.exec(s))) qualitys[match[2]] = match[1];
                return e.a(2, new m(qualitys, this.Playlist(n)))
            }
          }), ep, this)
        })));
        return function(e, a) { return _sl.apply(this, arguments) }
      }())
    }, {
      key: "convertHash",
      value: function(e) {
        return this.base36(e.substring(0, 8)) + this.base36(e.substring(8, 16)) +
               this.base36(e.substring(16, 24)) + this.base36(e.substring(24, 32))
      }
    }, {
      key: "base36",
      value: function(e) {
        for (var t = "", a = parseInt(e, 16); a > 0;)
          t = "0123456789abcdefghijklmnopqrstuvwxyz"[a % 36] + t, a = Math.floor(a / 36);
        return t || "0"
      }
    }]);
  }();
  _EpornerClass.host = "https://www.eporner.com";
  var f = _EpornerClass;

  // ===========================================================================
  // SECTION 4: РЕДАКТИРУЕМЫЕ ИСТОЧНИКИ — NextHub P[]
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // NEXTHUB ENGINE — вспомогательные функции (не редактировать)
  // ---------------------------------------------------------------------------
  function _tplReplace(e, t) {
    return e.replace(/\{([^}]+)\}/g, (function(e, a) {
      var n; return null !== (n = t[a]) && void 0 !== n ? n : ""
    }))
  }
  function _joinUrl(e, t) {
    var a = e.replace(/\/+$/, ""), n = t.replace(/^\/+/, "");
    return a + (n ? "/" + n : "")
  }
  function _parseHtml(e) { return (new DOMParser).parseFromString(e, "text/html") }
  function _xpathNode(e, t, a) {
    return e.evaluate(t, a || e, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
  }
  function _getAttr(e, t, a) {
    if (!e) return "";
    if (Array.isArray(t)) {
      var n, r = _createForOfIteratorHelper(t);
      try {
        for (r.s(); !(n = r.n()).done;) {
          var i = n.value, o = e.getAttribute(i);
          if (o && "" !== o.trim()) return o
        }
      } catch (e) { r.e(e) } finally { r.f() }
      return a || ""
    }
    return e.getAttribute(t || "src") || a || ""
  }

  // ---------------------------------------------------------------------------
  // NEXTHUB ENGINE — основной класс (не редактировать)
  // ---------------------------------------------------------------------------
  var _NextHubClass = _createClass((function e(t) {
    _classCallCheck(this, e), this.cfgs = t
  }), [{
    key: "buildListUrl",
    value: function(e, t, a, n) {
      var r, i, o, s, lv,
        iscat  = n && "" !== n.trim(),
        defSort = Object.keys((null === (r = e.menu) || void 0 === r ? void 0 : r.sort) || {}).find((function(t) {
          var a, n = null === (a = e.menu) || void 0 === a || null === (a = a.sort) || void 0 === a ? void 0 : a[t];
          return !n || "" === n
        })),
        hasSort = a && "" !== a.trim() && a !== defSort;
      if (null !== (i = e.menu) && void 0 !== i && i.route)
        if (iscat && hasSort && e.menu.route.catsort)    s = e.menu.route.catsort;
        else if (iscat && hasSort && !e.menu.route.catsort) s = e.menu.route.cat;
        else if (iscat && e.menu.route.cat)              s = e.menu.route.cat;
        else if (hasSort && e.menu.route.sort)           s = e.menu.route.sort;
        else { var dv; s = 1 === t && null != (null === (dv = e.list) || void 0 === dv ? void 0 : dv.firstpage) ? e.list.firstpage : e.list ? e.list.uri : "{host}" }
      else s = 1 === t && null != (null === (lv = e.list) || void 0 === lv ? void 0 : lv.firstpage) ? e.list.firstpage : e.list ? e.list.uri : "{host}";
      var sortVal = (hasSort && null !== (o = e.menu) && void 0 !== o && o.sort ? e.menu.sort[a] : "").replace(/\{page\}/g, String(t)),
        url = _tplReplace(s = s.replace(/\{page\}/g, String(t)), { host: e.host, sort: sortVal || "", cat: n || "", page: String(t) });
      return s.startsWith("{host}") || url.startsWith("http") || (url = _joinUrl(e.host, url)), url
    }
  }, {
    key: "buildSearchUrl",
    value: function(e, t, a) {
      if (!e.search) return e.host;
      return _joinUrl(e.host, _tplReplace(e.search.uri, { search: encodeURIComponent(t), page: String(a) }))
    }
  }, {
    key: "buildModelUrl",
    value: function(e, t, a) {
      var n, r = null == e || null === (n = e.menu) || void 0 === n || null === (n = n.route) || void 0 === n ? void 0 : n.model,
        i = decodeURIComponent(t);
      return r.replace("{host}", e.host).replace("{model}", i).replace("{page}", String(a))
    }
  }, {
    key: "buildMenu",
    value: function(e, t, a) {
      var n, r, i,
        isRelated = arguments.length > 3 && void 0 !== arguments[3] && arguments[3],
        relHref   = arguments.length > 4 ? arguments[4] : void 0,
        items = [];
      if (isRelated || items.push(new p("Поиск", "nexthub://".concat(e.displayname, "?mode=search"), "search_on")),
        isRelated && null !== (n = e.view) && void 0 !== n && n.related && relHref) {
        var cv, uv = null === (cv = relHref.split("/").pop()) || void 0 === cv ||
                     null === (cv = cv.split("?")[0]) || void 0 === cv ? void 0 : cv.split("&")[0],
          relUrl = "nexthub://".concat(e.displayname, "?mode=related&href=").concat(
            encodeURIComponent("".concat(e.host, "/").concat(uv)));
        items.push(new p("Похожие", relUrl))
      }
      if (null !== (r = e.menu) && void 0 !== r && r.sort) {
        var sorts = [];
        for (var g = 0, y = Object.entries(e.menu.sort); g < y.length; g++) {
          var vv, bv = _slicedToArray(y[g], 2), sortKey = bv[0],
            sortUrl = "nexthub://".concat(e.displayname, "?mode=list&sort=").concat(encodeURIComponent(sortKey));
          a && null !== (vv = e.menu) && void 0 !== vv && null !== (vv = vv.route) && void 0 !== vv && vv.catsort &&
            (sortUrl += "&cat=".concat(encodeURIComponent(a))),
            sorts.push(new p(sortKey, sortUrl))
        }
        var curSort = sorts.find((function(e) { return e.title === t })) || sorts[0];
        items.push(new p("Сортировка: " + curSort.title, "submenu", void 0, sorts))
      }
      if (null !== (i = e.menu) && void 0 !== i && i.categories) {
        var cats = [];
        for (var x = 0, C = Object.entries(e.menu.categories); x < C.length; x++) {
          var sv, Pv = _slicedToArray(C[x], 2), catName = Pv[0], catVal = Pv[1],
            catUrl = "nexthub://".concat(e.displayname, "?mode=list&cat=").concat(encodeURIComponent(catVal));
          if (null !== (sv = e.menu) && void 0 !== sv && null !== (sv = sv.route) && void 0 !== sv && sv.catsort) {
            var Mv, defSortKey = Object.keys((null === (Mv = e.menu) || void 0 === Mv ? void 0 : Mv.sort) || {}).find((function(t) {
              var a, n = null === (a = e.menu) || void 0 === a || null === (a = a.sort) || void 0 === a ? void 0 : a[t];
              return !n || "" === n
            }));
            t && t !== defSortKey && (catUrl += "&sort=".concat(encodeURIComponent(t)))
          }
          cats.push(new p(catName, catUrl))
        }
        var curCatLabel = "Все";
        if (a) {
          var found = Object.entries(e.menu.categories).find((function(e) {
            return _slicedToArray(e, 2)[1] === a
          }));
          found && (curCatLabel = found[0])
        }
        items.push(new p("Категория: " + curCatLabel, "submenu", void 0, cats))
      }
      return items
    }
  }, {
    key: "toPlaylist",
    value: function(e, t) {
      var a, n = t.contentParse,
        nodes = (function(e, t, a) {
          for (var n = e.evaluate(t, a || e, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null), r = [], i = 0; i < n.snapshotLength; i++) r.push(n.snapshotItem(i));
          return r
        })(e, n.nodes),
        items = [], it = _createForOfIteratorHelper(nodes);
      try {
        for (it.s(); !(a = it.n()).done;) {
          var s, node = a.value,
            nameEl  = n.name     ? _xpathNode(e, n.name.node, node)     : null,
            hrefEl  = _xpathNode(e, n.href.node, node),
            imgEl   = n.img      ? _xpathNode(e, n.img.node, node)      : null,
            durEl   = n.duration ? _xpathNode(e, n.duration.node, node) : null,
            prevEl  = n.preview  ? _xpathNode(e, n.preview.node, node)  : null,
            title   = nameEl ? (nameEl.textContent || "").trim() : (null == hrefEl ? void 0 : hrefEl.getAttribute("title")) || "",
            href    = hrefEl && hrefEl.getAttribute(n.href.attribute || "href") || "",
            img     = n.img ? _getAttr(imgEl, n.img.attributes || n.img.attribute || "src") : "",
            preview = n.preview ? _getAttr(prevEl, n.preview.attribute || "data-preview") : null,
            dur     = durEl ? (durEl.textContent || "").trim() : null;
          if (img && (
            (img = img.replace(/&amp;/g, "&").replace(/\\/g, "")).startsWith("../") ?
              img = "".concat(t.host, "/").concat(img.replace("../", "")) :
            img.startsWith("//") ? img = "https:".concat(img) :
            img.startsWith("/")  ? img = t.host + img :
            img.startsWith("http") || (img = "".concat(t.host, "/").concat(img))),
            href && title && img) {
            var fullUrl = href.startsWith("http") ? href : t.host.replace(/\/?$/, "/") + href.replace(/^\/?/, ""),
              model = null;
            if (n.model) {
              var mnEl = n.model.name ? _xpathNode(e, n.model.name.node, node) : null,
                mhEl   = n.model.href ? _xpathNode(e, n.model.href.node, node) : null;
              if (mnEl && mhEl && n.model.href) {
                var mName = (mnEl.textContent || "").trim(),
                  mHref   = mhEl.getAttribute(n.model.href.attribute || "href") || "";
                mName && mHref && (model = {
                  uri: "nexthub://".concat(t.displayname.toLowerCase(), "?mode=model&model=").concat(encodeURIComponent(mHref)),
                  name: mName
                })
              }
            }
            items.push(new u(title, fullUrl, img, preview, dur, null, !0,
              (null === (s = t.view) || void 0 === s ? void 0 : s.related) || !1, model))
          }
        }
      } catch (e) { it.e(e) } finally { it.f() }
      return items
    }
  }, {
    key: "extractStreams",
    value: (function() {
      var _es = _asyncToGenerator(_regenerator().m((function e(t, a) {
        var n, r, i, o, s, iframeRx, iframeM, iframeSrc, iframeUrl, evalFn, evalRes,
          nodeFileDoc, nodeFileEl, nodeFileVal, matchArr, mIt, mItRes, mKey, mRx, mVal,
          mFound, mResult, mFormat, relDoc, relItems, O;
        return _regenerator().w((function(e) {
          for (;;) switch (e.n) {
            case 0:
              if (s = {}, null === (n = a.view) || void 0 === n || null === (n = n.iframe) || void 0 === n || !n.pattern) { e.n = 2; break }
              if (iframeRx = new RegExp(a.view.iframe.pattern, "g"), !(iframeM = iframeRx.exec(t)) || !iframeM[1]) { e.n = 2; break }
              return iframeSrc = iframeM[1],
                iframeUrl = iframeSrc.startsWith("http") ? iframeSrc : a.host + iframeSrc,
                e.n = 1, l.Get(iframeUrl, void 0, a.charset);
            case 1:
              t = e.v;
            case 2:
              if (null === (r = a.view) || void 0 === r || !r.eval) { e.n = 3; break }
              try {
                evalFn = new Function("html", a.view.eval),
                  (evalRes = evalFn(t)) && (s.auto = evalRes.replace(/&amp;/g, "&").replace(/\\/g, ""))
              } catch (e) { console.error("Eval execution error:", e) }
              e.n = 15; break;
            case 3:
              if (null === (i = a.view) || void 0 === i || !i.nodeFile) { e.n = 4; break }
              nodeFileDoc = _parseHtml(t),
                (nodeFileEl = _xpathNode(nodeFileDoc, a.view.nodeFile.node)) &&
                (nodeFileVal = _getAttr(nodeFileEl, a.view.nodeFile.attribute)) &&
                (s.auto = nodeFileVal.replace(/&amp;/g, "&").replace(/\\/g, "")),
                e.n = 15; break;
            case 4:
              if (null !== (o = a.view) && void 0 !== o && null !== (o = o.regexMatch) && void 0 !== o && o.pattern) { e.n = 5; break }
              return e.a(2, new m(s, []));
            case 5:
              matchArr = a.view.regexMatch.matches || [""], mIt = _createForOfIteratorHelper(matchArr), e.p = 6, mIt.s();
            case 7:
              if ((mItRes = mIt.n()).done) { e.n = 12; break }
              mKey = mItRes.value,
                (mRx = a.view.regexMatch.pattern).includes("{value}") && (mRx = mRx.replace("{value}", mKey)),
                mVal = new RegExp(mRx, "g"), mResult = void 0, mFound = !1;
            case 8:
              if (!(mResult = mVal.exec(t))) { e.n = 10; break }
              if (mFormat = mResult[1]) { e.n = 9; break }
              return e.a(3, 8);
            case 9:
              mFormat = mResult[1],
                a.view.regexMatch.format && (mFormat = a.view.regexMatch.format.replace("{host}", a.host).replace("{value}", mResult[1])),
                s.auto = mFormat.replace(/&amp;/g, "&").replace(/\\/g, ""), mFound = !0, e.n = 8; break;
            case 10:
              if (!mFound) { e.n = 11; break }
              return e.a(3, 12);
            case 11:
              e.n = 7; break;
            case 12:
              e.n = 14; break;
            case 13:
              e.p = 13, O = e.v, mIt.e(O);
            case 14:
              return e.p = 14, mIt.f(), e.f(14);
            case 15:
              return relItems = [],
                null !== (o = a.view) && void 0 !== o && o.related &&
                  (relDoc = _parseHtml(t), relItems.push.apply(relItems, _toConsumableArray(this.toPlaylist(relDoc, a)))),
                e.a(2, new m(s, relItems))
          }
        }), e, this, [[6, 13, 14, 15]])
      })));
      return function(e, a) { return _es.apply(this, arguments) }
    }())
  }, {
    key: "Invoke",
    value: (function() {
      var _inv = _asyncToGenerator(_regenerator().m((function e(t) {
        var a, hostname, cfg, mode, hrefParam, hrefDecoded, hrefClean, hrefHtml, streams,
          modelParam, modelPage, modelUrl, modelHtml, modelDoc,
          searchArr, searchQ, searchPage, searchUrl, searchHtml, searchDoc,
          sort, cat, pg, listUrl, listHtml, listDoc;
        return _regenerator().w((function(e) {
          for (;;) switch (e.n) {
            case 0:
              if (a = new URL(t),
                hostname = a.hostname || a.pathname.replace(/^\//, "") || t.replace("nexthub://", "").split("?")[0],
                cfg = this.cfgs.find((function(e) { return e.displayname.toLowerCase() === hostname.toLowerCase() }))) { e.n = 1; break }
              return e.a(2, "unknown nexthub site");
            case 1:
              if (console.log("NextHub: Invoke ".concat(t)),
                "view" !== (mode = a.searchParams.get("mode") || "list") && "related" !== mode) { e.n = 5; break }
              if (hrefParam = a.searchParams.get("href")) { e.n = 2; break }
              return e.a(2, "no href param");
            case 2:
              return hrefDecoded = decodeURIComponent(hrefParam),
                hrefClean = hrefDecoded.replace("&related?pg=1", ""),
                e.n = 3, l.Get(hrefClean, void 0, cfg.charset);
            case 3:
              return hrefHtml = e.v, e.n = 4, this.extractStreams(hrefHtml, cfg);
            case 4:
              return streams = e.v, e.a(2, new h(streams, "related" === mode || hrefDecoded.includes("&related")));
            case 5:
              if ("model" !== mode) { e.n = 8; break }
              if (modelParam = a.searchParams.get("model")) { e.n = 6; break }
              return e.a(2, "no model param");
            case 6:
              return modelPage = Number(a.searchParams.get("pg") || "1"),
                modelUrl = this.buildModelUrl(cfg, modelParam, modelPage),
                e.n = 7, l.Get(modelUrl, void 0, cfg.charset);
            case 7:
              return modelHtml = e.v, modelDoc = _parseHtml(modelHtml),
                e.a(2, { menu: this.buildMenu(cfg, void 0, void 0, !1), list: this.toPlaylist(modelDoc, cfg) });
            case 8:
              if ("search" !== mode) { e.n = 10; break }
              return searchArr = a.searchParams.getAll("search"),
                searchQ = searchArr.find((function(e) { return "" !== e.trim() })) || "",
                searchPage = Number(a.searchParams.get("pg") || "1"),
                searchUrl = this.buildSearchUrl(cfg, searchQ, searchPage),
                e.n = 9, l.Get(searchUrl, void 0, cfg.charset);
            case 9:
              return searchHtml = e.v, searchDoc = _parseHtml(searchHtml),
                e.a(2, { menu: this.buildMenu(cfg, void 0, void 0, !1), list: this.toPlaylist(searchDoc, cfg) });
            case 10:
              return sort = a.searchParams.get("sort") || "",
                cat  = a.searchParams.get("cat") || "",
                pg   = Number(a.searchParams.get("pg") || "1"),
                listUrl = this.buildListUrl(cfg, pg, sort, cat),
                e.n = 11, l.Get(listUrl, void 0, cfg.charset);
            case 11:
              return listHtml = e.v, listDoc = _parseHtml(listHtml),
                e.a(2, { menu: this.buildMenu(cfg, sort, cat, !1), list: this.toPlaylist(listDoc, cfg) });
            case 12:
              return e.a(2)
          }
        }), e, this)
      })));
      return function(t) { return _inv.apply(this, arguments) }
    }())
  }]);
  _NextHubClass.host = "nexthub://";
  var S = _NextHubClass;

  // ---------------------------------------------------------------------------
  // NEXTHUB CONFIGS ARRAY P[]
  // Поля каждого источника:
  //   enable        — включён/выключен
  //   maintenance   — временно недоступен (true = скрыт, но не удалён)
  //   version       — версия, в которой добавлен/изменён
  //   fallback_host — резервный домен (зарезервировано, см. resolveFallbackHost)
  //   displayname   — отображаемое имя
  //   host          — основной домен
  // ---------------------------------------------------------------------------
  var P = [

    // -------------------------------------------------------------------------
    // SOURCE: rt.pornhub.com
    // -------------------------------------------------------------------------
    {
      enable: !0,
      maintenance: !1,
      version: "1.0.0",
      // fallback_host: "",  // [FALLBACK_RESERVED]
      displayname: "PornHub",
      host: "https://rt.pornhub.com",
      menu: {
        route: {
          sort:    "{host}/video?o={sort}&page={page}",
          model:   "{host}{model}/videos?page={page}",
          cat:     "{host}/video?c={cat}&page={page}",
          catsort: "{host}/video?c={cat}&o={sort}&page={page}"
        },
        sort: {
          "Недавно в Избранном": "",
          "Новые":               "cm",
          "Популярные":          "mv",
          "Лучшие":              "tr",
          "Горячие":             "ht"
        },
        categories: {
          "Все": "", "Азиатки": "1", "Анальный секс": "35", "Арабское": "98", "БДСМ": "10",
          "Бисексуалы": "76", "Блондинки": "9", "Большая грудь": "8", "Большие члены": "7",
          "Бразильское": "102", "Британское": "96", "Брызги": "69", "Брюнетки": "11",
          "Буккаке": "14", "В школе": "88", "Веб-камера": "61", "Вечеринки": "53", "Гонзо": "41",
          "Грубый секс": "67", "Групповуха": "80", "Девушки (соло)": "492", "Двойное проникновение": "72",
          "Дрочит": "20", "Европейцы": "55", "Жесткий секс": "21", "Женский оргазм": "502",
          "За кадром": "141", "Звезды": "12", "Золотой дождь": "211", "Зрелые": "28", "Игрушки": "23",
          "Индийское": "101", "Итальянское": "97", "Кастинги": "90", "Кончают": "16",
          "Корейское": "103", "Косплей": "241", "Кунилингус": "131", "Курящие": "91",
          "Латинки": "26", "Лесбиянки": "27", "Любительское": "3", "Маленькая грудь": "59",
          "Мамочки": "29", "Массаж": "78", "Мастурбация": "22", "Межрассовый Секс": "25",
          "Минет": "13", "Музыка": "121", "Мулаты": "17", "Мультики": "86",
          "Мускулистые Мужчины": "512", "На публике": "24", "Немецкое": "95", "Ноги": "93",
          "Няни": "89", "Парни (соло)": "92", "Пародия": "201", "Попки": "4", "Приколы": "32",
          "Проверенное Любительское": "138", "Проверенные Модели": "139", "Проверенные Пары": "482",
          "Реальный секс": "31", "Ретро": "43", "Рогоносцы": "242", "Ролевые Игры": "81",
          "Русское": "99", "Секс втроем": "65", "60FPS": "105", "Closed Captions": "732",
          "Gaming": "881", "Podcast": "891"
        }
      },
      list:   { uri: "video?page={page}" },
      search: { uri: "video/search?search={search}&page={page}" },
      contentParse: {
        nodes:    "//li[contains(@class,'videoblock')] | //div[contains(@class,'video-list') or contains(@class,'videos')]//li[contains(@class,'videoblock')] | //ul[@id='videoCategory']//li[contains(@class,'videoblock')]",
        name:     { node: ".//a[@data-event='thumb_click'] | .//a[@class='gtm-event-thumb-click'] | .//span[@class='title']//a" },
        href:     { node: ".//a[contains(@class,'linkVideoThumb')] | .//a[contains(@class,'title')]", attribute: "href" },
        img:      { node: ".//img | .//a[contains(@class,'linkVideoThumb')]//img", attributes: ["data-mediumthumb", "data-thumb_url", "data-image", "src"] },
        preview:  { node: ".//img | .//a[contains(@class,'linkVideoThumb')]//img", attribute: "data-mediabook" },
        duration: { node: ".//*[contains(@class,'duration')]" },
        model: {
          name: { node: ".//a[contains(@href,'/model/')]" },
          href: { node: ".//a[contains(@href,'/model/')]", attribute: "href" }
        }
      },
      view: {
        related: !0,
        regexMatch: {
          matches: ["1080", "720", "480", "360", "240"],
          pattern: '"videoUrl":"([^"]+)","quality":"{value}"'
        }
      }
    },

    // -------------------------------------------------------------------------
    // SOURCE: ru.xhamster.com
    // -------------------------------------------------------------------------
    {
      enable: !0,
      maintenance: !1,
      version: "1.0.0",
      // fallback_host: "",  // [FALLBACK_RESERVED]
      displayname: "Xhamster",
      host: "https://ru.xhamster.com",
      menu: {
        route: {
          sort:    "{host}/{sort}/{page}",
          cat:     "{host}/categories/{cat}/{page}",
          catsort: "{host}/categories/{cat}/{sort}/{page}"
        },
        sort: {
          "В тренде": "",
          "Новейшее": "newest",
          "Лучшие":   "best/weekly"
        },
        categories: {
          "Все": "", "Русское": "russian", "Секс втроем": "threesome", "Азиатское": "asian",
          "Анал": "anal", "Арабское": "arab", "АСМР": "asmr", "Бабки": "granny", "БДСМ": "bdsm",
          "Би": "bisexual", "Большие жопы": "big-ass", "Большие задницы": "pawg",
          "Большие сиськи": "big-tits", "Большой член": "big-cock", "Британское": "british",
          "В возрасте": "mature", "Вебкамера": "webcam", "Винтаж": "vintage", "Волосатые": "hairy",
          "Голые мужчины одетые женщины": "cfnm", "Групповой секс": "group-sex", "Гэнгбэнг": "gangbang",
          "Дилдо": "dildo", "Домашнее порно": "homemade", "Дрочка ступнями": "footjob",
          "Женское доминирование": "femdom", "Жиробасина": "ssbbw", "Жопа": "ass",
          "Застряла": "stuck", "Знаменитость": "celebrity", "Игра": "game", "История": "story",
          "Кастинг": "casting", "Комический": "comic", "Кончина": "cumshot",
          "Кремовый пирог": "creampie", "Латина": "latina", "Лесбиянка": "lesbian",
          "Лизать киску": "eating-pussy", "Любительское порно": "amateur", "Массаж": "massage",
          "Медсестра": "nurse", "Межрасовый секс": "interracial", "МИЛФ": "milf", "Милые": "cute",
          "Минет": "blowjob", "Миниатюрная": "petite", "Миссионерская поза": "missionary",
          "Монахиня": "nun", "Мультфильмы": "cartoon", "Негритянки": "black", "Немецкое": "german",
          "Офис": "office", "Первый раз": "first-time", "Пляж": "beach",
          "Порно для женщин": "porn-for-women", "Реслинг": "wrestling", "Рогоносцы": "cuckold",
          "Романтический": "romantic", "Свингеры": "swingers", "Сквирт": "squirting",
          "Старик": "old-man", "Старые с молодыми": "old-young", "Тинейджеры (18+)": "teen",
          "Толстушки": "bbw", "Тренажерный зал": "gym", "Узкая киска": "tight-pussy",
          "Французское": "french", "Футанари": "futanari", "Хардкор": "hardcore",
          "Хенджоб": "handjob", "Хентай": "hentai", "Японское": "japanese"
        }
      },
      list:   { uri: "{host}/{page}", firstpage: "{host}" },
      search: { uri: "search/{search}/{page}" },
      contentParse: {
        nodes:    "//div[contains(@class,'thumb-list__item')] | //div[contains(@class,'thumb-list-mobile-item')]",
        name:     { node: ".//a[contains(@class,'video-thumb-info__name')]" },
        href:     { node: ".//a[contains(@class,'video-thumb-info__name')]", attribute: "href" },
        img:      { node: ".//img", attributes: ["srcset", "src"] },
        preview:  { node: ".//a", attribute: "data-previewvideo" },
        duration: { node: ".//div[@data-role='video-duration'] | .//time[contains(@class,'video-thumb__time')]" }
      },
      view: {
        related: !0,
        nodeFile: { node: "//link[@rel='preload']", attribute: "href" }
      }
    },

    // -------------------------------------------------------------------------
    // SOURCE: wes.lenkino.adult
    // -------------------------------------------------------------------------
    {
      enable: !0,
      maintenance: !1,
      version: "1.0.0",
      // fallback_host: "",  // [FALLBACK_RESERVED]
      displayname: "Lenkino",
      host: "https://wes.lenkino.adult",
      menu: {
        route: {
          cat:     "{host}/{cat}/page/{page}",
          sort:    "{host}/{sort}/page/{page}",
          catsort: "{host}/{cat}-top/page/{page}",
          model:   "{model}/page/{page}"
        },
        sort: {
          "Новые":   "",
          "Лучшие":  "top-porno",
          "Горячие": "hot-porno"
        },
        categories: {
          "Русское порно": "a1-russian", "Порно зрелых": "milf-porn", "Красивый секс": "beautiful",
          "Мачеха": "stepmom", "Анал": "anal-porno", "Большие сиськи": "big-tits", "Эротика": "erotic",
          "Лесби": "lesbi-porno", "Групповуха": "group-videos", "POV": "pov", "БДСМ": "bdsm",
          "Вебкамера": "webcam", "Ган банг": "gangbang", "Домашнее порно": "amateur",
          "ЖМЖ": "threesome-ffm", "Кастинг": "casting", "Куни": "cunnilingus", "Массаж": "massage",
          "Мастурбация": "masturbation", "Минет": "blowjob", "Соло": "solo", "Хардкор": "hardcore",
          "МЖМ": "threesome-mmf", "Чешское порно": "czech", "Русское домашнее": "russian-amateur",
          "Молодые": "teen", "Старые с молодыми": "old-young", "Студенты": "student",
          "Азиатки": "asian", "Латинки": "latina", "Медсестра": "nurse", "Секретарша": "secretary",
          "Няня": "babysitter", "Черлидерша": "cheerleader", "Студентка": "schoolgirl",
          "Горничная": "maid", "Учительница": "teacher", "Блондинки": "blonde",
          "Брюнетки": "brunette", "Рыжие": "redhead", "Короткие волосы": "short-hair",
          "Длинные волосы": "long-hair", "Косички": "pigtails", "В ванной": "bathroom",
          "В машине": "car", "В офисе": "office", "В спальне": "bedroom", "В спортзале": "gym",
          "На кухне": "kitchen", "На пляже": "beach", "На природе": "outdoor", "На диване": "sofa",
          "На столе": "table", "Двойное проникновение": "double-penetration",
          "Крупным планом": "close-up", "Лижет попу": "rimjob", "Между сисек": "titjob",
          "Наездница": "cowgirl", "Оргазмы": "orgasm", "Поза 69": "69", "Раком": "doggy-style",
          "Сквирт": "squirt", "Стриптиз": "striptease", "Большие жопы": "big-ass",
          "Большой чёрный член": "bbc", "Большие члены": "big-cock", "Гибкие": "flexible",
          "Красивая грудь": "nice-tits", "Маленькие сиськи": "small-tits",
          "Натуральные сиськи": "natural-tits", "Красивые попки": "nice-ass", "Красивые": "beautiful",
          "Бритые письки": "shaved", "Волосатая пизда": "hairy", "Толстые": "bbw", "Худые": "skinny",
          "Силиконовые сиськи": "fake-tits", "Интимные стрижки": "trimmed", "Загорелые": "tanned",
          "Босс": "boss", "Доктор": "doctor", "Тренер": "trainer",
          "В красивом белье": "lingerie", "В чулках": "stockings", "На каблуках": "heels",
          "В гольфах": "socks", "Латекс": "latex", "С вибратором": "vibrator", "Дилдо": "dildo",
          "Евро": "european", "Йога": "yoga", "Куколд": "cuckold", "Межрассовое": "interracial",
          "На публике": "public", "Пикап": "pickup", "Свингеры": "swingers",
          "Секс-игрушки": "sex-toys", "Страпон": "strapon", "Анальная пробка": "buttplug",
          "Бондаж": "bondage", "Женское доминирование": "femdom", "Подчинение": "submissive",
          "Фистинг": "fisting", "Футфетиш": "footjob", "Негры": "black", "Негритянки": "ebony",
          "Негры с блондинками": "black-blonde", "Буккаке": "bukkake", "Сперма": "cumshot",
          "Сперма вытекает": "creampie", "Сперма на груди": "cum-on-tits",
          "Сперма на лице": "facial", "Глотает сперму": "cum-swallow",
          "Сперма на попе": "cum-on-ass", "Сперма на пизде": "cum-on-pussy"
        }
      },
      list:   { uri: "page/{page}" },
      search: { uri: "search/{search}/page/{page}" },
      contentParse: {
        nodes:    "//div[@class='item']",
        name:     { node: ".//div[@class='itm-tit']" },
        href:     { node: ".//a", attribute: "href" },
        img:      { node: ".//img[@class='lzy']", attribute: "data-srcset" },
        duration: { node: ".//div[@class='itm-dur fnt-cs']" },
        preview:  { node: ".//img[@class='lzy']", attribute: "data-preview" },
        model: {
          name: { node: ".//a[@class='itm-opt-mdl len_pucl']" },
          href: { node: ".//a[@class='itm-opt-mdl len_pucl']", attribute: "href" }
        }
      },
      view: {
        related: !0,
        regexMatch: {
          matches: ["alt_url", "url"],
          pattern: "video_{value}:[\\t ]+'([^']+)'"
        }
      }
    },

    // -------------------------------------------------------------------------
    // SOURCE: trahkino.me  [добавлен в v1.1.0]
    // -------------------------------------------------------------------------
    {
      enable: !0,
      maintenance: !1,
      version: "1.1.0",
      // fallback_host: "",  // [FALLBACK_RESERVED]
      displayname: "TrahKino",
      host: "https://trahkino.me",
      menu: {
        route: {
          sort: "{host}/{sort}/{page}/",
          cat:  "{host}/categories/{cat}/{page}/"
        },
        sort: {
          "Новое":      "latest-updates",
          "Лучшее":     "top-rated",
          "Популярное": "most-popular"
        },
        categories: {
          "Все": "", "Любительское": "lyubitelskiy-seks", "Большие сиськи": "bolshie-siski",
          "Большие попки": "bolshie-popki", "Минет": "minet", "Блондинки": "blondinki",
          "Брюнетки": "bryunetki", "Хардкор": "hardkor", "Милфы": "milfy",
          "Красотки": "krasotki", "Большие члены": "bolshie-hui", "Наездница": "naezdnica",
          "Маленькие сиськи": "malenkie-siski", "Бритые киски": "britye-kiski",
          "Красивое": "krasivyy-seks", "Азиатки": "aziatki",
          "Кончают внутрь": "konchayut-vnutr", "Медсестра": "medsestra", "Анал": "anal",
          "МЖМ": "mjm", "Раком": "rakom", "Дрочка члена": "drochka-chlena", "Жесть": "jest",
          "На кровати": "na-krovati", "Реальное": "realnyy-seks",
          "Женский оргазм": "jenskiy-orgazm", "В нижнем белье": "v-nijnem-bele",
          "Японки": "yaponki", "Домашнее": "domashka", "Full HD": "full-hd",
          "Жёны": "jeny", "В чулках": "v-chulkah", "На каблуках": "na-kablukah",
          "В очках": "v-ochkah", "Толстушки": "tolstye", "В ванной": "v-vannoy",
          "Ролевые игры": "rolevye-igry", "Пьяные": "pyanye", "Стриптиз": "striptiz",
          "Мультики": "multiki", "В туалете": "v-tualete"
        }
      },
      list:   { uri: "latest-updates/{page}/", firstpage: "{host}" },
      search: { uri: "search/{page}/?q={search}" },
      contentParse: {
        nodes:    "//div[contains(@class,'item')]",
        name:     { node: ".//strong[contains(@class,'title')]" },
        href:     { node: ".//a", attribute: "href" },
        img:      { node: ".//img", attributes: ["data-original", "data-src", "src"] },
        duration: { node: ".//div[contains(@class,'duration')]" }
      },
      view: {
        related: !0,
        regexMatch: {
          matches: ["1080p", "720p", "480p", "360p"],
          pattern: "function/0/(https://[^/]+/get_file/[^']+_{value}\\.mp4)/"
        }
      }
    },

    // -------------------------------------------------------------------------
    // SOURCE: w0w.ukdevilz.com  [добавлен в v1.2.0]
    // -------------------------------------------------------------------------
    {
      enable: !0,
      maintenance: !1,
      version: "1.2.0",
      // fallback_host: "",  // [FALLBACK_RESERVED]
      displayname: "UkDevilz",
      host: "https://w0w.ukdevilz.com",
      menu: {
        route: {
          sort: "{host}/{sort}/week?p={page}"
        },
        sort: {
          "Новинки":    "",
          "Популярное": "popular"
        }
      },
      list:   { uri: "now?p={page}" },
      search: { uri: "video/{search}?p={page}" },
      contentParse: {
        nodes:    "//div[contains(@class, 'item')]",
        name:     { node: ".//div[@class='title']" },
        href:     { node: ".//a", attribute: "href" },
        img:      { node: ".//img", attribute: "data-src" },
        duration: { node: ".//div[@class='m_time']" },
        preview:  { node: ".//div", attribute: "data-trailer_url" }
      },
      view: {
        related: !0,
        regexMatch: { pattern: '"file":"([^"]+)"' }
      }
    }

    // =========================================================================
    // [NEW_SOURCE_SLOT] — место для следующего источника.
    // Скопируйте шаблон из README.md, вставьте перед этим комментарием.
    // Увеличьте VERSION в шапке файла.
    // =========================================================================

  ]; // конец массива P[]

  // ===========================================================================
  // SECTION 5: РОУТИНГ — НЕ РЕДАКТИРОВАТЬ
  // ===========================================================================

  var z = new d;    // BongaCams
  var L = new g;    // XVideos
  var j = new y;    // XNXX
  var M = new v;    // SpankBang
  var T = new b;    // Chaturbate
  var A = new f;    // EPorner
  var I = new S(P); // NextHub

  !function() {
    function route(t) {
      return (route = _asyncToGenerator(_regenerator().m((function e(t) {
        var a, n, r;
        return _regenerator().w((function(e) {
          for (;;) switch (e.n) {
            case 0:
              if (!t.startsWith(d.host)) { e.n = 2; break }
              return e.n = 1, z.Invoke(t);
            case 1:
            case 3:
            case 5:
            case 7:
            case 9:
            case 11:
            case 13:
            case 15:
              return e.a(2, e.v);
            case 2:
              if (!t.startsWith(g.host)) { e.n = 4; break }
              return e.n = 3, L.Invoke(t);
            case 4:
              if (!t.startsWith(y.host)) { e.n = 6; break }
              return e.n = 5, j.Invoke(t);
            case 6:
              if (!t.startsWith(v.host)) { e.n = 8; break }
              return e.n = 7, M.Invoke(t);
            case 8:
              if (!t.startsWith(b.host)) { e.n = 10; break }
              return e.n = 9, T.Invoke(t);
            case 10:
              if (!t.startsWith(f.host)) { e.n = 12; break }
              return e.n = 11, A.Invoke(t);
            case 12:
              if (!t.startsWith("nexthub://")) { e.n = 14; break }
              return e.n = 13, I.Invoke(t);
            case 14:
              if (a = new URL(t), !(n = P.find((function(e) {
                return e.enable && !e.maintenance && a.hostname === new URL(e.host).hostname
              })))) { e.n = 16; break }
              return r = "nexthub://".concat(n.displayname, "?mode=view&href=").concat(encodeURIComponent(t)),
                e.n = 15, I.Invoke(r);
            case 16:
              return e.a(2, "unknown site")
          }
        }), e)
      }))).apply(this, arguments)
    }

    window.AdultJS = {
      Menu: function() {
        var e = [
          { title: "xvideos.com",    playlist_url: g.host },
          { title: "spankbang.com",  playlist_url: v.host },
          { title: "eporner.com",    playlist_url: f.host },
          { title: "xnxx.com",       playlist_url: y.host },
          { title: "bongacams.com",  playlist_url: d.host },
          { title: "chaturbate.com", playlist_url: b.host }
        ];
        P.filter((function(e) { return e.enable && !e.maintenance }))
          .forEach((function(t) {
            e.push({ title: t.displayname.toLowerCase(), playlist_url: "nexthub://".concat(t.displayname, "?mode=list") })
          }));
        return e
      },
      Invoke: function(t) { return route.apply(this, arguments) }
    }
  }();

  // ===========================================================================
  // SECTION 6: ИНИЦИАЛИЗАЦИЯ ПЛАГИНА
  // ===========================================================================

  !function() {
    var PLUGIN_ID = "AdultJS";

    Lampa.Lang.add({
      lampac_adultName: {
        ru: "Adult JS",
        en: "Adult 18+",
        uk: "Для дорослих",
        zh: "Adult 18+"
      }
    });

    var _previewTimer, _previewEl, _req = new Lampa.Reguest;

    function getBestQuality(e) {
      var t, a = Lampa.Storage.get("video_quality_default", "1080") + "p";
      if (e) {
        for (var n in e) 0 == n.indexOf(a) && (t = e[n]);
        t || (t = e[Lampa.Arrays.getKeys(e)[0]])
      }
      return t
    }

    function hidePreview() {
      if (clearTimeout(_previewTimer), _previewEl) {
        var e, n = _previewEl.find("video");
        try { e = n.pause() } catch (e) {}
        void 0 !== e && e.then((function() {})).catch((function(e) {})),
          _previewEl.addClass("hide"), _previewEl = !1
      }
    }

    var _invoke, helper = {
      sourceTitle: function(e) { return Lampa.Utils.capitalizeFirstLetter(e.split(".")[0]) },
      play: function(e) {
        var t = Lampa.Controller.enabled().name;
        if (e.json) {
          Lampa.Loading.start((function() { _req.clear(), Lampa.Loading.stop() })),
          _invoke.qualitys(e.video, (function(a) {
            if (a.error) return Lampa.Noty.show(Lampa.Lang.translate("torrent_parser_nofiles")), void Lampa.Loading.stop();
            var n = a.qualitys || a, i = a.recomends || [];
            Lampa.Loading.stop();
            var o = {
              title: e.name,
              url: getBestQuality(n),
              url_reserve: !!a.qualitys_proxy && getBestQuality(a.qualitys_proxy),
              quality: n,
              headers: a.headers_stream
            };
            Lampa.Player.play(o),
              i.length ? (
                i.forEach((function(e) {
                  e.title    = Lampa.Utils.shortText(e.name, 50),
                  e.icon     = '<img class="size-youtube" src="' + e.picture + '" />',
                  e.template = "selectbox_icon",
                  e.url      = function(t) {
                    e.json ? _invoke.qualitys(e.video, (function(a) {
                      e.quality = a.qualitys, e.url = getBestQuality(a.qualitys),
                        a.qualitys_proxy && (e.url_reserve = getBestQuality(a.qualitys_proxy)), t()
                    })) : (e.url = e.video, t())
                  }
                })),
                Lampa.Player.playlist(i)
              ) : Lampa.Player.playlist([o]),
              Lampa.Player.callback((function() { Lampa.Controller.toggle(t) }))
          }), (function() {
            Lampa.Noty.show(Lampa.Lang.translate("torrent_parser_nofiles")), Lampa.Loading.stop()
          }))
        } else {
          var a = {
            title: e.name,
            url: getBestQuality(e.qualitys) || e.video,
            url_reserve: getBestQuality(e.qualitys_proxy) || e.video_reserve || "",
            quality: e.qualitys
          };
          Lampa.Player.play(a), Lampa.Player.playlist([a]),
            Lampa.Player.callback((function() { Lampa.Controller.toggle(t) }))
        }
      },
      fixCards: function(e) {
        e.forEach((function(e) {
          e.background_image = e.picture, e.poster = e.picture, e.img = e.picture,
            e.name = Lampa.Utils.capitalizeFirstLetter(e.name).replace(/\&(.*?);/g, "")
        }))
      },
      preview: function(e, n) {
        hidePreview(), _previewTimer = setTimeout((function() {
          if (n.preview && Lampa.Storage.field("sisi_preview")) {
            var t, r = e.find("video"), i = e.find(".sisi-video-preview");
            r.length || (
              r = $(document.createElement("video")),
              i = $(document.createElement("div")),
              i.addClass("sisi-video-preview"),
              i.css({ position: "absolute", width: "100%", height: "100%", left: 0, top: 0, overflow: "hidden", borderRadius: "1em" }),
              r.css({ position: "absolute", width: "100%", height: "100%", left: 0, top: 0, objectFit: "cover" }),
              i.append(r),
              e.find(".card__view").append(i),
              r.attr("src", n.preview),
              r[0].addEventListener("ended", (function() { i.addClass("hide") })),
              r[0].load()
            ),
            _previewEl = i;
            try { t = r[0].play() } catch (e) {}
            void 0 !== t && t.then((function() {})).catch((function(e) {})),
              i.removeClass("hide")
          }
        }), 1500)
      },
      hidePreview: hidePreview,
      fixList: function(e) {
        return e.forEach((function(e) { !e.quality && e.time && (e.quality = e.time) })), e
      },
      menu: function(t, a) {
        var n = [];
        a.related && n.push({ title: "Похожие", related: !0 }),
          a.model   && n.push({ title: a.model.name, model: !0 }),
          Lampa.Select.show({
            title: "Меню", items: n,
            onSelect: function(t) {
              t.model ?
                Lampa.Activity.push({ url: a.model.uri, title: "Модель - " + a.model.name, component: "sisi_view_" + PLUGIN_ID, page: 1 }) :
                t.related && Lampa.Activity.push({ url: a.video + "&related", title: "Похожие - " + a.title, component: "sisi_view_" + PLUGIN_ID, page: 1 })
            },
            onBack: function() { Lampa.Controller.toggle("content") }
          })
      }
    };

    _invoke = new function() {
      var self = this, req = new Lampa.Reguest, _menu;
      this.menu = function(e, t) {
        if (_menu) return e(_menu);
        var a = AdultJS.Menu();
        a ? e(_menu = a) : t(a.msg)
      };
      this.view = function(e, t, a) {
        AdultJS.Invoke(Lampa.Utils.addUrlComponent(e.url, "pg=" + (e.page || 1)))
          .then((function(e) {
            e.list ? (
              e.results = helper.fixList(e.list), e.collection = !0,
              e.total_pages = e.total_pages || 30,
              helper.fixCards(e.results), delete e.list, t(e)
            ) : a()
          })).catch((function() { console.log("AdultJS", "no load", e.url), a() }))
      };
      this.playlist = function(t, a, n) {
        var run = function() {
          var status = new Lampa.Status(_menu.length);
          status.onComplite = function(e) {
            var t = [];
            _menu.forEach((function(a) {
              e[a.playlist_url] && e[a.playlist_url].results.length && t.push(e[a.playlist_url])
            })),
              t.length ? a(t) : n()
          };
          _menu.forEach((function(a) {
            var r = -1 !== a.playlist_url.indexOf("?") ? "&" : "?",
              i = -1 !== t.indexOf("?") || -1 !== t.indexOf("&") ? t.substring(1) : t,
              cancelled = !1,
              timer = setTimeout((function() { cancelled = !0, status.error() }), 8e3);
            AdultJS.Invoke(a.playlist_url + r + i)
              .then((function(t) {
                clearTimeout(timer), cancelled || (t.list ? (
                  t.title = helper.sourceTitle(a.title),
                  t.results = helper.fixList(t.list), t.url = a.playlist_url,
                  t.collection = !0, t.line_type = "none",
                  t.card_events = {
                    onMenu:  helper.menu,
                    onEnter: function(e, t) { helper.hidePreview(), helper.play(t) }
                  },
                  helper.fixCards(t.results), delete t.list,
                  status.append(a.playlist_url, t)
                ) : status.error())
              })).catch((function() {
                console.log("AdultJS", "no load", a.playlist_url + r + i),
                  clearTimeout(timer), status.error()
              }))
          }))
        };
        _menu ? run() : self.menu(run, n)
      };
      this.main   = function(e, t, a) { this.playlist("", t, a) };
      this.search = function(e, t, a) { this.playlist("?search=" + encodeURIComponent(e.query), t, a) };
      this.qualitys = function(e, t, a) {
        AdultJS.Invoke(e).then(t).catch((function() { console.log("AdultJS", "no load", e), a() }))
      };
      this.clear = function() { req.clear() }
    };

    function buildMainComponent(t) {
      var a = new Lampa.InteractionMain(t);
      a.create = function() {
        return this.activity.loader(!0),
          _invoke.main(t, this.build.bind(this), this.empty.bind(this)),
          this.render()
      };
      a.empty = function(e) {
        var self = this,
          empty = new Lampa.Empty({ descr: "string" == typeof e ? e : Lampa.Lang.translate("empty_text_two") });
        Lampa.Activity.all().forEach((function(e) {
          self.activity == e.activity &&
            e.activity.render().find(".activity__body > div")[0].appendChild(empty.render(!0))
        })),
          this.start = empty.start.bind(empty),
          this.activity.loader(!1),
          this.activity.toggle()
      };
      a.onMore = function(t) {
        Lampa.Activity.push({ url: t.url, title: t.title, component: "sisi_view_" + PLUGIN_ID, page: 2 })
      };
      a.onAppend = function(e) {
        e.onAppend = function(e) {
          var t = e.onFocus;
          e.onFocus = function(e, a) { t(e, a), helper.preview(e, a) }
        }
      };
      return a
    }

    function buildViewComponent(t) {
      var menuData, n = new Lampa.InteractionCategory(t);
      n.create = function() {
        var self = this;
        this.activity.loader(!0),
          _invoke.view(t, (function(t) {
            (menuData = t.menu) && menuData.forEach((function(e) {
              var t = e.title.split(":");
              e.title = t[0].trim(),
                t[1] && (e.subtitle = Lampa.Utils.capitalizeFirstLetter(t[1].trim().replace(/all/i, "Любой"))),
                e.submenu && e.submenu.forEach((function(e) {
                  e.title = Lampa.Utils.capitalizeFirstLetter(e.title.trim().replace(/all/i, "Любой"))
                }))
            })),
              self.build(t),
              n.render().find(".category-full").addClass("mapping--grid cols--3")
          }), this.empty.bind(this))
      };
      n.nextPageReuest = function(e, t, a) { _invoke.view(e, t.bind(this), a.bind(this)) };
      n.cardRender = function(e, t, a) {
        a.onMenu  = function(e, t) { return helper.menu(e, t) };
        a.onEnter = function() { helper.hidePreview(), helper.play(t) };
        var onFocus = a.onFocus;
        a.onFocus = function(e, a) { onFocus(e, a), helper.preview(e, t) }
      };
      n.filter = function() {
        if (menuData) {
          var r = menuData.filter((function(e) { return !e.search_on })),
            i   = menuData.find((function(e) { return e.search_on }));
          if (i || (i = t.search_start), !r.length && !i) return;
          i && Lampa.Arrays.insert(r, 0, {
            title: "Найти",
            onSelect: function() {
              $("body").addClass("ambience--enable"),
                Lampa.Input.edit({ title: "Поиск", value: "", free: !0, nosave: !0 }, (function(e) {
                  $("body").removeClass("ambience--enable"), Lampa.Controller.toggle("content");
                  if (e) {
                    var a = -1 !== i.playlist_url.indexOf("?") ? "&" : "?";
                    Lampa.Activity.push({
                      url: i.playlist_url + a + "search=" + encodeURIComponent(e),
                      title: "Поиск - " + e,
                      component: "sisi_view_" + PLUGIN_ID,
                      search_start: i, page: 1
                    })
                  }
                }))
            }
          });
          Lampa.Select.show({
            title: "Фильтр", items: r,
            onBack: function() { Lampa.Controller.toggle("content") },
            onSelect: function(r) {
              menuData.forEach((function(e) { e.selected = e == r })),
                r.submenu ? Lampa.Select.show({
                  title: r.title, items: r.submenu,
                  onBack:   function() { n.filter() },
                  onSelect: function(a) {
                    Lampa.Activity.push({ title: t.title, url: a.playlist_url, component: "sisi_view_" + PLUGIN_ID, page: 1 })
                  }
                }) : n.filter()
            }
          })
        }
      };
      n.onRight = n.filter.bind(n);
      return n
    }

    window["plugin_adultjs_" + PLUGIN_ID + "_ready"] || function() {

      function mountUI() {
        var $btn = $([
          '<li class="menu__item selector" data-action="adultjs">',
          '  <div class="menu__ico">',
          '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29.461 29.461" width="512" height="512">',
          '      <path d="M28.855 13.134c-.479 0-.91-.197-1.371-.452-1.671 7.509-10.383 11.899-12.765 12.972-2.514-1.125-12.034-5.916-12.963-14.188-.043.029-.088.056-.132.084-.411.269-.797.523-1.299.523-.064 0-.121-.029-.184-.038C1.586 22.377 14.72 27.47 14.72 27.47s12.227-4.74 14.386-14.362a1.397 1.397 0 0 1-.251.026z" fill="currentColor"/>',
          '      <path d="M29.379 8.931C28.515-.733 16.628.933 14.721 6.432 12.814.932.928-.733.062 8.931c-.397 4.426 1.173.063 3.508 1.205 1.008.494 1.99 2.702 3.356 2.974 1.998.397 3.109-1.551 4.27-1.631 3.174-.222 2.394 6.596 5.424 5.586 1.961-.653 2.479-3.016 4.171-2.806 1.582.195 3.296-3.711 4.78-3.571 2.471.23 4.305 3.786 3.808-1.757z" fill="currentColor"/>',
          '      <path d="M14.894 21.534c2.286 0-.929-3.226-.588-4.511-1.994 1.276-1.697 4.511.588 4.511z" fill="currentColor"/>',
          '    </svg>',
          '  </div>',
          '  <div class="menu__text">' + Lampa.Lang.translate("lampac_adultName") + '</div>',
          '</li>'
        ].join(""));

        $btn.find(".menu__ico").css("position", "relative").append(
          $("<div>JS</div>").css({
            position: "absolute", right: "-0.4em", bottom: "-0.4em",
            color: "#fff", fontSize: "0.6em", borderRadius: "0.5em",
            fontWeight: 900, textTransform: "uppercase"
          })
        );

        $btn.on("hover:enter", (function() {
          Lampa.ParentalControl || (Lampa.ParentalControl = { query: function(e) { "function" == typeof e && e() } });
          Lampa.ParentalControl.query((function() {
            _invoke.menu((function(t) {
              t.forEach((function(e) { e.title = helper.sourceTitle(e.title) }));
              Lampa.Select.show({
                title: "Сайты", items: t,
                onSelect: function(t) {
                  t.playlist_url ?
                    Lampa.Activity.push({ url: t.playlist_url, title: t.title, component: "sisi_view_" + PLUGIN_ID, page: 1 }) :
                    Lampa.Activity.push({ url: "", title: Lampa.Lang.translate("lampac_adultName"), component: "sisi_" + PLUGIN_ID, page: 1 })
                },
                onBack: function() { Lampa.Controller.toggle("menu") }
              })
            }), (function() {}))
          }), (function() {}))
        }));

        $(".menu .menu__list").eq(0).append($btn);

        // Кнопка фильтра в шапке
        !function() {
          var _actObj, _hideTimer,
            $filter = $([
              '<div class="head__action head__settings selector">',
              '  <svg height="36" viewBox="0 0 38 36" fill="none" xmlns="http://www.w3.org/2000/svg">',
              '    <rect x="1.5" y="1.5" width="35" height="33" rx="1.5" stroke="currentColor" stroke-width="3"/>',
              '    <rect x="7" y="8"  width="24" height="3" rx="1.5" fill="currentColor"/>',
              '    <rect x="7" y="16" width="24" height="3" rx="1.5" fill="currentColor"/>',
              '    <rect x="7" y="25" width="24" height="3" rx="1.5" fill="currentColor"/>',
              '    <circle cx="13.5" cy="17.5" r="3.5" fill="currentColor"/>',
              '    <circle cx="23.5" cy="26.5" r="3.5" fill="currentColor"/>',
              '    <circle cx="21.5" cy="9.5"  r="3.5" fill="currentColor"/>',
              '  </svg>',
              '</div>'
            ].join(""));
          $filter.hide().on("hover:enter", (function() {
            _actObj && (Lampa.Manifest.app_digital >= 300
              ? _actObj.activity.component.filter()
              : _actObj.activity.component().filter())
          }));
          $(".head .open--search").after($filter);
          Lampa.Listener.follow("activity", (function(r) {
            "start" == r.type && (_actObj = r.object),
              clearTimeout(_hideTimer),
              _hideTimer = setTimeout((function() {
                _actObj && _actObj.component !== "sisi_view_" + PLUGIN_ID && ($filter.hide(), _actObj = !1)
              }), 1e3),
              "start" == r.type && r.component == "sisi_view_" + PLUGIN_ID && ($filter.show(), _actObj = r.object)
          }))
        }();

        // Регистрация настроек
        window.sisi_add_param_ready || (window.sisi_add_param_ready = !0,
          Lampa.SettingsApi.addComponent({
            component: "AdultJS",
            // v3.0.0+: название содержит версию
            name: Lampa.Lang.translate("lampac_adultName") + " v3.0.1",
            icon: '<svg width="200" height="243" viewBox="0 0 200 243" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M187.714 130.727C206.862 90.1515 158.991 64.2019 100.983 64.2019C42.9759 64.2019 -4.33044 91.5669 10.875 130.727C26.0805 169.888 63.2501 235.469 100.983 234.997C138.716 234.526 168.566 171.303 187.714 130.727Z" stroke="currentColor" stroke-width="15"/><path d="M102.11 62.3146C109.995 39.6677 127.46 28.816 169.692 24.0979C172.514 56.1811 135.338 64.2018 102.11 62.3146Z" stroke="currentColor" stroke-width="15"/><path d="M90.8467 62.7863C90.2285 34.5178 66.0667 25.0419 31.7127 33.063C28.8904 65.1461 68.8826 62.7863 90.8467 62.7863Z" stroke="currentColor" stroke-width="15"/><path d="M100.421 58.5402C115.627 39.6677 127.447 13.7181 85.2149 9C82.3926 41.0832 83.5258 35.4214 100.421 58.5402Z" stroke="currentColor" stroke-width="15"/><rect x="39.0341" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="90.8467" y="92.0388" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="140.407" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="116.753" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="64.9404" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="93.0994" y="176.021" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/></svg>'
          }),
          // v3.0.0+: единственный пункт — Предпросмотр при наведении
          Lampa.SettingsApi.addParam({
            component: "AdultJS",
            param: { name: "sisi_preview", type: "trigger", values: "", default: !0 },
            field: {
              name: "Предпросмотр при наведении",
              description: "Показывать предпросмотр при наведении на карточку"
            },
            onRender: function(e) {}
          })
        )
      }

      window["plugin_adultjs_" + PLUGIN_ID + "_ready"] = !0;
      Lampa.Component.add("sisi_" + PLUGIN_ID, buildMainComponent);
      Lampa.Component.add("sisi_view_" + PLUGIN_ID, buildViewComponent);
      window.appready
        ? mountUI()
        : Lampa.Listener.follow("app", (function(e) { "ready" == e.type && mountUI() }))

    }()
  }()

}();
