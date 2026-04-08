// =============================================================
// xds.js — ЗАГЛУШКА-ТЕСТ для проверки взаимодействия AdultJS ↔ парсеры
// Version  : 1.0.0
// Changed  : [1.0.0] Тестовая заглушка вместо реального xds-парсера.
//            Генерирует 12 карточек из публичных источников без CORS:
//              - Картинки: picsum.photos (seed-фото, HTTPS, no-CORS)
//              - Видео:    commondatastorage.googleapis.com (публичные .mp4)
//            Не делает сетевых запросов — данные захардкожены.
//            Цель: подтвердить что цепочка
//              menu.json → loadParser('xds') → registerParser →
//              Parsers['xds'] → view() → success(data) → Lampa UI
//            работает корректно ДО подключения реального парсера.
//
// УДАЛИТЬ: когда будет готов настоящий парсер xds.
// =============================================================

(function () {
  'use strict';

  var NAME = 'xds';

  // ----------------------------------------------------------
  // [1.0.0] ТЕСТОВЫЕ ДАННЫЕ
  // 12 публичных .mp4 — Google Storage, без авторизации и CORS
  // ----------------------------------------------------------
  var VIDEOS = [
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',              title: 'Big Buck Bunny',          dur: '9:56'  },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',             title: 'Elephants Dream',         dur: '10:54' },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',            title: 'For Bigger Blazes',       dur: '0:15'  },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',           title: 'For Bigger Escapes',      dur: '0:15'  },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',               title: 'For Bigger Fun',          dur: '0:15'  },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',          title: 'For Bigger Joyrides',     dur: '0:15'  },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',         title: 'For Bigger Meltdowns',    dur: '0:15'  },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Subaru_Outback_On_Street_And_Dirt.mp4', title: 'Subaru Outback',   dur: '5:30'  },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',               title: 'Tears of Steel',          dur: '12:14' },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',        title: 'Volkswagen GTI Review',   dur: '0:14'  },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',        title: 'We Are Going On Bullrun', dur: '0:14'  },
    { url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',  title: 'What Car For A Grand',    dur: '0:14'  },
  ];

  // ----------------------------------------------------------
  // [1.0.0] ГЕНЕРАТОР КАРТОЧЕК
  // picsum.photos/seed/{N}/320/180 — детерминированные картинки по seed,
  // не меняются, HTTPS, нет CORS.
  // ----------------------------------------------------------
  function makeCards(count, offset) {
    offset = offset || 0;
    var cards  = [];
    var suffix = offset > 0 ? ' [стр.' + (Math.floor(offset / 12) + 1) + ']' : '';
    for (var i = 0; i < count; i++) {
      var idx  = (offset + i) % VIDEOS.length;
      var v    = VIDEOS[idx];
      var seed = 200 + offset + i;  // seed 200+ чтобы не пересекаться с другими парсерами
      cards.push({
        name:    'TEST #' + (offset + i + 1) + ' — ' + v.title + suffix,
        video:   v.url,
        picture: 'https://picsum.photos/seed/' + seed + '/320/180',
        preview: null,
        time:    v.dur,
        quality: '1080p',
        json:    false,   // прямая ссылка, второй запрос не нужен
        related: false,
        model:   null,
        source:  NAME,
      });
    }
    return cards;
  }

  // ----------------------------------------------------------
  // [1.0.0] МЕНЮ ФИЛЬТРА — тестовое
  // ----------------------------------------------------------
  function buildMenu() {
    return [{
      title:        'Категория: Все',
      playlist_url: 'submenu',
      submenu: [
        { title: '[TEST] Все',      playlist_url: 'xds://test/all'   },
        { title: '[TEST] Короткие', playlist_url: 'xds://test/short' },
        { title: '[TEST] Длинные',  playlist_url: 'xds://test/long'  },
      ],
    }];
  }

  // ----------------------------------------------------------
  // [1.0.0] ПУБЛИЧНЫЙ ИНТЕРФЕЙС
  //
  // success() через setTimeout(0) — асинхронная семантика,
  // Lampa не ожидает синхронного вызова колбэка.
  // ----------------------------------------------------------
  var XdsStub = {

    main: function (params, success, error) {
      console.log('[xds-stub] main()');
      setTimeout(function () {
        success({
          results:     makeCards(12, 0),
          collection:  true,
          total_pages: 3,
          menu:        buildMenu(),
        });
      }, 0);
    },

    view: function (params, success, error) {
      var page   = parseInt(params.page, 10) || 1;
      var offset = (page - 1) * 12;
      console.log('[xds-stub] view() page=' + page + ' url=' + (params.url || ''));
      setTimeout(function () {
        success({
          results:     makeCards(12, offset),
          collection:  true,
          total_pages: 3,
          menu:        buildMenu(),
        });
      }, 0);
    },

    search: function (params, success, error) {
      var query = params.query || '';
      console.log('[xds-stub] search() query=' + query);
      setTimeout(function () {
        var results = makeCards(4, 0).map(function (c, i) {
          c.name = 'ПОИСК[' + query + '] #' + (i + 1) + ' — ' + VIDEOS[i].title;
          return c;
        });
        success({
          title:       'xds: ' + query,
          results:     results,
          url:         'xds://test/search?q=' + encodeURIComponent(query),
          collection:  true,
          total_pages: 1,
        });
      }, 0);
    },
  };

  // ----------------------------------------------------------
  // [1.0.0] РЕГИСТРАЦИЯ с polling + Lampa-уведомление
  // ----------------------------------------------------------
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, XdsStub);
      console.log('[xds-stub] v1.0.0 registered — TEST STUB ACTIVE');
      // Показываем напоминание что это заглушка
      try {
        setTimeout(function () {
          Lampa.Noty.show('xds: тестовая заглушка v1.0.0', { time: 2500 });
        }, 500);
      } catch (e) {}
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
