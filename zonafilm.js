(function () {
  'use strict';

  /* ─────────────────────────────────────────
     КОНФИГ
  ───────────────────────────────────────── */
  var Defined = {
    use_api: 'lampac',
    github_raw:   'https://raw.githubusercontent.com/Denis-Tikhonov/lampa-plugin/refs/heads/main',
    github_pages: 'https://denis-tikhonov.github.io/lampa-plugin',
  };

  // Основная база GitHub (можно переключить на pages)
  var GITHUB_BASE = Defined.github_raw;

  // Специальный маркер URL для локальных закладок
  var BOOKMARKS_URL = 'local://bookmarks';

  /* ─────────────────────────────────────────
     UNIC ID
  ───────────────────────────────────────── */
  var luid = Lampa.Storage.get('lampac_unic_id', '');
  if (!luid) {
    luid = Lampa.Utils.uid(8).toLowerCase();
    Lampa.Storage.set('lampac_unic_id', luid);
  }

  /* ─────────────────────────────────────────
     ЛОКАЛИЗАЦИЯ
  ───────────────────────────────────────── */
  Lampa.Lang.add({
    lampac_sisiname: {
      ru: 'Клубничка',
      en: 'Strawberry',
      uk: 'Полуничка',
      zh: '草莓',
    },
  });

  /* ─────────────────────────────────────────
     СЕТЕВОЙ ОБЪЕКТ + ПРЕВЬЮ
  ───────────────────────────────────────── */
  var network       = new Lampa.Reguest();
  var preview_timer, preview_video;

  /* ─────────────────────────────────────────
     ЛОКАЛЬНЫЕ ЗАКЛАДКИ (Lampa.Storage)
  ───────────────────────────────────────── */
  var BookmarkStorage = {
    KEY: 'sisi_local_bookmarks',

    getAll: function () {
      return Lampa.Storage.get(this.KEY, []);
    },

    save: function (list) {
      Lampa.Storage.set(this.KEY, list);
    },

    add: function (element) {
      var list = this.getAll();
      var uid  = Lampa.Utils.uid(8);
      var item = JSON.parse(JSON.stringify(element)); // deep copy
      item.bookmark = { uid: uid };
      list.push(item);
      this.save(list);
      element.bookmark = { uid: uid };
      return uid;
    },

    remove: function (uid) {
      var list = this.getAll().filter(function (b) {
        return !(b.bookmark && b.bookmark.uid === uid);
      });
      this.save(list);
    },

    has: function (element) {
      var list = this.getAll();
      for (var i = 0; i < list.length; i++) {
        if (
          list[i].name    === element.name &&
          list[i].picture === element.picture
        ) {
          return list[i].bookmark && list[i].bookmark.uid
            ? list[i].bookmark.uid
            : false;
        }
      }
      return false;
    },

    toResponse: function () {
      var list = this.getAll();
      return {
        results:     list,
        collection:  true,
        total_pages: 1,
      };
    },
  };

  /* ─────────────────────────────────────────
     ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  ───────────────────────────────────────── */
  function sourceTitle(title) {
    return Lampa.Utils.capitalizeFirstLetter(title.split('.')[0]);
  }

  function isVIP(element) {
    return /vip\.mp4/.test(element.video);
  }

  function qualityDefault(qualitys) {
    var preferably = Lampa.Storage.get('video_quality_default', '1080') + 'p';
    var url;
    if (qualitys) {
      for (var q in qualitys) {
        if (q.indexOf(preferably) === 0) url = qualitys[q];
      }
      if (!url) url = qualitys[Lampa.Arrays.getKeys(qualitys)[0]];
    }
    return url;
  }

  function modal(text) {
    var controller = Lampa.Controller.enabled().name;
    var content =
      '<div class="about"><div>' +
      (text || 'Доступ ограничен') +
      '</div><div class="about__contacts"><div>' +
      '<small>unic_id</small><br>' + luid +
      '</div></div></div>';
    Lampa.Modal.open({
      title: 'Доступ ограничен',
      html:  $(content),
      size:  'medium',
      onBack: function () {
        Lampa.Modal.close();
        Lampa.Controller.toggle(controller);
      },
    });
  }

  function fixCards(json) {
    json.forEach(function (m) {
      m.background_image = m.picture;
      m.poster = m.picture;
      m.img    = m.picture;
      m.name   = Lampa.Utils.capitalizeFirstLetter(m.name).replace(/&(.*?);/g, '');

      // Проставляем bookmark-статус из локального хранилища
      if (!m.bookmark) {
        var uid = BookmarkStorage.has(m);
        m.bookmark = uid ? { uid: uid } : {};
      }
    });
  }

  function fixList(list) {
    list.forEach(function (a) {
      if (!a.quality && a.time) a.quality = a.time;
    });
    return list;
  }

  /* ─────────────────────────────────────────
     ПРЕВЬЮ
  ───────────────────────────────────────── */
  function hidePreview() {
    clearTimeout(preview_timer);
    if (preview_video) {
      var vid = preview_video.find('video');
      var p;
      try { p = vid.pause(); } catch (e) {}
      if (p !== undefined) { p.then(function(){}).catch(function(){}); }
      preview_video.addClass('hide');
      preview_video = false;
    }
  }

  function preview(target, element) {
    hidePreview();
    preview_timer = setTimeout(function () {
      if (!element.preview || !Lampa.Storage.field('sisi_preview')) return;
      var video     = target.find('video');
      var container = target.find('.sisi-video-preview');
      if (!video.length) {
        video     = $('<video>');
        container = $('<div class="sisi-video-preview">');
        container.css({ position:'absolute', width:'100%', height:'100%',
                         left:0, top:0, overflow:'hidden', borderRadius:'1em' });
        video.css({ position:'absolute', width:'100%', height:'100%',
                    left:0, top:0, objectFit:'cover' });
        container.append(video);
        target.find('.card__view').append(container);
        video[0].src = element.preview;
        video[0].addEventListener('ended', function () { container.addClass('hide'); });
        video[0].load();
      }
      preview_video = container;
      var pp;
      try { pp = video[0].play(); } catch (e) {}
      if (pp !== undefined) { pp.then(function(){}).catch(function(){}); }
      container.removeClass('hide');
    }, 1500);
  }

  /* ─────────────────────────────────────────
     ВОСПРОИЗВЕДЕНИЕ
  ───────────────────────────────────────── */
  function play(element) {
    var ctrl = Lampa.Controller.enabled().name;

    if (isVIP(element)) { return modal(); }

    if (element.json) {
      Lampa.Loading.start(function () { network.clear(); Lampa.Loading.stop(); });

      Api.qualitys(
        element.video,
        function (data) {
          if (data.error) {
            Lampa.Noty.show(Lampa.Lang.translate('torrent_parser_nofiles'));
            Lampa.Loading.stop();
            return;
          }
          var qualitys  = data.qualitys || data;
          var recomends = data.recomends || [];
          Lampa.Loading.stop();

          var video = {
            title:   element.name,
            url:     qualityDefault(qualitys),
            quality: qualitys,
            headers: data.headers_stream,
          };
          Lampa.Player.play(video);

          if (recomends.length) {
            recomends.forEach(function (a) {
              a.title    = Lampa.Utils.shortText(a.name, 50);
              a.icon     = '<img class="size-youtube" src="' + a.picture + '" />';
              a.template = 'selectbox_icon';
              a.url      = function (call) {
                if (a.json) {
                  Api.qualitys(a.video, function (d) {
                    a.quality = d.qualitys;
                    a.url     = qualityDefault(d.qualitys);
                    call();
                  });
                } else { a.url = a.video; call(); }
              };
            });
            Lampa.Player.playlist(recomends);
          } else {
            Lampa.Player.playlist([video]);
          }
          Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
        },
        function () {
          Lampa.Noty.show(Lampa.Lang.translate('torrent_parser_nofiles'));
          Lampa.Loading.stop();
        },
      );
    } else {
      if (element.qualitys) {
        for (var i in element.qualitys) { /* уже абсолютные URL */ }
      }
      var video = {
        title:       element.name,
        url:         qualityDefault(element.qualitys) || element.video,
        url_reserve: qualityDefault(element.qualitys_proxy) || element.video_reserve || '',
        quality:     element.qualitys,
      };
      Lampa.Player.play(video);
      Lampa.Player.playlist([video]);
      Lampa.Player.callback(function () { Lampa.Controller.toggle(ctrl); });
    }
  }

  /* ─────────────────────────────────────────
     КОНТЕКСТНОЕ МЕНЮ КАРТОЧКИ
  ───────────────────────────────────────── */
  function cardMenu(target, card_data) {
    if (!card_data.bookmark) return;

    var cm = [
      { title: !card_data.bookmark.uid ? 'В закладки' : 'Удалить из закладок' },
    ];

    if (card_data.related) {
      cm.push({ title: 'Похожие', related: true });
    }
    if (card_data.model) {
      cm.push({ title: card_data.model.name, model: true });
    }
    if (Lampa.Platform.is('android') && Lampa.Storage.field('player') !== 'inner') {
      cm.push({ title: 'Плеер Lampa', lampaplayer: true });
    }

    Lampa.Select.show({
      title: 'Меню',
      items: cm,
      onSelect: function (m) {
        if (m.model) {
          Lampa.Activity.push({
            url:       GITHUB_BASE + '/' + card_data.model.uri,
            title:     'Модель - ' + card_data.model.name,
            component: 'sisi_view_' + Defined.use_api,
            page: 1,
          });
        } else if (m.related) {
          Lampa.Activity.push({
            url:       card_data.video + '&related=true',
            title:     'Похожие - ' + card_data.title,
            component: 'sisi_view_' + Defined.use_api,
            page: 1,
          });
        } else if (m.lampaplayer) {
          Lampa.Controller.toggle('content');
          play(card_data);
        } else {
          Api.bookmark(card_data, !card_data.bookmark.uid, function () {
            Lampa.Noty.show('Успешно');
          });
          Lampa.Controller.toggle('content');
        }
      },
      onBack: function () { Lampa.Controller.toggle('content'); },
    });
  }

  /* ─────────────────────────────────────────
     UTILS
  ───────────────────────────────────────── */
  var Utils = {
    sourceTitle: sourceTitle,
    play:        play,
    fixCards:    fixCards,
    isVIP:       isVIP,
    preview:     preview,
    hidePreview: hidePreview,
    fixList:     fixList,
    menu:        cardMenu,
  };

  /* ─────────────────────────────────────────
     API — GITHUB STATIC
  ───────────────────────────────────────── */
  var menu_cache = null; // кеш меню из /ss

  function ApiGithub() {
    var _this   = this;
    var net     = new Lampa.Reguest();

    /* ── Загрузка меню из /ss ── */
    this.menu = function (success, error) {
      if (menu_cache) { return success(menu_cache); }

      net.silent(
        GITHUB_BASE + '/ss',
        function (data) {
          var channels = data.channels || (Array.isArray(data) ? data : null);
          if (!channels) { return error('Неверный формат /ss'); }

          // Добавляем закладки отдельным пунктом если нет в JSON
          var hasBookmarks = channels.some(function (c) {
            return c.playlist_url === BOOKMARKS_URL;
          });
          if (!hasBookmarks) {
            channels.unshift({
              title:        'Закладки',
              playlist_url: BOOKMARKS_URL,
            });
          }

          // Добавляем phub если нет в JSON
          var hasPhub = channels.some(function (c) {
            return c.playlist_url && c.playlist_url.indexOf('/phub') !== -1;
          });
          if (!hasPhub) {
            channels.push({
              title:        'phub.net',
              playlist_url: GITHUB_BASE + '/phub',
            });
          }

          menu_cache = channels;
          success(menu_cache);
        },
        function () {
          // Фоллбек: минимальное меню из закладок + phub
          menu_cache = [
            { title: 'Закладки',  playlist_url: BOOKMARKS_URL },
            { title: 'phub.net',  playlist_url: GITHUB_BASE + '/phub' },
          ];
          success(menu_cache);
        },
      );
    };

    /* ── Загрузка отдельной страницы / плейлиста ── */
    this.view = function (params, success, error) {
      var url  = params.url;
      var page = params.page || 1;

      // Локальные закладки
      if (url === BOOKMARKS_URL || url.indexOf('/bookmarks') !== -1) {
        var bdata = BookmarkStorage.toResponse();
        Utils.fixCards(bdata.results);
        return success(bdata);
      }

      // GitHub /phub
      if (url.indexOf('/phub') !== -1) {
        net.silent(
          GITHUB_BASE + '/phub',
          function (json) {
            var list = json.list || json.results || (Array.isArray(json) ? json : null);
            if (!list) { return error(); }
            var result = {
              results:     Utils.fixList(list),
              collection:  true,
              total_pages: json.total_pages || 1,
            };
            Utils.fixCards(result.results);
            success(result);
          },
          error,
        );
        return;
      }

      // Прочие внешние URL (динамические источники)
      var u = Lampa.Utils.addUrlComponent(url, 'pg=' + page);
      net.silent(
        u,
        function (json) {
          if (json.list) {
            json.results     = Utils.fixList(json.list);
            json.collection  = true;
            json.total_pages = json.total_pages || 30;
            Utils.fixCards(json.results);
            delete json.list;
            success(json);
          } else if (json.results) {
            json.collection  = true;
            json.total_pages = json.total_pages || 1;
            Utils.fixCards(json.results);
            success(json);
          } else {
            error();
          }
        },
        error,
      );
    };

    /* ── Закладки (локальные) ── */
    this.bookmark = function (element, add, call) {
      if (add) {
        BookmarkStorage.add(element);
      } else {
        if (element.bookmark && element.bookmark.uid) {
          BookmarkStorage.remove(element.bookmark.uid);
          element.bookmark = {};
        }
      }
      call(true);
    };

    /* ── Загрузка качества видео ── */
    this.qualitys = function (video_url, oncomplite, error) {
      var sep = video_url.indexOf('?') !== -1 ? '&' : '?';
      net.silent(video_url + sep + 'json=true', oncomplite, error);
    };

    /* ── Плейлист (главная / поиск) ── */
    this.playlist = function (add_url_query, oncomplite, error) {
      var load = function () {
        var items   = menu_cache || [];
        var visible = items.filter(function (m) {
          return m.playlist_url !== BOOKMARKS_URL; // закладки не на главной
        });

        if (!visible.length) { return error(); }

        var status = new Lampa.Status(visible.length);

        status.onComplite = function (data) {
          var result = [];
          visible.forEach(function (m) {
            var key = m.playlist_url;
            if (data[key] && data[key].results && data[key].results.length) {
              result.push(data[key]);
            }
          });
          if (result.length) oncomplite(result);
          else error();
        };

        visible.forEach(function (m) {
          var purl = m.playlist_url;

          // /phub — GitHub static, клиентская фильтрация для поиска
          if (purl.indexOf('/phub') !== -1) {
            net.silent(
              GITHUB_BASE + '/phub',
              function (json) {
                var list = json.list || json.results || (Array.isArray(json) ? json : []);
                var query = add_url_query.replace(/^[\?&]*search=/, '').replace(/^[\?&]+/, '');

                if (query) {
                  var q = decodeURIComponent(query).toLowerCase();
                  list  = list.filter(function (it) {
                    return (it.name || '').toLowerCase().indexOf(q) !== -1;
                  });
                }

                if (!list.length) { return status.error(); }

                var resp = {
                  title:      Utils.sourceTitle(m.title),
                  results:    Utils.fixList(list),
                  url:        purl,
                  collection: true,
                  line_type:  'none',
                  card_events: {
                    onMenu:  Utils.menu,
                    onEnter: function (card, element) {
                      Utils.hidePreview(); Utils.play(element);
                    },
                  },
                };
                Utils.fixCards(resp.results);
                status.append(purl, resp);
              },
              status.error.bind(status),
            );
            return;
          }

          // Прочие динамические источники
          var sep  = purl.indexOf('?') !== -1 ? '&' : '?';
          var full = purl.replace(/[\?&]+$/, '') + sep +
                     add_url_query.replace(/^[\?&]+/, '');

          net.silent(
            full,
            function (json) {
              var list = json.list || json.results;
              if (!list) { return status.error(); }
              var resp = {
                title:      Utils.sourceTitle(m.title),
                results:    Utils.fixList(list),
                url:        purl,
                collection: true,
                line_type:  'none',
                card_events: {
                  onMenu:  Utils.menu,
                  onEnter: function (card, element) {
                    Utils.hidePreview(); Utils.play(element);
                  },
                },
              };
              Utils.fixCards(resp.results);
              delete resp.list;
              status.append(purl, resp);
            },
            status.error.bind(status),
          );
        });
      };

      if (menu_cache) load();
      else _this.menu(load, error);
    };

    this.main = function (params, oncomplite, error) {
      this.playlist('', oncomplite, error);
    };

    this.search = function (params, oncomplite, error) {
      this.playlist('?search=' + encodeURIComponent(params.query), oncomplite, error);
    };

    this.clear = function () { net.clear(); };
  }

  var Api = new ApiGithub();

  /* ─────────────────────────────────────────
     КОМПОНЕНТ: SISI (главная — все каналы)
  ───────────────────────────────────────── */
  function Sisi(object) {
    var comp = new Lampa.InteractionMain(object);

    comp.create = function () {
      this.activity.loader(true);
      Api.main(object, this.build.bind(this), this.empty.bind(this));
      return this.render();
    };

    comp.empty = function (er) {
      var _this = this;
      var empty = new Lampa.Empty({
        descr: typeof er === 'string' ? er : Lampa.Lang.translate('empty_text_two'),
      });
      Lampa.Activity.all().forEach(function (active) {
        if (_this.activity === active.activity) {
          active.activity.render()
            .find('.activity__body > div')[0]
            .appendChild(empty.render(true));
        }
      });
      this.start = empty.start.bind(empty);
      this.activity.loader(false);
      this.activity.toggle();
    };

    comp.onMore = function (data) {
      Lampa.Activity.push({
        url:       data.url,
        title:     data.title,
        component: 'sisi_view_' + Defined.use_api,
        page: 2,
      });
    };

    comp.onAppend = function (line) {
      line.onAppend = function (card) {
        var origFocus = card.onFocus;
        card.onFocus  = function (target, card_data) {
          origFocus(target, card_data);
          Utils.preview(target, card_data);
        };
      };
    };

    return comp;
  }

  /* ─────────────────────────────────────────
     КОМПОНЕНТ: VIEW (список / категория)
  ───────────────────────────────────────── */
  function View(object) {
    var comp    = new Lampa.InteractionCategory(object);
    var menuArr;

    comp.create = function () {
      var _this = this;
      this.activity.loader(true);

      Api.view(
        object,
        function (data) {
          menuArr = data.menu;

          if (menuArr) {
            menuArr.forEach(function (m) {
              var spl   = m.title.split(':');
              m.title   = spl[0].trim();
              if (spl[1]) {
                m.subtitle = Lampa.Utils.capitalizeFirstLetter(
                  spl[1].trim().replace(/all/i, 'Любой')
                );
              }
              if (m.submenu) {
                m.submenu.forEach(function (s) {
                  s.title = Lampa.Utils.capitalizeFirstLetter(
                    s.title.trim().replace(/all/i, 'Любой')
                  );
                });
              }
            });
          }

          _this.build(data);
          comp.render().find('.category-full').addClass('mapping--grid cols--3');

          if (!data.results.length && object.url.indexOf('bookmarks') !== -1) {
            Lampa.Noty.show('Удерживайте ОК на видео для добавления в закладки.', {
              time: 10000,
            });
          }
        },
        this.empty.bind(this),
      );
    };

    comp.nextPageReuest = function (object, resolve, reject) {
      Api.view(object, resolve.bind(this), reject.bind(this));
    };

    comp.cardRender = function (object, element, card) {
      card.onMenu  = function (target, card_data) { Utils.menu(target, card_data); };
      card.onEnter = function () { Utils.hidePreview(); Utils.play(element); };

      var origFocus = card.onFocus;
      card.onFocus  = function (target, card_data) {
        origFocus(target, card_data);
        Utils.preview(target, element);
      };
    };

    comp.filter = function () {
      if (!menuArr) return;
      var items  = menuArr.filter(function (m) { return !m.search_on; });
      var search = menuArr.find(function (m)   { return !!m.search_on; });
      if (!search) search = object.search_start;
      if (!items.length && !search) return;

      if (search) {
        Lampa.Arrays.insert(items, 0, {
          title: 'Найти',
          onSelect: function () {
            $('body').addClass('ambience--enable');
            Lampa.Input.edit(
              { title:'Поиск', value:'', free:true, nosave:true },
              function (value) {
                $('body').removeClass('ambience--enable');
                Lampa.Controller.toggle('content');
                if (value) {
                  var sep = search.playlist_url.indexOf('?') !== -1 ? '&' : '?';
                  Lampa.Activity.push({
                    url:          search.playlist_url + sep + 'search=' + encodeURIComponent(value),
                    title:        'Поиск - ' + value,
                    component:    'sisi_view_' + Defined.use_api,
                    search_start: search,
                    page: 1,
                  });
                }
              },
            );
          },
        });
      }

      Lampa.Select.show({
        title: 'Фильтр',
        items: items,
        onBack:   function () { Lampa.Controller.toggle('content'); },
        onSelect: function (a) {
          menuArr.forEach(function (m) { m.selected = (m === a); });
          if (a.submenu) {
            Lampa.Select.show({
              title: a.title,
              items: a.submenu,
              onBack:   function () { comp.filter(); },
              onSelect: function (b) {
                Lampa.Activity.push({
                  title:     object.title,
                  url:       b.playlist_url,
                  component: 'sisi_view_' + Defined.use_api,
                  page: 1,
                });
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

  /* ─────────────────────────────────────────
     ПОИСК
  ───────────────────────────────────────── */
  var Search = {
    title: 'Клубничка',

    search: function (params, oncomplite) {
      Api.search(params, oncomplite, function () { oncomplite([]); });
    },

    onCancel: function () { Api.clear(); },

    params: {
      lazy:      true,
      align_left: true,
      card_events: {
        onMenu: function () {},
      },
    },

    onMore: function (params, close) {
      close();
      var url = Lampa.Utils.addUrlComponent(
        params.data.url,
        'search=' + encodeURIComponent(params.query),
      );
      Lampa.Activity.push({
        url:       url,
        title:     'Поиск - ' + params.query,
        component: 'sisi_view_' + Defined.use_api,
        page: 2,
      });
    },

    onSelect: function (params) { Utils.play(params.element); },

    onAppend: function (card) { card.render().addClass('card--collection'); },
  };

  /* ─────────────────────────────────────────
     ЗАПУСК ПЛАГИНА
  ───────────────────────────────────────── */
  function startPlugin() {
    window['plugin_sisi_' + Defined.use_api + '_ready'] = true;

    var unic_id = Lampa.Storage.get('sisi_unic_id', '');
    if (!unic_id) {
      unic_id = Lampa.Utils.uid(8).toLowerCase();
      Lampa.Storage.set('sisi_unic_id', unic_id);
    }

    Lampa.Component.add('sisi_'      + Defined.use_api, Sisi);
    Lampa.Component.add('sisi_view_' + Defined.use_api, View);
    Lampa.Search.addSource(Search);

    /* ── Кнопка фильтра ── */
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
        '</svg></div>',
      );

      button.hide().on('hover:enter', function () {
        if (activi) {
          if (Lampa.Manifest.app_digital >= 300) activi.activity.component.filter();
          else activi.activity.component().filter();
        }
      });

      $('.head .open--search').after(button);

      Lampa.Listener.follow('activity', function (e) {
        if (e.type === 'start') activi = e.object;
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (activi && activi.component !== 'sisi_view_' + Defined.use_api) {
            button.hide();
            activi = false;
          }
        }, 1000);
        if (e.type === 'start' && e.component === 'sisi_view_' + Defined.use_api) {
          button.show();
          activi = e.object;
        }
      });
    }

    /* ── Настройки ── */
    function addSettings() {
      if (window.sisi_add_param_ready) return;
      window.sisi_add_param_ready = true;

      var ICON_SVG =
        '<svg width="200" height="243" viewBox="0 0 200 243" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M187.714 130.727C206.862 90.1515 158.991 64.2019 100.983 64.2019C42.9759 64.2019 -4.33044 91.5669 10.875 130.727C26.0805 169.888 63.2501 235.469 100.983 234.997C138.716 234.526 168.566 171.303 187.714 130.727Z" stroke="currentColor" stroke-width="15"/>' +
        '<path d="M102.11 62.3146C109.995 39.6677 127.46 28.816 169.692 24.0979C172.514 56.1811 135.338 64.2018 102.11 62.3146Z" stroke="currentColor" stroke-width="15"/>' +
        '<path d="M90.8467 62.7863C90.2285 34.5178 66.0667 25.0419 31.7127 33.063C28.8904 65.1461 68.8826 62.7863 90.8467 62.7863Z" stroke="currentColor" stroke-width="15"/>' +
        '<path d="M100.421 58.5402C115.627 39.6677 127.447 13.7181 85.2149 9C82.3926 41.0832 83.5258 35.4214 100.421 58.5402Z" stroke="currentColor" stroke-width="15"/>' +
        '<rect x="39.0341" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '<rect x="90.8467" y="92.0388" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '<rect x="140.407" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '<rect x="116.753" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '<rect x="64.9404" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '<rect x="93.0994" y="176.021" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '</svg>';

      Lampa.SettingsApi.addComponent({
        component: 'sisi',
        name:      Lampa.Lang.translate('lampac_sisiname'),
        icon:      ICON_SVG,
      });

      Lampa.SettingsApi.addParam({
        component: 'sisi',
        param: { name:'sisi_preview', type:'trigger', values:'', default:true },
        field: {
          name:        'Предпросмотр',
          description: 'Показывать предпросмотр при наведении на карточку',
        },
        onRender: function () {},
      });

      // Настройка GitHub источника (raw / pages)
      Lampa.SettingsApi.addParam({
        component: 'sisi',
        param: {
          name:    'sisi_github_source',
          type:    'select',
          values:  { raw:'GitHub Raw', pages:'GitHub Pages' },
          default: 'raw',
        },
        field: {
          name:        'Источник GitHub',
          description: 'Откуда загружать данные меню и phub',
        },
        onRender: function (item) {
          item.on('change', function () {
            var val = Lampa.Storage.field('sisi_github_source');
            GITHUB_BASE = val === 'pages' ? Defined.github_pages : Defined.github_raw;
            menu_cache  = null; // сброс кеша меню
          });
        },
      });
    }

    /* ── Кнопка в меню ── */
    function add() {
      var ICON_SVG =
        '<svg width="200" height="243" viewBox="0 0 200 243" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M187.714 130.727C206.862 90.1515 158.991 64.2019 100.983 64.2019C42.9759 64.2019 -4.33044 91.5669 10.875 130.727C26.0805 169.888 63.2501 235.469 100.983 234.997C138.716 234.526 168.566 171.303 187.714 130.727Z" stroke="currentColor" stroke-width="15"/>' +
        '<path d="M102.11 62.3146C109.995 39.6677 127.46 28.816 169.692 24.0979C172.514 56.1811 135.338 64.2018 102.11 62.3146Z" stroke="currentColor" stroke-width="15"/>' +
        '<path d="M90.8467 62.7863C90.2285 34.5178 66.0667 25.0419 31.7127 33.063C28.8904 65.1461 68.8826 62.7863 90.8467 62.7863Z" stroke="currentColor" stroke-width="15"/>' +
        '<path d="M100.421 58.5402C115.627 39.6677 127.447 13.7181 85.2149 9C82.3926 41.0832 83.5258 35.4214 100.421 58.5402Z" stroke="currentColor" stroke-width="15"/>' +
        '<rect x="39.0341" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '<rect x="90.8467" y="92.0388" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '<rect x="140.407" y="98.644" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '<rect x="116.753" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '<rect x="64.9404" y="139.22" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '<rect x="93.0994" y="176.021" width="19.1481" height="30.1959" rx="9.57407" fill="currentColor"/>' +
        '</svg>';

      var button = $(
        '<li class="menu__item selector" data-action="sisi">' +
        '<div class="menu__ico">' + ICON_SVG + '</div>' +
        '<div class="menu__text">' + Lampa.Lang.translate('lampac_sisiname') + '</div>' +
        '</li>',
      );

      button.on('hover:enter', function () {
        if (!Lampa.ParentalControl) {
          Lampa.ParentalControl = {
            query: function (ok) { if (typeof ok === 'function') ok(); },
          };
        }
        Lampa.ParentalControl.query(function () {
          Api.menu(
            function (data) {
              var items = [{ title: 'Все' }];
              data.forEach(function (a) { a.title = Utils.sourceTitle(a.title); });
              items = items.concat(data);

              Lampa.Select.show({
                title: 'Разделы',
                items: items,
                onSelect: function (a) {
                  if (a.playlist_url) {
                    Lampa.Activity.push({
                      url:       a.playlist_url,
                      title:     a.title,
                      component: 'sisi_view_' + Defined.use_api,
                      page: 1,
                    });
                  } else {
                    Lampa.Activity.push({
                      url:       '',
                      title:     Lampa.Lang.translate('lampac_sisiname'),
                      component: 'sisi_' + Defined.use_api,
                      page: 1,
                    });
                  }
                },
                onBack: function () { Lampa.Controller.toggle('menu'); },
              });
            },
            function (e) { if (typeof e === 'string') modal(e); },
          );
        }, function () {});
      });

      $('.menu .menu__list').eq(0).append(button);
    }

    /* ── init ── */
    function init() {
      if (window.lampa_settings && window.lampa_settings.sisi_app) {
        Api.menu(function (data) {
          data.forEach(function (a) {
            a.title = Utils.sourceTitle(a.title);
            Lampa.Menu.addButton(
              '<img src="./img/icons/settings/more.svg">',
              a.title,
              function () {
                Lampa.Activity.push({
                  url:       a.playlist_url || '',
                  title:     a.title,
                  component: a.playlist_url
                    ? 'sisi_view_' + Defined.use_api
                    : 'sisi_' + Defined.use_api,
                  page: 1,
                });
              },
            );
          });
        }, function () {});
      } else {
        add();
      }

      addFilter();
      addSettings();
    }

    if (window.appready) init();
    else {
      Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
      });
    }
  }

  /* ── Старт ── */
  if (!window['plugin_sisi_' + Defined.use_api + '_ready']) {
    startPlugin();
  }

})();
