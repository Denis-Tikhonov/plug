// =============================================================
// AdultJS.js — Lampa Adult Plugin
// Version  : 1.7.5
// Changed  :
//   [1.0.0] Полный рефакторинг с ab2024.ru → GitHub Pages
//   [1.0.0] Убраны: RCH, история, лицензионные проверки
//   [1.0.0] Добавлены: localStorage-закладки, динамические парсеры
//   [1.1.0] Версия плагина выводится в строке названия в настройках
//   [1.1.0] Добавлена кнопка «Сброс плагина» в настройках
//   [1.3.0] Добавлен централизованный AdultPlugin.networkRequest()
//   [1.3.0] Обработка HTTP 403 от Worker + тихий fallback
//   [1.4.0] URL воркера — жёсткая константа WORKER_DEFAULT
//   [1.5.0] BUGFIX: таймаут native 9с, расширенные логи
//   [1.5.1] BUGFIX: полифиллы Array.find/findIndex
//   [1.5.1] BUGFIX: null-guard comp.render(), filterMenu.find → цикл
//   [1.5.3] BUGFIX: Utils.preview.show — полная защита try/catch,
//           guard на target/.find()/.card__view, muted+playsinline на video
//   [1.5.6] Добавление в domainMap: 'rt.pornhub.com', 'top.porno365tube.win',
//           'xv-ru.com'
//   [1.5.7] BUGFIX: vEl.play() Promise rejection — добавлен .catch() для
//           гашения необработанных rejection в консоли Android TV WebView.
//   [1.5.8] BUGFIX: Utils.fixCards — проксирование picture через Worker.
//   [1.5.9] BUGFIX: origFocus guard в View.cardRender и Sisi.onAppend.
//   [1.5.9] BUGFIX: Storage default для sisi_preview.
//   [1.6.0] REFACTOR: domainMap вынесен в константу DOMAIN_MAP,
//           добавлена функция resolveParserName() — устраняет
//           дублирование в Api.view() и Api.search()
//   [1.6.0] BUGFIX: domainMap 'xhamster.com' → 'xham' (было 'hxham')
//   [1.6.0] BUGFIX: Utils.proxyVideoUrl() — проксирование video URL
//           через Worker перед передачей в плеер. Без этого плеер
//           получал get_file URL (требующий 302 → ahcdn.com) напрямую,
//           TV не мог пройти редирект без заголовков → видео не играло.
//   [1.6.0] BUGFIX: все три ветки Utils.play() теперь проксируют
//           video URL через Worker (основная, error-fallback, no-parser)
//   [1.7.0] ОПТИМИЗАЦИЯ: Адаптивные таймауты с учётом истории доменов.
//           Механизм повторных попыток при таймаутах перед fallback.
//           Персистентное кэширование menu.json в Lampa.Storage.
//           Параллельная загрузка источников для главной страницы.
//           LRU-кеш парсеров с автоматической выгрузкой неактивных.
//   [1.7.1] ОПТИМИЗАЦИЯ: исправление ....
//   [1.7.2] BUGFIX: resolveParserName — экранирование точки в regex (/.js$/i → /\.js$/i).
//           BUGFIX: debounce в Sisi для устранения мерцания UI при параллельной загрузке.
//   [1.7.3] NEW проксирование picture через Worker
//   [1.7.4] FIX fixCards: picture/img/poster → Worker + [AdultJS][Poster] debug
//   [1.7.5] Сброс: лёгкий (память) без confirm; полный без закладок + опция закладок
// GitHub   : https://denis-tikhonov.github.io/plug/
// Worker   :
// =============================================================
//   Внимание: Новые источники добавлять в DOMAIN_MAP (одно место)
//             и в ALLOWED_TARGETS Worker
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // КОНСТАНТЫ И КОНФИГУРАЦИЯ
  // ----------------------------------------------------------
  var PLUGIN_ID      = 'adult_lampac';
  var PLUGIN_VERSION = '1.7.5';

  // Константы таймаутов
  var TIMEOUT_CONFIG = {
    NATIVE_BASE:      12000,    // Базовый таймаут native (12 сек)
    NATIVE_MIN:       8000,     // Минимальный таймаут
    NATIVE_MAX:       25000,    // Максимальный таймаут для медленных CDN
    REQUENT_TIMEOUT:  12000,    // Таймаут Reguest
    FETCH_TIMEOUT:    15000,    // Таймаут fetch
    RETRY_DELAY:      1500,     // Задержка перед retry (мс)
    MAX_RETRIES:      2,        // Максимум повторов при таймауте
    DOMAIN_HISTORY_TTL: 3600000,// TTL истории домена (1 час)
  };

  // Конфигурация LRU-кеша парсеров
  var PARSER_CACHE_CONFIG = {
    MAX_PARSERS: 10,            // Максимум загруженных парсеров
    CLEANUP_THRESHOLD: 12,      // Порог очистки
  };

  // ----------------------------------------------------------
  // ПОЛИФИЛЛЫ
  // ----------------------------------------------------------
  if (!Array.prototype.find) {
    Array.prototype.find = function (fn) {
      for (var i = 0; i < this.length; i++) {
        if (fn(this[i], i, this)) return this[i];
      }
      return undefined;
    };
  }
  if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function (fn) {
      for (var i = 0; i < this.length; i++) {
        if (fn(this[i], i, this)) return i;
      }
      return -1;
    };
  }

  var GITHUB_BASE = 'https://denis-tikhonov.github.io/plug/';
  var MENU_URL    = GITHUB_BASE + 'menu.json';
  var READY_FLAG  = 'plugin_' + PLUGIN_ID + '_ready';

  var WORKER_DEFAULT = 'https://zonaproxy.777b737.workers.dev/?url=';

  // Подробный лог прокси постеров в Console: [AdultJS][Poster]
  // false — выключить после проверки
  var ADULT_DEBUG_POSTERS = true;

  var STORAGE_KEYS = [
    'adult_bookmarks_list',
    'sisi_preview',
    'sisi_unic_id',
    'lampac_unic_id',
    'adult_menu_cache',         // [1.7.0] Кэш меню
    'adult_domain_history',     // [1.7.0] История таймаутов по доменам
  ];

  // ----------------------------------------------------------
  // [1.6.0] DOMAIN_MAP — единая карта домен → имя парсера.
  //         Новые источники добавлять ТОЛЬКО ЗДЕСЬ
  //         (+ в ALLOWED_TARGETS Worker).
  // ----------------------------------------------------------
  var DOMAIN_MAP = {
    'pornobriz.com':        'briz',
    'eporner.com':          'epor',
    'yjizz.com':            'yjizz',
    'wes.lenkino.adult':    'lkno',
    'rt.pornhub.com':       'phub',
    'hdtube.porn':          'hdtub',
    'rt.xgroovy.com':       'xgr',
    'xhamster.com':         'xham',
    'eptaporno.com':        'ept',
    'ostroeporno.com':      'ostr',
    'porntop.com':          'ptop',
    'trahkino.me':          'trh',
    'bigtitslust.com':      'btit',
    'pornone.com':          'pone',
    'top.porno365tube.win': 'p365',
    'xv-ru.com':            'xv-ru',
    'ukr.bongacams.com':    'bcms',
    'xds.com':              'xds',
    'ru.anysex.com':        'ansx',
    'ru.mylust.com':        'mlst',
    'xtits.xxx':            'xtit',
    'analdin.com':          'anld',
    'inporn.com':           'iprn',
    'winporn.club':         'vprn',
    'viptube.com':          'vtub',
    'zbporn.com':           'zbrn',
    'sexzoo.net':           'szpn',
    'video-scat.com':       'scpr',
    'ru.faphouse.com':      'fph',
    'retro.huyamba.mobi': 'huyamba',
    'huyamba.mobi':       'huyamba',
    'r17.mixporn.space':  'mixporn',
    'mixporn.space':      'mixporn',
  };

  // [1.6.0] Единая функция разрешения имени парсера по URL.
  function resolveParserName(playlistUrl) {
    var stripped = playlistUrl.replace(GITHUB_BASE, '');
    if (stripped.indexOf('http') === 0 || stripped.indexOf('//') === 0) {
      try {
        var hostname = new URL(playlistUrl).hostname.replace('www.', '');
        return DOMAIN_MAP[hostname] || stripped.split('/')[0];
      } catch (e) {
        return 'briz';
      }
    }
  // ФИКС: убираем query-параметры и расширение .js
  return stripped.split('?')[0].split('/')[0].replace(/\.js$/i, '');

  }

  // ----------------------------------------------------------
  // [1.7.0] УПРАВЛЕНИЕ ТАЙМАУТАМИ И ИСТОРИЕЙ ДОМЕНОВ
  // ----------------------------------------------------------

  /**
   * Получить hostname из URL
   */
  function extractHostname(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch (e) {
      return '';
    }
  }

  /**
   * Загрузить историю домена из storage
   */
  function loadDomainHistory() {
    var raw = Lampa.Storage.get('adult_domain_history', '{}');
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }

  /**
   * Сохранить историю домена в storage
   */
  function saveDomainHistory(history) {
    // Очистка устаревших записей
    var now = Date.now();
    var ttl = TIMEOUT_CONFIG.DOMAIN_HISTORY_TTL;
    for (var host in history) {
      if (history[host].lastUpdate && (now - history[host].lastUpdate) > ttl) {
        delete history[host];
      }
    }
    Lampa.Storage.set('adult_domain_history', JSON.stringify(history));
  }

  /**
   * Рассчитать адаптивный таймаут на основе истории домена
   */
  function getAdaptiveTimeout(url) {
    var hostname = extractHostname(url);
    if (!hostname) return TIMEOUT_CONFIG.NATIVE_BASE;

    var history = loadDomainHistory();
    var domainData = history[hostname];

    if (!domainData || !domainData.avgLatency) {
      return TIMEOUT_CONFIG.NATIVE_BASE;
    }

    // Рассчитываем таймаут как: средняя latency + 3 сигмы + буфер
    var latency = domainData.avgLatency || TIMEOUT_CONFIG.NATIVE_BASE;
    var variance = domainData.variance || 2000;
    var suggestedTimeout = latency + (3 * Math.sqrt(variance)) + 2000;

    // Ограничиваем диапазон
    return Math.max(
      TIMEOUT_CONFIG.NATIVE_MIN,
      Math.min(TIMEOUT_CONFIG.NATIVE_MAX, Math.round(suggestedTimeout))
    );
  }

  /**
   * Обновить статистику домена после успешного запроса
   */
  function updateDomainStats(url, successTime) {
    var hostname = extractHostname(url);
    if (!hostname) return;

    var history = loadDomainHistory();
    if (!history[hostname]) {
      history[hostname] = { samples: [], avgLatency: 0, variance: 0, lastUpdate: 0 };
    }

    var data = history[hostname];
    var sample = Math.min(successTime, 30000); // Ограничиваем выбросы

    data.samples.push(sample);
    if (data.samples.length > 20) {
      data.samples.shift(); // Ограничиваем окно
    }

    // Пересчёт среднего и дисперсии
    var sum = 0;
    for (var i = 0; i < data.samples.length; i++) {
      sum += data.samples[i];
    }
    var newAvg = sum / data.samples.length;

    var varSum = 0;
    for (var j = 0; j < data.samples.length; j++) {
      var diff = data.samples[j] - newAvg;
      varSum += diff * diff;
    }
    var newVariance = data.samples.length > 1 ? varSum / data.samples.length : 0;

    data.avgLatency = Math.round(newAvg);
    data.variance = Math.round(newVariance);
    data.lastUpdate = Date.now();

    saveDomainHistory(history);
    console.log('[AdultJS] Domain stats updated: ' + hostname + ' avg=' + data.avgLatency + 'ms var=' + data.variance);
  }

  // ----------------------------------------------------------
  // ЛОКАЛИЗАЦИЯ
  // ----------------------------------------------------------
  Lampa.Lang.add({
    adult_plugin_name: {
      ru: 'Клубничка', en: 'Strawberry', uk: 'Полуничка', zh: '草莓',
    },
    adult_bookmarks:   { ru: 'Закладки',            en: 'Bookmarks'          },
    adult_add_bm:      { ru: 'Добавить в закладки',  en: 'Add to bookmarks'   },
    adult_del_bm:      { ru: 'Удалить из закладок',  en: 'Remove bookmark'    },
    adult_bm_empty:    { ru: 'Закладки пусты. Удержите ОК на видео для добавления.', en: 'No bookmarks yet. Hold OK on a card to add.' },
    adult_bm_saved:    { ru: 'Сохранено в закладки', en: 'Saved to bookmarks' },
    adult_bm_removed:  { ru: 'Удалено из закладок',  en: 'Removed from bookmarks' },
    adult_reset_light:       { ru: 'Очистить кэш парсеров',                    en: 'Clear parser cache' },
    adult_reset_light_descr: { ru: 'Память и скрипты парсеров, без подтверждения', en: 'Memory and parser scripts, no confirm' },
    adult_reset_light_done:  { ru: 'Кэш парсеров очищен',                      en: 'Parser cache cleared' },
    adult_reset:             { ru: 'Полный сброс',                             en: 'Full reset' },
    adult_reset_descr:       { ru: 'Кэш меню и настройки (закладки по умолчанию сохраняются)', en: 'Menu cache and settings (bookmarks kept by default)' },
    adult_reset_done:        { ru: 'Плагин сброшен (закладки сохранены)',      en: 'Plugin reset (bookmarks kept)' },
    adult_reset_done_bm:     { ru: 'Плагин сброшен, закладки удалены',         en: 'Plugin reset, bookmarks deleted' },
    adult_reset_confirm:     { ru: 'Полный сброс (закладки сохранить)',        en: 'Full reset (keep bookmarks)' },
    adult_reset_confirm_bm:  { ru: 'Полный сброс + удалить закладки',          en: 'Full reset + delete bookmarks' },
    adult_worker_403:      { ru: 'Домен не разрешён в Worker',                  en: 'Domain not allowed in Worker'         },
    adult_worker_fallback: { ru: 'Worker заблокировал домен, прямой запрос...', en: 'Worker blocked domain, direct request...' },
  });

  // ----------------------------------------------------------
  // ЗАКЛАДКИ
  // ----------------------------------------------------------
  var Bookmarks = {
    _key: 'adult_bookmarks_list',

    _load: function () {
      var v = Lampa.Storage.get(this._key, []);
      return Array.isArray ? (Array.isArray(v) ? v : []) : (v && v.length !== undefined ? v : []);
    },
    _save: function (list) { Lampa.Storage.set(this._key, list); },
    all:   function () { return this._load(); },
    has:   function (element) {
      if (!element || !element.video) return false;
      try {
        return this._load().some(function (b) { return b.video === element.video; });
      } catch(e) { return false; }
    },
    add: function (element) {
      var list = this._load();
      if (!this.has(element)) {
        list.unshift({
          video:   element.video,
          name:    element.name,
          picture: element.picture,
          preview: element.preview || '',
          quality: element.quality || '',
          source:  element.source  || '',
        });
        this._save(list);
      }
      Lampa.Noty.show(Lampa.Lang.translate('adult_bm_saved'));
    },
    remove: function (element) {
      var list = this._load().filter(function (b) { return b.video !== element.video; });
      this._save(list);
      Lampa.Noty.show(Lampa.Lang.translate('adult_bm_removed'));
    },
    toggle: function (element) {
      if (this.has(element)) this.remove(element);
      else                    this.add(element);
    },
  };

  // ----------------------------------------------------------
  // СБРОС ПЛАГИНА
  // ----------------------------------------------------------
  // [1.7.5] Лёгкий сброс: только память (парсеры, menuCache). Без confirm.
  function resetLight() {
    menuCache = null;
    Object.keys(Parsers).forEach(function (name) { delete Parsers[name]; });
    parserAccessOrder = [];
    document.querySelectorAll('script[data-adult-parser]').forEach(function (s) {
      if (s.parentNode) s.parentNode.removeChild(s);
    });
    Lampa.Noty.show(Lampa.Lang.translate('adult_reset_light_done'), { time: 2500 });
    console.log('[AdultJS] resetLight, version:', PLUGIN_VERSION);
  }

  // [1.7.5] Полный сброс: кэш меню, история доменов, настройки.
  // clearBookmarks=true — дополнительно стереть adult_bookmarks_list.
  function resetFull(clearBookmarks) {
    resetLight();
    Lampa.Storage.set('adult_menu_cache', null);
    Lampa.Storage.set('adult_domain_history', null);
    Lampa.Storage.set('sisi_preview', null);
    Lampa.Storage.set('sisi_unic_id', null);
    Lampa.Storage.set('lampac_unic_id', null);
    if (clearBookmarks) {
      Lampa.Storage.set('adult_bookmarks_list', null);
    }
    window.adult_settings_ready = false;
    Lampa.Noty.show(
      Lampa.Lang.translate(clearBookmarks ? 'adult_reset_done_bm' : 'adult_reset_done'),
      { time: 3500 }
    );
    console.log('[AdultJS] resetFull bookmarks=' + !!clearBookmarks + ', version:', PLUGIN_VERSION);
  }

  // совместимость со старым именем
  function resetPlugin() {
    resetFull(false);
  }

  // ----------------------------------------------------------
  // [1.7.0] LRU-КЭШ ПАРСЕРОВ
  // ----------------------------------------------------------
  var Parsers = {};
  var parserAccessOrder = []; // Массив имён парсеров в порядке доступа (старые впереди)

  function touchParser(name) {
    var idx = parserAccessOrder.indexOf(name);
    if (idx !== -1) {
      parserAccessOrder.splice(idx, 1);
    }
    parserAccessOrder.push(name);

    // Очистка старых парсеров при превышении лимита
    while (parserAccessOrder.length > PARSER_CACHE_CONFIG.MAX_PARSERS) {
      var oldName = parserAccessOrder.shift();
      if (Parsers[oldName]) {
        console.log('[AdultJS] LRU: unloading parser ' + oldName);
        delete Parsers[oldName];
        // Удаляем script-элемент
        var scripts = document.querySelectorAll('script[data-adult-parser="' + oldName + '"]');
        scripts.forEach(function (s) { s.parentNode.removeChild(s); });
      }
    }
  }

  // ----------------------------------------------------------
  // ЗАГРУЗЧИК ПАРСЕРОВ
  // ----------------------------------------------------------
  function loadParser(name, callback) {
    // Проверяем кэш
    if (Parsers[name]) {
      touchParser(name);
      callback(Parsers[name]);
      return;
    }

    var url    = GITHUB_BASE + name + '.js?v=' + Date.now();
    var script = document.createElement('script');
    script.src = url;
    script.setAttribute('data-adult-parser', name);
    script.onload = function () {
      // Убираем из DOM после загрузки для освобождения памяти
      setTimeout(function () {
        if (script.parentNode) script.parentNode.removeChild(script);
      }, 100);

      touchParser(name);
      if (Parsers[name]) callback(Parsers[name]);
      else console.warn('[AdultJS] Parser not registered after load:', name);
    };
    script.onerror = function () {
      console.error('[AdultJS] Failed to load parser:', url);
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    document.head.appendChild(script);
  }

  // ----------------------------------------------------------
  // [1.7.0] ПЕРСИСТЕНТНОЕ КЭШИРОВАНИЕ МЕНЮ
  // ----------------------------------------------------------
  var menuCache = null;

  function loadMenuCache(callback) {
    var cached = Lampa.Storage.get('adult_menu_cache', null);
    if (cached) {
      try {
        var parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        if (parsed && parsed.channels && parsed.timestamp) {
          var age = Date.now() - parsed.timestamp;
          var maxAge = 3600000; // 1 час
          if (age < maxAge) {
            console.log('[AdultJS] Menu loaded from cache (' + Math.round(age / 1000) + 's old)');
            menuCache = parsed.channels; // <-- ДОБАВЛЕНО: синхронизация глобальной переменной
            callback(parsed.channels);
            return true;
          }
        }
      } catch (e) {
        console.warn('[AdultJS] Cache parse error:', e.message);
      }
    }
    return false;
  }

  function saveMenuCache(channels) {
    Lampa.Storage.set('adult_menu_cache', JSON.stringify({
      channels: channels,
      timestamp: Date.now(),
    }));
    console.log('[AdultJS] Menu cached');
  }

  // ----------------------------------------------------------
  // ЦЕНТРАЛИЗОВАННЫЙ СЕТЕВОЙ ЗАПРОС С ОПТИМИЗАЦИЯМИ
  // ----------------------------------------------------------

  function _ts() {
    var d = new Date();
    return d.getHours() + ':' +
      ('0' + d.getMinutes()).slice(-2) + ':' +
      ('0' + d.getSeconds()).slice(-2) + '.' +
      ('00' + d.getMilliseconds()).slice(-3);
  }

  function _noty(msg, style) {
    try { Lampa.Noty.show(msg, { time: 3000, style: style || '' }); } catch(e) {}
  }

  function getWorkerUrl() {
    var url = WORKER_DEFAULT;
    if (!url) return '';
    if (url.charAt(url.length - 1) !== '=') {
      console.warn('[AdultJS][' + _ts() + '] WORKER_DEFAULT без "=" — добавляю');
      url = url + '=';
    }
    return url;
  }

  /**
   * [1.7.0] Нативный запрос с адаптивными таймаутами и retry
   */
  function _networkNativeWithRetry(url, success, error, attemptNumber) {
    attemptNumber = attemptNumber || 1;
    var adaptiveTimeout = getAdaptiveTimeout(url);
    var timeout = Math.min(adaptiveTimeout, TIMEOUT_CONFIG.NATIVE_MAX);

    if (!window.AdultPlugin ||
        typeof Lampa === 'undefined' ||
        !Lampa.Network ||
        typeof Lampa.Network.native !== 'function') {
      error('native_unavailable');
      return;
    }

    var workerUrl = getWorkerUrl();
    if (!workerUrl) {
      error('worker_not_configured');
      return;
    }

    var fullPath = workerUrl + encodeURIComponent(url);
    var t0   = Date.now();
    var done = false;

    console.log('[AdultJS][' + _ts() + '] native START (attempt ' + attemptNumber + ') → ' +
                fullPath.substring(0, 120) + ' [timeout: ' + timeout + 'ms]');

    var timerId = setTimeout(function () {
      if (done) return;
      done = true;

      // [1.7.0] Retry логика для таймаутов
      if (attemptNumber < TIMEOUT_CONFIG.MAX_RETRIES) {
        console.warn('[AdultJS][' + _ts() + '] native TIMEOUT ' + timeout + 'мс (attempt ' +
                     attemptNumber + ') → retry in ' + TIMEOUT_CONFIG.RETRY_DELAY + 'ms');
        setTimeout(function () {
          _networkNativeWithRetry(url, success, error, attemptNumber + 1);
        }, TIMEOUT_CONFIG.RETRY_DELAY);
        return;
      }

      console.warn('[AdultJS][' + _ts() + '] native TIMEOUT ' + timeout + 'мс after ' +
                   attemptNumber + ' attempts → переход к Reguest');
      error('native_timeout');
    }, timeout);

    try {
      Lampa.Network.native(
        fullPath,
        function (result) {
          if (done) return;
          done = true;
          clearTimeout(timerId);

          var elapsed = Date.now() - t0;
          var text = (typeof result === 'string') ? result : JSON.stringify(result);

          // [1.7.0] Обновляем статистику домена при успехе
          updateDomainStats(url, elapsed);

          if (text && text.indexOf('"status":403') !== -1) {
            console.warn('[AdultJS][' + _ts() + '] native OK но Worker 403 в теле (' + elapsed + 'мс)');
            error('worker_403');
            return;
          }

          if (text && text.length > 50) {
            console.log('[AdultJS][' + _ts() + '] native OK ' + elapsed + 'мс, байт: ' + text.length);
            success(text);
          } else {
            console.warn('[AdultJS][' + _ts() + '] native пустой ответ ' + elapsed + 'мс (' + text.length + ' байт)');
            error('native_empty_response');
          }
        },
        function (e) {
          if (done) return;
          done = true;
          clearTimeout(timerId);

          var elapsed = Date.now() - t0;
          var status  = (e && e.status)  ? e.status  : 0;
          var message = (e && e.message) ? e.message : String(e || 'unknown');

          console.warn('[AdultJS][' + _ts() + '] native FAIL ' + elapsed + 'мс' +
            ' | status=' + status + ' | ' + message);

          if (status === 403 || message.indexOf('403') !== -1) {
            console.warn('[AdultJS][' + _ts() + '] Worker 403: домен не в ALLOWED_TARGETS');
            error('worker_403');
            return;
          }

          error(e || 'native_error');
        },
        false,
        { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
      );
    } catch (ex) {
      if (done) return;
      done = true;
      clearTimeout(timerId);
      console.error('[AdultJS][' + _ts() + '] native исключение: ' + ex.message);
      error(ex.message);
    }
  }

  function _networkReguest(url, success, error) {
    var t0 = Date.now();
    console.log('[AdultJS][' + _ts() + '] Reguest START → ' + url.substring(0, 80));

    try {
      var net = new Lampa.Reguest();
      net.silent(
        url,
        function (data) {
          var elapsed = Date.now() - t0;
          var text = (typeof data === 'string') ? data : '';
          console.log('[AdultJS][' + _ts() + '] Reguest OK ' + elapsed + 'мс, байт: ' + text.length);
          if (text.length > 50) {
            success(text);
          } else {
            console.warn('[AdultJS][' + _ts() + '] Reguest пустой ответ (' + text.length + ' байт)');
            error('reguest_empty');
          }
        },
        function (e) {
          var elapsed = Date.now() - t0;
          var message = (e && e.message) ? e.message : String(e || 'unknown');
          console.warn('[AdultJS][' + _ts() + '] Reguest FAIL ' + elapsed + 'мс | ' + message);
          error(e || 'reguest_error');
        },
        false,
        { dataType: 'text', timeout: TIMEOUT_CONFIG.REQUENT_TIMEOUT }
      );
    } catch (ex) {
      console.error('[AdultJS][' + _ts() + '] Reguest исключение: ' + ex.message);
      error(ex.message);
    }
  }

  function _networkFetch(url, success, error) {
    if (typeof fetch === 'undefined') {
      console.warn('[AdultJS][' + _ts() + '] fetch недоступен в этом окружении');
      error('fetch_unavailable');
      return;
    }
    var t0 = Date.now();
    console.log('[AdultJS][' + _ts() + '] fetch START → ' + url.substring(0, 80));

    var controller = new AbortController();
    var timerId = setTimeout(function () {
      controller.abort();
    }, TIMEOUT_CONFIG.FETCH_TIMEOUT);

    fetch(url, { method: 'GET', signal: controller.signal })
      .then(function (r) {
        clearTimeout(timerId);
        console.log('[AdultJS][' + _ts() + '] fetch HTTP ' + r.status + ' ' + (Date.now()-t0) + 'мс');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) {
        console.log('[AdultJS][' + _ts() + '] fetch OK ' + (Date.now()-t0) + 'мс, байт: ' + text.length);
        success(text);
      })
      .catch(function (e) {
        clearTimeout(timerId);
        if (e.name === 'AbortError') {
          console.warn('[AdultJS][' + _ts() + '] fetch TIMEOUT ' + TIMEOUT_CONFIG.FETCH_TIMEOUT + 'мс');
          error('fetch_timeout');
        } else {
          console.error('[AdultJS][' + _ts() + '] fetch FAIL ' + (Date.now()-t0) + 'мс | ' + (e.message || e));
          error(e);
        }
      });
  }

  function networkRequest(url, success, error) {
    console.log('[AdultJS][' + _ts() + '] networkRequest → ' + url.substring(0, 80));

    _networkNativeWithRetry(url,
      function (text) {
        console.log('[AdultJS][' + _ts() + '] ✅ успех: native+Worker');
        success(text);
      },
      function (e1) {
        var r1 = String(e1 && e1.message ? e1.message : e1);
        console.warn('[AdultJS][' + _ts() + '] native провал (' + r1 + ') → Reguest');

        _networkReguest(url,
          function (text) {
            console.log('[AdultJS][' + _ts() + '] ✅ успех: Reguest');
            success(text);
          },
          function (e2) {
            var r2 = String(e2 && e2.message ? e2.message : e2);
            console.warn('[AdultJS][' + _ts() + '] Reguest провал (' + r2 + ') → fetch');

            _networkFetch(url,
              function (text) {
                console.log('[AdultJS][' + _ts() + '] ✅ успех: fetch');
                success(text);
              },
              function (e3) {
                var r3 = String(e3 && e3.message ? e3.message : e3);
                console.error('[AdultJS][' + _ts() + '] ❌ ВСЕ МЕТОДЫ ПРОВАЛЕНЫ для: ' + url);
                console.error('[AdultJS][' + _ts() + '] native=' + r1 + ' | Reguest=' + r2 + ' | fetch=' + r3);
                error(e3 || 'all_methods_failed');
              }
            );
          }
        );
      }
    );
  }

  // Публичный API
  window.AdultPlugin = window.AdultPlugin || {};
  window.AdultPlugin.registerParser = function (name, parserObj) {
    Parsers[name] = parserObj;
    console.log('[AdultJS] Parser registered:', name);
  };

  console.log('[AdultJS] v' + PLUGIN_VERSION +
    ' worker=' + WORKER_DEFAULT +
    ' debugPosters=' + ADULT_DEBUG_POSTERS);
  window.AdultPlugin.networkRequest = networkRequest;
  Object.defineProperty(window.AdultPlugin, 'workerUrl', {
    get: function () { return WORKER_DEFAULT; },
    enumerable: true,
    configurable: true,
  });

  // ----------------------------------------------------------
  // УТИЛИТЫ
  // ----------------------------------------------------------
  var Utils = {

    sourceTitle: function (title) {
      return Lampa.Utils.capitalizeFirstLetter((title || '').split('.')[0]);
    },
    // [1.5.8][1.7.4] проксирование picture через Worker + лог [AdultJS][Poster]
    fixCards: function (list) {
      if (!list || !list.length) return;
      var workerUrl = (window.AdultPlugin && window.AdultPlugin.workerUrl)
        ? window.AdultPlugin.workerUrl : '';
      if (workerUrl && workerUrl.charAt(workerUrl.length - 1) !== '=') {
        workerUrl = workerUrl + '=';
      }
      list.forEach(function (m) {
        var src = m.picture || m.img || m.poster || m.background_image || '';
        if (workerUrl && src && src.indexOf('http') === 0 &&
            src.indexOf('workers.dev') === -1 && src.indexOf('/?url=') === -1) {
          src = workerUrl + encodeURIComponent(src);
        }
        m.picture = src;
        m.img = src;
        m.poster = src;
        m.background_image = src;
        m.name = Lampa.Utils.capitalizeFirstLetter(m.name || '').replace(/&(.*?);/g, '');
      });
    },

    // [1.6.0] Проксирование video URL через Worker.
    proxyVideoUrl: function (url) {
      if (!url || url.indexOf('http') !== 0) return url;
      var w = (window.AdultPlugin && window.AdultPlugin.workerUrl)
        ? window.AdultPlugin.workerUrl : '';
      if (!w) return url;
      if (w.charAt(w.length - 1) !== '=') w = w + '=';
      if (url.indexOf(w) === 0) return url; // уже проксирован
      return w + encodeURIComponent(url);
    },

    qualityDefault: function (qualities) {
      if (!qualities) return '';
      var prefer = Lampa.Storage.get('video_quality_default', '1080') + 'p';
      var url;
      for (var q in qualities) {
        if (q.indexOf(prefer) === 0) url = qualities[q];
      }
      if (!url) url = qualities[Lampa.Arrays.getKeys(qualities)[0]];
      return url;
    },

    // [1.6.0] Воспроизведение с полным проксированием video URL
    play: function (element) {
      var ctrl = Lampa.Controller.enabled().name;

      if (element.json && element.video && element.source) {
        var parserName = element.source;
        Lampa.Loading.start(function () { Lampa.Loading.stop(); });

        loadParser(parserName, function (parser) {
          if (parser && typeof parser.qualities === 'function') {
            parser.qualities(
              element.video,
              function (data) {
                Lampa.Loading.stop();
                var qualities = data.qualities || data;

                for (var qKey in qualities) {
                  qualities[qKey] = Utils.proxyVideoUrl(qualities[qKey]);
                }

                var video = {
                  title:   element.name,
                  url:     Utils.qualityDefault(qualities) || Utils.proxyVideoUrl(element.video),
                  quality: qualities,
                };
                Lampa.Player.play(video);
                Lampa.Player.playlist([video]);
                Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
              },
              function (e) {
                Lampa.Loading.stop();
                console.warn('[AdultJS] qualities error:', e);
                var video = {
                  title: element.name,
                  url:   Utils.proxyVideoUrl(element.video),
                };
                Lampa.Player.play(video);
                Lampa.Player.playlist([video]);
                Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
              }
            );
          } else {
            Lampa.Loading.stop();
            var video = {
              title: element.name,
              url:   Utils.proxyVideoUrl(element.video),
            };
            Lampa.Player.play(video);
            Lampa.Player.playlist([video]);
            Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
          }
        });
        return;
      }

      if (element.qualities) {
        var proxiedQ = {};
        for (var k in element.qualities) {
          proxiedQ[k] = Utils.proxyVideoUrl(element.qualities[k]);
        }
        var video = {
          title:   element.name,
          url:     Utils.qualityDefault(proxiedQ) || Utils.proxyVideoUrl(element.video),
          quality: proxiedQ,
        };
        Lampa.Player.play(video);
        Lampa.Player.playlist([video]);
      } else {
        var video = {
          title: element.name,
          url:   Utils.proxyVideoUrl(element.video),
        };
        Lampa.Player.play(video);
        Lampa.Player.playlist([video]);
      }
      Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
    },

    menu: function (target, card_data) {
      var hasBm = Bookmarks.has(card_data);
      var ctrl  = Lampa.Controller.enabled().name;

      var items = [
        { title: Lampa.Lang.translate(hasBm ? 'adult_del_bm' : 'adult_add_bm'), bm: true },
      ];

      if (Lampa.Platform.is('android') && Lampa.Storage.field('player') !== 'inner') {
        items.push({ title: 'Плеер Lampa', lampaplayer: true });
      }

      Lampa.Select.show({
        title: 'Меню',
        items: items,
        onSelect: function (m) {
          if (m.bm)               Bookmarks.toggle(card_data);
          else if (m.lampaplayer) Utils.play(card_data);
          Lampa.Controller.toggle('content');
        },
        onBack: function () { Lampa.Controller.toggle('content'); },
      });
    },

    preview: (function () {
      var timer, activeContainer;

      function hide() {
        clearTimeout(timer);
        if (activeContainer) {
          try {
            var vid = activeContainer[0] && activeContainer[0].querySelector('video');
            if (vid) { try { vid.pause(); } catch(e){} }
            activeContainer.addClass('hide');
          } catch(e) {}
          activeContainer = null;
        }
      }

      function show(target, element) {
        hide();
        if (!target || typeof target.find !== 'function') return;
        if (!element || !element.preview) return;

        timer = setTimeout(function () {
          try {
            if (!Lampa.Storage.field('sisi_preview')) return;
            if (!target || !target.length) return;

            var container = target.find('.adult-video-preview');

            if (!container || !container.length) {
              var cardView = target.find('.card__view');
              if (!cardView || !cardView.length) return;

              container = $('<div class="adult-video-preview"></div>').css({
                position:'absolute', width:'100%', height:'100%',
                left:0, top:0, overflow:'hidden', borderRadius:'1em',
              });
              var vid = $('<video muted playsinline></video>').css({
                position:'absolute', width:'100%', height:'100%',
                left:0, top:0, objectFit:'cover',
              });
              if (vid && vid[0]) {
                vid[0].src = element.preview;
                vid[0].addEventListener('ended', function () {
                  try { container.addClass('hide'); } catch(e) {}
                });
                vid[0].load();
              }
              container.append(vid);
              cardView.append(container);
            }

            if (container && container.length) {
              activeContainer = container;
              var vEl = container[0] ? container[0].querySelector('video') : null;
              if (vEl) {
                try {
                  var playPromise = vEl.play();
                  if (playPromise !== undefined && typeof playPromise.then === 'function') {
                    playPromise.catch(function (err) {
                      console.log('[AdultJS] preview play() suppressed: ' + (err.name || err.message || err));
                    });
                  }
                } catch(e) {
                  console.log('[AdultJS] preview play() sync error: ' + (e.message || e));
                }
              }
              container.removeClass('hide');
            }
          } catch(e) {
            console.warn('[AdultJS] preview.show error:', e.message || e);
          }
        }, 1500);
      }

      return { show: show, hide: hide };
    })(),
  };

  // ----------------------------------------------------------
  // API — меню с GitHub + роутинг по парсерам
  // ----------------------------------------------------------
  var Api = {

    menu: function (success, error) {
      // [1.7.0] Проверяем кэш
      if (loadMenuCache(success)) return;

      // Загружаем свежее меню
      var net = new Lampa.Reguest();
      net.silent(
        MENU_URL,
        function (data) {
          if (data && data.channels) {
            menuCache = data.channels;
            saveMenuCache(data.channels);
            success(menuCache);
          } else {
            error('Неверный формат menu.json');
          }
        },
        function () { error('Не удалось загрузить menu.json'); }
      );
    },

    // [1.6.0] REFACTOR: использует resolveParserName()
    view: function (params, success, error) {
      var url = params.url || '';

      if (url === 'local://bookmarks') {
        var list = Bookmarks.all();
        Utils.fixCards(list);
        if (list.length) success({ results: list, collection: true, total_pages: 1 });
        else             error(Lampa.Lang.translate('adult_bm_empty'));
        return;
      }

      var parserName = resolveParserName(url);
      if (!parserName) { error('Неизвестный источник'); return; }

      loadParser(parserName, function (parser) {
        parser.view(params, success, error);
      });
    },

    // [1.6.0] REFACTOR: использует resolveParserName()
    search: function (params, oncomplite, error) {
      Api.menu(function (channels) {
        var status  = new Lampa.Status(channels.length);
        var results = [];

        status.onComplite = function () {
          if (results.length) oncomplite(results);
          else error();
        };

        channels.forEach(function (ch) {
          if (ch.playlist_url === 'local://bookmarks') {
            var q     = (params.query || '').toLowerCase();
            var found = Bookmarks.all().filter(function (b) {
              return (b.name || '').toLowerCase().indexOf(q) >= 0;
            });
            if (found.length) {
              Utils.fixCards(found);
              results.push({
                title:      'Закладки',
                results:    found,
                url:        'local://bookmarks',
                collection: true,
                line_type:  'none',
                card_events: {
                  onMenu:  Utils.menu,
                  onEnter: function (card, el) { Utils.preview.hide(); Utils.play(el); },
                },
              });
            }
            status.error();
            return;
          }

          var parserName = resolveParserName(ch.playlist_url);
          loadParser(parserName, function (parser) {
            if (parser.search) {
              parser.search(params, function (data) {
                if (data && data.results && data.results.length) {
                  data.card_events = {
                    onMenu:  Utils.menu,
                    onEnter: function (card, el) { Utils.preview.hide(); Utils.play(el); },
                  };
                  results.push(data);
                  status.append(ch.playlist_url, data);
                } else {
                  status.error();
                }
              }, function () { status.error(); });
            } else {
              status.error();
            }
          });
        });
      }, error);
    },

    clear: function () {},
  };

  // ----------------------------------------------------------
  // КОМПОНЕНТ — главная (все источники плитками)
  // [1.7.0] ОПТИМИЗАЦИЯ: параллельная загрузка источников
  // ----------------------------------------------------------
  function Sisi(object) {
    var comp = new Lampa.InteractionMain(object);

    comp.create = function () {
      var _this = this;
      this.activity.loader(true);

      Api.menu(function (channels) {
     var status = new Lampa.Status(channels.length);
     var items  = [];
     var pendingRequests = {}; // Для отслеживания незавершённых запросов
     // [1.7.2] Debounce для промежуточных перерисовок главной
     var buildTimer;
     function scheduleBuild() {
       clearTimeout(buildTimer);
       buildTimer = setTimeout(function () { _this.build(items); }, 200);
     }

        status.onComplite = function (data) {
          // Собираем результаты в порядке каналов
          channels.forEach(function (ch) {
            if (data[ch.playlist_url]) items.push(data[ch.playlist_url]);
          });
          if (items.length) _this.build(items);
          else              _this.empty();
        };

        // Параллельная загрузка всех источников
        channels.forEach(function (ch) {
          if (ch.playlist_url === 'local://bookmarks') {
            var list = Bookmarks.all();
            if (list.length) {
              Utils.fixCards(list);
              status.append(ch.playlist_url, {
                title:      Lampa.Lang.translate('adult_bookmarks'),
                results:    list.slice(0, 20),
                url:        'local://bookmarks',
                collection: true,
                line_type:  'none',
                card_events: {
                  onMenu:  Utils.menu,
                  onEnter: function (card, el) { Utils.preview.hide(); Utils.play(el); },
                },
              });
            } else {
              status.error();
            }
            return;
          }

          var parserName = resolveParserName(ch.playlist_url);
          pendingRequests[ch.playlist_url] = true;

          loadParser(parserName, function (parser) {
            parser.main({ url: ch.playlist_url, page: 1 }, function (data) {
              data.title     = Utils.sourceTitle(ch.title);
              data.url       = ch.playlist_url;
              data.line_type = 'none';
              data.card_events = {
                onMenu:  Utils.menu,
                onEnter: function (card, el) { Utils.preview.hide(); Utils.play(el); },
              };
              Utils.fixCards(data.results);
              delete pendingRequests[ch.playlist_url];
              status.append(ch.playlist_url, data);

           // [1.7.2] Промежуточное обновление UI при получении результата
           if (Object.keys(pendingRequests).length < channels.length / 2) {
             // Уже загружено более половины — показываем что есть (через debounce)
             scheduleBuild();
           }
            }, function () {
              delete pendingRequests[ch.playlist_url];
              status.error();
            });
          });
        });
      }, function (e) {
        _this.empty(e);
      });

      return this.render();
    };

    comp.empty = function (er) {
      var _this = this;
      var empty = new Lampa.Empty({ descr: typeof er === 'string' ? er : Lampa.Lang.translate('empty_text_two') });
      Lampa.Activity.all().forEach(function (active) {
        if (_this.activity === active.activity)
          active.activity.render().find('.activity__body > div')[0].appendChild(empty.render(true));
      });
      this.start = empty.start.bind(empty);
      this.activity.loader(false);
      this.activity.toggle();
    };

    comp.onMore = function (data) {
      Lampa.Activity.push({ url: data.url, title: data.title, component: 'adult_view', page: 2 });
    };

    comp.onAppend = function (line) {
      line.onAppend = function (card) {
        var origFocus = card.onFocus;
        card.onFocus = function (target, card_data) {
          if (typeof origFocus === 'function') origFocus(target, card_data);
          Utils.preview.show(target, card_data);
        };
      };
    };

    return comp;
  }

  // ----------------------------------------------------------
  // КОМПОНЕНТ — каталог / категория
  // ----------------------------------------------------------
  function View(object) {
    var comp = new Lampa.InteractionCategory(object);
    var filterMenu;

    comp.create = function () {
      var _this = this;
      this.activity.loader(true);

      Api.view(object, function (data) {
        filterMenu = data.menu;
        if (filterMenu) {
          filterMenu.forEach(function (m) {
            var spl = m.title.split(':');
            m.title = spl[0].trim();
            if (spl[1]) m.subtitle = Lampa.Utils.capitalizeFirstLetter(spl[1].trim().replace(/all/i, 'Любой'));
            if (m.submenu) {
              m.submenu.forEach(function (s) {
                s.title = Lampa.Utils.capitalizeFirstLetter(s.title.trim().replace(/all/i, 'Любой'));
              });
            }
          });
        }
        _this.build(data);
        var rendered = comp.render();
        if (rendered) rendered.find('.category-full').addClass('mapping--grid cols--3');
        if (!data.results.length && object.url === 'local://bookmarks') {
          Lampa.Noty.show(Lampa.Lang.translate('adult_bm_empty'), { time: 8000 });
        }
      }, this.empty.bind(this));
    };

    comp.nextPageReuest = function (object, resolve, reject) {
      Api.view(object, resolve.bind(this), reject.bind(this));
    };

    comp.cardRender = function (object, element, card) {
      card.onMenu  = function (target, card_data) { return Utils.menu(target, card_data); };
      card.onEnter = function () { Utils.preview.hide(); Utils.play(element); };

      var origFocus = card.onFocus;
      card.onFocus  = function (target, card_data) {
        if (typeof origFocus === 'function') origFocus(target, card_data);
        Utils.preview.show(target, element);
      };
    };

    comp.filter = function () {
      if (!filterMenu) return;
      var items  = [];
      var search = null;
      for (var fi = 0; fi < filterMenu.length; fi++) {
        if (filterMenu[fi].search_on) search = filterMenu[fi];
        else items.push(filterMenu[fi]);
      }
      if (!search) search = object.search_start;
      if (!items.length && !search) return;

      if (search) {
        Lampa.Arrays.insert(items, 0, {
          title: 'Найти',
          onSelect: function () {
            $('body').addClass('ambience--enable');
            Lampa.Input.edit({ title: 'Поиск', value: '', free: true, nosave: true }, function (value) {
              $('body').removeClass('ambience--enable');
              Lampa.Controller.toggle('content');
              if (value) {
                var sep = search.playlist_url.indexOf('?') !== -1 ? '&' : '?';
                Lampa.Activity.push({
                  url:          search.playlist_url + sep + 'search=' + encodeURIComponent(value),
                  title:        'Поиск - ' + value,
                  component:    'adult_view',
                  search_start: search,
                  page:         1,
                });
              }
            });
          },
        });
      }

      Lampa.Select.show({
        title: 'Фильтр',
        items: items,
        onBack: function () { Lampa.Controller.toggle('content'); },
        onSelect: function (a) {
          filterMenu.forEach(function (m) { m.selected = (m === a); });
          if (a.submenu) {
            Lampa.Select.show({
              title:    a.title,
              items:    a.submenu,
              onBack:   function () { comp.filter(); },
              onSelect: function (b) {
                Lampa.Activity.push({ title: object.title, url: b.playlist_url, component: 'adult_view', page: 1 });
              },
            });
          } else {
            comp.filter();
          }
        },
      });
    };

    comp.onRight = comp.filter.bind(comp);
    return comp;
  }

  // ----------------------------------------------------------
  // ГЛОБАЛЬНЫЙ ПОИСК
  // ----------------------------------------------------------
  var SearchSource = {
    title: Lampa.Lang.translate('adult_plugin_name'),
    search: function (params, oncomplite) {
      Api.search(params, oncomplite, function () { oncomplite([]); });
    },
    onCancel: function () { Api.clear(); },
    params: {
      lazy: true, align_left: true,
      card_events: { onMenu: function () {} },
    },
    onMore: function (params, close) {
      close();
      var url = Lampa.Utils.addUrlComponent(params.data.url, 'search=' + encodeURIComponent(params.query));
      Lampa.Activity.push({ url: url, title: 'Поиск - ' + params.query, component: 'adult_view', page: 2 });
    },
    onSelect: function (params) { Utils.play(params.element); },
    onAppend: function (card)   { card.render().addClass('card--collection'); },
  };

  // ----------------------------------------------------------
  // НАСТРОЙКИ
  // ----------------------------------------------------------
  function addSettings() {
    if (window.adult_settings_ready) return;
    window.adult_settings_ready = true;

    var previewVal = Lampa.Storage.field('sisi_preview');
    if (previewVal === null || previewVal === undefined) {
      Lampa.Storage.set('sisi_preview', true);
      console.log('[AdultJS] sisi_preview инициализирован: true');
    }

    var componentName = Lampa.Lang.translate('adult_plugin_name') + '  v' + PLUGIN_VERSION;

    Lampa.SettingsApi.addComponent({
      component: PLUGIN_ID,
      name:      componentName,
      icon:      '<svg width="200" height="243" viewBox="0 0 200 243" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M187.714 130.727C206.862 90.1515 158.991 64.2019 100.983 64.2019C42.9759 64.2019 -4.33044 91.5669 10.875 130.727C26.0805 169.888 63.2501 235.469 100.983 234.997C138.716 234.526 168.566 171.303 187.714 130.727Z" stroke="currentColor" stroke-width="15"/><path d="M102.11 62.3146C109.995 39.6677 127.46 28.816 169.692 24.0979C172.514 56.1811 135.338 64.2018 102.11 62.3146Z" stroke="currentColor" stroke-width="15"/><path d="M90.8467 62.7863C90.2285 34.5178 66.0667 25.0419 31.7127 33.063C28.8904 65.1461 68.8826 62.7863 90.8467 62.7863Z" stroke="currentColor" stroke-width="15"/><path d="M100.421 58.5402C115.627 39.6677 127.447 13.7181 85.2149 9C82.3926 41.0832 83.5258 35.4214 100.421 58.5402Z" stroke="currentColor" stroke-width="15"/><rect x="39.0341" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="90.8467" y="92.0388" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="140.407" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="116.753" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="64.9404" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="93.0994" y="176.021" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/></svg>',
    });

    // [1.7.5] Лёгкий сброс — без подтверждения
    Lampa.SettingsApi.addParam({
      component: PLUGIN_ID,
      param: { name: 'adult_reset_light_action', type: 'button', values: '', default: '' },
      field: {
        name:        Lampa.Lang.translate('adult_reset_light'),
        description: Lampa.Lang.translate('adult_reset_light_descr'),
      },
      onRender: function (item) {
        item.on('hover:enter', function () {
          resetLight();
        });
      },
    });

    // [1.7.5] Полный сброс — с подтверждением; закладки опционально
    Lampa.SettingsApi.addParam({
      component: PLUGIN_ID,
      param: { name: 'adult_reset_action', type: 'button', values: '', default: '' },
      field: {
        name:        Lampa.Lang.translate('adult_reset'),
        description: Lampa.Lang.translate('adult_reset_descr'),
      },
      onRender: function (item) {
        item.on('hover:enter', function () {
          var ctrl = Lampa.Controller.enabled().name;
          Lampa.Select.show({
            title: Lampa.Lang.translate('adult_reset'),
            items: [
              { title: Lampa.Lang.translate('adult_reset_confirm'), confirm: true, clearBookmarks: false },
              { title: '⚠  ' + Lampa.Lang.translate('adult_reset_confirm_bm'), confirm: true, clearBookmarks: true },
              { title: Lampa.Lang.translate('cancel') || 'Отмена', cancel: true },
            ],
            onSelect: function (m) {
              if (m.confirm) resetFull(!!m.clearBookmarks);
              Lampa.Controller.toggle(ctrl);
            },
            onBack: function () { Lampa.Controller.toggle(ctrl); },
          });
        });
      },
    });
  }

  // ----------------------------------------------------------
  // КНОПКА ФИЛЬТРА В ШАПКЕ
  // ----------------------------------------------------------
  function addFilter() {
    var activi, timer;
    var button = $(
      '<div class="head__action head__settings selector">' +
      '<svg height="36" viewBox="0 0 38 36" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="1.5" y="1.5" width="35" height="33" rx="1.5" stroke="currentColor" stroke-width="3"/>' +
      '<rect x="7" y="8" width="24" height="3" rx="1.5" fill="currentColor"/>' +
      '<rect x="7" y="16" width="24" height="3" rx="1.5" fill="currentColor"/>' +
      '<rect x="7" y="25" width="24" height="3" rx="1.5" fill="currentColor"/>' +
      '<circle cx="13.5" cy="17.5" r="3.5" fill="currentColor"/>' +
      '<circle cx="23.5" cy="26.5" r="3.5" fill="currentColor"/>' +
      '<circle cx="21.5" cy="9.5" r="3.5" fill="currentColor"/>' +
      '</svg></div>'
    );

    button.hide().on('hover:enter', function () {
      if (!activi) return;
      var comp = Lampa.Manifest.app_digital >= 300
        ? activi.activity.component
        : activi.activity.component();
      if (comp && comp.filter) comp.filter();
    });

    $('.head .open--search').after(button);

    Lampa.Listener.follow('activity', function (e) {
      if (e.type === 'start') activi = e.object;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (activi && activi.component !== 'adult_view') {
          button.hide();
          activi = false;
        }
      }, 1000);
      if (e.type === 'start' && e.component === 'adult_view') {
        button.show();
        activi = e.object;
      }
    });
  }

  // ----------------------------------------------------------
  // КНОПКА В БОКОВОМ МЕНЮ
  // ----------------------------------------------------------
  function addMenuButton() {
    var icon = '<svg width="200" height="243" viewBox="0 0 200 243" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M187.714 130.727C206.862 90.1515 158.991 64.2019 100.983 64.2019C42.9759 64.2019 -4.33044 91.5669 10.875 130.727C26.0805 169.888 63.2501 235.469 100.983 234.997C138.716 234.526 168.566 171.303 187.714 130.727Z" stroke="currentColor" stroke-width="15"/><path d="M102.11 62.3146C109.995 39.6677 127.46 28.816 169.692 24.0979C172.514 56.1811 135.338 64.2018 102.11 62.3146Z" stroke="currentColor" stroke-width="15"/><path d="M90.8467 62.7863C90.2285 34.5178 66.0667 25.0419 31.7127 33.063C28.8904 65.1461 68.8826 62.7863 90.8467 62.7863Z" stroke="currentColor" stroke-width="15"/><path d="M100.421 58.5402C115.627 39.6677 127.447 13.7181 85.2149 9C82.3926 41.0832 83.5258 35.4214 100.421 58.5402Z" stroke="currentColor" stroke-width="15"/><rect x="39.0341" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="90.8467" y="92.0388" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="140.407" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="116.753" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="64.9404" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="93.0994" y="176.021" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/></svg>';

    var button = $(
      '<li class="menu__item selector" data-action="adult_plugin">' +
      '<div class="menu__ico">' + icon + '</div>' +
      '<div class="menu__text">' + Lampa.Lang.translate('adult_plugin_name') + '</div>' +
      '</li>'
    );

    button.on('hover:enter', function () {
      if (!Lampa.ParentalControl) {
        Lampa.ParentalControl = { query: function (ok) { ok(); } };
      }

      Lampa.ParentalControl.query(function () {
        Api.menu(function (channels) {
          var items = [{ title: 'Все', all: true }];
          channels.forEach(function (ch) {
            items.push({ title: Utils.sourceTitle(ch.title), playlist_url: ch.playlist_url });
          });
          Lampa.Select.show({
            title: 'Источники',
            items: items,
            onSelect: function (a) {
              if (a.all || !a.playlist_url) {
                Lampa.Activity.push({ url: '', title: Lampa.Lang.translate('adult_plugin_name'), component: 'adult_main', page: 1 });
              } else {
                Lampa.Activity.push({ url: a.playlist_url, title: a.title, component: 'adult_view', page: 1 });
              }
            },
            onBack: function () { Lampa.Controller.toggle('menu'); },
          });
        }, function (e) {
          Lampa.Noty.show(typeof e === 'string' ? e : 'Ошибка загрузки menu.json', { style: 'error', time: 5000 });
        });
      }, function () {});
    });

    $('.menu .menu__list').eq(0).append(button);
  }

  // ----------------------------------------------------------
  // ИНИЦИАЛИЗАЦИЯ
  // ----------------------------------------------------------
  function init() {
    Lampa.Component.add('adult_main', Sisi);
    Lampa.Component.add('adult_view', View);
    Lampa.Search.addSource(SearchSource);
    addMenuButton();
    addFilter();
    addSettings();
  }

  function startPlugin() {
    window[READY_FLAG] = true;
    if (window.appready) init();
    else {
      Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
      });
    }
  }

  if (!window[READY_FLAG]) startPlugin();

})();
