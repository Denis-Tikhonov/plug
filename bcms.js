// =============================================================
// bcms.js — Парсер BongaCams для AdultJS / AdultPlugin (Lampa)
// Version  : 1.1.0
// Changed  : [1.0.0] Первая версия
//            [1.1.0] FIX: Http.isAndroid вычислялся при определении
//                    объекта (до инициализации Lampa.Platform) → всегда
//                    false на Android TV → шёл fetch с User-Agent →
//                    forbidden header → TypeError. Теперь isAndroid
//                    вычисляется лениво внутри Http.get().
//            [1.1.0] FIX: Lampa.Reguest().native() — это не HTTP-метод.
//                    Правильный метод для HTTP-запроса: silent() с
//                    { dataType:'text' }. Метод native() в Lampa.Reguest
//                    предназначен для нативного плеера, не для fetch.
//            [1.1.0] FIX: fallback fetch() — убран запрещённый
//                    заголовок User-Agent (forbidden header).
//            [1.1.0] NOTE: BongaCams может требовать cookies/referer.
//                    Если сайт отдаёт пустую страницу — нужен прокси.
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // [1.0.0] КОНФИГУРАЦИЯ
  // ----------------------------------------------------------
  var HOST    = 'https://ukr.bongacams.com';
  var NAME    = 'bcms';

  var CATEGORIES = [
    { title: 'Новые',          url: HOST + '/new-models'          },
    { title: 'Пары',           url: HOST + '/couples'             },
    { title: 'Девушки',        url: HOST + '/female'              },
    { title: 'Русские модели', url: HOST + '/female/tags/russian' },
    { title: 'Парни',          url: HOST + '/male'                },
    { title: 'Транссексуалы',  url: HOST + '/trans'               },
  ];

  // ----------------------------------------------------------
  // [1.1.0] HTTP-ХЕЛПЕР — исправленная версия
  //
  // БАГ v1.0.0 #1: isAndroid вычислялся в IIFE при определении объекта.
  //   Lampa.Platform ещё не готова → isAndroid = false → fetch с User-Agent
  //   → forbidden header TypeError.
  //   ИСПРАВЛЕНИЕ: вычисляем isAndroid лениво внутри get().
  //
  // БАГ v1.0.0 #2: использовался Lampa.Reguest().native().
  //   native() в Lampa — метод нативного плеера, не HTTP.
  //   ИСПРАВЛЕНИЕ: используем silent() с { dataType:'text' }.
  //
  // БАГ v1.0.0 #3: fallback fetch() имел заголовок User-Agent.
  //   ИСПРАВЛЕНИЕ: убран из fetch().
  // ----------------------------------------------------------
  var Http = {
    get: function (url) {
      // [1.1.0] Ленивая проверка платформы (Lampa уже инициализирована)
      var isAndroid = false;
      try {
        isAndroid = window.Lampa &&
                    window.Lampa.Platform &&
                    typeof window.Lampa.Platform.is === 'function' &&
                    window.Lampa.Platform.is('android');
      } catch (e) {}

      if (isAndroid) {
        // [1.1.0] Android TV: нативный HTTP через Lampa.Reguest.silent
        return new Promise(function (resolve, reject) {
          var req = new window.Lampa.Reguest();
          req.silent(
            url,
            function (data) {
              resolve(typeof data === 'string' ? data : JSON.stringify(data));
              req.clear();
            },
            reject,
            false,
            { dataType: 'text', timeout: 8000 }
          );
        });
      }

      // [1.1.0] Браузер: чистый fetch без запрещённых заголовков
      return fetch(url, { method: 'GET' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.text();
        });
    },
  };

  // ----------------------------------------------------------
  // [1.0.0] ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ extract
  // ----------------------------------------------------------
  function extract(str, regex, group) {
    if (!str) return null;
    var g   = (group === undefined) ? 1 : group;
    var m   = str.match(regex);
    var val = (m && m[g] !== undefined) ? m[g] : null;
    return (val && val.trim() !== '') ? val.trim() : null;
  }

  // ----------------------------------------------------------
  // [1.0.0] НОРМАЛИЗАЦИЯ URL ПАГИНАЦИИ
  // BongaCams: ?page=N; Lampa добавляет: ?pg=N / &pg=N
  // ----------------------------------------------------------
  function normalizeUrl(url) {
    return url.replace('?pg=1', '').replace('pg=', 'page=');
  }

  function activeCategoryTitle(url) {
    var found = CATEGORIES.find(function (cat) {
      var tail = cat.url.replace(HOST, '').replace(/^\//, '');
      return tail && url.includes(tail);
    });
    return found ? found.title : 'Новые';
  }

  // ----------------------------------------------------------
  // [1.0.0] ПАРСЕР КАРТОЧЕК
  // Источник логики: AdultJS_debug_v1.3.2 [BLOCK:06] BongaCams.Playlist()
  //
  // HTML BongaCams разбивается по CSS-классам блоков камер:
  //   "ls_thumb js-ls_thumb" / "mls_item mls_so_"
  // HLS собирается из data-esid + data-chathost.
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    var cards = [];
    if (!html || !html.length) return cards;

    var parts = html.split(/class="(ls_thumb js-ls_thumb|mls_item mls_so_)"/);

    for (var i = 0; i < parts.length; i++) {
      var block    = parts[i];
      var chathost = extract(block, /data-chathost="([^"]+)"/);
      if (!chathost) continue;

      var esid = extract(block, /data-esid="([^"]+)"/);
      if (!esid) continue;

      var picture = extract(block, /this\.src='\/\/([^']+\.jpg)'/);
      if (!picture) picture = extract(block, /src="\/\/([^"]+)"/);
      if (!picture) continue;

      var name    = extract(block, /lst_topic lst_data">(.*?)</) || chathost;
      var quality = null;
      if (block.indexOf('__hd_plus __rt') !== -1)  quality = 'HD+';
      else if (block.indexOf('__hd __rtl') !== -1) quality = 'HD';

      var videoUrl = 'https://' + esid + '.bcvcdn.com/hls/stream_' + chathost
                   + '/public-aac/stream_' + chathost + '/chunks.m3u8';

      cards.push({
        name:    name,
        video:   videoUrl,
        picture: 'https://' + picture,
        preview: null,
        time:    null,
        quality: quality,
        json:    false,
        related: false,
        model:   null,
        source:  NAME,
      });
    }
    return cards;
  }

  // ----------------------------------------------------------
  // [1.0.0] МЕНЮ ФИЛЬТРА
  // ----------------------------------------------------------
  function buildMenu(currentUrl) {
    return [{
      title:        'Сортировка: ' + activeCategoryTitle(currentUrl || ''),
      playlist_url: 'submenu',
      submenu:      CATEGORIES.map(function (cat) {
        return { title: cat.title, playlist_url: cat.url };
      }),
    }];
  }

  // ----------------------------------------------------------
  // [1.0.0] ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  // ----------------------------------------------------------
  var BcmsParser = {

    main: function (params, success, error) {
      var url = CATEGORIES[0].url;
      Http.get(url)
        .then(function (html) {
          var results = parsePlaylist(html);
          if (!results.length) { error('BongaCams: нет карточек (возможно, требуется cookies)'); return; }
          success({ results: results, collection: true, total_pages: 30, menu: buildMenu(url) });
        })
        .catch(function (e) { console.error('[bcms] main:', e); error(e); });
    },

    view: function (params, success, error) {
      var rawUrl  = (params.url || CATEGORIES[0].url).split('&pg=')[0].split('?pg=')[0];
      var page    = parseInt(params.page, 10) || 1;
      var loadUrl = normalizeUrl(
        page > 1 ? rawUrl + (rawUrl.indexOf('?') !== -1 ? '&' : '?') + 'page=' + page : rawUrl
      );

      Http.get(loadUrl)
        .then(function (html) {
          var results = parsePlaylist(html);
          if (!results.length) { error('BongaCams: нет карточек'); return; }
          success({ results: results, collection: true, total_pages: page + 5, menu: buildMenu(rawUrl) });
        })
        .catch(function (e) { console.error('[bcms] view:', e); error(e); });
    },

    search: function (params, success, error) {
      // BongaCams — live-сервис, поиск не поддерживается
      error('BongaCams: поиск не поддерживается');
    },
  };

  // ----------------------------------------------------------
  // [1.0.0] РЕГИСТРАЦИЯ с polling
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BcmsParser);
      console.log('[bcms] v1.1.0 registered OK');
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var _elapsed = 0;
    var _poll = setInterval(function () {
      _elapsed += 100;
      if (tryRegister() || _elapsed >= 10000) clearInterval(_poll);
    }, 100);
  }

})();
