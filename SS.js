// =============================================================
// AdultJS.js — Основной плагин AdultPlugin для Lampa
// Version  : 1.2.0
// GitHub   : https://denis-tikhonov.github.io/plug/
// Changed  : [1.0.0] Первая версия. Загрузка menu.json,
//                    динамическая загрузка парсеров.
//            [1.1.0] Раздел настроек в Lampa.Settings.
//                    Хранение Worker URL через Lampa.Storage.
//            [1.2.0] Централизованный window.AdultPlugin.networkRequest()
//                    Интеграция Lampa.Network.native + Cloudflare Worker.
//                    Приоритетная цепочка: native → Reguest → fetch.
//                    Экспорт workerUrl для подключаемых парсеров.
//                    Ранняя инициализация AdultPlugin до загрузки парсеров.
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // КОНСТАНТЫ
  // ----------------------------------------------------------
  var TAG             = '[AdultJS]';
  var VERSION         = '1.2.0';
  var NOTY_TIME       = 4000;

  // URL menu.json на GitHub Pages — список парсеров + метаданные
  var MENU_URL        = 'https://denis-tikhonov.github.io/plug/menu.json';

  // URL Cloudflare Worker по умолчанию.
  // Переопределяется через настройки плагина (Lampa.Storage 'adult_worker_url').
  var WORKER_DEFAULT  = 'https://zonaproxy.777b737.workers.dev/?url=';

  // Ключи Lampa.Storage
  var STORAGE_WORKER  = 'adult_worker_url';
  var STORAGE_ENABLED = 'adult_enabled';

  // ----------------------------------------------------------
  // РАННЯЯ ИНИЦИАЛИЗАЦИЯ window.AdultPlugin
  //
  // Выполняется ДО загрузки menu.json и парсеров.
  // Парсеры вызывают registerParser() сразу при старте,
  // не дожидаясь полной инициализации AdultJS —
  // объект должен существовать заранее.
  // ----------------------------------------------------------
  if (!window.AdultPlugin) {
    window.AdultPlugin = {

      // Хранилище зарегистрированных парсеров: { name: impl }
      parsers: {},

      // URL Worker — заполняется в _init() из Lampa.Storage
      workerUrl: WORKER_DEFAULT,

      // [1.2.0] Регистрация парсера из подключённого JS-файла.
      // Парсер вызывает: window.AdultPlugin.registerParser('briz', BrizParser)
      registerParser: function (name, impl) {
        if (!name || typeof impl !== 'object') {
          console.warn(TAG, 'registerParser: некорректные аргументы', name);
          return;
        }
        this.parsers[name] = impl;
        console.log(TAG, 'Парсер зарегистрирован:', name);
        _notyRaw('✅ Парсер ' + name + ' загружен');
      },

      // [1.2.0] Централизованный HTTP-запрос для всех парсеров.
      // Парсеры вызывают: window.AdultPlugin.networkRequest(url, ok, err)
      // Внутри — приоритетная цепочка: native+Worker → Reguest → fetch
      networkRequest: function (url, success, error, opts) {
        _networkRequest(url, success, error, opts);
      },
    };
  }

  // ----------------------------------------------------------
  // ЛОГИРОВАНИЕ
  // ----------------------------------------------------------
  function log(msg, data) {
    console.log(TAG, msg, data !== undefined ? data : '');
  }

  function warn(msg, data) {
    console.warn(TAG, msg, data !== undefined ? data : '');
  }

  function err(msg, data) {
    console.error(TAG, msg, data !== undefined ? data : '');
  }

  // Noty без зависимости от инициализации (может вызываться рано)
  function _notyRaw(msg) {
    try {
      Lampa.Noty.show(TAG + ' ' + msg, { time: NOTY_TIME });
    } catch (e) {
      console.log(TAG, '[noty]', msg);
    }
  }

  function noty(msg)        { _notyRaw(msg); }
  function notyError(msg)   { _notyRaw('⛔ ' + msg); }
  function notySuccess(msg) { _notyRaw('✅ ' + msg); }

  // ----------------------------------------------------------
  // [1.2.0] СЕТЕВОЙ СЛОЙ
  //
  // Приоритетная цепочка:
  //   1. Lampa.Network.native() через Cloudflare Worker
  //      — нативный HTTP Android/iOS, нет CORS
  //   2. Lampa.Reguest()
  //      — стандартный XHR Lampa, прямой запрос
  //   3. fetch()
  //      — браузерный fallback, может падать на CORS
  // ----------------------------------------------------------

  // Получить актуальный Worker URL
  function _getWorkerUrl() {
    try {
      var stored = Lampa.Storage.get(STORAGE_WORKER, '');
      if (stored && stored.length > 10) return stored;
    } catch (e) {}
    return window.AdultPlugin.workerUrl || WORKER_DEFAULT;
  }

  // ----------------------------------------------------------
  // Уровень 1: Lampa.Network.native + Cloudflare Worker
  //
  // Lampa.Network.native() — нативный HTTP-клиент приложения.
  // Выполняется за пределами WebView, не имеет CORS-ограничений.
  // Worker подменяет заголовки Origin/Referer на стороне сервера,
  // что снимает блокировки на уровне целевого сайта.
  // ----------------------------------------------------------
  function _nativeRequest(url, success, error) {
    var hasNative = (
      typeof Lampa !== 'undefined' &&
      Lampa.Network &&
      typeof Lampa.Network.native === 'function'
    );

    if (!hasNative) {
      log('_nativeRequest → Lampa.Network.native недоступен');
      error('native_unavailable');
      return;
    }

    var workerUrl = _getWorkerUrl();
    var fullPath  = workerUrl + encodeURIComponent(url);

    log('_nativeRequest → запрос через Worker:', fullPath.substring(0, 120));
    noty('Native + Worker: ' + url.substring(0, 50) + '...');

    try {
      Lampa.Network.native(
        fullPath,

        function (result) {
          var text = (typeof result === 'string') ? result : JSON.stringify(result);

          if (text && text.length > 50) {
            log('_nativeRequest → OK, длина:', text.length);
            notySuccess('Native OK (' + text.length + ' символов)');
            success(text);
          } else {
            warn('_nativeRequest → мало данных:', (text || '').length);
            error('native_empty');
          }
        },

        function (e) {
          warn('_nativeRequest → ошибка:', e);

          // Отдельно логируем 504 (таймаут Worker)
          if (String(e || '').indexOf('504') !== -1) {
            notyError('Worker: таймаут (504)');
          }
          error(e || 'native_error');
        },

        false,

        {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          },
        }
      );
    } catch (ex) {
      err('_nativeRequest → исключение:', ex.message);
      error(ex.message);
    }
  }

  // ----------------------------------------------------------
  // Уровень 2: Lampa.Reguest (прямой XHR)
  // ----------------------------------------------------------
  function _requestionRequest(url, success, error) {
    log('_requestionRequest → запрос:', url);
    noty('Reguest: ' + url.substring(0, 50) + '...');

    try {
      var net = new Lampa.Reguest();
      net.silent(
        url,
        function (data) {
          var text = (typeof data === 'string') ? data : '';
          if (text.length > 50) {
            log('_requestionRequest → OK, длина:', text.length);
            notySuccess('Reguest OK (' + text.length + ' символов)');
            success(text);
          } else {
            warn('_requestionRequest → мало данных:', text.length);
            error('reguest_empty');
          }
        },
        function (e) {
          warn('_requestionRequest → ошибка:', e);
          error(e || 'reguest_error');
        },
        false,
        { dataType: 'text', timeout: 15000 }
      );
    } catch (ex) {
      err('_requestionRequest → исключение:', ex.message);
      error(ex.message);
    }
  }

  // ----------------------------------------------------------
  // Уровень 3: браузерный fetch() (последний резерв)
  // ----------------------------------------------------------
  function _fetchRequest(url, success, error) {
    if (typeof fetch === 'undefined') {
      err('_fetchRequest → fetch недоступен');
      notyError('fetch недоступен');
      error('fetch_unavailable');
      return;
    }

    log('_fetchRequest → запрос:', url);
    noty('Fetch: ' + url.substring(0, 50) + '...');

    fetch(url, { method: 'GET' })
      .then(function (r) {
        log('_fetchRequest → статус:', r.status);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (text) {
        log('_fetchRequest → OK, длина:', text.length);
        notySuccess('Fetch OK (' + text.length + ' символов)');
        success(text);
      })
      .catch(function (e) {
        err('_fetchRequest → ошибка:', e.message || e);
        notyError('Fetch ошибка: ' + (e.message || e));
        error(e);
      });
  }

  // ----------------------------------------------------------
  // [1.2.0] _networkRequest — главная функция сетевого слоя.
  // Экспортируется как window.AdultPlugin.networkRequest().
  // Парсеры вызывают её напрямую вместо собственных httpGet().
  // ----------------------------------------------------------
  function _networkRequest(url, success, error) {
    log('_networkRequest → URL:', url);

    // Уровень 1: native + Worker
    _nativeRequest(url,
      function (text) {
        success(text);
      },
      function () {
        // Уровень 2: Reguest
        warn('_networkRequest → native не сработал, уровень 2: Reguest');
        noty('Native не сработал, пробую Reguest...');

        _requestionRequest(url,
          function (text) {
            success(text);
          },
          function () {
            // Уровень 3: fetch
            warn('_networkRequest → Reguest не сработал, уровень 3: fetch');
            noty('Reguest не сработал, пробую fetch...');

            _fetchRequest(url, success, function (e) {
              err('_networkRequest → все методы исчерпаны:', url);
              notyError('Все методы запроса исчерпаны!');
              error(e || 'all_failed');
            });
          }
        );
      }
    );
  }

  // ----------------------------------------------------------
  // ЗАГРУЗКА menu.json
  //
  // menu.json содержит:
  // {
  //   "worker_url": "https://...",   // опционально
  //   "parsers": [
  //     { "name": "briz", "url": "https://...briz.js" },
  //     ...
  //   ]
  // }
  //
  // Загружается через Lampa.Reguest напрямую — это GitHub Pages,
  // CORS настроен корректно, Worker не нужен.
  // ----------------------------------------------------------
  function _loadMenu(onSuccess, onError) {
    log('_loadMenu → загрузка:', MENU_URL);
    noty('Загрузка конфигурации...');

    try {
      var net = new Lampa.Reguest();
      net.silent(
        MENU_URL,
        function (data) {
          var text = (typeof data === 'string') ? data : JSON.stringify(data);
          log('_loadMenu → получено, длина:', text.length);

          try {
            var json = JSON.parse(text);
            log('_loadMenu → JSON разобран OK');
            notySuccess('Конфигурация загружена');
            onSuccess(json);
          } catch (e) {
            err('_loadMenu → JSON.parse ошибка:', e.message);
            notyError('Ошибка разбора menu.json: ' + e.message);
            onError(e.message);
          }
        },
        function (e) {
          err('_loadMenu → ошибка загрузки:', e);
          notyError('Ошибка загрузки menu.json');
          onError(e);
        },
        false,
        { dataType: 'text', timeout: 10000 }
      );
    } catch (ex) {
      err('_loadMenu → исключение:', ex.message);
      notyError('Исключение при загрузке menu.json: ' + ex.message);
      onError(ex.message);
    }
  }

  // ----------------------------------------------------------
  // ДИНАМИЧЕСКАЯ ЗАГРУЗКА ПАРСЕРОВ
  //
  // Для каждого парсера из menu.json создаётся тег <script>.
  // После загрузки парсер сам вызывает registerParser().
  // ----------------------------------------------------------
  function _loadParser(parserEntry, index) {
    var name = parserEntry.name || ('parser_' + index);
    var url  = parserEntry.url  || '';

    if (!url) {
      warn('_loadParser → нет URL для парсера:', name);
      return;
    }

    log('_loadParser → загрузка парсера "' + name + '":', url);
    noty('Загрузка парсера ' + name + '...');

    var script    = document.createElement('script');
    script.type   = 'text/javascript';
    script.src    = url;
    script.async  = true;

    script.onload = function () {
      log('_loadParser → "' + name + '" script загружен:', url);
      // Парсер сам вызовет registerParser() при инициализации
    };

    script.onerror = function () {
      err('_loadParser → ошибка загрузки "' + name + '":', url);
      notyError('Ошибка загрузки парсера ' + name);
    };

    (document.head || document.body).appendChild(script);
  }

  function _loadAllParsers(parsers) {
    if (!parsers || !parsers.length) {
      warn('_loadAllParsers → список парсеров пуст');
      return;
    }

    log('_loadAllParsers → парсеров в списке:', parsers.length);

    for (var i = 0; i < parsers.length; i++) {
      _loadParser(parsers[i], i);
    }
  }

  // ----------------------------------------------------------
  // НАСТРОЙКИ ПЛАГИНА В LAMPA
  //
  // Добавляет раздел "Adult Plugin" в Lampa.Settings.
  // Пользователь может задать URL Cloudflare Worker вручную.
  // ----------------------------------------------------------
  function _registerSettings() {
    try {
      // Добавляем параметр Worker URL в настройки Lampa
      Lampa.SettingsApi.addParam({
        component: 'adult_plugin',
        param: {
          name:    STORAGE_WORKER,
          type:    'input',
          default: WORKER_DEFAULT,
        },
        field: {
          name:        'URL Cloudflare Worker',
          description: 'Прокси для обхода CORS. Формат: https://worker.workers.dev/?url=',
        },
        onChange: function (val) {
          Lampa.Storage.set(STORAGE_WORKER, val);
          window.AdultPlugin.workerUrl = val;
          log('Настройки → Worker URL обновлён:', val);
          notySuccess('Worker URL сохранён');
        },
      });

      // Переключатель: включить/выключить плагин
      Lampa.SettingsApi.addParam({
        component: 'adult_plugin',
        param: {
          name:    STORAGE_ENABLED,
          type:    'toggle',
          default: true,
        },
        field: {
          name:        'Включить Adult Plugin',
          description: 'Активировать раздел контента для взрослых',
        },
        onChange: function (val) {
          Lampa.Storage.set(STORAGE_ENABLED, val);
          log('Настройки → плагин ' + (val ? 'включён' : 'выключён'));
        },
      });

      log('_registerSettings → настройки зарегистрированы');
    } catch (e) {
      warn('_registerSettings → SettingsApi недоступен:', e.message);
      // Тихо игнорируем — некоторые сборки Lampa не имеют SettingsApi
    }
  }

  // ----------------------------------------------------------
  // РЕГИСТРАЦИЯ КОМПОНЕНТА В LAMPA
  //
  // Компонент 'adult_catalog' обрабатывает запросы к парсерам.
  // Lampa вызывает его методы при навигации пользователя.
  // ----------------------------------------------------------
  function _registerComponent() {
    try {
      Lampa.Component.add('adult_catalog', function (object) {
        var parserName = object.parser  || '';
        var method     = object.method  || 'main';
        var params     = object.params  || {};

        var parser = window.AdultPlugin.parsers[parserName];

        if (!parser) {
          err('adult_catalog → парсер не найден:', parserName);
          notyError('Парсер не найден: ' + parserName);
          return;
        }

        if (typeof parser[method] !== 'function') {
          err('adult_catalog → метод не существует:', method);
          notyError('Метод ' + method + ' не найден в парсере ' + parserName);
          return;
        }

        log('adult_catalog → вызов ' + parserName + '.' + method);

        parser[method](
          params,
          function (result) {
            log('adult_catalog → ' + parserName + '.' + method + ' OK');
            if (object.success) object.success(result);
          },
          function (e) {
            err('adult_catalog → ' + parserName + '.' + method + ' ошибка:', e);
            notyError(parserName + ': ошибка загрузки');
            if (object.error) object.error(e);
          }
        );
      });

      log('_registerComponent → компонент adult_catalog зарегистрирован');
    } catch (e) {
      warn('_registerComponent → Lampa.Component недоступен:', e.message);
    }
  }

  // ----------------------------------------------------------
  // ДОБАВЛЕНИЕ РАЗДЕЛА В МЕНЮ LAMPA
  //
  // При открытии раздела — показывает список доступных парсеров.
  // Каждый парсер открывается через activity adult_catalog.
  // ----------------------------------------------------------
  function _addToMenu() {
    try {
      // Ждём инициализации Lampa Menu
      Lampa.Lang.add({
        adult_menu_title: { ru: 'Для взрослых', en: 'Adult' },
      });

      var menuItem = {
        title:     Lampa.Lang.translate('adult_menu_title'),
        subtitle:  'AdultPlugin v' + VERSION,
        icon:      '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>',
        action:    function () {
          _openParserList();
        },
      };

      // Добавляем в главное меню Lampa
      if (Lampa.Menu && typeof Lampa.Menu.add === 'function') {
        Lampa.Menu.add(menuItem);
        log('_addToMenu → пункт меню добавлен');
      } else {
        warn('_addToMenu → Lampa.Menu.add недоступен');
      }
    } catch (e) {
      warn('_addToMenu → ошибка:', e.message);
    }
  }

  // ----------------------------------------------------------
  // ОТОБРАЖЕНИЕ СПИСКА ПАРСЕРОВ
  //
  // Открывает activity со списком зарегистрированных парсеров.
  // Пользователь выбирает парсер → открывается его main().
  // ----------------------------------------------------------
  function _openParserList() {
    var names = Object.keys(window.AdultPlugin.parsers);

    if (!names.length) {
      notyError('Нет загруженных парсеров. Проверьте интернет.');
      return;
    }

    var items = [];
    for (var i = 0; i < names.length; i++) {
      (function (name) {
        items.push({
          title:  name,
          action: function () {
            _openParser(name);
          },
        });
      })(names[i]);
    }

    try {
      Lampa.Select.show({
        title:  'Adult Plugin — выберите источник',
        items:  items,
        onBack: function () {
          Lampa.Controller.toggle('menu');
        },
      });
    } catch (e) {
      warn('_openParserList → Lampa.Select.show недоступен:', e.message);
      // Fallback: открыть первый парсер напрямую
      if (names.length > 0) _openParser(names[0]);
    }
  }

  // ----------------------------------------------------------
  // ОТКРЫТЬ ПАРСЕР (вызов main())
  // ----------------------------------------------------------
  function _openParser(parserName) {
    log('_openParser → открываем:', parserName);

    try {
      Lampa.Activity.push({
        url:        '',
        title:      parserName,
        component:  'adult_catalog',
        parser:     parserName,
        method:     'main',
        params:     {},
        page:       1,
      });
    } catch (e) {
      err('_openParser → Lampa.Activity.push ошибка:', e.message);
      notyError('Ошибка открытия парсера ' + parserName);
    }
  }

  // ----------------------------------------------------------
  // ИНИЦИАЛИЗАЦИЯ
  //
  // Последовательность:
  //   1. Читаем Worker URL из Lampa.Storage
  //   2. Регистрируем настройки
  //   3. Регистрируем компонент
  //   4. Загружаем menu.json
  //   5. Из menu.json берём список парсеров → грузим их
  //   6. Добавляем пункт в меню Lampa
  // ----------------------------------------------------------
  function _init() {
    log('Инициализация AdultPlugin v' + VERSION);
    noty('AdultPlugin v' + VERSION + ' запускается...');

    // Шаг 1: Читаем сохранённый Worker URL
    try {
      var savedWorker = Lampa.Storage.get(STORAGE_WORKER, '');
      if (savedWorker && savedWorker.length > 10) {
        window.AdultPlugin.workerUrl = savedWorker;
        log('_init → Worker URL из Storage:', savedWorker);
      } else {
        window.AdultPlugin.workerUrl = WORKER_DEFAULT;
        log('_init → Worker URL по умолчанию');
      }
    } catch (e) {
      warn('_init → Storage недоступен:', e.message);
      window.AdultPlugin.workerUrl = WORKER_DEFAULT;
    }

    // Шаг 2: Настройки в UI Lampa
    _registerSettings();

    // Шаг 3: Компонент для обработки запросов к парсерам
    _registerComponent();

    // Шаг 4+5: Загружаем конфигурацию и парсеры
    _loadMenu(
      function (config) {
        log('_init → конфигурация получена');

        // Если menu.json содержит переопределение Worker URL
        if (config.worker_url && config.worker_url.length > 10) {
          // Применяем только если пользователь не задал свой URL
          var userWorker = '';
          try {
            userWorker = Lampa.Storage.get(STORAGE_WORKER, '');
          } catch (e) {}

          if (!userWorker || userWorker.length < 10) {
            window.AdultPlugin.workerUrl = config.worker_url;
            log('_init → Worker URL из menu.json:', config.worker_url);
          }
        }

        // Загружаем парсеры
        if (config.parsers && config.parsers.length) {
          log('_init → парсеров в конфигурации:', config.parsers.length);
          _loadAllParsers(config.parsers);
        } else {
          warn('_init → в menu.json нет парсеров');
          notyError('В конфигурации нет парсеров');
        }

        // Шаг 6: Добавляем в меню
        _addToMenu();

        notySuccess('AdultPlugin v' + VERSION + ' инициализирован');
      },
      function (e) {
        err('_init → ошибка загрузки menu.json:', e);
        notyError('Ошибка загрузки конфигурации');

        // Даже без menu.json добавляем пункт меню —
        // парсеры могут быть загружены другим способом
        _addToMenu();
      }
    );
  }

  // ----------------------------------------------------------
  // ЗАПУСК
  //
  // Ждём готовности Lampa. Если уже готово — инициализируем
  // сразу, иначе подписываемся на событие ready.
  // ----------------------------------------------------------
  function _waitAndInit() {
    if (typeof Lampa === 'undefined') {
      // Lampa ещё не загружена — ждём
      var _elapsed = 0;
      var _timer = setInterval(function () {
        _elapsed += 100;
        if (typeof Lampa !== 'undefined' && Lampa.Storage) {
          clearInterval(_timer);
          log('Lampa обнаружена через ' + _elapsed + 'мс');
          _init();
        } else if (_elapsed >= 15000) {
          clearInterval(_timer);
          console.error(TAG, 'Lampa не обнаружена за 15 секунд!');
        }
      }, 100);
      return;
    }

    // Lampa уже доступна
    if (Lampa.Listener && typeof Lampa.Listener.follow === 'function') {
      // Подписываемся на событие готовности Lampa
      Lampa.Listener.follow('ready', function () {
        log('Lampa → событие ready');
        _init();
      });
    } else {
      // Нет системы событий — инициализируем напрямую
      _init();
    }
  }

  // Точка входа
  _waitAndInit();

})();
