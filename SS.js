// =============================================================
// AdultJS.js — Lampa Adult Plugin
// Version  : 1.1.0
// Changed  : [1.0.0] Полный рефакторинг с ab2024.ru → GitHub Pages
//            [1.0.0] Убраны: RCH, история, лицензионные проверки
//            [1.0.0] Добавлены: localStorage-закладки, динамические парсеры
//            [1.1.0] Версия плагина выводится в строке названия в настройках
//            [1.1.0] Добавлена кнопка «Сброс плагина» в настройках:
//                    очищает кэш меню, кэш парсеров, закладки, настройки
// GitHub   : https://denis-tikhonov.github.io/plug/
// =============================================================

(function () {
  'use strict';

  // ----------------------------------------------------------
  // [1.0.0] КОНСТАНТЫ
  // [1.1.0] PLUGIN_VERSION — отображается в настройках; менять при каждом релизе
  // ----------------------------------------------------------
  var PLUGIN_ID      = 'adult_lampac';
  var PLUGIN_VERSION = '1.2.0';
  var GITHUB_BASE    = 'https://denis-tikhonov.github.io/plug/';
  var MENU_URL       = GITHUB_BASE + 'menu.json';
  var READY_FLAG     = 'plugin_' + PLUGIN_ID + '_ready';

  // [1.1.0] Все ключи Lampa.Storage, которые использует плагин — для сброса
  var STORAGE_KEYS = [
    'adult_bookmarks_list',  // закладки
    'sisi_preview',          // настройка превью
    'sisi_unic_id',          // id устройства (совместимость)
    'lampac_unic_id',        // id lampac
  ];

  // ----------------------------------------------------------
  // [1.0.0] ЛОКАЛИЗАЦИЯ
  // ----------------------------------------------------------
  Lampa.Lang.add({
    adult_plugin_name: {
      ru: 'Клубничка',
      en: 'Strawberry',
      uk: 'Полуничка',
      zh: '草莓',
    },
    adult_bookmarks:   { ru: 'Закладки',           en: 'Bookmarks'        },
    adult_add_bm:      { ru: 'Добавить в закладки', en: 'Add to bookmarks' },
    adult_del_bm:      { ru: 'Удалить из закладок', en: 'Remove bookmark'  },
    adult_bm_empty:    { ru: 'Закладки пусты. Удержите ОК на видео для добавления.', en: 'No bookmarks yet. Hold OK on a card to add.' },
    adult_bm_saved:    { ru: 'Сохранено в закладки', en: 'Saved to bookmarks' },
    adult_bm_removed:  { ru: 'Удалено из закладок',  en: 'Removed from bookmarks' },
    // [1.1.0] Сброс плагина
    adult_reset:       { ru: 'Сброс плагина',                        en: 'Reset plugin'                       },
    adult_reset_descr: { ru: 'Очистить кэш меню, парсеры и закладки', en: 'Clear menu cache, parsers and bookmarks' },
    adult_reset_done:  { ru: 'Плагин сброшен до начальных установок', en: 'Plugin reset to defaults'           },
    adult_reset_confirm: { ru: 'Сбросить плагин? Закладки будут удалены!', en: 'Reset plugin? Bookmarks will be deleted!' },
  });

  // ----------------------------------------------------------
  // [1.0.0] ЗАКЛАДКИ — только localStorage через Lampa.Storage
  // ----------------------------------------------------------
  var Bookmarks = {
    _key: 'adult_bookmarks_list',

    _load: function () {
      return Lampa.Storage.get(this._key, []);
    },

    _save: function (list) {
      Lampa.Storage.set(this._key, list);
    },

    all: function () {
      return this._load();
    },

    has: function (element) {
      return this._load().some(function (b) { return b.video === element.video; });
    },

    add: function (element) {
      var list = this._load();
      if (!this.has(element)) {
        // [1.0.0] Сохраняем только нужные поля
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
  // Очищает: кэш меню в памяти, кэш парсеров, все ключи Storage
  // ----------------------------------------------------------
  function resetPlugin() {
    // 1. Кэш меню (в памяти)
    menuCache = null;

    // 2. Кэш парсеров (в памяти + удаляем загруженные <script> теги)
    Object.keys(Parsers).forEach(function (name) {
      delete Parsers[name];
    });
    document.querySelectorAll('script[data-adult-parser]').forEach(function (s) {
      s.parentNode.removeChild(s);
    });

    // 3. Ключи Lampa.Storage
    STORAGE_KEYS.forEach(function (key) {
      Lampa.Storage.set(key, null);
    });

    // 4. Флаг инициализации настроек (чтобы можно было перерегистрировать)
    window.adult_settings_ready = false;

    Lampa.Noty.show(Lampa.Lang.translate('adult_reset_done'), { time: 4000 });
    console.log('[AdultJS] Plugin reset to defaults, version:', PLUGIN_VERSION);
  }

  // ----------------------------------------------------------
  // [1.0.0] ЗАГРУЗЧИК ПАРСЕРОВ (phub.js, xds.js и т.д.)
  // ----------------------------------------------------------
  var Parsers = {};   // { 'phub': <объект парсера>, ... }

  function loadParser(name, callback) {
    if (Parsers[name]) { callback(Parsers[name]); return; }

    var url = GITHUB_BASE + name + '.js?v=' + Date.now();
    var script = document.createElement('script');
    script.src = url;
    script.setAttribute('data-adult-parser', name);  // [1.1.0] маркер для сброса
    script.onload = function () {
      // [1.0.0] Каждый парсер регистрирует себя через AdultPlugin.registerParser
      if (Parsers[name]) callback(Parsers[name]);
      else console.warn('[AdultJS] Parser not registered after load:', name);
    };
    script.onerror = function () {
      console.error('[AdultJS] Failed to load parser:', url);
    };
    document.head.appendChild(script);
  }

  // Публичный API для регистрации парсеров из phub.js / xds.js
  window.AdultPlugin = window.AdultPlugin || {};
  window.AdultPlugin.registerParser = function (name, parserObj) {
    Parsers[name] = parserObj;
    console.log('[AdultJS] Parser registered:', name);
  };

  // ----------------------------------------------------------
  // [1.0.0] УТИЛИТЫ
  // ----------------------------------------------------------
  var Utils = {

    sourceTitle: function (title) {
      return Lampa.Utils.capitalizeFirstLetter((title || '').split('.')[0]);
    },

    fixCards: function (list) {
      list.forEach(function (m) {
        m.background_image = m.picture;
        m.poster            = m.picture;
        m.img               = m.picture;
        m.name = Lampa.Utils.capitalizeFirstLetter(m.name || '').replace(/&(.*?);/g, '');
      });
    },

    // [1.0.0] Воспроизведение видео
    // [1.2.0] json:true → сначала получаем прямые ссылки через parser.qualitys()
    play: function (element) {
      var ctrl = Lampa.Controller.enabled().name;

      // [1.2.0] Если карточка помечена json:true — нужен доп. запрос
      // за прямыми mp4-ссылками через парсер источника.
      if (element.json && element.video && element.source) {
        var parserName = element.source; // 'eporner' / 'briz' / 'yjizz' etc.

        // Показываем лоадер пока грузим ссылки
        Lampa.Loading.start(function () { Lampa.Loading.stop(); });

        loadParser(parserName, function (parser) {
          if (parser && typeof parser.qualitys === 'function') {
            parser.qualitys(
              element.video,
              function (data) {
                Lampa.Loading.stop();
                var qualitys = data.qualitys || data;
                var video = {
                  title:   element.name,
                  url:     Utils.qualityDefault(qualitys) || element.video,
                  quality: qualitys,
                };
                Lampa.Player.play(video);
                Lampa.Player.playlist([video]);
                Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
              },
              function (e) {
                Lampa.Loading.stop();
                console.warn('[AdultJS] qualitys error:', e);
                // Fallback: пробуем воспроизвести страницу напрямую
                var video = { title: element.name, url: element.video };
                Lampa.Player.play(video);
                Lampa.Player.playlist([video]);
                Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
              }
            );
          } else {
            // Парсер без qualitys — воспроизводим как есть
            Lampa.Loading.stop();
            var video = { title: element.name, url: element.video };
            Lampa.Player.play(video);
            Lampa.Player.playlist([video]);
            Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
          }
        });
        return;
      }

      // Обычное воспроизведение (json:false или qualitys уже есть)
      if (element.qualitys) {
        var video = {
          title:   element.name,
          url:     Utils.qualityDefault(element.qualitys) || element.video,
          quality: element.qualitys,
        };
        Lampa.Player.play(video);
        Lampa.Player.playlist([video]);
      } else {
        var video = { title: element.name, url: element.video };
        Lampa.Player.play(video);
        Lampa.Player.playlist([video]);
      }

      Lampa.Player.callback(function () {
        Lampa.Controller.toggle(ctrl);
      });
    },

    qualityDefault: function (qualitys) {
      if (!qualitys) return '';
      var prefer = Lampa.Storage.get('video_quality_default', '1080') + 'p';
      var url;
      for (var q in qualitys) {
        if (q.indexOf(prefer) === 0) url = qualitys[q];
      }
      if (!url) url = qualitys[Lampa.Arrays.getKeys(qualitys)[0]];
      return url;
    },

    // [1.0.0] Контекстное меню карточки (только закладки, без истории)
    menu: function (target, card_data) {
      var hasBm  = Bookmarks.has(card_data);
      var ctrl   = Lampa.Controller.enabled().name;

      var items = [
        { title: Lampa.Lang.translate(hasBm ? 'adult_del_bm' : 'adult_add_bm'), bm: true },
      ];

      // [1.0.0] Внешний плеер на Android
      if (Lampa.Platform.is('android') && Lampa.Storage.field('player') !== 'inner') {
        items.push({ title: 'Плеер Lampa', lampaplayer: true });
      }

      Lampa.Select.show({
        title: 'Меню',
        items: items,
        onSelect: function (m) {
          if (m.bm) {
            Bookmarks.toggle(card_data);
          } else if (m.lampaplayer) {
            Utils.play(card_data);
          }
          Lampa.Controller.toggle('content');
        },
        onBack: function () {
          Lampa.Controller.toggle('content');
        },
      });
    },

    // [1.0.0] Видео-превью при наведении
    preview: (function () {
      var timer, activeContainer;

      function hide() {
        clearTimeout(timer);
        if (activeContainer) {
          var vid = activeContainer[0] && activeContainer[0].querySelector('video');
          if (vid) { try { vid.pause(); } catch(e){} }
          activeContainer.addClass('hide');
          activeContainer = null;
        }
      }

      function show(target, element) {
        hide();
        timer = setTimeout(function () {
          if (!element.preview || !Lampa.Storage.field('sisi_preview')) return;
          var container = target.find('.adult-video-preview');
          if (!container.length) {
            container = $('<div class="adult-video-preview"></div>').css({
              position:'absolute', width:'100%', height:'100%',
              left:0, top:0, overflow:'hidden', borderRadius:'1em',
            });
            var vid = $('<video></video>').css({
              position:'absolute', width:'100%', height:'100%',
              left:0, top:0, objectFit:'cover',
            });
            vid[0].src = element.preview;
            vid[0].addEventListener('ended', function () { container.addClass('hide'); });
            vid[0].load();
            container.append(vid);
            target.find('.card__view').append(container);
          }
          activeContainer = container;
          try { container[0].querySelector('video').play(); } catch(e){}
          container.removeClass('hide');
        }, 1500);
      }

      return { show: show, hide: hide };
    })(),
  };

  // ----------------------------------------------------------
  // [1.0.0] API — загрузка меню с GitHub + роутинг по источникам
  // ----------------------------------------------------------
  var menuCache = null;

  var Api = {

    // [1.0.0] Загрузка menu.json с GitHub Pages
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

    // [1.0.0] Роутинг: local://bookmarks → закладки; иначе → парсер
    view: function (params, success, error) {
      var url = params.url || '';

      // Закладки из localStorage
      if (url === 'local://bookmarks') {
        var list = Bookmarks.all();
        Utils.fixCards(list);
        if (list.length) {
          success({ results: list, collection: true, total_pages: 1 });
        } else {
          error(Lampa.Lang.translate('adult_bm_empty'));
        }
        return;
      }

      // [1.0.0] Определяем парсер по имени файла в URL
      // menu.json playlist_url: "https://denis-tikhonov.github.io/lampa-plugin/phub"
      // → парсер "phub"
      var parserName = url.replace(GITHUB_BASE, '').split('?')[0].split('/')[0];
      if (!parserName) { error('Неизвестный источник'); return; }

      loadParser(parserName, function (parser) {
        parser.view(params, success, error);
      });
    },

    // [1.0.0] Поиск — делегируем активному парсеру
    search: function (params, oncomplite, error) {
      Api.menu(function (channels) {
        var status = new Lampa.Status(channels.length);
        var results = [];

        status.onComplite = function () {
          if (results.length) oncomplite(results);
          else error();
        };

        channels.forEach(function (ch) {
          if (ch.playlist_url === 'local://bookmarks') {
            // [1.0.0] Поиск по закладкам локально
            var q = (params.query || '').toLowerCase();
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
            status.error(); // счётчик
            return;
          }

          var parserName = ch.playlist_url.replace(GITHUB_BASE, '').split('?')[0].split('/')[0];
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
      var _this  = this;
      var empty  = new Lampa.Empty({ descr: typeof er === 'string' ? er : Lampa.Lang.translate('empty_text_two') });
      Lampa.Activity.all().forEach(function (active) {
        if (_this.activity === active.activity)
          active.activity.render().find('.activity__body > div')[0].appendChild(empty.render(true));
      });
      this.start = empty.start.bind(empty);
      this.activity.loader(false);
      this.activity.toggle();
    };

    comp.onMore = function (data) {
      Lampa.Activity.push({
        url:       data.url,
        title:     data.title,
        component: 'adult_view',
        page:      2,
      });
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
            var spl    = m.title.split(':');
            m.title    = spl[0].trim();
            if (spl[1]) m.subtitle = Lampa.Utils.capitalizeFirstLetter(spl[1].trim().replace(/all/i, 'Любой'));
            if (m.submenu) {
              m.submenu.forEach(function (s) {
                s.title = Lampa.Utils.capitalizeFirstLetter(s.title.trim().replace(/all/i, 'Любой'));
              });
            }
          });
        }
        _this.build(data);
        comp.render().find('.category-full').addClass('mapping--grid cols--3');

        // [1.0.0] Подсказка для пустых закладок
        if (!data.results.length && object.url === 'local://bookmarks') {
          Lampa.Noty.show(Lampa.Lang.translate('adult_bm_empty'), { time: 8000 });
        }
      }, this.empty.bind(this));
    };

    comp.nextPageReuest = function (object, resolve, reject) {
      Api.view(object, resolve.bind(this), reject.bind(this));
    };

    comp.cardRender = function (object, element, card) {
      card.onMenu = function (target, card_data) { return Utils.menu(target, card_data); };
      card.onEnter = function () { Utils.preview.hide(); Utils.play(element); };
      var origFocus = card.onFocus;
      card.onFocus = function (target, card_data) {
        origFocus(target, card_data);
        Utils.preview.show(target, element);
      };
    };

    comp.filter = function () {
      if (!filterMenu) return;
      var items  = filterMenu.filter(function (m) { return !m.search_on; });
      var search = filterMenu.find(function (m)   { return  m.search_on; });
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
      lazy:       true,
      align_left: true,
      card_events: { onMenu: function () {} },
    },
    onMore: function (params, close) {
      close();
      var url = Lampa.Utils.addUrlComponent(params.data.url, 'search=' + encodeURIComponent(params.query));
      Lampa.Activity.push({ url: url, title: 'Поиск - ' + params.query, component: 'adult_view', page: 2 });
    },
    onSelect: function (params) {
      Utils.play(params.element);
    },
    onAppend: function (card) {
      card.render().addClass('card--collection');
    },
  };

  // ----------------------------------------------------------
  // [1.0.0] НАСТРОЙКИ
  // [1.1.0] Версия выводится в строке названия компонента
  // [1.1.0] Добавлена кнопка «Сброс плагина»
  // ----------------------------------------------------------
  function addSettings() {
    if (window.adult_settings_ready) return;
    window.adult_settings_ready = true;

    // [1.1.0] Название содержит версию: «Клубничка  v1.1.0»
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
    // Используем тип 'button' (Lampa SettingsApi поддерживает action-параметры).
    // onRender добавляет обработчик клика на сгенерированный элемент.
    Lampa.SettingsApi.addParam({
      component: PLUGIN_ID,
      param: {
        name:    'adult_reset_action',
        type:    'button',
        values:  '',
        default: '',
      },
      field: {
        name:        Lampa.Lang.translate('adult_reset'),
        description: Lampa.Lang.translate('adult_reset_descr'),
      },
      // [1.1.0] onRender — вешаем подтверждение и вызов resetPlugin()
      onRender: function (item) {
        // item — jQuery-элемент строки настройки
        item.on('hover:enter', function () {
          var ctrl = Lampa.Controller.enabled().name;

          // Диалог подтверждения через Lampa.Select
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
            onBack: function () {
              Lampa.Controller.toggle(ctrl);
            },
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
          // [1.0.0] «Все» — суммарная главная
          var items = [{ title: 'Все', all: true }];

          channels.forEach(function (ch) {
            items.push({ title: Utils.sourceTitle(ch.title), playlist_url: ch.playlist_url });
          });

          Lampa.Select.show({
            title: 'Источники',
            items: items,
            onSelect: function (a) {
              if (a.all || !a.playlist_url) {
                Lampa.Activity.push({
                  url:       '',
                  title:     Lampa.Lang.translate('adult_plugin_name'),
                  component: 'adult_main',
                  page:      1,
                });
              } else {
                Lampa.Activity.push({
                  url:       a.playlist_url,
                  title:     a.title,
                  component: 'adult_view',
                  page:      1,
                });
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
