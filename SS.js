// =============================================================
// AdultJS.js — Lampa Adult Plugin
// Version  : 1.5.8
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
//           Примечание: autoplay <video> заблокирован политикой WebView на TV
//           без жеста пользователя — визуальное превью на TV невозможно через
//           HTML5 video. Ошибка теперь тихо логируется как console.log.
//   [1.5.8] BUGFIX: Utils.fixCards — проксирование picture через Worker.
//           Постеры карточек запрашивались TV-браузером напрямую с CDN
//           сайтов (pornobriz.com, xvideos-cdn.com, vids69.com и др.),
//           которые блокируют hotlink-запросы → пустые картинки на всех
//           парсерах. Теперь picture оборачивается в Worker URL до того,
//           как попасть в background_image / poster / img.
//           Логика: если workerUrl настроен И picture начинается с http
//           И ещё не проксирован — добавляем префикс Worker + encodeURI.
// GitHub   : https://denis-tikhonov.github.io/plug/
// Worker   :
// =============================================================
//   Внимание: Новые источники подключать в двух местах и в Worker
//             var domainMap =
//             var _dm =
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // [1.0.0] КОНСТАНТЫ
  // [1.1.0] PLUGIN_VERSION — отображается в настройках
  // [1.4.0] WORKER_DEFAULT — жёстко вшитый URL воркера.
  //         Менять здесь вручную, поле Settings удалено.
  // ----------------------------------------------------------
  var PLUGIN_ID      = 'adult_lampac';
  var PLUGIN_VERSION = '1.5.8';

  // ----------------------------------------------------------
  // [1.5.1] ПОЛИФИЛЛЫ — старые Android WebView не имеют
  //         Array.prototype.find и иногда Array.prototype.filter
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

  var GITHUB_BASE    = 'https://denis-tikhonov.github.io/plug/';
  var MENU_URL       = GITHUB_BASE + 'menu.json';
  var READY_FLAG     = 'plugin_' + PLUGIN_ID + '_ready';

  // [1.4.0] URL Cloudflare Worker — менять здесь, не в Settings.
  // Должен заканчиваться на '?url=' или '&url='.
  // Пример: 'https://zonaproxy.777b737.workers.dev/?url='
  var WORKER_DEFAULT = 'https://zonaproxy.777b737.workers.dev/?url=';

  // [1.0.0] Все ключи Lampa.Storage — для сброса
  var STORAGE_KEYS = [
    'adult_bookmarks_list',
    'sisi_preview',
    'sisi_unic_id',
    'lampac_unic_id',
  ];

  // ----------------------------------------------------------
  // [1.0.0] ЛОКАЛИЗАЦИЯ
  // [1.3.0] Добавлены строки для Worker-настройки и ошибок
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
    // [1.1.0]
    adult_reset:         { ru: 'Сброс плагина',                           en: 'Reset plugin'                        },
    adult_reset_descr:   { ru: 'Очистить кэш меню, парсеры и закладки',   en: 'Clear menu cache, parsers and bookmarks' },
    adult_reset_done:    { ru: 'Плагин сброшен до начальных установок',   en: 'Plugin reset to defaults'            },
    adult_reset_confirm: { ru: 'Сбросить плагин? Закладки будут удалены!', en: 'Reset plugin? Bookmarks will be deleted!' },
    // [1.3.0]
    adult_worker_403:      { ru: 'Домен не разрешён в Worker',                  en: 'Domain not allowed in Worker'         },
    adult_worker_fallback: { ru: 'Worker заблокировал домен, прямой запрос...', en: 'Worker blocked domain, direct request...' },
  });

  // ----------------------------------------------------------
  // [1.0.0] ЗАКЛАДКИ
  // [1.5.1] BUGFIX: _load() защищён от не-массива из Storage
  //         (Storage.get может вернуть null/object → .some() падало)
  // ----------------------------------------------------------
  var Bookmarks = {
    _key: 'adult_bookmarks_list',

    _load: function () {
      var v = Lampa.Storage.get(this._key, []);
      // [1.5.1] Защита: если Storage вернул не массив — возвращаем []
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
  // [1.1.0] СБРОС ПЛАГИНА
  // ----------------------------------------------------------
  function resetPlugin() {
    menuCache = null;

    Object.keys(Parsers).forEach(function (name) { delete Parsers[name]; });
    document.querySelectorAll('script[data-adult-parser]').forEach(function (s) {
      s.parentNode.removeChild(s);
    });

    STORAGE_KEYS.forEach(function (key) { Lampa.Storage.set(key, null); });

    window.adult_settings_ready = false;
    Lampa.Noty.show(Lampa.Lang.translate('adult_reset_done'), { time: 4000 });
    console.log('[AdultJS] Plugin reset to defaults, version:', PLUGIN_VERSION);
  }

  // ----------------------------------------------------------
  // [1.0.0] ЗАГРУЗЧИК ПАРСЕРОВ
  // ----------------------------------------------------------
  var Parsers = {};

  function loadParser(name, callback) {
    if (Parsers[name]) { callback(Parsers[name]); return; }

    var url    = GITHUB_BASE + name + '.js?v=' + Date.now();
    var script = document.createElement('script');
    script.src = url;
    script.setAttribute('data-adult-parser', name);
    script.onload = function () {
      if (Parsers[name]) callback(Parsers[name]);
      else console.warn('[AdultJS] Parser not registered after load:', name);
    };
    script.onerror = function () {
      console.error('[AdultJS] Failed to load parser:', url);
    };
    document.head.appendChild(script);
  }

  // ----------------------------------------------------------
  // [1.3.0] ЦЕНТРАЛИЗОВАННЫЙ СЕТЕВОЙ ЗАПРОС
  //
  // AdultPlugin.networkRequest(url, success, error, opts)
  //
  // Парсеры (briz.js и др.) вызывают этот метод через:
  //   window.AdultPlugin.networkRequest(url, success, error, { type: 'html' })
  //
  // Цепочка:
  //   1. Lampa.Network.native + Cloudflare Worker
  //      → при 403: Noty «Домен не разрешён в Worker» + тихий fallback
  //   2. Lampa.Reguest (прямой запрос)
  //   3. fetch() (последний резерв)
  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // [1.5.0] Таймаут для Lampa.Network.native (мс).
  // Lampa на Android ждёт ~30с по умолчанию (OkHttp).
  // Снижаем до 9с — цепочка переходит к Reguest намного быстрее.
  // ----------------------------------------------------------
  var NATIVE_TIMEOUT_MS = 9000;

  // [1.5.0] Метка времени для логов: «14:07:32.450»
  function _ts() {
    var d = new Date();
    return d.getHours() + ':' +
      ('0' + d.getMinutes()).slice(-2) + ':' +
      ('0' + d.getSeconds()).slice(-2) + '.' +
      ('00' + d.getMilliseconds()).slice(-3);
  }

  // [1.5.0] Noty-прогресс — короткое всплывающее сообщение
  function _noty(msg, style) {
    try { Lampa.Noty.show(msg, { time: 3000, style: style || '' }); } catch(e) {}
  }

  // [1.4.0] Получить URL воркера из WORKER_DEFAULT.
  // [1.5.0] Авто-коррекция '=' + лог.
  function getWorkerUrl() {
    var url = WORKER_DEFAULT;
    if (!url) return '';
    if (url.charAt(url.length - 1) !== '=') {
      console.warn('[AdultJS][' + _ts() + '] WORKER_DEFAULT без "=" — добавляю');
      url = url + '=';
    }
    return url;
  }

  // ----------------------------------------------------------
  // [1.3.0] Уровень 1: Lampa.Network.native + Cloudflare Worker
  // [1.5.0] Явный таймаут через setTimeout (9с).
  //         Флаг done защищает от двойного вызова колбэка
  //         (таймаут + ответ одновременно).
  //         Лог: START / OK(мс, байт) / FAIL(мс, код, msg) / TIMEOUT.
  // ----------------------------------------------------------
  function _networkNative(url, success, error) {
    if (typeof Lampa === 'undefined' ||
        !Lampa.Network ||
        typeof Lampa.Network.native !== 'function') {
      console.warn('[AdultJS][' + _ts() + '] native недоступен — пропуск');
      error('native_unavailable');
      return;
    }

    var workerUrl = getWorkerUrl();
    if (!workerUrl) {
      console.warn('[AdultJS][' + _ts() + '] WORKER_DEFAULT пуст — пропуск');
      error('worker_not_configured');
      return;
    }

    var fullPath = workerUrl + encodeURIComponent(url);
    var t0   = Date.now();
    var done = false;

    console.log('[AdultJS][' + _ts() + '] native START → ' + fullPath.substring(0, 120));
    _noty('[AdultJS] 🔄 Запрос через Worker...');

    // [1.5.0] Свой таймаут — срабатывает если native молчит > 9с
    var timerId = setTimeout(function () {
      if (done) return;
      done = true;
      console.warn('[AdultJS][' + _ts() + '] native TIMEOUT ' + NATIVE_TIMEOUT_MS + 'мс → переход к Reguest');
      _noty('[AdultJS] ⏱ Worker timeout → Reguest...', 'error');
      error('native_timeout');
    }, NATIVE_TIMEOUT_MS);

    try {
      Lampa.Network.native(
        fullPath,
        function (result) {
          if (done) return;
          done = true;
          clearTimeout(timerId);

          var elapsed = Date.now() - t0;
          var text = (typeof result === 'string') ? result : JSON.stringify(result);

          // [1.3.0] 403 внутри тела JSON-ответа Worker
          if (text && text.indexOf('"status":403') !== -1) {
            console.warn('[AdultJS][' + _ts() + '] native OK но Worker 403 в теле (' + elapsed + 'мс)');
            _noty('[AdultJS] ⛔ Домен не разрешён в Worker (403)', 'error');
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
            _noty('[AdultJS] ⛔ Домен не разрешён в Worker', 'error');
            error('worker_403');
            return;
          }

          // [1.5.0] Типичная причина на Android TV: сайт заблокирован / DNS
          if (message.indexOf('CANCEL') !== -1 || message.indexOf('stream was reset') !== -1) {
            console.warn('[AdultJS][' + _ts() + '] → вероятно хост недоступен (DNS/firewall)');
          }

          _noty('[AdultJS] ⚠ Native: ' + message.substring(0, 40));
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

  // ----------------------------------------------------------
  // [1.3.0] Уровень 2: Lampa.Reguest прямой запрос
  // [1.5.0] Метки времени + детальный лог отказа
  // ----------------------------------------------------------
  function _networkReguest(url, success, error) {
    var t0 = Date.now();
    console.log('[AdultJS][' + _ts() + '] Reguest START → ' + url.substring(0, 80));
    _noty('[AdultJS] 🔄 Reguest прямой запрос...');

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
        { dataType: 'text', timeout: 10000 }
      );
    } catch (ex) {
      console.error('[AdultJS][' + _ts() + '] Reguest исключение: ' + ex.message);
      error(ex.message);
    }
  }

  // ----------------------------------------------------------
  // [1.3.0] Уровень 3: fetch() — последний резерв
  // [1.5.0] Метки времени + HTTP-статус
  // ----------------------------------------------------------
  function _networkFetch(url, success, error) {
    if (typeof fetch === 'undefined') {
      console.warn('[AdultJS][' + _ts() + '] fetch недоступен в этом окружении');
      error('fetch_unavailable');
      return;
    }
    var t0 = Date.now();
    console.log('[AdultJS][' + _ts() + '] fetch START → ' + url.substring(0, 80));
    _noty('[AdultJS] 🔄 Fetch последний резерв...');

    fetch(url, { method: 'GET' })
      .then(function (r) {
        console.log('[AdultJS][' + _ts() + '] fetch HTTP ' + r.status + ' ' + (Date.now()-t0) + 'мс');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) {
        console.log('[AdultJS][' + _ts() + '] fetch OK ' + (Date.now()-t0) + 'мс, байт: ' + text.length);
        success(text);
      })
      .catch(function (e) {
        console.error('[AdultJS][' + _ts() + '] fetch FAIL ' + (Date.now()-t0) + 'мс | ' + (e.message || e));
        error(e);
      });
  }

  // ----------------------------------------------------------
  // [1.3.0] Публичная точка входа: window.AdultPlugin.networkRequest
  // [1.5.0] Сводный лог итога: все три причины отказа в одной строке
  // ----------------------------------------------------------
  function networkRequest(url, success, error) {
    console.log('[AdultJS][' + _ts() + '] networkRequest → ' + url.substring(0, 80));

    _networkNative(url,
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
                // [1.5.0] Итоговая строка с причиной каждого уровня
                console.error('[AdultJS][' + _ts() + '] ❌ ВСЕ МЕТОДЫ ПРОВАЛЕНЫ для: ' + url);
                console.error('[AdultJS][' + _ts() + '] native=' + r1 + ' | Reguest=' + r2 + ' | fetch=' + r3);
                _noty('[AdultJS] ⛔ Сайт недоступен (все методы исчерпаны)', 'error');
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
  window.AdultPlugin.networkRequest = networkRequest;
  // [1.5.5] Экспортируем workerUrl чтобы парсеры могли читать актуальный URL
  // Парсеры должны обращаться к window.AdultPlugin.workerUrl, не держать свою копию
  Object.defineProperty(window.AdultPlugin, 'workerUrl', {
    get: function () { return WORKER_DEFAULT; },
    enumerable: true,
    configurable: true,
  });

  // ----------------------------------------------------------
  // [1.0.0] УТИЛИТЫ
  // ----------------------------------------------------------
  var Utils = {

    sourceTitle: function (title) {
      return Lampa.Utils.capitalizeFirstLetter((title || '').split('.')[0]);
    },

    // ----------------------------------------------------------
    // [1.5.8] BUGFIX: проксирование picture через Worker.
    //
    // ПРОБЛЕМА: TV-браузер запрашивает URL картинок напрямую с CDN
    // сайтов (pornobriz.com, xvideos-cdn.com, vids69.com и др.).
    // CDN блокирует hotlink-запросы по IP-адресу устройства → картинка
    // не загружается ни в одном парсере.
    //
    // РЕШЕНИЕ: до присваивания background_image/poster/img оборачиваем
    // picture в Worker URL (CORS-прокси), если:
    //   1. workerUrl настроен (WORKER_DEFAULT не пустой)
    //   2. picture начинается с 'http' (абсолютный внешний URL)
    //   3. picture ещё не обёрнут (не начинается с workerUrl)
    //
    // Это гарантирует, что все запросы к изображениям проходят через
    // Cloudflare Worker → CDN получает запрос от IP Worker, а не TV.
    //
    // ВАЖНО: preview (mp4-превью) НЕ проксируется здесь — он
    // используется как src для <video> и требует поддержки Range
    // запросов. Worker 1.3.5 поддерживает Range, но preview-URL
    // передаётся напрямую в <video> без fixCards — оставляем как есть.
    // ----------------------------------------------------------
    fixCards: function (list) {
      var workerUrl = (window.AdultPlugin && window.AdultPlugin.workerUrl)
        ? window.AdultPlugin.workerUrl
        : '';

      // Авто-коррекция: workerUrl должен заканчиваться на '='
      if (workerUrl && workerUrl.charAt(workerUrl.length - 1) !== '=') {
        workerUrl = workerUrl + '=';
      }

      list.forEach(function (m) {
        // [1.5.8] Проксировать picture через Worker если:
        //   - workerUrl задан
        //   - picture — абсолютный URL (http/https)
        //   - picture ещё не проксирован
        if (workerUrl &&
            m.picture &&
            m.picture.indexOf('http') === 0 &&
            m.picture.indexOf(workerUrl) !== 0) {
          console.log('[AdultJS] fixCards → proxy picture: ' + m.picture.substring(0, 60));
          m.picture = workerUrl + encodeURIComponent(m.picture);
        }

        m.background_image = m.picture;
        m.poster            = m.picture;
        m.img               = m.picture;
        m.name = Lampa.Utils.capitalizeFirstLetter(m.name || '').replace(/&(.*?);/g, '');
      });
    },

    // [1.0.0] / [1.2.0] Воспроизведение
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
                var video = {
                  title:   element.name,
                  url:     Utils.qualityDefault(qualities) || element.video,
                  quality: qualities,
                };
                Lampa.Player.play(video);
                Lampa.Player.playlist([video]);
                Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
              },
              function (e) {
                Lampa.Loading.stop();
                console.warn('[AdultJS] qualities error:', e);
                var video = { title: element.name, url: element.video };
                Lampa.Player.play(video);
                Lampa.Player.playlist([video]);
                Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
              }
            );
          } else {
            Lampa.Loading.stop();
            var video = { title: element.name, url: element.video };
            Lampa.Player.play(video);
            Lampa.Player.playlist([video]);
            Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
          }
        });
        return;
      }

      if (element.qualities) {
        var video = {
          title:   element.name,
          url:     Utils.qualityDefault(element.qualities) || element.video,
          quality: element.qualities,
        };
        Lampa.Player.play(video);
        Lampa.Player.playlist([video]);
      } else {
        var video = { title: element.name, url: element.video };
        Lampa.Player.play(video);
        Lampa.Player.playlist([video]);
      }
      Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
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
              // [1.5.3] Guard: если .card__view не найден — выходим молча
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
              // [1.5.3] Guard: vid[0] может быть null в некоторых WebView
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

            // [1.5.3] Назначаем activeContainer только если контейнер реальный
            if (container && container.length) {
              activeContainer = container;
              var vEl = container[0] ? container[0].querySelector('video') : null;
              // [1.5.7] BUGFIX: vEl.play() возвращает Promise на современных
              // движках. Без .catch() браузер/WebView бросает необработанный
              // Promise rejection в консоль при каждом наведении.
              // На Android TV autoplay через <video> заблокирован политикой
              // WebView (требует жест пользователя) — .catch() убирает шум
              // в логах, но визуальное превью на TV не появится.
              // Реальное решение — нативный слой (Lampa.Platform), но API
              // для этого Lampa не предоставляет.
              if (vEl) {
                try {
                  var playPromise = vEl.play();
                  if (playPromise !== undefined && typeof playPromise.then === 'function') {
                    playPromise.catch(function (err) {
                      // NotAllowedError — autoplay заблокирован (Android TV WebView)
                      // AbortError   — элемент удалён до завершения play()
                      // Оба случая не критичны — просто гасим rejection
                      console.log('[AdultJS] preview play() suppressed: ' + (err.name || err.message || err));
                    });
                  }
                } catch(e) {
                  // Синхронный throw — старый WebView без Promise-play
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
  // [1.0.0] API — меню с GitHub + роутинг по парсерам
  // ----------------------------------------------------------
  var menuCache = null;

  var Api = {

    menu: function (success, error) {
      if (menuCache) { success(menuCache); return; }
      var net = new Lampa.Reguest();
      net.silent(
        MENU_URL,
        function (data) {
          if (data && data.channels) {
            menuCache = data.channels;
            success(menuCache);
          } else {
            error('Неверный формат menu.json');
          }
        },
        function () { error('Не удалось загрузить menu.json'); }
      );
    },

    view: function (params, success, error) {
      var url = params.url || '';

      if (url === 'local://bookmarks') {
        var list = Bookmarks.all();
        Utils.fixCards(list);
        if (list.length) success({ results: list, collection: true, total_pages: 1 });
        else             error(Lampa.Lang.translate('adult_bm_empty'));
        return;
      }

      // [1.5.1] BUGFIX: parserName из полного URL
      // Раньше: 'https://pornobriz.com/anal/'.split('/')[0] = 'https:' → грузил https.js
      // Теперь: сначала strip GITHUB_BASE, потом проверяем что осталось не URL
      var parserName;
      var stripped = url.replace(GITHUB_BASE, '');
      if (stripped.indexOf('http') === 0 || stripped.indexOf('//') === 0) {
        // URL не с GitHub Pages — определяем парсер по hostname
        try {
          var hostname = new URL(url).hostname.replace('www.', '');
          var domainMap = {
            'pornobriz.com':        'briz',
            'eporner.com':          'epor',
            'yjizz.com':            'yjizz',
            'rt.pornhub.com':       'phub',
            'top.porno365tube.win': 'p365',
            'xv-ru.com':            'xv-ru',
            'https://api.pexels.com/videos':              'xds',
          };
          parserName = domainMap[hostname] || stripped.split('/')[0];
        } catch(e) {
          parserName = 'briz';
        }
      } else {
        parserName = stripped.split('?')[0].split('/')[0];
      }

      if (!parserName) { error('Неизвестный источник'); return; }

      loadParser(parserName, function (parser) {
        parser.view(params, success, error);
      });
    },

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

          // [1.5.1] BUGFIX: правильное определение парсера по URL
          var _pn;
          var _ps = ch.playlist_url.replace(GITHUB_BASE, '');
          if (_ps.indexOf('http') === 0 || _ps.indexOf('//') === 0) {
            try {
              var _hn = new URL(ch.playlist_url).hostname.replace('www.', '');
              var _dm = {
                'pornobriz.com':        'briz',
                'eporner.com':          'epor',
                'yjizz.com':            'yjizz',
                'rt.pornhub.com':       'phub',
                'top.porno365tube.win': 'p365',
                'xv-ru.com':            'xv-ru',
                'https://api.pexels.com/videos':              'xds',
              };
              _pn = _dm[_hn] || _ps.split('/')[0];
            } catch(e2) { _pn = 'briz'; }
          } else {
            _pn = _ps.split('?')[0].split('/')[0];
          }
          var parserName = _pn;
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
  // [1.0.0] КОМПОНЕНТ — главная (все источники плитками)
  // ----------------------------------------------------------
  function Sisi(object) {
    var comp = new Lampa.InteractionMain(object);

    comp.create = function () {
      var _this = this;
      this.activity.loader(true);

      Api.menu(function (channels) {
        var status = new Lampa.Status(channels.length);
        var items  = [];

        status.onComplite = function (data) {
          channels.forEach(function (ch) {
            if (data[ch.playlist_url]) items.push(data[ch.playlist_url]);
          });
          if (items.length) _this.build(items);
          else              _this.empty();
        };

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

          var parserName = ch.playlist_url.replace(GITHUB_BASE, '').split('?')[0].split('/')[0];
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
              status.append(ch.playlist_url, data);
            }, function () { status.error(); });
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
          origFocus(target, card_data);
          Utils.preview.show(target, card_data);
        };
      };
    };

    return comp;
  }

  // ----------------------------------------------------------
  // [1.0.0] КОМПОНЕНТ — каталог / категория
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
        // [1.5.1] BUGFIX: comp.render() возвращает undefined если build()
        // не отработал (пустые results или ошибка структуры данных).
        // Добавляем null-guard чтобы избежать Cannot read .find of undefined
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
        origFocus(target, card_data);
        Utils.preview.show(target, element);
      };
    };

    comp.filter = function () {
      if (!filterMenu) return;
      // [1.5.1] BUGFIX: filterMenu.find() падает на старых Android WebView
      // (нет Array.prototype.find). Используем явный цикл.
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
  // [1.0.0] ГЛОБАЛЬНЫЙ ПОИСК
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
  // [1.0.0] НАСТРОЙКИ
  // [1.1.0] Версия в названии + кнопка сброса
  // [1.3.0] Добавлено поле ввода URL Cloudflare Worker
  // ----------------------------------------------------------
  function addSettings() {
    if (window.adult_settings_ready) return;
    window.adult_settings_ready = true;

    var componentName = Lampa.Lang.translate('adult_plugin_name') + '  v' + PLUGIN_VERSION;

    Lampa.SettingsApi.addComponent({
      component: PLUGIN_ID,
      name:      componentName,
      icon:      '<svg width="200" height="243" viewBox="0 0 200 243" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M187.714 130.727C206.862 90.1515 158.991 64.2019 100.983 64.2019C42.9759 64.2019 -4.33044 91.5669 10.875 130.727C26.0805 169.888 63.2501 235.469 100.983 234.997C138.716 234.526 168.566 171.303 187.714 130.727Z" stroke="currentColor" stroke-width="15"/><path d="M102.11 62.3146C109.995 39.6677 127.46 28.816 169.692 24.0979C172.514 56.1811 135.338 64.2018 102.11 62.3146Z" stroke="currentColor" stroke-width="15"/><path d="M90.8467 62.7863C90.2285 34.5178 66.0667 25.0419 31.7127 33.063C28.8904 65.1461 68.8826 62.7863 90.8467 62.7863Z" stroke="currentColor" stroke-width="15"/><path d="M100.421 58.5402C115.627 39.6677 127.447 13.7181 85.2149 9C82.3926 41.0832 83.5258 35.4214 100.421 58.5402Z" stroke="currentColor" stroke-width="15"/><rect x="39.0341" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="90.8467" y="92.0388" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="140.407" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="116.753" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="64.9404" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/><rect x="93.0994" y="176.021" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/></svg>',
    });

    // Переключатель превью
    Lampa.SettingsApi.addParam({
      component: PLUGIN_ID,
      param:     { name: 'sisi_preview', type: 'trigger', values: '', default: true },
      field:     { name: 'Предпросмотр', description: 'Показывать превью при наведении на карточку' },
      onRender:  function () {},
    });

    // [1.1.0] Кнопка «Сброс плагина»
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
              { title: '⚠  ' + Lampa.Lang.translate('adult_reset_confirm'), confirm: true },
              { title: Lampa.Lang.translate('cancel') || 'Отмена', cancel: true },
            ],
            onSelect: function (m) {
              if (m.confirm) resetPlugin();
              Lampa.Controller.toggle(ctrl);
            },
            onBack: function () { Lampa.Controller.toggle(ctrl); },
          });
        });
      },
    });
  }

  // ----------------------------------------------------------
  // [1.0.0] КНОПКА ФИЛЬТРА В ШАПКЕ
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
  // [1.0.0] КНОПКА В БОКОВОМ МЕНЮ
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
  // [1.0.0] ИНИЦИАЛИЗАЦИЯ
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
