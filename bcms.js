// =============================================================
// bcms.js — Парсер BongaCams для AdultJS / AdultPlugin (Lampa)
// Version  : 1.0.0
// Changed  : [1.0.0] Первая автономная версия.
//            Источник логики: AdultJS_debug_v1.3.2 [BLOCK:06]
//            Адаптирован для подключения через window.AdultPlugin.registerParser
//            (архитектура проекта lampa-plugin на GitHub Pages)
//            Поддерживает ОБА хоста проекта:
//              - AdultJS (старый)  → window.AdultJS.registerSource
//              - AdultPlugin (новый) → window.AdultPlugin.registerParser
// GitHub   : https://denis-tikhonov.github.io/lampa-plugin/bcms.js
//
// ПОДКЛЮЧЕНИЕ в menu.json:
// {
//   "title": "BongaCams",
//   "playlist_url": "https://denis-tikhonov.github.io/lampa-plugin/bcms"
// }
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // [1.0.0] КОНФИГУРАЦИЯ
  // ----------------------------------------------------------
  var HOST    = 'https://ukr.bongacams.com';
  var NAME    = 'bcms';
  var DISPLAY = 'BongaCams';

  // [1.0.0] Статичный список категорий (разделы сайта)
  // Соответствует Menu() из оригинального [BLOCK:06]
  var CATEGORIES = [
    { title: 'Новые',          url: HOST + '/new-models'          },
    { title: 'Пары',           url: HOST + '/couples'             },
    { title: 'Девушки',        url: HOST + '/female'              },
    { title: 'Русские модели', url: HOST + '/female/tags/russian' },
    { title: 'Парни',          url: HOST + '/male'                },
    { title: 'Транссексуалы',  url: HOST + '/trans'               },
  ];

  // ----------------------------------------------------------
  // [1.0.0] HTTP-ХЕЛПЕР
  // Повторяет логику HttpHelper.Get из [BLOCK:04]:
  //   - на Android TV → Lampa.Reguest.native (нативный запрос без CORS)
  //   - иначе → window.fetch с User-Agent
  // ----------------------------------------------------------
  var Http = {

    UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/130.0.0.0 Safari/537.36',

    isAndroid: (function () {
      try {
        return typeof window !== 'undefined' &&
               window.Lampa &&
               window.Lampa.Platform &&
               typeof window.Lampa.Platform.is === 'function' &&
               window.Lampa.Platform.is('android');
      } catch (e) { return false; }
    })(),

    // [1.0.0] Нативный запрос через Lampa (Android TV, без CORS-ограничений)
    native: function (url) {
      return new Promise(function (resolve, reject) {
        var req = new window.Lampa.Reguest();
        req.native(
          url,
          function (data) {
            resolve(typeof data === 'object' ? JSON.stringify(data) : data);
            req.clear();
          },
          reject,
          false,
          {
            dataType: 'text',
            timeout:  8000,
            headers:  { 'User-Agent': Http.UA },
          }
        );
      });
    },

    // [1.0.0] Обычный fetch (браузер / эмулятор)
    fetch: function (url) {
      return fetch(url, {
        method:  'GET',
        headers: { 'User-Agent': Http.UA },
      }).then(function (r) { return r.text(); });
    },

    // [1.0.0] Точка входа: выбирает native или fetch
    get: function (url) {
      if (Http.isAndroid) return Http.native(url);
      return Http.fetch(url);
    },
  };

  // ----------------------------------------------------------
  // [1.0.0] ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ extract
  // Аналог RegexHelper.extract из [BLOCK:05]
  // ----------------------------------------------------------
  function extract(str, regex, group) {
    if (!str) return null;
    var g   = (group === undefined) ? 1 : group;
    var m   = str.match(regex);
    var val = (m && m[g] !== undefined && m[g] !== null) ? m[g] : null;
    return (val && val.trim() !== '') ? val.trim() : null;
  }

  // ----------------------------------------------------------
  // [1.0.0] НОРМАЛИЗАЦИЯ URL ПАГИНАЦИИ
  // BongaCams использует ?page=N, Lampa добавляет ?pg=N / &pg=N.
  // Логика из Invoke() оригинального [BLOCK:06]:
  //   t.replace("?pg=1", "").replace("pg=", "page=")
  // ----------------------------------------------------------
  function normalizeUrl(url) {
    return url
      .replace('?pg=1', '')   // первая страница — убираем параметр
      .replace('pg=', 'page='); // последующие — переименовываем
  }

  // ----------------------------------------------------------
  // [1.0.0] ОПРЕДЕЛЕНИЕ АКТИВНОЙ КАТЕГОРИИ
  // Находит заголовок текущей категории для отображения в фильтре.
  // ----------------------------------------------------------
  function activeCategoryTitle(url) {
    var found = CATEGORIES.find(function (cat) {
      // Сравниваем хвост URL без хоста
      var tail = cat.url.replace(HOST, '').replace(/^\//, '');
      return tail && url.includes(tail);
    });
    return found ? found.title : 'Новые';
  }

  // ----------------------------------------------------------
  // [1.0.0] ПАРСЕР КАРТОЧЕК (Playlist)
  // Источник: BongaCams.Playlist() из [BLOCK:06] строки 813–834
  //
  // Структура HTML BongaCams:
  //   Блоки камер разделяются по CSS-классу:
  //     "ls_thumb js-ls_thumb"   — обычный список
  //     "mls_item mls_so_"       — мобильный список
  //
  // Из каждого блока извлекаем:
  //   data-chathost → имя модели (используется в HLS URL)
  //   data-esid     → ID CDN-сервера (используется в HLS URL)
  //   src/this.src  → картинка превью
  //   lst_topic     → тема стрима (название карточки)
  //   CSS-классы    → метка качества HD / HD+
  //
  // HLS-ссылка собирается по шаблону из оригинала:
  //   https://{esid}.bcvcdn.com/hls/stream_{chathost}/public-aac/stream_{chathost}/chunks.m3u8
  // ----------------------------------------------------------
  function parsePlaylist(html) {
    var cards = [];
    if (!html || html.length === 0) return cards;

    // Разбиваем HTML по маркеру блока камеры (два варианта CSS-класса)
    var parts = html.split(/class="(ls_thumb js-ls_thumb|mls_item mls_so_)"/);

    for (var i = 0; i < parts.length; i++) {
      var block = parts[i];

      // [1.0.0] Имя модели — ключ для HLS URL
      var chathost = extract(block, /data-chathost="([^"]+)"/);
      if (!chathost) continue;

      // [1.0.0] ID CDN-сервера — вторая часть HLS URL
      var esid = extract(block, /data-esid="([^"]+)"/);
      if (!esid) continue;

      // [1.0.0] Картинка превью:
      //   Сначала пробуем JS-присваивание (this.src='//...'),
      //   если не найдено — обычный атрибут src="//..."
      var picture = extract(block, /this\.src='\/\/([^']+\.jpg)'/);
      if (!picture) picture = extract(block, /src="\/\/([^"]+)"/);
      if (!picture) continue;

      // [1.0.0] Название: тема стрима или имя модели как fallback
      var name = extract(block, /lst_topic lst_data">(.*?)</);
      if (!name) name = chathost;

      // [1.0.0] Метка качества из CSS-класса блока
      var quality = null;
      if (block.indexOf('__hd_plus __rt') !== -1)  quality = 'HD+';
      else if (block.indexOf('__hd __rtl') !== -1) quality = 'HD';

      // [1.0.0] Собираем HLS-ссылку по шаблону из оригинала [BLOCK:06]
      var videoUrl = 'https://' + esid + '.bcvcdn.com/hls/stream_' + chathost
                   + '/public-aac/stream_' + chathost + '/chunks.m3u8';

      cards.push({
        name:    name,
        video:   videoUrl,        // прямая HLS-ссылка .m3u8
        picture: 'https://' + picture,
        preview: null,            // live-стрим — нет записанного превью
        time:    null,            // live — нет длительности
        quality: quality,         // "HD" / "HD+" / null
        json:    false,           // ссылка уже прямая, второй запрос не нужен
        related: false,           // нет раздела "похожие"
        model:   null,            // нет отдельной страницы модели
        source:  NAME,            // маркер источника для закладок
      });
    }

    return cards;
  }

  // ----------------------------------------------------------
  // [1.0.0] МЕНЮ ФИЛЬТРА (Menu)
  // Источник: BongaCams.Menu() из [BLOCK:06] строки 836–847
  //
  // Возвращает массив MenuItem:
  //   [{
  //     title:       "Сортировка: Девушки",
  //     playlist_url: "submenu",   ← спец. значение — открывает подменю
  //     submenu:     [...]          ← список категорий
  //   }]
  //
  // Логика определения активного заголовка:
  //   Ищем совпадение хвоста текущего URL с playlist_url категорий
  // ----------------------------------------------------------
  function buildMenu(currentUrl) {
    var submenuItems = CATEGORIES.map(function (cat) {
      return {
        title:        cat.title,
        playlist_url: cat.url,
      };
    });

    var activeTitle = activeCategoryTitle(currentUrl || '');

    return [
      {
        title:        'Сортировка: ' + activeTitle,
        playlist_url: 'submenu',     // Lampa InteractionCategory раскроет подменю
        submenu:      submenuItems,
      },
    ];
  }

  // ----------------------------------------------------------
  // [1.0.0] ПУБЛИЧНЫЙ ИНТЕРФЕЙС ПАРСЕРА
  // Соответствует контракту window.AdultPlugin.registerParser:
  //   main(params, success, error)   — главная страница
  //   view(params, success, error)   — категория + пагинация
  //   search(params, success, error) — BongaCams не поддерживает поиск
  //                                    (нет search_on в Menu)
  // ----------------------------------------------------------
  var BcmsParser = {

    // [1.0.0] Главная — загружаем первую категорию (Новые)
    main: function (params, success, error) {
      var url = CATEGORIES[0].url;
      Http.get(url)
        .then(function (html) {
          var results = parsePlaylist(html);
          if (!results.length) { error('BongaCams: нет карточек на главной'); return; }
          success({
            results:     results,
            collection:  true,
            total_pages: 30,         // BongaCams не сообщает общее число страниц
            menu:        buildMenu(url),
          });
        })
        .catch(function (e) {
          console.error('[bcms] main error:', e);
          error(e);
        });
    },

    // [1.0.0] Просмотр категории с пагинацией
    view: function (params, success, error) {
      // Убираем параметр пагинации Lampa (?pg=N), переименовываем в ?page=N
      // Оригинал: t.replace("?pg=1","").replace("pg=","page=")
      var rawUrl = (params.url || CATEGORIES[0].url)
        .split('&pg=')[0]
        .split('?pg=')[0];
      var page    = parseInt(params.page, 10) || 1;
      var loadUrl = normalizeUrl(
        page > 1
          ? rawUrl + (rawUrl.indexOf('?') !== -1 ? '&' : '?') + 'page=' + page
          : rawUrl
      );

      Http.get(loadUrl)
        .then(function (html) {
          var results = parsePlaylist(html);
          if (!results.length) { error('BongaCams: нет карточек'); return; }
          success({
            results:     results,
            collection:  true,
            // [1.0.0] BongaCams не возвращает total_pages;
            // Отдаём page+5, чтобы Lampa не блокировала пролистывание
            total_pages: page + 5,
            menu:        buildMenu(rawUrl),
          });
        })
        .catch(function (e) {
          console.error('[bcms] view error:', e);
          error(e);
        });
    },

    // [1.0.0] Поиск — BongaCams live-сервис, поиск по стримам не поддерживается.
    // Метод объявлен для совместимости с интерфейсом, всегда возвращает пустой результат.
    search: function (params, success, error) {
      error('BongaCams: поиск не поддерживается');
    },
  };

  // ----------------------------------------------------------
  // [1.0.0] РЕГИСТРАЦИЯ — двойная совместимость
  //
  // Поддерживаем ОБА API одновременно:
  //
  // 1. window.AdultPlugin.registerParser(name, parser)
  //    → новая архитектура (AdultJS.js в lampa-plugin)
  //
  // 2. window.AdultJS (старый встроенный плагин AdultJS_debug_v1.3.2)
  //    → не имеет публичного registerSource, но мы можем добавить
  //      парсер в его внутренний роутер через monkey-patch AdultJS.Invoke.
  //      Этот блок активируется только если AdultPlugin недоступен.
  // ----------------------------------------------------------

  function registerAdultPlugin() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, BcmsParser);
      console.log('[bcms] registered via AdultPlugin.registerParser');
      return true;
    }
    return false;
  }

  function registerAdultJS() {
    if (!window.AdultJS || typeof window.AdultJS.Invoke !== 'function') return false;

    // [1.0.0] Monkey-patch роутера AdultJS.Invoke:
    //   Если URL начинается с HOST — обрабатываем своим парсером,
    //   иначе передаём оригинальному Invoke.
    var _origInvoke = window.AdultJS.Invoke.bind(window.AdultJS);

    window.AdultJS.Invoke = function (url) {
      if (typeof url === 'string' && url.startsWith(HOST)) {
        // Конвертируем params-стиль AdultJS → наш view()
        return new Promise(function (resolve, reject) {
          BcmsParser.view(
            { url: url, page: 1 },
            function (data) { resolve({ list: data.results, menu: data.menu }); },
            reject
          );
        });
      }
      return _origInvoke(url);
    };

    // [1.0.0] Добавляем источник в меню AdultJS (если Menu — функция)
    if (typeof window.AdultJS.Menu === 'function') {
      var _origMenu = window.AdultJS.Menu.bind(window.AdultJS);
      window.AdultJS.Menu = function () {
        var items = _origMenu();
        // Не дублируем, если уже есть
        var exists = items.some(function (i) {
          return i.playlist_url && i.playlist_url.startsWith(HOST);
        });
        if (!exists) {
          var dot = (window.AdultJS_Status && typeof window.AdultJS_Status.dot === 'function')
            ? window.AdultJS_Status.dot('bongacams.com')
            : '🟢';
          // Вставляем перед пунктом диагностики (debug_action) или в конец
          var debugIdx = items.findIndex(function (i) { return i.debug_action; });
          var entry = { title: dot + ' bongacams.com', playlist_url: HOST };
          if (debugIdx !== -1) items.splice(debugIdx, 0, entry);
          else items.push(entry);
        }
        return items;
      };
    }

    console.log('[bcms] registered via AdultJS.Invoke monkey-patch');
    return true;
  }

  // [1.0.0] Пробуем зарегистрироваться немедленно
  if (!registerAdultPlugin()) {
    if (!registerAdultJS()) {
      // Оба API ещё не загружены — ждём, проверяем каждые 100 мс
      var _waitMs    = 0;
      var _waitLimit = 10000; // максимум 10 секунд
      var _waitTimer = setInterval(function () {
        _waitMs += 100;
        if (registerAdultPlugin() || registerAdultJS()) {
          clearInterval(_waitTimer);
          return;
        }
        if (_waitMs >= _waitLimit) {
          clearInterval(_waitTimer);
          console.warn('[bcms] Timeout: neither AdultPlugin nor AdultJS found after 10s');
        }
      }, 100);
    }
  }

})();
