// ============================================================
// AdultJS Plugin for Lampa (Android TV) — DEBUG VERSION
// VERSION: 1.2.0-debug
// CHANGELOG:
//   v1.0.0        - Оригинальная версия
//   v1.1.0        - Добавлен TrahKino, переименован плагин "Adult JS"
//   v1.2.0        - Добавлен UkDevilz, fallback_host механизм
//   v1.2.0-debug  - Встроен модуль отладки AdultJS_Debugger:
//                   * Кнопка "Диагностика источников" в настройках Lampa
//                   * Проверка доступности каждого источника (HEAD-запрос)
//                   * Проверка парсинга (запрос первой страницы + счёт карточек)
//                   * Вывод итогов через Lampa.Noty.show (TV-уведомления)
//                   * Логирование ошибок в console.error с тегом [AdultJS-DEBUG]
// ============================================================
// [DEBUG_MODULE_START] — не удалять этот маркер
// ============================================================

"use strict";

// ============================================================
// [BLOCK:01:START] POLYFILLS — вспомогательные функции Babel (не изменять)
// ============================================================
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
      } else for (; !(l = (n = i.call(a)).done) && (s.push(n.value), s.length !== t); l = !0);
    } catch (e) { c = !0, r = e }
    finally {
      try { if (!l && null != a.return && (o = a.return(), Object(o) !== o)) return }
      finally { if (c) throw r }
    }
    return s
  }
}
function _arrayWithHoles(e) { if (Array.isArray(e)) return e }
function _createForOfIteratorHelper(e, t) {
  var a = "undefined" != typeof Symbol && e[Symbol.iterator] || e["@@iterator"];
  if (!a) {
    if (Array.isArray(e) || (a = _unsupportedIterableToArray(e)) || t && e && "number" == typeof e.length) {
      a && (e = a);
      var n = 0, r = function () {};
      return {
        s: r,
        n: function () { return n >= e.length ? { done: !0 } : { done: !1, value: e[n++] } },
        e: function (e) { throw e },
        f: r
      }
    }
    throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
  }
  var i, o = !0, s = !1;
  return {
    s: function () { a = a.call(e) },
    n: function () { var e = a.next(); return o = e.done, e },
    e: function (e) { s = !0, i = e },
    f: function () {
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
  return (_typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator
    ? function (e) { return typeof e }
    : function (e) {
      return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e
    }), _typeof(e)
}
function _regenerator() {
  /*! regenerator-runtime -- Copyright (c) 2014-present, Facebook, Inc. -- license (MIT): https://github.com/babel/babel/blob/main/packages/babel-helpers/LICENSE */
  var e, t, a = "function" == typeof Symbol ? Symbol : {},
    n = a.iterator || "@@iterator", r = a.toStringTag || "@@toStringTag";
  function i(a, n, r, i) {
    var l = n && n.prototype instanceof s ? n : s, c = Object.create(l.prototype);
    return _regeneratorDefine2(c, "_invoke", function (a, n, r) {
      var i, s, l, c = 0, u = r || [], p = !1,
        d = {
          p: 0, n: 0, v: e, a: h, f: h.bind(e, 4),
          d: function (t, a) { return i = t, s = 0, l = e, d.n = a, o }
        };
      function h(a, n) {
        for (s = a, l = n, t = 0; !p && c && !r && t < u.length; t++) {
          var r, i = u[t], h = d.p, m = i[2];
          a > 3 ? (r = m === n) && (l = i[(s = i[4]) ? 5 : (s = 3, 3)], i[4] = i[5] = e)
            : i[0] <= h && ((r = a < 2 && h < i[1]) ? (s = 0, d.v = n, d.n = i[1])
              : h < m && (r = a < 3 || i[0] > n || n > m) && (i[4] = a, i[5] = n, d.n = m, s = 0))
        }
        if (r || a > 1) return o;
        throw p = !0, n
      }
      return function (r, u, m) {
        if (c > 1) throw TypeError("Generator is already running");
        for (p && 1 === u && h(u, m), s = u, l = m; (t = s < 2 ? e : l) || !p;) {
          i || (s ? s < 3 ? (s > 1 && (d.n = -1), h(s, l)) : d.n = l : d.v = l);
          try {
            if (c = 2, i) {
              if (s || (r = "next"), t = i[r]) {
                if (!(t = t.call(i, l))) throw TypeError("iterator result is not an object");
                if (!t.done) return t;
                l = t.value, s < 2 && (s = 0)
              } else (1 === s && (t = i.return) && t.call(i),
                s < 2 && (l = TypeError("The iterator does not provide a '" + r + "' method"), s = 1));
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
  function s() {} function l() {} function c() {}
  t = Object.getPrototypeOf;
  var u = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this }), t),
    p = c.prototype = s.prototype = Object.create(u);
  function d(e) {
    return Object.setPrototypeOf ? Object.setPrototypeOf(e, c)
      : (e.__proto__ = c, _regeneratorDefine2(e, r, "GeneratorFunction")),
      e.prototype = Object.create(p), e
  }
  return l.prototype = c, _regeneratorDefine2(p, "constructor", c), _regeneratorDefine2(c, "constructor", l),
    l.displayName = "GeneratorFunction", _regeneratorDefine2(c, r, "GeneratorFunction"),
    _regeneratorDefine2(p), _regeneratorDefine2(p, r, "Generator"),
    _regeneratorDefine2(p, n, function () { return this }),
    _regeneratorDefine2(p, "toString", function () { return "[object Generator]" }),
    (_regenerator = function () { return { w: i, m: d } })()
}
function _regeneratorDefine2(e, t, a, n) {
  var r = Object.defineProperty;
  try { r({}, "", {}) } catch (e) { r = 0 }
  _regeneratorDefine2 = function (e, t, a, n) {
    if (t) r ? r(e, t, { value: a, enumerable: !n, configurable: !n, writable: !n }) : e[t] = a;
    else {
      var i = function (t, a) { _regeneratorDefine2(e, t, function (e) { return this._invoke(t, a, e) }) };
      i("next", 0), i("throw", 1), i("return", 2)
    }
  }, _regeneratorDefine2(e, t, a, n)
}
function asyncGeneratorStep(e, t, a, n, r, i, o) {
  try { var s = e[i](o), l = s.value } catch (e) { return void a(e) }
  s.done ? t(l) : Promise.resolve(l).then(n, r)
}
function _asyncToGenerator(e) {
  return function () {
    var t = this, a = arguments;
    return new Promise(function (n, r) {
      var i = e.apply(t, a);
      function o(e) { asyncGeneratorStep(i, n, r, o, s, "next", e) }
      function s(e) { asyncGeneratorStep(i, n, r, o, s, "throw", e) }
      o(void 0)
    })
  }
}
function ownKeys(e, t) {
  var a = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var n = Object.getOwnPropertySymbols(e);
    t && (n = n.filter(function (t) { return Object.getOwnPropertyDescriptor(e, t).enumerable })),
      a.push.apply(a, n)
  }
  return a
}
function _objectSpread(e) {
  for (var t = 1; t < arguments.length; t++) {
    var a = null != arguments[t] ? arguments[t] : {};
    t % 2 ? ownKeys(Object(a), !0).forEach(function (t) { _defineProperty(e, t, a[t]) })
      : Object.getOwnPropertyDescriptors
        ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(a))
        : ownKeys(Object(a)).forEach(function (t) { Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(a, t)) })
  }
  return e
}
function _defineProperty(e, t, a) {
  return (t = _toPropertyKey(t)) in e
    ? Object.defineProperty(e, t, { value: a, enumerable: !0, configurable: !0, writable: !0 })
    : e[t] = a, e
}
function _classCallCheck(e, t) {
  if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function")
}
function _defineProperties(e, t) {
  for (var a = 0; a < t.length; a++) {
    var n = t[a];
    n.enumerable = n.enumerable || !1, n.configurable = !0,
      "value" in n && (n.writable = !0), Object.defineProperty(e, _toPropertyKey(n.key), n)
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

// ============================================================
// [SECTION: MAIN PLUGIN IIFE]
// ============================================================
!function (e, t, a, n, r, i, o, s) {
  !function () {
    var e = "AdultJS";

    // --------------------------------------------------------
    // [BLOCK:01:END]

    // [BLOCK:02:START] LANG — локализация названия плагина
    // --------------------------------------------------------
    Lampa.Lang.add({
      lampac_adultName: {
        ru: "Adult JS",
        en: "Adult 18+",
        uk: "Для взрослых",
        zh: "Adult 18+"
      }
    });

    var t, a, n = new Lampa.Reguest;

    function r(e) {
      var t, a = Lampa.Storage.get("video_quality_default", "1080") + "p";
      if (e) {
        for (var n in e) 0 == n.indexOf(a) && (t = e[n]);
        t || (t = e[Lampa.Arrays.getKeys(e)[0]])
      }
      return t
    }

    function i() {
      if (clearTimeout(t), a) {
        var e, n = a.find("video");
        try { e = n.pause() } catch (e) {}
        void 0 !== e && e.then(function () {}).catch(function (e) {}),
          a.addClass("hide"), a = !1
      }
    }

    var o, s = {
      sourceTitle: function (e) {
        return Lampa.Utils.capitalizeFirstLetter(e.split(".")[0])
      },
      play: function (e) {
        var t = Lampa.Controller.enabled().name;
        if (e.json)
          (Lampa.Loading.start(function () { n.clear(), Lampa.Loading.stop() }),
            l.qualitys(e.video, function (a) {
              if (a.error)
                return Lampa.Noty.show(Lampa.Lang.translate("torrent_parser_nofiles")),
                  void Lampa.Loading.stop();
              var n = a.qualitys || a, i = a.recomends || [];
              Lampa.Loading.stop();
              var o = {
                title: e.name, url: r(n),
                url_reserve: !!a.qualitys_proxy && r(a.qualitys_proxy),
                quality: n, headers: a.headers_stream
              };
              Lampa.Player.play(o),
                i.length
                  ? (i.forEach(function (e) {
                    e.title = Lampa.Utils.shortText(e.name, 50),
                      e.icon = '<img class="size-youtube" src="' + e.picture + '" />',
                      e.template = "selectbox_icon",
                      e.url = function (t) {
                        e.json ? l.qualitys(e.video, function (a) {
                          e.quality = a.qualitys, e.url = r(a.qualitys),
                            a.qualitys_proxy && (e.url_reserve = r(a.qualitys_proxy)), t()
                        }) : (e.url = e.video, t())
                      }
                  }), Lampa.Player.playlist(i))
                  : Lampa.Player.playlist([o]),
                Lampa.Player.callback(function () { Lampa.Controller.toggle(t) })
            }, function () {
              Lampa.Noty.show(Lampa.Lang.translate("torrent_parser_nofiles")),
                Lampa.Loading.stop()
            }));
        else {
          var a = {
            title: e.name, url: r(e.qualitys) || e.video,
            url_reserve: r(e.qualitys_proxy) || e.video_reserve || "",
            quality: e.qualitys
          };
          Lampa.Player.play(a), Lampa.Player.playlist([a]),
            Lampa.Player.callback(function () { Lampa.Controller.toggle(t) })
        }
      },
      fixCards: function (e) {
        e.forEach(function (e) {
          e.background_image = e.picture, e.poster = e.picture, e.img = e.picture,
            e.name = Lampa.Utils.capitalizeFirstLetter(e.name).replace(/\&(.*?);/g, "")
        })
      },
      preview: function (e, n) {
        i(), t = setTimeout(function () {
          if (n.preview && Lampa.Storage.field("sisi_preview")) {
            var t, r = e.find("video"), i = e.find(".sisi-video-preview");
            r || (r = document.createElement("video"),
              (i = document.createElement("div")).addClass("sisi-video-preview"),
              i.style.position = "absolute", i.style.width = "100%",
              i.style.height = "100%", i.style.left = "0", i.style.top = "0",
              i.style.overflow = "hidden", i.style.borderRadius = "1em",
              r.style.position = "absolute", r.style.width = "100%",
              r.style.height = "100%", r.style.left = "0", r.style.top = "0",
              r.style.objectFit = "cover", i.append(r),
              e.find(".card__view").append(i), r.src = n.preview,
              r.addEventListener("ended", function () { i.addClass("hide") }), r.load()),
              a = i;
            try { t = r.play() } catch (e) {}
            void 0 !== t && t.then(function () {}).catch(function (e) {}), i.removeClass("hide")
          }
        }, 1500)
      },
      hidePreview: i,
      fixList: function (e) {
        return e.forEach(function (e) { !e.quality && e.time && (e.quality = e.time) }), e
      },
      menu: function (t, a) {
        var n = [];
        a.related && n.push({ title: "Похожие", related: !0 }),
          a.model && n.push({ title: a.model.name, model: !0 }),
          Lampa.Select.show({
            title: "Меню", items: n,
            onSelect: function (t) {
              t.model ? Lampa.Activity.push({
                url: a.model.uri, title: "Модель - " + a.model.name,
                component: "sisi_view_" + e, page: 1
              }) : t.related && Lampa.Activity.push({
                url: a.video + "&related", title: "Похожие - " + a.title,
                component: "sisi_view_" + e, page: 1
              })
            },
            onBack: function () { Lampa.Controller.toggle("content") }
          })
      }
    };

    var l = new function () {
      var e = this, t = new Lampa.Reguest;
      this.menu = function (e, t) {
        // [STATUS_MENU_NOCACHE] v1.3.1 — не кэшируем список сайтов:
        // значки статуса должны читаться свежо при каждом открытии меню.
        // Если хранилище пустое — строим список и кэшируем.
        // После диагностики вызывается AdultJS_Status.invalidateMenu()
        // которая сбрасывает o → следующее открытие перечитает значки.
        if (o && !window._adultjs_menu_dirty) return e(o);
        window._adultjs_menu_dirty = false;
        var a = AdultJS.Menu();
        a ? e(o = a) : t(a.msg)
      },
        this.view = function (e, t, a) {
          AdultJS.Invoke(Lampa.Utils.addUrlComponent(e.url, "pg=" + (e.page || 1)))
            .then(function (e) {
              e.list
                ? (e.results = s.fixList(e.list), e.collection = !0,
                  e.total_pages = e.total_pages || 30, s.fixCards(e.results),
                  delete e.list, t(e))
                : a()
            }).catch(function () {
              console.log("AdultJS", "no load", e.url), a()
            })
        },
        this.playlist = function (t, a, n) {
          var r = function () {
            var e = new Lampa.Status(o.length);
            e.onComplite = function (e) {
              var t = [];
              o.forEach(function (a) {
                e[a.playlist_url] && e[a.playlist_url].results.length && t.push(e[a.playlist_url])
              }), t.length ? a(t) : n()
            },
              o.forEach(function (a, n) {
                var r = -1 !== a.playlist_url.indexOf("?") ? "&" : "?",
                  i = -1 !== t.indexOf("?") || -1 !== t.indexOf("&") ? t.substring(1) : t,
                  o = !1,
                  l = setTimeout(function () { o = !0, e.error() }, 8e3);
                AdultJS.Invoke(a.playlist_url + r + i)
                  .then(function (t) {
                    clearTimeout(l), o || (t.list
                      ? (t.title = s.sourceTitle(a.title), t.results = s.fixList(t.list),
                        t.url = a.playlist_url, t.collection = !0, t.line_type = "none",
                        t.card_events = {
                          onMenu: s.menu,
                          onEnter: function (e, t) { s.hidePreview(), s.play(t) }
                        },
                        s.fixCards(t.results), delete t.list, e.append(a.playlist_url, t))
                      : e.error())
                  }).catch(function () {
                    console.log("AdultJS", "no load", a.playlist_url + r + i),
                      clearTimeout(l), e.error()
                  })
              })
          };
          o ? r() : e.menu(r, n)
        },
        this.main = function (e, t, a) { this.playlist("", t, a) },
        this.search = function (e, t, a) {
          this.playlist("?search=" + encodeURIComponent(e.query), t, a)
        },
        this.qualitys = function (e, t, a) {
          AdultJS.Invoke(e).then(t).catch(function (t) {
            console.log("AdultJS", "no load", e), a()
          })
        },
        this.clear = function () { t.clear() }
    };

    function c(t) {
      var a = new Lampa.InteractionMain(t);
      return a.create = function () {
        return this.activity.loader(!0),
          l.main(t, this.build.bind(this), this.empty.bind(this)), this.render()
      },
        a.empty = function (e) {
          var t = this, a = new Lampa.Empty({
            descr: "string" == typeof e ? e : Lampa.Lang.translate("empty_text_two")
          });
          Lampa.Activity.all().forEach(function (e) {
            t.activity == e.activity &&
              e.activity.render().find(".activity__body > div")[0].appendChild(a.render(!0))
          }),
            this.start = a.start.bind(a), this.activity.loader(!1), this.activity.toggle()
        },
        a.onMore = function (t) {
          Lampa.Activity.push({ url: t.url, title: t.title, component: "sisi_view_" + e, page: 2 })
        },
        a.onAppend = function (e, t) {
          e.onAppend = function (e) {
            var t = e.onFocus;
            e.onFocus = function (e, a) { t(e, a), s.preview(e, a) }
          }
        }, a
    }

    function u(t) {
      var a, n = new Lampa.InteractionCategory(t);
      return n.create = function () {
        var e = this;
        this.activity.loader(!0),
          l.view(t, function (t) {
            (a = t.menu) && a.forEach(function (e) {
              var t = e.title.split(":");
              e.title = t[0].trim(),
                t[1] && (e.subtitle = Lampa.Utils.capitalizeFirstLetter(
                  t[1].trim().replace(/all/i, "Любой"))),
                e.submenu && e.submenu.forEach(function (e) {
                  e.title = Lampa.Utils.capitalizeFirstLetter(e.title.trim().replace(/all/i, "Любой"))
                })
            }), e.build(t),
              n.render().find(".category-full").addClass("mapping--grid cols--3")
          }, this.empty.bind(this))
      },
        n.nextPageReuest = function (e, t, a) { l.view(e, t.bind(this), a.bind(this)) },
        n.cardRender = function (e, t, a) {
          a.onMenu = function (e, t) { return s.menu(e, t) },
            a.onEnter = function () { s.hidePreview(), s.play(t) };
          var n = a.onFocus;
          a.onFocus = function (e, a) { n(e, a), s.preview(e, t) }
        },
        n.filter = function () {
          if (a) {
            var r = a.filter(function (e) { return !e.search_on }),
              i = a.find(function (e) { return e.search_on });
            if (i || (i = t.search_start), !r.length && !i) return;
            i && Lampa.Arrays.insert(r, 0, {
              title: "Найти",
              onSelect: function () {
                $("body").addClass("ambience--enable"),
                  Lampa.Input.edit({ title: "Поиск", value: "", free: !0, nosave: !0 },
                    function (t) {
                      if ($("body").removeClass("ambience--enable"),
                        Lampa.Controller.toggle("content"), t) {
                        var a = -1 !== i.playlist_url.indexOf("?") ? "&" : "?";
                        Lampa.Activity.push({
                          url: i.playlist_url + a + "search=" + encodeURIComponent(t),
                          title: "Поиск - " + t,
                          component: "sisi_view_" + e,
                          search_start: i, page: 1
                        })
                      }
                    })
              }
            }),
              Lampa.Select.show({
                title: "Фильтр", items: r,
                onBack: function () { Lampa.Controller.toggle("content") },
                onSelect: function (r) {
                  a.forEach(function (e) { e.selected = e == r }),
                    r.submenu ? Lampa.Select.show({
                      title: r.title, items: r.submenu,
                      onBack: function () { n.filter() },
                      onSelect: function (a) {
                        Lampa.Activity.push({
                          title: t.title, url: a.playlist_url,
                          component: "sisi_view_" + e, page: 1
                        })
                      }
                    }) : n.filter()
                }
              })
          }
        },
        n.onRight = n.filter.bind(n), n
    }

    window["plugin_adultjs_" + e + "_ready"] || function () {
      function t() {
        var t = $('<li class="menu__item selector" data-action="adultjs">\n            <div class="menu__ico">\n                <svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 29.461 29.461" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M28.855 13.134c-.479 0-.91-.197-1.371-.452-1.671 7.509-10.383 11.899-12.765 12.972-2.514-1.125-12.034-5.916-12.963-14.188-.043.029-.088.056-.132.084-.411.269-.797.523-1.299.523-.064 0-.121-.029-.184-.038C1.586 22.377 14.72 27.47 14.72 27.47s12.227-4.74 14.386-14.362a1.397 1.397 0 0 1-.251.026z" fill="currentColor" ></path><path d="M29.379 8.931C28.515-.733 16.628.933 14.721 6.432 12.814.932.928-.733.062 8.931c-.397 4.426 1.173.063 3.508 1.205 1.008.494 1.99 2.702 3.356 2.974 1.998.397 3.109-1.551 4.27-1.631 3.174-.222 2.394 6.596 5.424 5.586 1.961-.653 2.479-3.016 4.171-2.806 1.582.195 3.296-3.711 4.78-3.571 2.471.23 4.305 3.786 3.808-1.757z" fill="currentColor" ></path><path d="M14.894 21.534c2.286 0-.929-3.226-.588-4.511-1.994 1.276-1.697 4.511.588 4.511z" fill="currentColor"></path></g></svg>\n            </div>\n            <div class="menu__text">' + Lampa.Lang.translate("lampac_adultName") + "</div>\n        </li>"),
          a = $("<div>JS</div>");
        a.css({
          position: "absolute", right: "-0.4em", bottom: "-0.4em",
          color: "#fff", fontSize: "0.6em", borderRadius: "0.5em",
          fontWeight: 900, textTransform: "uppercase"
        }),
          t.find(".menu__ico").css("position", "relative").append(a),
          t.on("hover:enter", function () {
            Lampa.ParentalControl || (Lampa.ParentalControl = {
              query: function (e, t) { "function" == typeof e && e() }
            }),
              Lampa.ParentalControl.query(function () {
                l.menu(function (t) {
                  var a = [];
                  t.forEach(function (e) { e.title = s.sourceTitle(e.title) }),
                    a = a.concat(t),
                    Lampa.Select.show({
                      title: "Сайты", items: a,
                      onSelect: function (t) {
                        // ----------------------------------------
                        // [DEBUG_MENU_HANDLER] v1.2.0-debug
                        // Перехват нажатия на пункт "Диагностика источников"
                        // Для отката: удалить блок if (t.debug_action) {...}
                        // ----------------------------------------
                        if (t.debug_action) {
                          Lampa.Controller.toggle("menu");
                          if (window.AdultJS_Debugger) {
                            AdultJS_Debugger.runAll();
                          } else {
                            Lampa.Noty.show("[AdultJS] Модуль диагностики не загружен");
                          }
                          return;
                        }
                        // ----------------------------------------
                        t.playlist_url ? Lampa.Activity.push({
                          url: t.playlist_url, title: t.title,
                          component: "sisi_view_" + e, page: 1
                        }) : Lampa.Activity.push({
                          url: "", title: Lampa.Lang.translate("lampac_adultName"),
                          component: "sisi_" + e, page: 1
                        })
                      },
                      onBack: function () { Lampa.Controller.toggle("menu") }
                    })
                }, function () {})
              }, function () {})
          }),
          $(".menu .menu__list").eq(0).append(t),
          function () {
            var t, a, n = $('<div class="head__action head__settings selector">\n            <svg height="36" viewBox="0 0 38 36" fill="none" xmlns="http://www.w3.org/2000/svg">\n                <rect x="1.5" y="1.5" width="35" height="33" rx="1.5" stroke="currentColor" stroke-width="3"></rect>\n                <rect x="7" y="8" width="24" height="3" rx="1.5" fill="currentColor"></rect>\n                <rect x="7" y="16" width="24" height="3" rx="1.5" fill="currentColor"></rect>\n                <rect x="7" y="25" width="24" height="3" rx="1.5" fill="currentColor"></rect>\n                <circle cx="13.5" cy="17.5" r="3.5" fill="currentColor"></circle>\n                <circle cx="23.5" cy="26.5" r="3.5" fill="currentColor"></circle>\n                <circle cx="21.5" cy="9.5" r="3.5" fill="currentColor"></circle>\n            </svg>\n        </div>');
            n.hide().on("hover:enter", function () {
              t && (Lampa.Manifest.app_digital >= 300
                ? t.activity.component.filter()
                : t.activity.component().filter())
            }),
              $(".head .open--search").after(n),
              Lampa.Listener.follow("activity", function (r) {
                "start" == r.type && (t = r.object),
                  clearTimeout(a),
                  a = setTimeout(function () {
                    t && t.component !== "sisi_view_" + e && (n.hide(), t = !1)
                  }, 1e3),
                  "start" == r.type && r.component == "sisi_view_" + e && (n.show(), t = r.object)
              })
          }(),

          // --------------------------------------------------------
          // [BLOCK:02:END]

          // [BLOCK:03:START] SETTINGS — регистрация параметров в меню Lampa
          // --------------------------------------------------------
          window.sisi_add_param_ready || (window.sisi_add_param_ready = !0,
            Lampa.SettingsApi.addComponent({
              component: "AdultJS",
              name: Lampa.Lang.translate("lampac_adultName"),
              icon: '<svg width="200" height="243" viewBox="0 0 200 243" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M187.714 130.727C206.862 90.1515 158.991 64.2019 100.983 64.2019C42.9759 64.2019 -4.33044 91.5669 10.875 130.727C26.0805 169.888 63.2501 235.469 100.983 234.997C138.716 234.526 168.566 171.303 187.714 130.727Z" stroke="currentColor" stroke-width="15"/><path d="M102.11 62.3146C109.995 39.6677 127.46 28.816 169.692 24.0979C172.514 56.1811 135.338 64.2018 102.11 62.3146Z" stroke="currentColor" stroke-width="15"/><path d="M90.8467 62.7863C90.2285 34.5178 66.0667 25.0419 31.7127 33.063C28.8904 65.1461 68.8826 62.7863 90.8467 62.7863Z" stroke="currentColor" stroke-width="15"/><path d="M100.421 58.5402C115.627 39.6677 127.447 13.7181 85.2149 9C82.3926 41.0832 83.5258 35.4214 100.421 58.5402Z" stroke="currentColor" stroke-width="15"/><rect x="39.0341" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="90.8467" y="92.0388" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="140.407" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="116.753" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="64.9404" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="93.0994" y="176.021" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/></svg>'
            }),

            // --------------------------------------------------------
            // [PARAM: sisi_preview] v1.0.0 — предпросмотр при наведении
            // --------------------------------------------------------
            Lampa.SettingsApi.addParam({
              component: "AdultJS",
              param: { name: "sisi_preview", type: "trigger", values: "", default: !0 },
              field: {
                name: "Предпросмотр",
                description: "Показывать предпросмотр при наведение на карточку"
              },
              onRender: function (e) {}
            })
            // --------------------------------------------------------
            // [DEBUG_SETTINGS_NOTE] v1.2.0-debug
            // Кнопка диагностики перенесена в меню выбора сайтов
            // (последний пункт списка "📝 Диагностика источников").
            // Для отката debug-модуля: удалить [DEBUG_MENU_ITEM],
            // [DEBUG_MENU_HANDLER] и [DEBUG_MODULE_START..END].
            // --------------------------------------------------------
          )
      }

      window["plugin_adultjs_" + e + "_ready"] = !0,
        Lampa.Component.add("sisi_" + e, c),
        Lampa.Component.add("sisi_view_" + e, u),
        window.appready ? t() : Lampa.Listener.follow("app", function (e) {
          "ready" == e.type && t()
        })
    }()
  }();

  // ============================================================
  // [BLOCK:03:END]

  // [BLOCK:04:START] HTTP_HELPER — класс fetch/native запросов
  // ============================================================
  var l = (e = function () {
    function e() { _classCallCheck(this, e) }
    return _createClass(e, null, [
      {
        key: "ensureHeaders",
        value: function (e) {
          var t = e ? _objectSpread({}, e) : {};
          return t["user-agent"] || t["User-Agent"] ||
            (t["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"),
            t
        }
      },
      {
        key: "Get",
        value: (t = _asyncToGenerator(_regenerator().m(function t(a, n, r) {
          var i, o, s, l, c;
          return _regenerator().w(function (t) {
            for (;;) switch (t.n) {
              case 0:
                if (!e.isAndroid) { t.n = 1; break }
                return t.a(2, e.Native(a));
              case 1:
                return i = e.ensureHeaders(n), o = { method: "GET", headers: i },
                  t.n = 2, fetch(a, o);
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
          }, t)
        })), function (e, a, n) { return t.apply(this, arguments) })
      },
      {
        key: "Native",
        value: function (t, a, n) {
          return new Promise(function (r, i) {
            var o = new window.Lampa.Reguest;
            o.native(t, function (e) {
              "object" === _typeof(e) ? r(JSON.stringify(e)) : r(e), o.clear()
            }, i, a, { dataType: "text", timeout: 8e3, headers: e.ensureHeaders(n) })
          })
        }
      }
    ]);
    var t
  }(),
    e.isAndroid = "undefined" != typeof window && void 0 !== window.Lampa &&
      void 0 !== window.Lampa.Platform && "function" == typeof window.Lampa.Platform.is &&
      window.Lampa.Platform.is("android"),
    e),

    // ============================================================
    // [BLOCK:04:END]

    // [BLOCK:05:START] HELPERS — RegexHelper и модели данных (VideoItem, MenuItem)
    // ============================================================
    c = function () {
      return _createClass(function e() { _classCallCheck(this, e) }, null, [{
        key: "extract",
        value: function (e, t) {
          var a, n = arguments.length > 2 && void 0 !== arguments[2] ? arguments[2] : 1,
            r = (null === (a = e.match(t)) || void 0 === a ? void 0 : a[n]) || null;
          return r && "" !== r.trim() ? r.trim() : null
        }
      }])
    }(),

    // ============================================================
    // [SECTION: DATA MODELS] v1.0.0
    // ============================================================
    u = _createClass(function e(t, a, n, r, i, o, s, l, c) {
      _classCallCheck(this, e),
        this.name = t, this.video = a, this.picture = n, this.preview = r,
        this.time = i, this.quality = o, this.json = s, this.related = l, this.model = c
    }),
    p = _createClass(function e(t, a, n, r) {
      _classCallCheck(this, e), this.title = t, this.playlist_url = a,
        n && (this.search_on = n), r && (this.submenu = r)
    }),

    // ============================================================
    // [BLOCK:05:END]

    // [BLOCK:06:START] SOURCE_BONGACAMS — парсер BongaCams (live-камеры)
    // ============================================================
    d = (t = function () {
      function e() { _classCallCheck(this, e) }
      return _createClass(e, [{
        key: "Invoke",
        value: (t = _asyncToGenerator(_regenerator().m(function e(t) {
          var a;
          return _regenerator().w(function (e) {
            for (;;) switch (e.n) {
              case 0:
                return e.n = 1,
                  l.Get(t.replace("?pg=1", "").replace("pg=", "page="));
              case 1:
                return a = e.v,
                  e.a(2, { menu: this.Menu(t), list: this.Playlist(a) })
            }
          }, e, this)
        })), function (e) { return t.apply(this, arguments) })
      }, {
        key: "Playlist",
        value: function (e) {
          var t = [];
          return e && 0 !== e.length
            ? (e.split(/class="(ls_thumb js-ls_thumb|mls_item mls_so_)/).forEach(function (e) {
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
            }), t) : t
        }
      }, {
        key: "Menu",
        value: function (t) {
          var a = e.host + "/",
            n = [
              new p("Новые", a + "new-models"), new p("Пары", a + "couples"),
              new p("Девушки", a + "female"), new p("Русские модели", a + "female/tags/russian"),
              new p("Парни", a + "male"), new p("Транссексуалы", a + "trans")
            ],
            r = n.find(function (e) { return t.includes(e.playlist_url.replace(a, "")) });
          return [new p("Сортировка: " + (r ? r.title : "Новые"), "submenu", void 0, n)]
        }
      }]);
      var t
    }(), t.host = "https://ukr.bongacams.com", t),

    h = _createClass(function e(t, a) {
      _classCallCheck(this, e),
        a ? (this.total_pages = 1, this.list = t.recomends)
          : (this.qualitys = t.qualitys, this.recomends = t.recomends)
    }),
    m = _createClass(function e(t, a) {
      _classCallCheck(this, e), this.qualitys = t, this.recomends = a
    }),

    // ============================================================
    // [BLOCK:06:END]

    // [BLOCK:07:START] SOURCE_XVIDEOS — парсер XVideos (xv-ru.com)
    // ============================================================
    g = (a = function () {
      function e() { _classCallCheck(this, e) }
      return _createClass(e, [{
        key: "Invoke",
        value: (t = _asyncToGenerator(_regenerator().m(function t(a) {
          var n, r, i, o, s, c, u, p;
          return _regenerator().w(function (t) {
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
                  c = parseInt(r.searchParams.get("pg") || "1", 10),
                  u = this.buildUrl(e.host, i, o, s, c),
                  t.n = 3, l.Get(u);
              case 3:
                return p = t.v, t.a(2, { menu: this.Menu(o, s), list: this.Playlist(p) });
              case 4: return t.a(2)
            }
          }, t, this)
        })), function (e) { return t.apply(this, arguments) })
      }, {
        key: "buildUrl",
        value: function (e, t, a, n, r) {
          return t ? "".concat(e, "/?k=").concat(encodeURIComponent(t), "&p=").concat(r)
            : n ? "".concat(e, "/c/s:").concat("top" === a ? "rating" : "uploaddate", "/").concat(n, "/").concat(r)
              : "top" === a ? "".concat(e, "/best/").concat(this.getLastMonth(), "/").concat(r)
                : "".concat(e, "/new/").concat(r)
        }
      }, {
        key: "getLastMonth",
        value: function () {
          var e = new Date;
          return e.setMonth(e.getMonth() - 1), e.toISOString().slice(0, 7)
        }
      }, {
        key: "Playlist",
        value: function (t) {
          if (!t) return [];
          for (var a = t.split('<div id="video'), n = [], r = 1; r < a.length; r++) {
            var i = a[r],
              o = /<a href="\/(video[^"]+|search-video\/[^"]+)" title="([^"]+)"/.exec(i);
            if (o && o[1] && o[2] || (o = /<a href="\/(video[^"]+)"[^>]+>([^<]+)/.exec(i)) && o[1] && o[2]) {
              var s = c.extract(i, /<span class="video-hd-mark">([^<]+)<\/span>/),
                lv = c.extract(i, /<span class="duration">([^<]+)<\/span>/),
                pv = c.extract(i, /data-src="([^"]+)"/),
                d = (pv = pv
                  ? (pv = (pv = pv.replace(/\/videos\/thumbs([0-9]+)\//, "/videos/thumbs$1lll/"))
                    .replace(/\.THUMBNUM\.(jpg|png)$/i, ".1.$1"))
                    .replace("thumbs169l/", "thumbs169lll/").replace("thumbs169ll/", "thumbs169lll/")
                  : "").replace(/\/thumbs[^/]+\//, "/videopreview/");
              d = (d = d.replace(/\/[^/]+$/, "")).replace(/-[0-9]+$/, ""),
                n.push(new u(o[2], "".concat(e.host, "/").concat(o[1]), pv, d + "_169.mp4",
                  lv || null, s || null, !0, !0, null))
            }
          }
          return n
        }
      }, {
        key: "Menu",
        value: function (t, a) {
          var n, r = e.host,
            i = [new p("Поиск", r, "search_on")],
            o = new p("Сортировка: ".concat(
              "like" === t ? "Понравившиеся" : "top" === t ? "Лучшие" : "Новое"),
              "submenu", void 0,
              [new p("Новое", r + "?c=".concat(a)), new p("Лучшие", r + "?sort=top&c=".concat(a))]);
          i.push(o);
          var s = [
            new p("Все", r + "?sort=".concat(t)),
            new p("Азиат", r + "?sort=".concat(t, "&c=Asian_Woman-32")),
            new p("Анал", r + "?sort=".concat(t, "&c=Anal-12")),
            new p("Арабки", r + "?sort=".concat(t, "&c=Arab-159")),
            new p("Бисексуалы", r + "?sort=".concat(t, "&c=Bi_Sexual-62")),
            new p("Блондинки", r + "?sort=".concat(t, "&c=Blonde-20")),
            new p("Большие Попы", r + "?sort=".concat(t, "&c=Big_Ass-24")),
            new p("Большие Сиськи", r + "?sort=".concat(t, "&c=Big_Tits-23")),
            new p("Большие яйца", r + "?sort=".concat(t, "&c=Big_Cock-34")),
            new p("Брюнетки", r + "?sort=".concat(t, "&c=Brunette-25")),
            new p("В масле", r + "?sort=".concat(t, "&c=Oiled-22")),
            new p("Веб камеры", r + "?sort=".concat(t, "&c=Cam_Porn-58")),
            new p("Гэнгбэнг", r + "?sort=".concat(t, "&c=Gangbang-69")),
            new p("Зияющие отверстия", r + "?sort=".concat(t, "&c=Gapes-167")),
            new p("Зрелые", r + "?sort=".concat(t, "&c=Mature-38")),
            new p("Индийский", r + "?sort=".concat(t, "&c=Indian-89")),
            new p("Испорченная семья", r + "?sort=".concat(t, "&c=Fucked_Up_Family-81")),
            new p("Кончает внутрь", r + "?sort=".concat(t, "&c=Creampie-40")),
            new p("Куколд / Горячая Жена", r + "?sort=".concat(t, "&c=Cuckold-237")),
            new p("Латинки", r + "?sort=".concat(t, "&c=Latina-16")),
            new p("Лесбиянки", r + "?sort=".concat(t, "&c=Lesbian-26")),
            new p("Любительское порно", r + "?sort=".concat(t, "&c=Amateur-65")),
            new p("Мамочки. МИЛФ", r + "?sort=".concat(t, "&c=Milf-19")),
            new p("Межрассовые", r + "?sort=".concat(t, "&c=Interracial-27")),
            new p("Минет", r + "?sort=".concat(t, "&c=Blowjob-15")),
            new p("Нижнее бельё", r + "?sort=".concat(t, "&c=Lingerie-83")),
            new p("Попки", r + "?sort=".concat(t, "&c=Ass-14")),
            new p("Рыжие", r + "?sort=".concat(t, "&c=Redhead-31")),
            new p("Сквиртинг", r + "?sort=".concat(t, "&c=Squirting-56")),
            new p("Соло", r + "?sort=".concat(t, "&c=Solo_and_Masturbation-33")),
            new p("Сперма", r + "?sort=".concat(t, "&c=Cumshot-18")),
            new p("Тинейджеры", r + "?sort=".concat(t, "&c=Teen-13")),
            new p("Фемдом", r + "?sort=".concat(t, "&c=Femdom-235")),
            new p("Фистинг", r + "?sort=".concat(t, "&c=Fisting-165")),
            new p("Черные Женщины", r + "?sort=".concat(t, "&c=bbw-51")),
            new p("Черный", r + "?sort=".concat(t, "&c=Black_Woman-30")),
            new p("Чулки,колготки", r + "?sort=".concat(t, "&c=Stockings-28")),
            new p("ASMR", r + "?sort=".concat(t, "&c=ASMR-229"))
          ];
          return i.push(new p("Категория: ".concat(
            (null === (n = s.find(function (e) { return e.playlist_url.endsWith("c=".concat(a)) }))
              || void 0 === n ? void 0 : n.title) || "все"), "submenu", void 0, s)), i
        }
      }, {
        key: "StreamLinks",
        value: function (t) {
          var a = c.extract(t, /html5player\.setVideoHLS\('([^']+)'\);/);
          if (!a) return new m({}, []);
          var n = [], r = c.extract(t, /video_related=([^\n\r]+);window/);
          if (r && r.startsWith("[") && r.endsWith("]")) try {
            var i, o = _createForOfIteratorHelper(JSON.parse(r));
            try {
              for (o.s(); !(i = o.n()).done;) {
                var s = i.value;
                if (s.tf && s.u && s.if) {
                  var lv = s.if.replace(/\/thumbs[^/]+\//, "/videopreview/");
                  lv = (lv = lv.replace(/\/[^/]+$/, "")).replace(/-[0-9]+$/, ""),
                    n.push(new u(s.tf, "".concat(e.host).concat(s.u), s.if,
                      lv + "_169.mp4", s.d || "", null, !0, !0, null))
                }
              }
            } catch (e) { o.e(e) } finally { o.f() }
          } catch (e) {}
          return new m({ auto: a }, n)
        }
      }]);
      var t
    }(), a.host = "https://www.xv-ru.com", a),

    // ============================================================
    // [BLOCK:07:END]

    // [BLOCK:08:START] SOURCE_XNXX — парсер XNXX (xnxx-ru.com)
    // ============================================================
    y = (n = function () {
      function e() { _classCallCheck(this, e) }
      return _createClass(e, [{
        key: "Invoke",
        value: (t = _asyncToGenerator(_regenerator().m(function t(a) {
          var n, r, i, o, s, c;
          return _regenerator().w(function (t) {
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
                return c = t.v, t.a(2, { menu: this.Menu(), list: this.Playlist(c) });
              case 4: return t.a(2)
            }
          }, t, this)
        })), function (e) { return t.apply(this, arguments) })
      }, {
        key: "buildUrl",
        value: function (e, t, a) {
          if (t) return "".concat(e, "/search/").concat(encodeURIComponent(t), "/").concat(a);
          var n = new Date;
          n.setMonth(n.getMonth() - 1);
          var r = n.toISOString().slice(0, 7);
          return "".concat(e, "/best/").concat(r, "/").concat(a)
        }
      }, {
        key: "Playlist",
        value: function (t) {
          if (!t) return [];
          for (var a = t.split('<div id="video_'), n = [], r = 1; r < a.length; r++) {
            var i = a[r],
              o = /<a href="\/(video-[^"]+)" title="([^"]+)"/.exec(i),
              s = c.extract(i, /<span class="superfluous"> - <\/span>([^<]+)<\/span>/);
            if (o && o[1] && o[2]) {
              var lv = c.extract(i, /<\/span>([^<]+)<span class="video-hd">/),
                pv = c.extract(i, /data-src="([^"]+)"/),
                d = (pv = pv ? pv.replace(".THUMBNUM.", ".1.") : "").replace(/\/thumbs[^/]+\//, "/videopreview/");
              d = (d = d.replace(/\/[^/]+$/, "")).replace(/-[0-9]+$/, ""),
                n.push(new u(o[2], "".concat(e.host, "/").concat(o[1]), pv,
                  d + "_169.mp4", lv || null, s || null, !0, !0, null))
            }
          }
          return n
        }
      }, {
        key: "Menu",
        value: function () {
          var t = e.host + "/xnx";
          return [new p("Поиск", t, "search_on")]
        }
      }, {
        key: "StreamLinks",
        value: function (t) {
          var a = c.extract(t, /html5player\.setVideoHLS\('([^']+)'\);/);
          if (!a) return new m({}, []);
          var n = [], r = c.extract(t, /video_related=([^\n\r]+);window/);
          if (r && r.startsWith("[") && r.endsWith("]")) try {
            var i, o = _createForOfIteratorHelper(JSON.parse(r));
            try {
              for (o.s(); !(i = o.n()).done;) {
                var s = i.value;
                s.tf && s.u && s.i && n.push(new u(s.tf, "".concat(e.host).concat(s.u),
                  s.i, null, "", null, !0, !0, null))
              }
            } catch (e) { o.e(e) } finally { o.f() }
          } catch (e) {}
          return new m({ auto: a }, n)
        }
      }]);
      var t
    }(), n.host = "https://www.xnxx-ru.com", n),

    // ============================================================
    // [BLOCK:08:END]

    // [BLOCK:09:START] SOURCE_SPANKBANG — парсер SpankBang
    // ============================================================
    v = (r = function () {
      function e() { _classCallCheck(this, e) }
      return _createClass(e, [{
        key: "Invoke",
        value: (t = _asyncToGenerator(_regenerator().m(function t(a) {
          var n, r, i, o, s, c, u2;
          return _regenerator().w(function (t) {
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
                  c = this.buildUrl(e.host, i, o, s),
                  t.n = 3, l.Get(c);
              case 3:
                return u2 = t.v, t.a(2, { menu: this.Menu(o), list: this.Playlist(u2) });
              case 4: return t.a(2)
            }
          }, t, this)
        })), function (e) { return t.apply(this, arguments) })
      }, {
        key: "buildUrl",
        value: function (e, t, a, n) {
          var r = "".concat(e, "/");
          return t ? r += "s/".concat(encodeURIComponent(t), "/").concat(n, "/")
            : (r += "".concat(a || "new_videos", "/").concat(n, "/"),
              "most_popular" === a && (r += "?p=m")), r
        }
      }, {
        key: "Playlist",
        value: function (t) {
          if (!t) return [];
          for (var a = t.split('class="video-item responsive-page"'), n = [], r = 1; r < a.length; r++) {
            var i = a[r], o = /<a href="\/([^\"]+)" title="([^"]+)"/.exec(i);
            if (o && o[1] && o[2]) {
              var s = c.extract(i, /<span class="video-badge h">([^<]+)<\/span>/),
                lv = c.extract(i, /<span class="video-badge l">([^<]+)<\/span>/),
                pv = c.extract(i, /data-src="([^"]+)"/);
              pv = pv ? pv.replace(/\/w:[0-9]00\//, "/w:300/") : "";
              var d = c.extract(i, /data-preview="([^"]+)"/);
              n.push(new u(o[2], "".concat(e.host, "/").concat(o[1]), pv, d || null,
                lv || null, s || null, !0, !0, null))
            }
          }
          return n
        }
      }, {
        key: "Menu",
        value: function (t) {
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
        value: function (e) {
          for (var t, a = {}, n = /'([0-9]+)(p|k)': ?\['(https?:\/\/[^']+)'/g;
            null !== (t = n.exec(e));) {
            var r = "k" === t[2] ? 2160 : parseInt(t[1], 10);
            a["".concat(r, "p")] = t[3]
          }
          return new m(a, this.Playlist(e))
        }
      }]);
      var t
    }(), r.host = "https://ru.spankbang.com", r),

    // ============================================================
    // [BLOCK:09:END]

    // [BLOCK:10:START] SOURCE_CHATURBATE — парсер Chaturbate (live-камеры)
    // ============================================================
    b = (i = function () {
      function e() { _classCallCheck(this, e) }
      return _createClass(e, [{
        key: "Invoke",
        value: (a = _asyncToGenerator(_regenerator().m(function t(a) {
          var n, r, i, o, s, c2, u2;
          return _regenerator().w(function (t) {
            for (;;) switch (t.n) {
              case 0:
                n = new URL(a, e.host);
                if (!a.includes("baba=")) { t.n = 2; break }
                return c2 = h, t.n = 1, this.StreamLinks(n.searchParams.get("baba"));
              case 1: return u2 = t.v, t.a(2, new c2(u2, !1));
              case 2:
                return r = n.searchParams.get("sort") || "",
                  i = parseInt(n.searchParams.get("pg") || "1", 10),
                  o = this.buildUrl(e.host, r, i),
                  t.n = 3, l.Get(o);
              case 3:
                return s = t.v, t.a(2, { menu: this.Menu(r), list: this.Playlist(s) });
              case 4: return t.a(2)
            }
          }, t, this)
        })), function (e) { return a.apply(this, arguments) })
      }, {
        key: "buildUrl",
        value: function (e, t, a) {
          var n = e + "/api/ts/roomlist/room-list/?enable_recommendations=false&limit=90";
          return t && (n += "&genders=".concat(t)),
            a > 1 && (n += "&offset=".concat(90 * a)), n
        }
      }, {
        key: "Playlist",
        value: function (t) {
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
        value: function (t) {
          var a, n = e.host + "/chu",
            r = [
              new p("Лучшие", n), new p("Девушки", n + "?sort=f"),
              new p("Пары", n + "?sort=c"), new p("Парни", n + "?sort=m"),
              new p("Транссексуалы", n + "?sort=t")
            ],
            i = (null === (a = r.find(function (e) {
              return e.playlist_url.endsWith("=".concat(t))
            })) || void 0 === a ? void 0 : a.title) || "Лучшие";
          return [new p("Сортировка: ".concat(i), "submenu", void 0, r)]
        }
      }, {
        key: "StreamLinks",
        value: (t = _asyncToGenerator(_regenerator().m(function t(a) {
          var n, r;
          return _regenerator().w(function (t) {
            for (;;) switch (t.n) {
              case 0:
                if (a) { t.n = 1; break }
                return t.a(2, new m({}, []));
              case 1:
                return t.n = 2, l.Get("".concat(e.host, "/").concat(a, "/"));
              case 2:
                if (n = t.v, r = c.extract(n, /(https?:\/\/[^ ]+\/playlist\.m3u8)/)) {
                  t.n = 3; break
                }
                return t.a(2, new m({}, []));
              case 3:
                return t.a(2, new m({
                  auto: r.replace(/\\u002D/g, "-").replace(/\\/g, "")
                }, []))
            }
          }, t)
        })), function (e) { return t.apply(this, arguments) })
      }]);
      var t, a
    }(), i.host = "https://chaturbate.com", i),

    // ============================================================
    // [BLOCK:10:END]

    // [BLOCK:11:START] SOURCE_EPORNER — парсер EPorner
    // ============================================================
    f = (o = function () {
      function e() { _classCallCheck(this, e) }
      return _createClass(e, [{
        key: "Invoke",
        value: (a = _asyncToGenerator(_regenerator().m(function t(a) {
          var n, r, i, o2, s, c2, u2, pv, dv, mv;
          return _regenerator().w(function (t) {
            for (;;) switch (t.n) {
              case 0:
                if (!a.includes("/video")) { t.n = 2; break }
                return pv = h, t.n = 1, this.StreamLinks(e.host, a);
              case 1:
                return dv = t.v, mv = a.includes("&related"), t.a(2, new pv(dv, mv));
              case 2:
                return n = new URL(a, e.host),
                  r = n.searchParams.get("search") || "",
                  i = n.searchParams.get("sort") || "",
                  o2 = n.searchParams.get("c") || "",
                  s = parseInt(n.searchParams.get("pg") || "1", 10),
                  c2 = this.buildUrl(e.host, r, i, o2, s),
                  t.n = 3, l.Get(c2);
              case 3:
                return u2 = t.v, t.a(2, { menu: this.Menu(r, i, o2), list: this.Playlist(u2) });
              case 4: return t.a(2)
            }
          }, t, this)
        })), function (e) { return a.apply(this, arguments) })
      }, {
        key: "buildUrl",
        value: function (e, t, a, n, r) {
          var i = "".concat(e, "/");
          return t
            ? (i += "search/".concat(encodeURIComponent(t), "/"),
              r > 1 && (i += "".concat(r, "/")),
              a && (i += "".concat(a, "/")))
            : n
              ? (i += "cat/".concat(n, "/"), r > 1 && (i += "".concat(r, "/")))
              : (r > 1 && (i += "".concat(r, "/")), a && (i += "".concat(a, "/"))), i
        }
      }, {
        key: "Playlist",
        value: function (t) {
          if (!t) return [];
          var a = t;
          a.includes('class="toptopbelinset"') && (a = a.split('class="toptopbelinset"')[1]),
            a.includes('class="relatedtext"') && (a = a.split('class="relatedtext"')[1]);
          for (var n = a.split(/<div class="mb (hdy)?"/), r = [], i = 1; i < n.length; i++) {
            var o2 = n[i], s = /<p class="mbtit">\s*<a href="\/([^"]+)">([^<]+)<\/a>/i.exec(o2);
            if (s && s[1] && s[2]) {
              var lv = c.extract(o2, /<div class="mvhdico"([^>]+)?><span>([^"<]+)/, 2),
                pv = c.extract(o2, / data-src="([^"]+)"/);
              pv || (pv = c.extract(o2, /<img src="([^"]+)"/));
              var dv = c.extract(o2, /data-id="([^"]+)"/),
                hv = pv && dv ? pv.replace(/\/[^/]+$/, "") + "/".concat(dv, "-preview.webm") : null,
                mv = c.extract(o2, /<span class="mbtim"([^>]+)?>([^<]+)<\/span>/, 2);
              r.push(new u(s[2], "".concat(e.host, "/").concat(s[1]),
                pv || "", hv, mv || null, lv || null, !0, !0, null))
            }
          }
          return r
        }
      }, {
        key: "Menu",
        value: function (t, a, n) {
          var r, i = e.host, o2 = [new p("Поиск", i, "search_on")];
          if (t) return (o2.push(new p("Сортировка: ".concat(a || "новинки"), "submenu", void 0,
            [new p("Новинки", i + "?search=".concat(encodeURIComponent(t))),
            new p("Топ просмотра", i + "?sort=most-viewed&search=".concat(encodeURIComponent(t))),
            new p("Топ рейтинга", i + "?sort=top-rated&search=".concat(encodeURIComponent(t))),
            new p("Длинные ролики", i + "?sort=longest&search=".concat(encodeURIComponent(t))),
            new p("Короткие ролики", i + "?sort=shortest&search=".concat(encodeURIComponent(t)))])), o2);
          n || o2.push(new p("Сортировка: ".concat(a || "новинки"), "submenu", void 0,
            [new p("Новинки", i), new p("Топ просмотра", i + "?sort=most-viewed"),
            new p("Топ рейтинга", i + "?sort=top-rated"),
            new p("Длинные ролики", i + "?sort=longest"),
            new p("Короткие ролики", i + "?sort=shortest")]));
          var s = [
            new p("Все", i), new p("4K UHD", i + "?c=4k-porn"),
            new p("60 FPS", i + "?c=60fps"), new p("Amateur", i + "?c=amateur"),
            new p("Anal", i + "?c=anal"), new p("Asian", i + "?c=asian"),
            new p("ASMR", i + "?c=asmr"), new p("BBW", i + "?c=bbw"),
            new p("BDSM", i + "?c=bdsm"), new p("Big Ass", i + "?c=big-ass"),
            new p("Big Dick", i + "?c=big-dick"), new p("Big Tits", i + "?c=big-tits"),
            new p("Teen", i + "?c=teens"), new p("Threesome", i + "?c=threesome"),
            new p("Mature", i + "?c=mature"), new p("MILF", i + "?c=milf")
          ];
          return o2.push(new p("Категория: ".concat(
            (null === (r = s.find(function (e) { return e.playlist_url.endsWith("c=".concat(n)) }))
              || void 0 === r ? void 0 : r.title) || "все"), "submenu", void 0, s)), o2
        }
      }, {
        key: "StreamLinks",
        value: (t = _asyncToGenerator(_regenerator().m(function e(t, a) {
          var n, r, i, o2, s, u2, pv, dv;
          return _regenerator().w(function (e) {
            for (;;) switch (e.n) {
              case 0:
                if (a) { e.n = 1; break } return e.a(2, new m({}, []));
              case 1: return e.n = 2, l.Get(a);
              case 2:
                if (n = e.v) { e.n = 3; break } return e.a(2, new m({}, []));
              case 3:
                if (r = c.extract(n, /vid ?= ?'([^']+)'/),
                  i = c.extract(n, /hash ?= ?'([^']+)'/), r && i) {
                  e.n = 4; break
                }
                return e.a(2, new m({}, []));
              case 4:
                return o2 = "".concat(t, "/xhr/video/").concat(r, "?hash=")
                  .concat(this.convertHash(i), "&domain=")
                  .concat(t.replace(/^https?:\/\//, ""),
                    "&fallback=false&embed=false&supportedFormats=dash,mp4&_=")
                  .concat(Math.floor(Date.now() / 1e3)),
                  e.n = 5, l.Get(o2);
              case 5:
                if (s = e.v) { e.n = 6; break } return e.a(2, new m({}, []));
              case 6:
                for (u2 = {}, pv = /"src":\s*"(https?:\/\/[^/]+\/[^"]+-([0-9]+p)\.mp4)",/g;
                  null !== (dv = pv.exec(s));) u2[dv[2]] = dv[1];
                return e.a(2, new m(u2, this.Playlist(n)))
            }
          }, e, this)
        })), function (e, a) { return t.apply(this, arguments) })
      }, {
        key: "convertHash",
        value: function (e) {
          return this.base36(e.substring(0, 8)) + this.base36(e.substring(8, 16))
            + this.base36(e.substring(16, 24)) + this.base36(e.substring(24, 32))
        }
      }, {
        key: "base36",
        value: function (e) {
          for (var t = "", a = parseInt(e, 16); a > 0;)
            t = "0123456789abcdefghijklmnopqrstuvwxyz"[a % 36] + t, a = Math.floor(a / 36);
          return t || "0"
        }
      }]);
      var t, a
    }(), o.host = "https://www.eporner.com", o);

  // ============================================================
  // [BLOCK:11:END]

  // [BLOCK:12:START] NEXTHUB_ENGINE — вспомогательные функции и движок NextHub
  // ============================================================
  function k(e, t) {
    return e.replace(/\{([^}]+)\}/g, function (e, a) {
      var n; return null !== (n = t[a]) && void 0 !== n ? n : ""
    })
  }
  function w(e, t) {
    var a = e.replace(/\/+$/, ""), n = t.replace(/^\/+/, "");
    return a + (n ? "/" + n : "")
  }
  function _(e) { return (new DOMParser).parseFromString(e, "text/html") }
  function x(e, t, a) {
    return e.evaluate(t, a || e, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
  }
  function C(e, t, a) {
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

  // ============================================================
  // [SECTION: NEXTHUB ENGINE] v1.0.0
  // ============================================================
  var S = (s = function () {
    return _createClass(function e(t) {
      _classCallCheck(this, e), this.cfgs = t
    }, [{
      key: "buildListUrl",
      value: function (e, t, a, n) {
        var r, i, o, s, l2,
          c2 = n && "" !== n.trim(),
          u2 = Object.keys((null === (r = e.menu) || void 0 === r ? void 0 : r.sort) || {})
            .find(function (t) {
              var a, n = null === (a = e.menu) || void 0 === a || null === (a = a.sort) || void 0 === a
                ? void 0 : a[t];
              return !n || "" === n
            }),
          p2 = a && "" !== a.trim() && a !== u2;
        if (null !== (i = e.menu) && void 0 !== i && i.route)
          if (c2 && p2 && e.menu.route.catsort) s = e.menu.route.catsort;
          else if (c2 && p2 && !e.menu.route.catsort) s = e.menu.route.cat;
          else if (c2 && e.menu.route.cat) s = e.menu.route.cat;
          else if (p2 && e.menu.route.sort) s = e.menu.route.sort;
          else {
            var d2;
            s = 1 === t && null != (null === (d2 = e.list) || void 0 === d2 ? void 0 : d2.firstpage)
              ? e.list.firstpage : e.list ? e.list.uri : "{host}"
          }
        else
          s = 1 === t && null != (null === (l2 = e.list) || void 0 === l2 ? void 0 : l2.firstpage)
            ? e.list.firstpage : e.list ? e.list.uri : "{host}";
        var h2 = (p2 && null !== (o = e.menu) && void 0 !== o && o.sort ? e.menu.sort[a] : "")
          .replace(/\{page\}/g, String(t)),
          m2 = k(s = s.replace(/\{page\}/g, String(t)), {
            host: e.host, sort: h2 || "", cat: n || "", page: String(t)
          });
        return s.startsWith("{host}") || m2.startsWith("http") || (m2 = w(e.host, m2)), m2
      }
    }, {
      key: "buildSearchUrl",
      value: function (e, t, a) {
        if (!e.search) return e.host;
        var n = k(e.search.uri, { search: encodeURIComponent(t), page: String(a) });
        return w(e.host, n)
      }
    }, {
      key: "buildModelUrl",
      value: function (e, t, a) {
        var n, r = null == e || null === (n = e.menu) || void 0 === n
          || null === (n = n.route) || void 0 === n ? void 0 : n.model,
          i = decodeURIComponent(t);
        return r.replace("{host}", e.host).replace("{model}", i).replace("{page}", String(a))
      }
    }, {
      key: "buildMenu",
      value: function (e, t, a) {
        var n, r, i,
          o2 = arguments.length > 3 && void 0 !== arguments[3] && arguments[3],
          s2 = arguments.length > 4 ? arguments[4] : void 0,
          l2 = [];
        if (o2 || l2.push(new p("Поиск", "nexthub://".concat(e.displayname, "?mode=search"), "search_on")),
          o2 && null !== (n = e.view) && void 0 !== n && n.related && s2) {
          var c2, u2 = null === (c2 = s2.split("/").pop()) || void 0 === c2
            || null === (c2 = c2.split("?")[0]) || void 0 === c2 ? void 0 : c2.split("&")[0],
            d2 = "".concat(e.host, "/").concat(u2),
            h2 = "nexthub://".concat(e.displayname, "?mode=related&href=").concat(encodeURIComponent(d2));
          l2.push(new p("Похожие", h2))
        }
        if (null !== (r = e.menu) && void 0 !== r && r.sort) {
          for (var m2 = [], g2 = 0, y2 = Object.entries(e.menu.sort); g2 < y2.length; g2++) {
            var v2, b2 = _slicedToArray(y2[g2], 2), f2 = b2[0],
              k2 = (b2[1], "nexthub://".concat(e.displayname, "?mode=list&sort=").concat(encodeURIComponent(f2)));
            a && null !== (v2 = e.menu) && void 0 !== v2 && null !== (v2 = v2.route) && void 0 !== v2
              && v2.catsort && (k2 += "&cat=".concat(encodeURIComponent(a))),
              m2.push(new p(f2, k2))
          }
          var w2 = m2.find(function (e) { return e.title === t }) || m2[0];
          l2.push(new p("Сортировка: " + w2.title, "submenu", void 0, m2))
        }
        if (null !== (i = e.menu) && void 0 !== i && i.categories) {
          for (var _2 = [], x2 = 0, C2 = Object.entries(e.menu.categories); x2 < C2.length; x2++) {
            var S2, P2 = _slicedToArray(C2[x2], 2), z2 = P2[0], L2 = P2[1],
              j2 = "nexthub://".concat(e.displayname, "?mode=list&cat=").concat(encodeURIComponent(L2));
            if (null !== (S2 = e.menu) && void 0 !== S2 && null !== (S2 = S2.route) && void 0 !== S2 && S2.catsort) {
              var M2, T2 = Object.keys((null === (M2 = e.menu) || void 0 === M2 ? void 0 : M2.sort) || {})
                .find(function (t) {
                  var a, n = null === (a = e.menu) || void 0 === a || null === (a = a.sort) || void 0 === a
                    ? void 0 : a[t];
                  return !n || "" === n
                });
              t && t !== T2 && (j2 += "&sort=".concat(encodeURIComponent(t)))
            }
            _2.push(new p(z2, j2))
          }
          var A2 = "Все";
          if (a) {
            var I2 = Object.entries(e.menu.categories).find(function (e) {
              var t = _slicedToArray(e, 2); t[0]; return t[1] === a
            });
            I2 && (A2 = I2[0])
          }
          l2.push(new p("Категория: " + A2, "submenu", void 0, _2))
        }
        return l2
      }
    }, {
      key: "toPlaylist",
      value: function (e, t) {
        var a, n = t.contentParse,
          r = function (e, t, a) {
            for (var n = e.evaluate(t, a || e, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null),
              r = [], i = 0; i < n.snapshotLength; i++) r.push(n.snapshotItem(i));
            return r
          }(e, n.nodes),
          i = [], o2 = _createForOfIteratorHelper(r);
        try {
          for (o2.s(); !(a = o2.n()).done;) {
            var s2, l2 = a.value,
              c2 = n.name ? x(e, n.name.node, l2) : null,
              p2 = x(e, n.href.node, l2),
              d2 = n.img ? x(e, n.img.node, l2) : null,
              h2 = n.duration ? x(e, n.duration.node, l2) : null,
              m2 = n.preview ? x(e, n.preview.node, l2) : null,
              g2 = c2 ? (c2.textContent || "").trim()
                : (null == p2 ? void 0 : p2.getAttribute("title")) || "",
              y2 = p2 && p2.getAttribute(n.href.attribute || "href") || "",
              v2 = n.img ? C(d2, n.img.attributes || n.img.attribute || "src") : "",
              b2 = n.preview ? C(m2, n.preview.attribute || "data-preview") : null,
              f2 = h2 ? (h2.textContent || "").trim() : null;
            if (v2 && ((v2 = v2.replace(/&amp;/g, "&").replace(/\\/g, "")).startsWith("../")
              ? v2 = "".concat(t.host, "/").concat(v2.replace("../", ""))
              : v2.startsWith("//") ? v2 = "https:".concat(v2)
                : v2.startsWith("/") ? v2 = t.host + v2
                  : v2.startsWith("http") || (v2 = "".concat(t.host, "/").concat(v2))),
              y2 && g2 && v2) {
              var k2 = y2.startsWith("http") ? y2
                : t.host.replace(/\/?$/, "/") + y2.replace(/^\/?/, ""),
                w2 = null;
              if (n.model) {
                var _2 = n.model.name ? x(e, n.model.name.node, l2) : null,
                  S2 = n.model.href ? x(e, n.model.href.node, l2) : null;
                if (_2 && S2 && n.model.href) {
                  var P2 = (_2.textContent || "").trim(),
                    z2 = S2.getAttribute(n.model.href.attribute || "href") || "";
                  P2 && z2 && (w2 = {
                    uri: "nexthub://".concat(t.displayname.toLowerCase(), "?mode=model&model=")
                      .concat(encodeURIComponent(z2)),
                    name: P2
                  })
                }
              }
              i.push(new u(g2, k2, v2, b2, f2, null, !0,
                (null === (s2 = t.view) || void 0 === s2 ? void 0 : s2.related) || !1, w2))
            }
          }
        } catch (e) { o2.e(e) } finally { o2.f() }
        return i
      }
    }, {
      key: "extractStreams",
      value: (t = _asyncToGenerator(_regenerator().m(function e(t, a) {
        var n, r, i, o2, s2, c2, u2, p2, d2, h2, g2, y2, v2, b2, f2, k2, w2, S2, P2, z2, L2, j2, M2, T2, A2, I2, B2, O2;
        return _regenerator().w(function (e) {
          for (;;) switch (e.n) {
            case 0:
              if (s2 = {},
                null === (n = a.view) || void 0 === n || null === (n = n.iframe) || void 0 === n || !n.pattern) {
                e.n = 2; break
              }
              if (c2 = new RegExp(a.view.iframe.pattern, "g"), !(u2 = c2.exec(t)) || !u2[1]) {
                e.n = 2; break
              }
              return p2 = u2[1], d2 = p2.startsWith("http") ? p2 : a.host + p2,
                e.n = 1, l.Get(d2, void 0, a.charset);
            case 1: t = e.v;
            case 2:
              if (null === (r = a.view) || void 0 === r || !r.eval) { e.n = 3; break }
              try {
                h2 = new Function("html", a.view.eval),
                  (g2 = h2(t)) && (s2.auto = g2.replace(/&amp;/g, "&").replace(/\\/g, ""))
              } catch (e) { console.error("Eval execution error:", e) }
              e.n = 15; break;
            case 3:
              if (null === (i = a.view) || void 0 === i || !i.nodeFile) { e.n = 4; break }
              y2 = _(t),
                (v2 = x(y2, a.view.nodeFile.node)) && (b2 = C(v2, a.view.nodeFile.attribute))
                && (s2.auto = b2.replace(/&amp;/g, "&").replace(/\\/g, "")),
                e.n = 15; break;
            case 4:
              if (null !== (f2 = a.view) && void 0 !== f2 && null !== (f2 = f2.regexMatch)
                && void 0 !== f2 && f2.pattern) { e.n = 5; break }
              return e.a(2, new m(s2, []));
            case 5:
              k2 = a.view.regexMatch.matches || [""],
                w2 = _createForOfIteratorHelper(k2), e.p = 6, w2.s();
            case 7:
              if ((S2 = w2.n()).done) { e.n = 12; break }
              P2 = S2.value,
                (z2 = a.view.regexMatch.pattern).includes("{value}") && (z2 = z2.replace("{value}", P2)),
                L2 = new RegExp(z2, "g"), j2 = void 0, M2 = !1;
            case 8:
              if (!(j2 = L2.exec(t))) { e.n = 10; break }
              if (T2 = j2[1]) { e.n = 9; break }
              return e.a(3, 8);
            case 9:
              A2 = T2,
                a.view.regexMatch.format && (A2 = a.view.regexMatch.format
                  .replace("{host}", a.host).replace("{value}", T2)),
                s2.auto = A2.replace(/&amp;/g, "&").replace(/\\/g, ""),
                M2 = !0, e.n = 8; break;
            case 10:
              if (!M2) { e.n = 11; break }
              return e.a(3, 12);
            case 11: e.n = 7; break;
            case 12: e.n = 14; break;
            case 13: e.p = 13, O2 = e.v, w2.e(O2);
            case 14: return e.p = 14, w2.f(), e.f(14);
            case 15:
              return I2 = [],
                null !== (o2 = a.view) && void 0 !== o2 && o2.related &&
                (B2 = _(t), I2.push.apply(I2, _toConsumableArray(this.toPlaylist(B2, a)))),
                e.a(2, new m(s2, I2))
          }
        }, e, this, [[6, 13, 14, 15]])
      })), function (e, a) { return t.apply(this, arguments) })
    }, {
      key: "Invoke",
      value: (e = _asyncToGenerator(_regenerator().m(function e(t) {
        var a, n, r, i, o2, s2, c2, u2, p2, d2, m2, g2, y2, v2, b2, f2, k2, w2, x2, C2, S2, P2, z2, L2, j2, M2;
        return _regenerator().w(function (e) {
          for (;;) switch (e.n) {
            case 0:
              if (a = new URL(t),
                n = a.hostname || a.pathname.replace(/^\//, "") || t.replace("nexthub://", "").split("?")[0],
                r = this.cfgs.find(function (e) {
                  return e.displayname.toLowerCase() === n.toLowerCase()
                })) { e.n = 1; break }
              return e.a(2, "unknown nexthub site");
            case 1:
              if (console.log("NextHub: Invoke ".concat(t)),
                "view" !== (i = a.searchParams.get("mode") || "list") && "related" !== i) {
                e.n = 5; break
              }
              if (o2 = a.searchParams.get("href")) { e.n = 2; break }
              return e.a(2, "no href param");
            case 2:
              return s2 = decodeURIComponent(o2),
                c2 = s2.replace("&related?pg=1", ""),
                e.n = 3, l.Get(c2, void 0, r.charset);
            case 3: return u2 = e.v, e.n = 4, this.extractStreams(u2, r);
            case 4:
              return p2 = e.v,
                e.a(2, new h(p2, "related" === i || s2.includes("&related")));
            case 5:
              if ("model" !== i) { e.n = 8; break }
              if (d2 = a.searchParams.get("model")) { e.n = 6; break }
              return e.a(2, "no model param");
            case 6:
              return m2 = Number(a.searchParams.get("pg") || "1"),
                g2 = this.buildModelUrl(r, d2, m2),
                e.n = 7, l.Get(g2, void 0, r.charset);
            case 7:
              return y2 = e.v, v2 = _(y2),
                e.a(2, { menu: this.buildMenu(r, void 0, void 0, !1), list: this.toPlaylist(v2, r) });
            case 8:
              if ("search" !== i) { e.n = 10; break }
              return b2 = a.searchParams.getAll("search"),
                f2 = b2.find(function (e) { return "" !== e.trim() }) || "",
                k2 = Number(a.searchParams.get("pg") || "1"),
                w2 = this.buildSearchUrl(r, f2, k2),
                e.n = 9, l.Get(w2, void 0, r.charset);
            case 9:
              return x2 = e.v, C2 = _(x2),
                e.a(2, { menu: this.buildMenu(r, void 0, void 0, !1), list: this.toPlaylist(C2, r) });
            case 10:
              return S2 = a.searchParams.get("sort") || "",
                P2 = a.searchParams.get("cat") || "",
                z2 = Number(a.searchParams.get("pg") || "1"),
                L2 = this.buildListUrl(r, z2, S2, P2),
                e.n = 11, l.Get(L2, void 0, r.charset);
            case 11:
              return j2 = e.v, M2 = _(j2),
                e.a(2, { menu: this.buildMenu(r, S2, P2, !1), list: this.toPlaylist(M2, r) });
            case 12: return e.a(2)
          }
        }, e, this)
      })), function (t) { return e.apply(this, arguments) })
    }]);
    var e, t
  }(), s.host = "nexthub://", s),

  // ============================================================
  // [BLOCK:12:END]

  // [BLOCK:13:START] NEXTHUB_CONFIGS — массив P конфигов источников NextHub
  // Добавление нового источника: вставить объект-конфиг перед
  // закрывающей скобкой ], следуя шаблону в README.md
  // ============================================================
  P = [
    // --- PornHub ---
    { enable: !0, displayname: "PornHub", host: "https://rt.pornhub.com", menu: { route: { sort: "{host}/video?o={sort}&page={page}", model: "{host}{model}/videos?page={page}", cat: "{host}/video?c={cat}&page={page}", catsort: "{host}/video?c={cat}&o={sort}&page={page}" }, sort: { "Недавно в Избранном": "", "Новые": "cm", "Популярные": "mv", "Лучшие": "tr", "Горячие": "ht" }, categories: { "Все": "", "Азиатки": "1", "Анальный секс": "35", "Арабское": "98", "БДСМ": "10", "Бисексуалы": "76", "Блондинки": "9", "Большая грудь": "8", "Большие члены": "7", "Брюнетки": "11", "Зрелые": "28", "Лесбиянки": "27", "Любительское": "3", "Мамочки": "29", "Межрассовый Секс": "25", "Минет": "13", "Попки": "4", "Русское": "99", "Секс втроем": "65" } }, list: { uri: "video?page={page}" }, search: { uri: "video/search?search={search}&page={page}" }, contentParse: { nodes: "//li[contains(@class,'videoblock')] | //div[contains(@class,'video-list') or contains(@class,'videos')]//li[contains(@class,'videoblock')] | //ul[@id='videoCategory']//li[contains(@class,'videoblock')]", name: { node: ".//a[@data-event='thumb_click'] | .//a[@class='gtm-event-thumb-click'] | .//span[@class='title']//a" }, href: { node: ".//a[contains(@class,'linkVideoThumb')] | .//a[contains(@class,'title')]", attribute: "href" }, img: { node: ".//img | .//a[contains(@class,'linkVideoThumb')]//img", attributes: ["data-mediumthumb", "data-thumb_url", "data-image", "src"] }, preview: { node: ".//img | .//a[contains(@class,'linkVideoThumb')]//img", attribute: "data-mediabook" }, duration: { node: ".//*[contains(@class,'duration')]" }, model: { name: { node: ".//a[contains(@href,'/model/')]" }, href: { node: ".//a[contains(@href,'/model/')]", attribute: "href" } } }, view: { related: !0, regexMatch: { matches: ["1080", "720", "480", "360", "240"], pattern: '"videoUrl":"([^"]+)","quality":"{value}"' } } },
    // --- Xhamster ---
    { enable: !0, displayname: "Xhamster", host: "https://ru.xhamster.com", menu: { route: { sort: "{host}/{sort}/{page}", cat: "{host}/categories/{cat}/{page}", catsort: "{host}/categories/{cat}/{sort}/{page}" }, sort: { "В тренде": "", "Новейшее": "newest", "Лучшие": "best/weekly" }, categories: { "Все": "", "Русское": "russian", "Анал": "anal", "Зрелые": "mature", "Лесбиянка": "lesbian", "Любительское порно": "amateur", "Минет": "blowjob", "МИЛФ": "milf" } }, list: { uri: "{host}/{page}", firstpage: "{host}" }, search: { uri: "search/{search}/{page}" }, contentParse: { nodes: "//div[contains(@class,'thumb-list__item')] | //div[contains(@class,'thumb-list-mobile-item')]", name: { node: ".//a[contains(@class,'video-thumb-info__name')]" }, href: { node: ".//a[contains(@class,'video-thumb-info__name')]", attribute: "href" }, img: { node: ".//img", attributes: ["srcset", "src"] }, preview: { node: ".//a", attribute: "data-previewvideo" }, duration: { node: ".//div[@data-role='video-duration'] | .//time[contains(@class,'video-thumb__time')]" } }, view: { related: !0, nodeFile: { node: "//link[@rel='preload']", attribute: "href" } } },
    // --- Lenkino ---
    { enable: !0, displayname: "Lenkino", host: "https://wes.lenkino.adult", menu: { route: { cat: "{host}/{cat}/page/{page}", sort: "{host}/{sort}/page/{page}", catsort: "{host}/{cat}-top/page/{page}", model: "{model}/page/{page}" }, sort: { "Новые": "", "Лучшие": "top-porno", "Горячие": "hot-porno" }, categories: { "Русское порно": "a1-russian", "Порно зрелых": "milf-porn", "Анал": "anal-porno", "Большие сиськи": "big-tits", "Лесби": "lesbi-porno", "Минет": "blowjob", "Соло": "solo", "Хардкор": "hardcore" } }, list: { uri: "page/{page}" }, search: { uri: "search/{search}/page/{page}" }, contentParse: { nodes: "//div[@class='item']", name: { node: ".//div[@class='itm-tit']" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img[@class='lzy']", attribute: "data-srcset" }, duration: { node: ".//div[@class='itm-dur fnt-cs']" }, preview: { node: ".//img[@class='lzy']", attribute: "data-preview" }, model: { name: { node: ".//a[@class='itm-opt-mdl len_pucl']" }, href: { node: ".//a[@class='itm-opt-mdl len_pucl']", attribute: "href" } } }, view: { related: !0, regexMatch: { matches: ["alt_url", "url"], pattern: "video_{value}:[\\t ]+'([^']+)'" } } },
    // --- Lenporno ---
    { enable: !0, displayname: "Lenporno", host: "https://pepa.lenporno.xyz", menu: { route: { cat: "{host}/{cat}/{page}/", sort: "{host}/{sort}/{page}/" }, sort: { "Новинки": "", "Лучшее": "the-best", "Популярнаe": "most-popular" }, categories: { "Русское": "russkoye", "Анальное": "analnoye", "Зрелые": "zrelyye", "Мамки": "mamki", "Молодые": "molodyye", "Минет": "minet", "Групповое": "gruppovoye" } }, list: { uri: "new-update/{page}/" }, search: { uri: "search/{search}/{page}/" }, contentParse: { nodes: "//div[@class='innercont']", name: { node: ".//a[@class='preview_link']" }, href: { node: ".//a[@class='preview_link']", attribute: "href" }, img: { node: ".//img", attribute: "src" }, duration: { node: ".//div[@class='duration']" } }, view: { related: !0, regexMatch: { matches: ["1080p", "720p", "480p", "360p"], pattern: '(https?://[^\\t" ]+_{value}.mp4)' } } },
    // --- 24video ---
    { enable: !0, displayname: "24video", host: "https://sex.24videos.space", menu: { route: { cat: "{host}/{cat}/page-{page}/", sort: "{host}/{sort}/page-{page}/" }, sort: { "Новинки": "", "Рейтинговое": "top-rated-porn", "Популярнаe": "most-popular-porn" }, categories: { "Русское": "porno-russkoye", "Анальное": "porno-analnoye", "Зрелые": "porno-zrelyye", "Мамки": "porno-mamki", "Молодые": "porno-molodyye" } }, list: { uri: "page-{page}/" }, search: { uri: "search/{search}/page-{page}/" }, contentParse: { nodes: "//div[@class='item video-block']", name: { node: ".//div[@class='title']" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "data-original" }, duration: { node: ".//span[@class='duration']" } }, view: { related: !0, regexMatch: { matches: ["1080p", "720p", "480p", "360p"], pattern: '(https://[^",\\n\\r\\t ]+/JOPORN_NET_[0-9]+_{value}.mp4)' } } },
    // --- BigBoss ---
    { enable: !0, displayname: "BigBoss", host: "https://bigboss.video", menu: { route: { cat: "{host}/category/{cat}_page-{page}.html", sort: "{host}/videos/{sort}_page-{page}.htm" }, sort: { "Новинки": "", "Популярное": "popular" }, categories: { "Русское порно": "rus", "Зрелые": "zrelue", "Домашнее (любительское)": "domashka", "Лесбиянки": "lesbiyanka", "Минет": "minet-video" } }, list: { uri: "latest/{page}/" }, search: { uri: "search/{search}/page/{page}/" }, contentParse: { nodes: "//div[contains(@class,'main__ct-items')]//div[contains(@class,'main__ct-item')]", name: { node: ".//div[contains(@class,'video-unit__caption')]" }, href: { node: ".//a[contains(@class,'video-unit')]", attribute: "href" }, img: { node: ".//img", attributes: ["data-src", "src"] } }, view: { related: !0, regexMatch: { matches: ["1080", "720", "480", "360"], pattern: '/(common/getvideo/video.mp4\\?q={value}&[^", ]+)', format: "{host}/{value}" } } },
    // --- Ebasos ---
    { enable: !0, displayname: "Ebasos", host: "https://wel.ebasos.club", menu: { route: { sort: "{host}/{sort}/{page}/", cat: "{host}/categories/{cat}/{page}/", catsort: "{host}/categories/{cat}/top/{page}/" }, sort: { "Новое": "", "Лучшее": "top-rated" }, categories: { "Русское порно": "ruporno", "Анал": "anal", "Зрелые": "zrelye", "Мамки": "mamki" } }, list: { uri: "latest-updates/{page}/" }, search: { uri: "search/{search}/{page}/" }, contentParse: { nodes: "//div[@id='list_videos_common_videos_list_items']//div[contains(@class, 'item')]", name: { node: ".//span[contains(@class, 'title')]" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img[contains(@class,'thumb')]", attribute: "data-original" }, duration: { node: ".//div[contains(@class, 'duration')]" } }, view: { iframe: { pattern: '<iframe[^>]+ src="([^"]+)"' }, regexMatch: { matches: ["video_alt_url", "video_url"], pattern: "{value}:[\\t ]+'([^']+)'" } } },
    // --- Ebun ---
    { enable: !0, displayname: "Ebun", host: "https://www1.ebun.tv", menu: { route: { sort: "{host}/{sort}/{page}/", cat: "{host}/categories/{cat}/{page}/", catsort: "{host}/categories/{cat}/{sort}/{page}/" }, sort: { "Новинки": "", "Топ рейтинга": "top-rated", "Популярнаe": "most-popular" }, categories: { "Русское": "russkoe", "Анал": "anal", "Зрелые": "zrelye", "Мамки": "mamki" } }, list: { uri: "latest-updates/{page}/" }, search: { uri: "search/{search}/{page}/" }, contentParse: { nodes: "//div[contains(@class, 'item th-item item_new')]", name: { node: ".//div[@class='item-title']" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "data-src" }, duration: { node: ".//div[@class='meta-time']" } }, view: { iframe: { pattern: '<iframe[^>]+ src="([^"]+)"' }, regexMatch: { matches: ["video_alt_url", "video_url"], pattern: "{value}:[\\t ]+'([^']+)'" } } },
    // --- JopaOnline ---
    { enable: !0, displayname: "JopaOnline", host: "https://jopaonline.mobi", menu: { route: { sort: "{host}/{sort}/{page}", cat: "{host}/categories/{cat}/{page}", catsort: "{host}/categories/{cat}/{sort}/{page}" }, sort: { "Новинки": "", "Топ рейтинга": "toprated", "Популярнаe": "popular" }, categories: { "Мамки": "mamki", "Русское": "russkoe", "Зрелые": "zrelye", "Анал": "anal" } }, list: { uri: "{page}" }, search: { uri: "search/{search}/{page}" }, contentParse: { nodes: "//div[@class='th']", name: { node: ".//p" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "src" }, duration: { node: ".//div[@class='th-duration']" }, preview: { node: ".//img", attribute: "data-preview" } }, view: { related: !0, regexMatch: { matches: ["url3", "url2", "url"], pattern: "video_alt_{value}:[\\t ]+'([^']+)'" } } },
    // --- NoodleMagazine ---
    { enable: !0, displayname: "NoodleMagazine", host: "https://adult.noodlemagazine.com", menu: { route: { sort: "{host}/{sort}/week?p={page}" }, sort: { "Новинки": "", "Популярное": "popular" } }, list: { uri: "now?p={page}" }, search: { uri: "video/{search}?p={page}" }, contentParse: { nodes: "//div[contains(@class, 'item')]", name: { node: ".//div[@class='title']" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "data-src" }, duration: { node: ".//div[@class='m_time']" }, preview: { node: ".//div", attribute: "data-trailer_url" } }, view: { related: !0, regexMatch: { pattern: '"file":"([^"]+)"' } } },
    // --- Porndig ---
    { enable: !0, displayname: "Porndig", host: "https://www.porndig.com", menu: { route: { cat: "{host}/channels/{cat}/page/{page}" }, categories: { "Анал": "33/anal", "Азиатки": "38/asian", "Лесби": "40/lesbian", "МИЛФ": "39/milf", "Минет": "52/blowjob" } }, list: { uri: "video/page/{page}" }, search: { uri: "channels/33/{search}/page/{page}" }, contentParse: { nodes: "//section[contains(@class, 'video_item_wrapper even_item video_item_medium')]", name: { node: ".//a" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img[@class='thumb_preview hidden']", attribute: "data-src" }, duration: { node: ".//div[@class='bubble bubble_duration']//span" }, preview: { node: ".//img[contains(@class, 'js_video_preview')]", attribute: "data-vid" } }, view: { related: !0, iframe: { pattern: '<link rel="prefetch" as="document" href="([^"]+)"' }, regexMatch: { matches: ["/master.mpd", "_2160.mp4", "_1080.mp4", "_720.mp4", "_540.mp4", "_468.mp4", "_360.mp4"], pattern: '"src":"([^"]+{value})"' } } },
    // --- Pornk ---
    { enable: !0, displayname: "Pornk", host: "https://ps.pornk.top", menu: { route: { sort: "{host}/{sort}/week/{page}/", cat: "{host}/categories/{cat}/{page}/" }, sort: { "Новинки": "", "Топ рейтинга": "top-rated", "Популярное": "most-popular" }, categories: { "Красотки": "krasotki", "Зрелые": "zrelye", "Лесби": "lesbi" } }, list: { uri: "latest-updates/{page}/" }, search: { uri: "search/{search}/{page}/" }, contentParse: { nodes: "//a[contains(@class, 'preview')]", name: { node: ".//span[@class='preview-title']" }, href: { node: ".", attribute: "href" }, img: { node: ".//img", attribute: "src" }, duration: { node: ".//span[@class='preview-duration']" } }, view: { related: !0, regexMatch: { matches: ["1080p", "720p", "480p", "360p"], pattern: "/(get_file/[^', ]+_{value}.mp4)", format: "{host}/{value}" } } },
    // --- Porno365 ---
    { enable: !0, displayname: "Porno365", host: "https://porno365x.me", menu: { route: { cat: "{host}/{cat}/{page}/", sort: "{host}/{sort}/{page}/", catsort: "{host}/{cat}/{sort}/{page}/" }, sort: { "Новинки": "", "Топ рейтинга": "toprated", "Топ просмотров": "popular" }, categories: { "Русское": "russkoye", "Анал": "anal", "Зрелые": "zrelyye", "Мамки": "mamki" } }, list: { uri: "{page}/" }, search: { uri: "search/{search}/{page}/" }, contentParse: { nodes: "//li[contains(@class, ' trailer')]", name: { node: ".//p" }, href: { node: ".//a[@class='image']", attribute: "href" }, img: { node: ".//img", attribute: "src" }, duration: { node: ".//span[@class='duration']" } }, view: { related: !0, regexMatch: { pattern: 'file:[\\t ]+"([^"]+)"' } } },
    // --- Porno666 ---
    { enable: !0, displayname: "Porno666", host: "https://wwwp.porno666.news", menu: { route: { cat: "{host}/categories/{cat}/{page}/", sort: "{host}/{sort}" }, sort: { "Новинки": "", "Лучшее": "top-rated/{page}/", "Популярнаe": "most-popular/{page}/" }, categories: { "Русское порно": "russkoe", "Анал": "analnyy-seks", "Зрелые": "zrelye" } }, list: { uri: "latest-updates/{page}/" }, search: { uri: "search/{search}/{page}/" }, contentParse: { nodes: "//div[@class='item trailer']", name: { node: ".//strong" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "data-original" }, duration: { node: ".//div[@class='duration']" }, preview: { node: ".//img", attribute: "data-preview" } }, view: { related: !0, regexMatch: { matches: ["url3", "url2", "url"], pattern: "video_alt_{value}:[\\t ]+'([^']+)'" } } },
    // --- PornoBriz ---
    { enable: !0, displayname: "PornoBriz", host: "https://pornobriz.com", menu: { route: { cat: "{host}/{cat}/page{page}/", sort: "{host}/{sort}" }, sort: { "Новинки": "", "Топ рейтинга": "top/page{page}/", "Популярнаe": "best/page{page}/" }, categories: { "Русское порно": "russian", "Анальный секс": "anal", "Лесбиянки": "lesbian" } }, list: { uri: "new/page{page}/" }, search: { uri: "search/{search}/page{page}/" }, contentParse: { nodes: "//div[contains(@class, 'thumb_main')]", name: { node: ".//div[@class='th-title']" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "data-original" }, duration: { node: ".//div[@class='duration']" }, preview: { node: ".//video", attribute: "data-preview" } }, view: { regexMatch: { matches: ["720", "480", "240"], pattern: 'src="([^"]+)" type="video/mp4" size="{value}"' } } },
    // --- SemBatsa (disabled) ---
    { enable: !1, displayname: "SemBatsa", host: "https://sem.batsa.pro", menu: { route: { sort: "{host}/{sort}/monthly?page={page}", cat: "{host}/{cat}?page={page}" }, sort: { "Новое": "", "Топ рейтинга": "top-rated", "Топ просмотров": "most-popular" }, categories: { "Русское порно": "russkoe-porno" } }, list: { uri: "?page={page}" }, search: { uri: "search?q={search}" }, contentParse: { nodes: "//div[@class='grid-item aspect-ratio-16x9']", name: { node: ".//div[@class='grid-item-description']//a" }, href: { node: ".//a[1]", attribute: "href" }, img: { node: ".//img", attribute: "src" }, duration: { node: ".//span[contains(@class,'grid-item-dur')]" }, preview: { node: ".//video//source", attribute: "src" } }, view: { related: !0, regexMatch: { matches: ["1080", "720", "480", "400", "360"], pattern: 'src="([^"]+)" type="video/mp4" label="{value}"' } } },
    // --- Sosushka ---
    { enable: !0, displayname: "Sosushka", host: "https://gi.sosushka.vip", menu: { route: { sort: "{host}/{sort}/all/month/page{page}/", cat: "{host}/{cat}/page{page}/" }, sort: { "Новинки": "", "Популярное": "top", "Лучшие": "bests" }, categories: { "Русское порно": "russian", "Анальный секс": "anal", "Зрелые": "milf" } }, list: { uri: "new/page{page}/" }, search: { uri: "search/{search}/" }, contentParse: { nodes: "//div[@class='thumb']", name: { node: ".//p" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "data-src" }, duration: { node: ".//span[@class='right']" }, preview: { node: ".//div", attribute: "data-preview-src" } }, view: { iframe: { pattern: 'property="ya:ovs:embed_url" content="([^"]+)"' }, regexMatch: { matches: ["720", "480", "240"], pattern: '<source src="([^"]+)" type="video/mp4" size="{value}"' } } },
    // --- Youjizz ---
    { enable: !0, displayname: "Youjizz", host: "https://www.youjizz.com", menu: { route: { sort: "{host}/{sort}/{page}.html" }, sort: { "Новинки": "newest-clips", "Популярные": "most-popular", "Топ рейтинга": "top-rated-week", "В тренде": "trending" } }, list: { uri: "newest-clips/{page}.html" }, search: { uri: "search/{search}-{page}.html" }, contentParse: { nodes: "//div[@class='video-thumb']", name: { node: ".//div[@class='video-title']//a" }, href: { node: ".//a[contains(@class, 'frame video')]", attribute: "href" }, img: { node: ".//img", attribute: "data-original" }, duration: { node: ".//span[@class='time']" }, preview: { node: ".//a", attribute: "data-clip" } }, view: { related: !0, regexMatch: { format: "https:{value}", pattern: '"quality":"Auto","filename":"([^"]+)"' } } },
    // --- Vporno ---
    { enable: !0, displayname: "Vporno", host: "https://vv.vporno.video", menu: { route: { cat: "{host}/{cat}&{page}" }, categories: { "Зрелые": "zrelyee", "Минет": "minet", "Азиатки": "aziatki" } }, list: { uri: "page/{page}" }, search: { uri: "search/?word={search}&page={page}" }, contentParse: { nodes: "//div[@class='col-xs-6 col-sm-6 col-md-4 col-lg-4']", name: { node: ".//h3" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "src" }, duration: { node: ".//span[@class='time']" } }, view: { related: !0, regexMatch: { matches: ["720", "480", "360", "240"], pattern: 'href="(/down/{value}/[^"]+)"', format: "{host}{value}" } } },
    // --- Pornobolt ---
    { enable: !0, displayname: "Pornobolt", host: "https://ru.pornobolt.li", menu: { route: { sort: "{host}/{page}?sort={sort}", cat: "{host}/{cat}/{page}" }, sort: { "Новинки": "", "Популярнаe": "mv" }, categories: { "Русские": "russkoe-porno", "Зрелые": "zrelye", "Анал": "anal" } }, list: { uri: "{page}/" }, search: { uri: "search/{search}/{page}" }, contentParse: { nodes: "//div[@class='media-obj widethumb']", name: { node: ".//p" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attributes: ["data-original", "src"] }, duration: { node: ".//span[@itemprop='duration']" }, preview: { node: ".//img", attribute: "data-video" } }, view: { related: !0, nodeFile: { node: "//meta[@property='ya:ovs:content_url']", attribute: "content" } } },
    // --- PornoAkt ---
    { enable: !0, displayname: "PornoAkt", host: "https://a.pornoakt.club", menu: { route: { cat: "{host}/{cat}/page/{page}/" }, categories: { "Русское порно": "russkoe-porno", "Анальный секс": "anal", "Зрелые": "zrelye" } }, list: { uri: "page/{page}/" }, search: { uri: "index.php?do=search&subaction=search&search_start={page}&full_search=0&result_from=25&story={search}" }, contentParse: { nodes: "//article[contains(@class, 'shortstory')]", name: { node: ".//h2//a" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "src" }, duration: { node: ".//div[@class='video_time']" } }, view: { related: !0, nodeFile: { node: "//li[@data-type='m4v']", attribute: "data-url" } } },
    // --- PornOne ---
    { enable: !0, displayname: "PornOne", host: "https://pornone.com", menu: { route: { sort: "{host}/{sort}/week/{page}/", cat: "{host}/{cat}/{page}/", catsort: "{host}/{cat}/{sort}/{page}/" }, sort: { "Новинки": "", "Популярные": "rating" }, categories: { "Amateur": "amateur", "Anal": "anal", "Russian": "russian", "Teen": "teen", "Mature": "mature", "MILF": "milf" } }, list: { uri: "{page}/" }, search: { uri: "search?q={search}&sort=relevance&page={page}" }, contentParse: { nodes: "//a[@class='popbop vidLinkFX  videocard linkage']", name: { node: ".//div[@class='videotitle ']" }, href: { node: ".", attribute: "href" }, img: { node: ".//img[contains(@class, 'lazy-loading')]", attribute: "data-src" }, duration: { node: ".//span[@class='durlabel']" } }, view: { related: !0, nodeFile: { node: "//source", attribute: "src" } } },
    // --- Rusvideos ---
    { enable: !0, displayname: "Rusvideos", host: "https://sex.rusvideos.art", menu: { route: { sort: "{host}/{page}?sortirovka={sort}", cat: "{host}/{cat}/{page}" }, sort: { "Новинки": "", "Популярнаe": "popularnoe" }, categories: { "Зрелые": "zrelye", "Молодые": "molodye", "Анал": "anal", "Минет": "minet", "Лесбиянки": "lesbians", "Групповухи": "gruppovuxi" } }, list: { uri: "{page}/" }, search: { uri: "poisk/{page}?q={search}" }, contentParse: { nodes: "//div[@class='thumb wide']", name: { node: ".//div[@class='thumb-title']" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attributes: ["data-original", "src"] }, duration: { node: ".//span[@class='ttime']" }, preview: { node: ".//img", attribute: "data-video" } }, view: { related: !0, nodeFile: { node: "//meta[@property='ya:ovs:content_url']", attribute: "content" } } },
    // --- Veporn ---
    { enable: !0, displayname: "Veporn", host: "https://veporn.com", menu: { route: { cat: "{host}/{cat}/page/{page}/" }, categories: { "amateur": "amateur", "anal": "anal", "russian": "russian", "milf": "milf", "mature": "mature" } }, list: { uri: "page/{page}/" }, search: { uri: "page/{page}/?s={search}" }, contentParse: { nodes: "//article[contains(@class, 'loop-post vdeo')]", name: { node: ".//h2" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "src" }, duration: { node: ".//p//span[2]" } }, view: { related: !0, nodeFile: { node: "//source", attribute: "src" } } },
    // --- Porntrex ---
    { enable: !0, displayname: "Porntrex", host: "https://www.porntrex.com", menu: { route: { sort: "{host}/{sort}/{page}/", cat: "{host}/categories/{cat}/{page}/" }, sort: { "Новинки": "", "Популярное": "most-popular", "Топ рейтинга": "top-rated", "Длинные": "longest" }, categories: { "Аматорское": "amateur", "Анальное": "anal", "Азиатки": "asian", "Лесби": "lesbian", "МИЛФ": "milf" } }, list: { uri: "latest-updates/{page}/" }, search: { uri: "search/{search}/latest-updates/{page}/" }, contentParse: { nodes: "//div[contains(@class,'video-preview-screen')]", name: { node: ".//p[@class='inf']//a" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attributes: ["data-src", "src"] }, duration: { node: ".//div[@class='durations']" } }, view: { related: !0, regexMatch: { matches: ["2160p", "1440p", "1080p", "720p", "480p", "360p"], pattern: "'(https?://[^/]+/get_file/[^']+_{value}.mp4/)'" } } },
    // --- GayPornTube ---
    { enable: !0, displayname: "GayPornTube", host: "https://www.gayporntube.com", menu: { route: { sort: "{host}/{sort}/page{page}.html" }, sort: { "Новые": "most-recent", "Топ по рейтингу": "top-rated", "Длинные": "longest" } }, list: { uri: "page{page}.html" }, search: { uri: "search/videos/{search}/page{page}.html" }, contentParse: { nodes: "//div[contains(@class,'item') and contains(@class,'item-col')]", name: { node: ".//a[contains(@class,'title')]" }, href: { node: ".//a[contains(@class,'title')]", attribute: "href" }, img: { node: ".//img", attributes: ["data-src", "src"] }, preview: { node: ".//img", attribute: "data-preview" }, duration: { node: ".//div[contains(@class,'duration')]" } }, view: { related: !0, regexMatch: { pattern: 'src="([^"]+)" type="video/mp4"' } } },
    // --- Vtrahe ---
    { enable: !0, displayname: "Vtrahe", host: "https://site.vtrahehd.tv", charset: "windows-1251", menu: { route: { sort: "{host}/{sort}/page/{page}/", cat: "{host}/{cat}/page/{page}/" }, sort: { "Новинки": "", "Рейтинговое": "top", "Популярнаe": "most-popular" }, categories: { "Русское": "russkoe-porno", "Анал": "analnoe-porno", "Зрелые": "zrelye-zhenshhiny" } }, list: { uri: "latest-updates/page/{page}/", firstpage: "" }, search: { uri: "?do=search&subaction=search&search_start={page}&full_search=0&result_from=25&story={search}" }, contentParse: { nodes: "//div[@class='innercont']", name: { node: ".//div[@class='preview_title']//a" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "src" }, duration: { node: ".//div[@class='dlit']" } }, view: { related: !0, eval: 'const match = html.match(/data-c="([^"]+)"/);if (!match) return null;const e = match[1].split(\';\');const videoId = parseInt(e[4]) || 0;const folder = 1000 * Math.floor(videoId / 1000);const qualitySuffix = e[1] === "720p" ? "" : "_" + e[1];return `https://${e[7]}.vstor.top/whlvid/${e[5]}/${e[6]}/${folder}/${videoId}/${videoId}${qualitySuffix}.mp4/${videoId}${qualitySuffix}.mp4`;' } },
    // --- VtraheTV ---
    { enable: !0, displayname: "VtraheTV", host: "https://my.vtrahe.work", menu: { route: { sort: "{host}/{sort}/page/{page}/", cat: "{host}/{cat}/page/{page}/" }, sort: { "Новинки": "", "Рейтинговое": "top", "Популярнаe": "most-popular" }, categories: { "Русское": "russkoye", "Анал": "anal", "Зрелые": "zrelyye", "Мамки": "mamki" } }, list: { uri: "page/{page}/" }, search: { uri: "search/{search}/page/{page}/" }, contentParse: { nodes: "//div[@class='innercont']", name: { node: ".//div[@class='preview_title']//a" }, href: { node: ".//a", attribute: "href" }, img: { node: ".//img", attribute: "src" }, duration: { node: ".//div[@class='dlit']" } }, view: { related: !0, eval: "const match = html.match(/data-c=\"([^\"]+)\"/);if (!match) return null;const e = match[1].split(';');return `https://v${e[7]}.cdnde.com/x${e[7]}/upload_${e[0].replace(/^_/, '')}/${e[4]}/JOPORN_NET_${e[4]}_${e[1]}.mp4?time=${e[5]}`;" } },

    // ============================================================
    // [SOURCE: TrahKino] v1.1.0 — добавлен в v1.1.0
    // fallback_host: null (зарезервировано — вставить домен-зеркало)
    // ============================================================
    {
      enable: !0,
      displayname: "TrahKino",
      host: "https://trahkino.me",
      // [FALLBACK_SLOT] fallback_host: "https://MIRROR.trahkino.me", // раскомментировать при смене домена
      menu: {
        route: {
          sort: "{host}/{sort}/{page}/",
          cat: "{host}/categories/{cat}/{page}/"
        },
        sort: {
          "Новое": "latest-updates",
          "Лучшее": "top-rated",
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
          "МЖМ": "mjm", "Раком": "rakom", "Дрочка члена": "drochka-chlena",
          "Жесть": "jest", "На кровати": "na-krovati", "Реальное": "realnyy-seks",
          "Женский оргазм": "jenskiy-orgazm", "В нижнем белье": "v-nijnem-bele",
          "Японки": "yaponki", "Домашнее": "domashka", "Full HD": "full-hd",
          "Жёны": "jeny", "В чулках": "v-chulkah", "На каблуках": "na-kablukah",
          "В очках": "v-ochkah", "Толстушки": "tolstye", "В ванной": "v-vannoy",
          "Ролевые игры": "rolevye-igry", "Пьяные": "pyanye", "Стриптиз": "striptiz",
          "Мультики": "multiki", "В туалете": "v-tualete"
        }
      },
      list: { uri: "latest-updates/{page}/", firstpage: "{host}" },
      search: { uri: "search/{page}/?q={search}" },
      contentParse: {
        nodes: "//div[contains(@class,'item')]",
        name: { node: ".//strong[contains(@class,'title')]" },
        href: { node: ".//a", attribute: "href" },
        img: { node: ".//img", attributes: ["data-original", "data-src", "src"] },
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

    // ============================================================
    // [SOURCE: UkDevilz] v1.2.0 — добавлен в v1.2.0
    // fallback_host: null (зарезервировано — вставить домен-зеркало)
    // Сайт: https://w0w.ukdevilz.com/now
    // Структура: NoodleMagazine-подобная (pagination ?p=N, поиск /video/QUERY)
    // ============================================================
    {
      enable: !0,
      displayname: "UkDevilz",
      host: "https://w0w.ukdevilz.com",
      // [FALLBACK_SLOT] fallback_host: "https://MIRROR.ukdevilz.com", // раскомментировать при смене домена
      menu: {
        route: {
          sort: "{host}/{sort}?p={page}"
        },
        sort: {
          "Новинки": "",
          "Популярное": "popular"
        }
      },
      list: { uri: "now?p={page}" },
      search: { uri: "video/{search}?p={page}" },
      contentParse: {
        nodes: "//div[contains(@class, 'item')]",
        name: { node: ".//div[@class='title'] | .//h3 | .//a[@class='title']" },
        href: { node: ".//a", attribute: "href" },
        img: { node: ".//img", attribute: "data-src" },
        duration: { node: ".//div[@class='m_time'] | .//span[@class='time'] | .//div[contains(@class,'duration')]" },
        preview: { node: ".//div", attribute: "data-trailer_url" }
      },
      view: {
        related: !0,
        regexMatch: {
          pattern: '"file":"([^"]+)"'
        }
      }
    }

    // ============================================================
    // [FALLBACK_NEW_SOURCE_SLOT]
    // Для добавления нового источника — вставить запятую после
    // закрывающей скобки } выше и добавить новый объект-конфиг здесь.
    // Следуйте инструкции в README.md -> Раздел 3: Шаблон конфига.
    // ============================================================

  ]; // конец массива P

  // ============================================================
  // [BLOCK:13:END]

  // [BLOCK:14:START] ROUTING — создание экземпляров и window.AdultJS
  // ============================================================
  var z = new d, L = new g, j = new y, M = new v, T = new b, A = new f, I = new S(P);

  // ============================================================
  // [SECTION: ROUTING & WINDOW.ADULTJS] v1.0.0
  // ============================================================
  !function () {
    function e() {
      return (e = _asyncToGenerator(_regenerator().m(function e(t) {
        var a, n, r;
        return _regenerator().w(function (e) {
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
              if (a = new URL(t), !(n = P.find(function (e) {
                return e.enable && a.hostname === new URL(e.host).hostname
              }))) { e.n = 16; break }
              return r = "nexthub://".concat(n.displayname, "?mode=view&href=")
                .concat(encodeURIComponent(t)), e.n = 15, I.Invoke(r);
            case 16:
              return e.a(2, "unknown site")
          }
        }, e)
      }))).apply(this, arguments)
    }

    // ----------------------------------------------------------
    // [STATUS_STORE] v1.3.0 — хранилище статусов источников
    // Ключ: имя источника (строчными буквами)
    // Значение: "green" | "yellow" | "red"
    // Изначально все источники — "green"
    // Обновляется модулем AdultJS_Debugger после runAll()
    // ----------------------------------------------------------
    window.AdultJS_Status = window.AdultJS_Status || (function () {
      var _store = {};

      // Значок для каждого статуса
      var _dot = {
        green:  "🟢",
        yellow: "🟡",
        red:    "🔴"
      };

      return {
        // Установить статус источника
        set: function (name, status) {
          _store[name.toLowerCase()] = status;
        },
        // Получить значок для отображения рядом с названием
        dot: function (name) {
          var s = _store[name.toLowerCase()];
          // Если статус не установлен — считаем зелёным (не проверялся)
          return _dot[s] || _dot.green;
        },
        // Получить текущий статус (green/yellow/red)
        get: function (name) {
          return _store[name.toLowerCase()] || "green";
        },
        // Сбросить все статусы (например, перед новой проверкой)
        reset: function () {
          _store = {};
        }
      };
    })();

    window.AdultJS = {
      Menu: function () {
        var e = [
          // --------------------------------------------------
          // [STATUS_IN_MENU] v1.3.0 — значок статуса в заголовке
          // Формат: "🟢 xvideos.com"
          // --------------------------------------------------
          { title: window.AdultJS_Status.dot("xvideos.com")    + " xvideos.com",    playlist_url: g.host },
          { title: window.AdultJS_Status.dot("spankbang.com")  + " spankbang.com",  playlist_url: v.host },
          { title: window.AdultJS_Status.dot("eporner.com")    + " eporner.com",    playlist_url: f.host },
          { title: window.AdultJS_Status.dot("xnxx.com")       + " xnxx.com",       playlist_url: y.host },
          { title: window.AdultJS_Status.dot("bongacams.com")  + " bongacams.com",  playlist_url: d.host },
          { title: window.AdultJS_Status.dot("chaturbate.com") + " chaturbate.com", playlist_url: b.host }
        ];
        P.filter(function (e) { return e.enable }).forEach(function (t) {
          var name = t.displayname.toLowerCase();
          e.push({
            title:        window.AdultJS_Status.dot(name) + " " + name,
            playlist_url: "nexthub://".concat(t.displayname, "?mode=list")
          });
        });
        // --------------------------------------------------------
        // [DEBUG_MENU_ITEM] v1.2.0-debug — кнопка диагностики
        // Последний пункт меню выбора сайтов.
        // Для отката: удалить этот блок e.push({...}) до return e
        // --------------------------------------------------------
        e.push({
          title: "📝 Диагностика источников",
          playlist_url: "__adultjs_debug__",
          debug_action: true
        });
        return e
      },
      Invoke: function (t) { return e.apply(this, arguments) }
    };
  }();

  // ============================================================
// [BLOCK:14:END]

  // [BLOCK:15:START] DEBUG_MODULE — модуль диагностики AdultJS_Debugger
  // Для отката к версии без отладки:
  //   1) Удалить блок [DEBUG_MENU_ITEM]    — e.push в window.AdultJS.Menu
  //   2) Удалить блок [DEBUG_MENU_HANDLER] — if (t.debug_action) в onSelect
  //   3) Удалить весь блок от этой строки до [DEBUG_MODULE_END]
  //   4) Сохранить файл как AdultJS.txt (без -debug суффикса)
  // ============================================================
  window.AdultJS_Debugger = (function () {

    var TIMEOUT_MS = 8000;

    // Список всех источников для проверки:
    // hardcoded (BongaCams, XVideos, XNXX, SpankBang, Chaturbate, EPorner)
    // + все nexthub-источники из массива P
    function getAllSources() {
      var fixed = [
        { name: "bongacams.com",  url: d.host },
        { name: "xvideos.com",    url: g.host },
        { name: "xnxx.com",       url: y.host },
        { name: "spankbang.com",  url: v.host },
        { name: "chaturbate.com", url: b.host },
        { name: "eporner.com",    url: f.host }
      ];
      var nexthub = P.filter(function(cfg) { return cfg.enable; }).map(function(cfg) {
        return { name: cfg.displayname, url: cfg.host };
      });
      return fixed.concat(nexthub);
    }

    // Показать уведомление на TV через Lampa.Noty (только Noty, без console)
    function notify(msg) {
      try { Lampa.Noty.show(msg); } catch(e) {}
    }


    // Проверка доступности одного источника (GET первой страницы)
    // Возвращает Promise<{name, ok, cards, error}>
    function checkSource(sourceObj) {
      var name = sourceObj.name;
      var url = sourceObj.url;

      // Для nexthub-источников строим реальный URL первой страницы
      var testUrl = url;
      if (url.startsWith("nexthub://")) {
        // Ищем конфиг в P по displayname
        var cfg = P.find(function(c) {
          return ("nexthub://" + c.displayname) === url
              || c.displayname.toLowerCase() === name.toLowerCase();
        });
        if (cfg && cfg.list) {
          var uri = cfg.list.firstpage || cfg.list.uri || "";
          testUrl = uri
            .replace("{host}", cfg.host)
            .replace("{page}", "1")
            .replace("{sort}", "")
            .replace("{cat}", "");
          if (!testUrl.startsWith("http")) {
            testUrl = cfg.host.replace(/\/?$/, "/") + testUrl.replace(/^\//, "");
          }
        } else {
          testUrl = ""; // не можем определить
        }
      }

      if (!testUrl || testUrl === "") {
        return Promise.resolve({ name: name, ok: false, cards: 0, error: "Не удалось определить URL" });
      }

      return new Promise(function(resolve) {
        var timer = setTimeout(function() {
          resolve({ name: name, ok: false, cards: 0, error: "Таймаут " + TIMEOUT_MS + "мс" });
        }, TIMEOUT_MS);

        fetch(testUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
          }
        })
        .then(function(resp) {
          clearTimeout(timer);
          if (!resp.ok) {
            resolve({ name: name, ok: false, cards: 0, error: "HTTP " + resp.status });
            return;
          }
          return resp.text().then(function(html) {
            // Считаем количество карточек по признаку наличия тегов с ссылками на видео
            // Простая эвристика: ищем href="/video" или data-src= в тексте
            var cardCount = 0;
            try {
              var cfg2 = P.find(function(c) { return c.displayname.toLowerCase() === name.toLowerCase(); });
              if (cfg2 && cfg2.contentParse && cfg2.contentParse.nodes) {
                var doc = (new DOMParser()).parseFromString(html, "text/html");
                var nodes = doc.evaluate(
                  cfg2.contentParse.nodes, doc, null,
                  XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null
                );
                cardCount = nodes.snapshotLength;
              } else {
                // fallback: считаем вхождения data-src=
                var matches = html.match(/data-src=/g);
                cardCount = matches ? matches.length : 0;
              }
            } catch(ex) {
              cardCount = -1;
            }
            resolve({ name: name, ok: true, cards: cardCount, error: null });
          });
        })
        .catch(function(err) {
          clearTimeout(timer);
          resolve({ name: name, ok: false, cards: 0, error: err.message || "Ошибка сети" });
        });
      });
    }

    // --------------------------------------------------------
    // Очередь уведомлений с паузой NOTIFY_PAUSE_MS между ними.
    // Гарантирует что каждое Lampa.Noty успевает отобразиться
    // и не перекрывается следующим мгновенно.
    // --------------------------------------------------------
    // Пауза между сообщениями: 3 сек
    // Пауза после последнего (чтобы успеть прочитать): 5 сек
    // Lampa.Noty не имеет встроенного параметра времени показа,
    // поэтому последнее сообщение висит пока пользователь не
    // нажмёт кнопку или пока Lampa сама не скроет Noty.
    // Задержка 5 сек гарантирует что следующих вызовов нет.
    var NOTIFY_PAUSE_MS  = 3000;
    var NOTIFY_LAST_MS   = 5000;

    function notifyQueue(messages) {
      if (!messages || messages.length === 0) return;
      var i = 0;
      function showNext() {
        if (i >= messages.length) return;
        var item = messages[i];
        var isLast = (i === messages.length - 1);
        i++;
        try { Lampa.Noty.show(item.text); } catch(e) {}
        // После последнего — пауза 5 сек, между остальными — 3 сек
        setTimeout(showNext, isLast ? NOTIFY_LAST_MS : NOTIFY_PAUSE_MS);
      }
      showNext();
    }

    // Запуск диагностики всех источников последовательно
    function runAll() {
      var sources = getAllSources();
      var total = sources.length;
      var idx = 0;
      var results = [];

      notify("🔍 Диагностика AdultJS: проверяем " + total + " источников...");

      function checkNext() {
        if (idx >= total) {
          var ok     = results.filter(function(r) { return r.ok; });
          var failed = results.filter(function(r) { return !r.ok; });
          var warned = results.filter(function(r) { return r.ok && r.cards >= 0 && r.cards < 3; });

          // --------------------------------------------------
          // Сообщение A: итоговая сводка одной строкой
          // --------------------------------------------------
          var summary = "✅ Готово: " + ok.length + " OK"
            + (failed.length ? " | ❌ " + failed.length + " ошибок"         : "")
            + (warned.length ? " | ⚠️ "  + warned.length + " предупреждений" : "")
            + " (всего: " + total + ")";

          // --------------------------------------------------
          // Сообщение B: все ошибки + предупреждения одним блоком
          // Формируется только если есть что показывать
          // --------------------------------------------------
          var detailLines = [];
          failed.forEach(function(r) {
            detailLines.push("❌ " + r.name + ": " + r.error);
          });
          warned.forEach(function(r) {
            detailLines.push("⚠️ " + r.name + ": мало карточек (" + r.cards + ") — проблема парсинга");
          });

          // --------------------------------------------------
          // Очередь: [A] сводка → пауза 3 сек → [B] детали
          // Lampa.Noty.show не имеет встроенного timeout API,
          // поэтому используем notifyQueue с NOTIFY_PAUSE_MS.
          // Последнее сообщение висит 5 сек (NOTIFY_LAST_MS)
          // за счёт того что после него нет следующего вызова.
          // --------------------------------------------------
          var queue = [{ text: summary }];
          if (detailLines.length > 0) {
            queue.push({ text: detailLines.join("\n") });
          }

          notifyQueue(queue);
          return;
        }

        // Во время проверки TV не засоряем — тихая обработка
        var src = sources[idx];
        idx++;

        checkSource(src).then(function(result) {
          results.push(result);
          checkNext();
        });
      }

      checkNext();
    }


    // Публичный API модуля отладки
    return {
      runAll: runAll,
      checkSource: checkSource,
      getAllSources: getAllSources
    };

  })();
  // ============================================================
  // [DEBUG_MODULE_END] AdultJS_Debugger v1.2.0-debug
  // [BLOCK:15:END]
  // ============================================================

}();

