/**
 * ============================================================
 *  LAMPA PLUGIN — ZonaFilm v1.1.0
 * ============================================================
 *
 *  ИСПРАВЛЕНИЯ v1.1:
 *    ✅ Данные загружаются ВНУТРИ компонента (не до push)
 *    ✅ Показывается спиннер загрузки
 *    ✅ Отладочные уведомления на каждом этапе
 *    ✅ CSS встраивается автоматически (не нужен отдельный файл)
 *
 *  СТРУКТУРА:
 *    Меню (Select) → Карточки (Component) → Детали (Select)
 * ============================================================
 */

(function () {
    'use strict';

    /* ==========================================================
     *  БЛОК 1: КОНФИГУРАЦИЯ
     * ========================================================== */
    var CONFIG = {
        debug: true,
        ver: '1.1.0',
        site: 'https://zonafilm.ru',
        buildId: '39MEgPaxeFXNBOSc6BloZ',
        proxy: [
            'https://api.codetabs.com/v1/proxy?quest={u}',
            'https://corsproxy.io/?{u}',
            'https://api.allorigins.win/raw?url={u}'
        ],
        pi: 0,
        timeout: 15000
    };

    /* ==========================================================
     *  БЛОК 2: ОТЛАДКА
     * ========================================================== */
    var D = {
        log: function(t,m){
            if(CONFIG.debug) console.log('[ZF]['+t+']',m);
        },
        err: function(t,m){
            console.error('[ZF][ERR]['+t+']',m);
        },
        noty: function(m){
            try{ Lampa.Noty.show(m); }catch(e){}
        }
    };

    D.log('Boot','v'+CONFIG.ver);

    /* ==========================================================
     *  БЛОК 3: СЕТЬ — с подробной отладкой
     * ========================================================== */
    var Net = {
        get: function(url, ok, fail, _i){
            var i = typeof _i === 'number' ? _i : CONFIG.pi;

            if(i >= CONFIG.proxy.length){
                D.err('Net','Все прокси недоступны для: '+url);
                D.noty('⚠ Сеть: все прокси недоступны');
                if(fail) fail();
                return;
            }

            var pu = CONFIG.proxy[i].replace('{u}', encodeURIComponent(url));
            D.log('Net','Прокси #'+i+': '+url);

            $.ajax({
                url: pu,
                timeout: CONFIG.timeout,
                success: function(data){
                    CONFIG.pi = i;
                    D.log('Net','✅ Успех #'+i+', данные: '+(typeof data === 'string' ? data.length+' символов' : typeof data));
                    if(ok) ok(data);
                },
                error: function(xhr, status, err){
                    D.log('Net','❌ Прокси #'+i+' ошибка: '+status+' '+err);
                    Net.get(url, ok, fail, i+1);
                }
            });
        }
    };

    /* ==========================================================
     *  БЛОК 4: ИСТОЧНИК ZONAFILM
     * ========================================================== */
    var Src = {
        _bid: function(cb){
            if(CONFIG.buildId){
                D.log('Src','BuildId: '+CONFIG.buildId);
                cb(CONFIG.buildId);
                return;
            }
            D.log('Src','Определяю buildId из HTML...');
            D.noty('⏳ Определяю buildId...');

            Net.get(CONFIG.site+'/movies', function(html){
                if(typeof html !== 'string'){
                    D.err('Src','HTML не строка: '+typeof html);
                    cb(null);
                    return;
                }
                var m = html.match(/"buildId"\s*:\s*"([^"]+)"/);
                if(m && m[1]){
                    CONFIG.buildId = m[1];
                    D.log('Src','BuildId найден: '+m[1]);
                    cb(m[1]);
                } else {
                    D.err('Src','BuildId не найден');
                    cb(null);
                }
            }, function(){
                D.err('Src','Загрузка HTML для buildId провалена');
                cb(null);
            });
        },

        _list: function(pp){
            var a = pp.data || pp.items || pp.movies || [];
            if(!Array.isArray(a)) a = a.items || a.results || [];
            D.log('Src','_list: найдено '+a.length+' элементов');
            return a.map(function(m){
                return {
                    title: m.title||'',
                    slug: m.slug||'',
                    year: m.year||0,
                    poster: m.cover_url||'',
                    rating: m.rating||0,
                    quality: m.best_quality||'',
                    description: m.description||'',
                    directors: m.directors||'',
                    duration: m.duration||0
                };
            });
        },

        main: function(page, cb){
            var self = this;
            D.log('Src','main() page='+page);

            this._bid(function(bid){
                if(!bid){
                    D.err('Src','Нет buildId');
                    D.noty('⚠ Не удалось получить buildId');
                    cb([]);
                    return;
                }

                var url = CONFIG.site+'/_next/data/'+bid+'/movies.json';
                if(page > 1) url += '?page='+page;

                D.log('Src','Запрос: '+url);
                D.noty('⏳ Загрузка каталога...');

                Net.get(url, function(raw){
                    try {
                        var j = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        D.log('Src','JSON получен, ключи: '+Object.keys(j).join(','));

                        var pp = j.pageProps || j;
                        D.log('Src','pageProps ключи: '+Object.keys(pp).join(','));

                        var items = self._list(pp);
                        D.log('Src','Фильмов: '+items.length);

                        if(items.length > 0){
                            cb(items);
                            return;
                        }

                        D.err('Src','Список пуст');
                        cb([]);
                    } catch(e){
                        D.err('Src','Ошибка парсинга: '+e.message);
                        D.noty('⚠ Ошибка парсинга данных');
                        cb([]);
                    }
                }, function(){
                    D.err('Src','Запрос каталога провален');
                    D.noty('⚠ Не удалось загрузить каталог');
                    cb([]);
                });
            });
        },

        getDetails: function(slug, cb){
            var self = this;
            this._bid(function(bid){
                if(!bid){ cb(null); return; }
                var url = CONFIG.site+'/_next/data/'+bid+'/movies/'+slug+'.json';
                D.log('Src','Детали: '+url);

                Net.get(url, function(raw){
                    try {
                        var j = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        var d = (j.pageProps||j).data;
                        if(d){
                            var g=[], c=[];
                            ((d.meta&&d.meta.tags)||[]).forEach(function(t){
                                if(t.type==='genre') g.push(t.title);
                                if(t.type==='country') c.push(t.title);
                            });
                            var act = ((d.meta&&d.meta.actors)||[]).map(function(a){
                                return a.name||'';
                            });
                            cb({
                                title:d.title||'', originalTitle:d.title_original||'',
                                slug:d.slug||'', year:d.year||0,
                                description:d.description||'',
                                poster:d.cover_url||'',
                                backdrop:(j.pageProps&&j.pageProps.backdropUrl)||'',
                                duration:d.duration||0, rating:d.rating||0,
                                ratingKP:d.rating_kp||0, ratingIMDB:d.rating_imdb||0,
                                quality:d.best_quality||'', genres:g, countries:c,
                                directors:d.directors||'', writers:d.writers||'',
                                actors:act, ageLimit:d.age_limit||0
                            });
                            return;
                        }
                    }catch(e){}
                    cb(null);
                }, function(){ cb(null); });
            });
        },

        search: function(q, cb){
            D.log('Src','search: "'+q+'"');
            var lq = q.toLowerCase();
            this.main(1, function(items){
                var found = items.filter(function(m){
                    return m.title.toLowerCase().indexOf(lq) !== -1;
                });
                D.log('Src','Найдено: '+found.length+' из '+items.length);
                cb(found);
            });
        },

        byGenre: function(slug, cb){
            var self = this;
            D.log('Src','byGenre: '+slug);

            this._bid(function(bid){
                if(!bid){ cb([]); return; }
                var url = CONFIG.site+'/_next/data/'+bid+
                    '/movies/filter/genre-'+slug+'.json';

                D.log('Src','Жанр URL: '+url);
                D.noty('⏳ Загрузка жанра...');

                Net.get(url, function(raw){
                    try {
                        var j = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        var pp = j.pageProps || j;
                        var items = self._list(pp);
                        D.log('Src','Жанр: '+items.length+' фильмов');
                        cb(items);
                    } catch(e){
                        D.err('Src','Жанр парсинг: '+e.message);
                        cb([]);
                    }
                }, function(){
                    D.err('Src','Жанр запрос провален');
                    cb([]);
                });
            });
        },

        streamUrl: function(slug){ return CONFIG.site+'/movies/'+slug; },

        cats: function(){
            return [
                {title:'Боевик',slug:'boevik'},
                {title:'Комедия',slug:'komediia'},
                {title:'Драма',slug:'drama'},
                {title:'Ужасы',slug:'uzhasy'},
                {title:'Фантастика',slug:'fantastika'},
                {title:'Триллер',slug:'triller'},
                {title:'Мелодрама',slug:'melodrama'},
                {title:'Детектив',slug:'detektiv'},
                {title:'Криминал',slug:'kriminal'},
                {title:'Приключения',slug:'prikliucheniia'},
                {title:'Фэнтези',slug:'fentezi'},
                {title:'Мультфильм',slug:'multfilm'},
                {title:'Семейный',slug:'semeinyi'},
                {title:'Военный',slug:'voennyi'}
            ];
        }
    };

    /* ==========================================================
     *  БЛОК 5: CSS
     * ========================================================== */
    var CSS = '\
        .zf-wrap{padding:1em}\
        .zf-grid{display:flex;flex-wrap:wrap;gap:.6em}\
        .zf-card{width:10.5em;position:relative;transition:transform .15s}\
        .zf-card.focus{transform:scale(1.08)}\
        .zf-poster{width:100%;height:15em;border-radius:.4em;overflow:hidden;background:#111}\
        .zf-poster img{width:100%;height:100%;object-fit:cover}\
        .zf-badge{position:absolute;top:.3em;left:.3em;background:rgba(0,0,0,.75);\
            padding:.1em .35em;border-radius:.2em;font-size:.7em;font-weight:700}\
        .zf-bg{color:#66BB6A}.zf-by{color:#FFA726}.zf-br{color:#EF5350}\
        .zf-ql{position:absolute;top:.3em;right:.3em;background:#E65100;color:#fff;\
            padding:.05em .3em;border-radius:.2em;font-size:.6em;font-weight:700;\
            text-transform:uppercase}\
        .zf-name{color:#eee;font-size:.78em;margin-top:.3em;overflow:hidden;\
            text-overflow:ellipsis;white-space:nowrap}\
        .zf-year{color:#666;font-size:.7em}\
        .zf-loading{display:flex;align-items:center;justify-content:center;\
            padding:3em;color:#888;font-size:1.1em}\
        .zf-spin{display:inline-block;width:1.5em;height:1.5em;border:3px solid #333;\
            border-top-color:#4FC3F7;border-radius:50%;margin-right:.6em;\
            animation:zfspin .7s linear infinite}\
        @keyframes zfspin{to{transform:rotate(360deg)}}\
        .zf-empty{text-align:center;padding:3em;color:#666;font-size:1.1em}\
    ';
    $('#zf-css').remove();
    $('<style>').attr('id','zf-css').text(CSS).appendTo('head');


    /* ==========================================================
     *  БЛОК 6: ГЛАВНОЕ МЕНЮ (Select)
     * ========================================================== */
    function showMainMenu(){
        D.log('Menu','Открываю');

        var items = [];

        items.push({
            title: '🔍 Поиск фильмов',
            subtitle: 'Найти по названию',
            action: 'search'
        });

        items.push({
            title: '📽 Все фильмы',
            subtitle: 'Популярные и новые',
            action: 'all'
        });

        items.push({
            title: '━━━ Жанры ━━━',
            subtitle: '', action: 'none'
        });

        Src.cats().forEach(function(c){
            items.push({
                title: '📂 ' + c.title,
                subtitle: '',
                action: 'genre',
                genre: c.slug,
                genreTitle: c.title
            });
        });

        items.push({
            title: '━━━━━━━━━━━',
            subtitle: '', action: 'none'
        });

        items.push({
            title: '← Назад',
            subtitle: 'Вернуться в Lampa',
            action: 'back'
        });

        Lampa.Select.show({
            title: '🎬 ZonaFilm',
            items: items,
            onBack: function(){
                Lampa.Controller.toggle('content');
            },
            onSelect: function(item){
                D.log('Menu','Выбрано: '+item.action);

                if(item.action === 'back' || item.action === 'none'){
                    Lampa.Controller.toggle('content');
                    return;
                }

                if(item.action === 'search'){
                    doSearch();
                    return;
                }

                if(item.action === 'all'){
                    /**
                     * ✅ ИСПРАВЛЕНО: сначала push, потом загрузка
                     * Передаём параметры загрузки в компонент
                     */
                    Lampa.Activity.push({
                        url: '',
                        title: 'Все фильмы',
                        component: 'zf_cards',
                        page: 1,
                        zf_mode: 'all'
                    });
                    return;
                }

                if(item.action === 'genre'){
                    Lampa.Activity.push({
                        url: '',
                        title: item.genreTitle,
                        component: 'zf_cards',
                        page: 1,
                        zf_mode: 'genre',
                        zf_genre: item.genre
                    });
                    return;
                }
            }
        });
    }

    /* ==========================================================
     *  БЛОК 7: ПОИСК
     * ========================================================== */
    function doSearch(){
        Lampa.Input.edit({
            title: 'Поиск фильмов',
            value: '', free: true, nosave: true
        }, function(val){
            if(val && val.trim()){
                Lampa.Activity.push({
                    url: '',
                    title: '🔍 ' + val.trim(),
                    component: 'zf_cards',
                    page: 1,
                    zf_mode: 'search',
                    zf_query: val.trim()
                });
            } else {
                showMainMenu();
            }
        });
    }

    /* ==========================================================
     *  БЛОК 8: КОМПОНЕНТ КАРТОЧЕК
     *  ---------------------------------------------------------
     *  ✅ ДАННЫЕ ЗАГРУЖАЮТСЯ ВНУТРИ КОМПОНЕНТА
     *  Параметры приходят через object:
     *    zf_mode: 'all' | 'genre' | 'search'
     *    zf_genre: slug жанра
     *    zf_query: поисковый запрос
     * ========================================================== */
    function CardsComp(object){
        var self   = this;
        var scroll = new Lampa.Scroll({mask:true, over:true, step:250});
        var body   = $('<div class="zf-wrap"></div>');
        var grid   = $('<div class="zf-grid"></div>');

        var mode   = object.zf_mode  || 'all';
        var genre  = object.zf_genre || '';
        var query  = object.zf_query || '';

        this.create = function(){
            D.log('Cards','create mode='+mode+' genre='+genre+' query='+query);

            /* Показываем спиннер */
            var loader = $(
                '<div class="zf-loading" id="zf-loader">' +
                '<div class="zf-spin"></div>Загрузка фильмов...</div>'
            );
            body.append(loader);
            body.append(grid);
            scroll.append(body);

            /* Загружаем данные в зависимости от режима */
            if(mode === 'search'){
                D.log('Cards','Поиск: '+query);
                Src.search(query, function(items){
                    self.onDataLoaded(items);
                });
            } else if(mode === 'genre'){
                D.log('Cards','Жанр: '+genre);
                Src.byGenre(genre, function(items){
                    self.onDataLoaded(items);
                });
            } else {
                D.log('Cards','Все фильмы');
                Src.main(1, function(items){
                    self.onDataLoaded(items);
                });
            }
        };

        /**
         * Данные загружены — показываем карточки
         */
        this.onDataLoaded = function(items){
            D.log('Cards','Данные получены: '+items.length);

            /* Убираем спиннер */
            $('#zf-loader').remove();

            if(!items.length){
                grid.html('<div class="zf-empty">📭 Ничего не найдено</div>');
                D.noty('📭 Ничего не найдено');
                this.activate();
                return;
            }

            D.noty('✅ Найдено: '+items.length+' фильмов');

            /* Создаём карточки */
            items.forEach(function(m){
                var rc = m.rating >= 7 ? 'zf-bg' :
                         (m.rating >= 5 ? 'zf-by' : 'zf-br');

                var ql = m.quality ? m.quality.toUpperCase() : '';
                if(ql === 'LQ') ql = 'CAM';
                if(ql === 'MQ') ql = 'HD';

                var card = $([
                    '<div class="zf-card selector">',
                      '<div class="zf-poster">',
                        m.poster ?
                          '<img src="'+m.poster+'" loading="lazy"/>' :
                          '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#333;font-size:2.5em">🎬</div>',
                      '</div>',
                      m.rating > 0 ?
                        '<div class="zf-badge '+rc+'">★ '+m.rating.toFixed(1)+'</div>' : '',
                      ql ?
                        '<div class="zf-ql">'+ql+'</div>' : '',
                      '<div class="zf-name">'+m.title+'</div>',
                      '<div class="zf-year">'+(m.year||'')+'</div>',
                    '</div>'
                ].join(''));

                card.on('hover:enter', function(){
                    showMovieDetails(m.slug, m.title);
                });

                card.on('hover:focus', function(){
                    scroll.update($(this));
                });

                grid.append(card);
            });

            this.activate();
        };

        /**
         * ✅ Навигация bylampa
         */
        this.activate = function(){
            var count = scroll.render().find('.selector').length;
            D.log('Cards','activate selectors='+count);

            Lampa.Controller.add('content', {
                back: function(){
                    D.log('Cards','← back');
                    Lampa.Activity.backward();
                    setTimeout(showMainMenu, 300);
                }
            });

            Lampa.Controller.enable('content');
            Lampa.Controller.collectionSet(scroll.render());
            Lampa.Controller.collectionFocus(false, scroll.render());
        };

        this.start = function(){
            D.log('Cards','start');
            this.activate();
        };
        this.pause = function(){};
        this.stop = function(){};
        this.render = function(){ return scroll.render(); };
        this.destroy = function(){ scroll.destroy(); };
    }

    /* ==========================================================
     *  БЛОК 9: ДЕТАЛИ ФИЛЬМА (Select)
     * ========================================================== */
    function showMovieDetails(slug, title){
        D.log('Detail','Загрузка: '+slug);
        D.noty('⏳ '+title);

        Src.getDetails(slug, function(m){
            if(!m){
                D.noty('⚠ Не удалось загрузить');
                return;
            }

            var ratingText = '';
            if(m.rating > 0) ratingText += '★ '+m.rating.toFixed(1);
            if(m.ratingKP > 0) ratingText += '  КП: '+m.ratingKP.toFixed(1);
            if(m.ratingIMDB > 0) ratingText += '  IMDb: '+m.ratingIMDB.toFixed(1);

            var ql = m.quality ? m.quality.toUpperCase() : '';
            if(ql === 'LQ') ql = 'CAM';
            if(ql === 'MQ') ql = 'HD';

            var detailItems = [];

            detailItems.push({
                title: '▶ Смотреть',
                subtitle: m.title+(m.year?' ('+m.year+')':''),
                action: 'play'
            });

            if(ratingText){
                detailItems.push({
                    title: '⭐ Рейтинг',
                    subtitle: ratingText,
                    action: 'info'
                });
            }

            var yearDur = '';
            if(m.year) yearDur += m.year;
            if(m.duration) yearDur += ' • '+m.duration+' мин';
            if(ql) yearDur += ' • '+ql;
            if(m.ageLimit) yearDur += ' • '+m.ageLimit+'+';
            if(yearDur){
                detailItems.push({
                    title: '📅 Информация',
                    subtitle: yearDur,
                    action: 'info'
                });
            }

            if(m.genres.length){
                detailItems.push({
                    title: '🎭 Жанры',
                    subtitle: m.genres.join(', '),
                    action: 'info'
                });
            }

            if(m.countries.length){
                detailItems.push({
                    title: '🌍 Страна',
                    subtitle: m.countries.join(', '),
                    action: 'info'
                });
            }

            if(m.directors){
                detailItems.push({
                    title: '🎬 Режиссёр',
                    subtitle: m.directors,
                    action: 'info'
                });
            }

            if(m.actors.length){
                detailItems.push({
                    title: '👥 Актёры',
                    subtitle: m.actors.slice(0,6).join(', '),
                    action: 'info'
                });
            }

            if(m.description){
                var desc = m.description.length > 200 ?
                    m.description.substring(0,200)+'...' :
                    m.description;
                detailItems.push({
                    title: '📝 Описание',
                    subtitle: desc,
                    action: 'info'
                });
            }

            detailItems.push({
                title: '← Назад',
                subtitle: '',
                action: 'back'
            });

            Lampa.Select.show({
                title: '🎬 '+m.title+(m.year?' ('+m.year+')':''),
                items: detailItems,
                onBack: function(){
                    Lampa.Controller.toggle('content');
                },
                onSelect: function(item){
                    if(item.action === 'play'){
                        playMovie(m);
                        return;
                    }
                    if(item.action === 'back'){
                        Lampa.Controller.toggle('content');
                        return;
                    }
                }
            });
        });
    }

    /* ==========================================================
     *  БЛОК 10: ВОСПРОИЗВЕДЕНИЕ
     * ========================================================== */
    function playMovie(m){
        var url = Src.streamUrl(m.slug);
        D.log('Play',url);

        try {
            if(typeof Lampa.Android !== 'undefined' && Lampa.Android.openUrl){
                Lampa.Android.openUrl(url);
                return;
            }
        } catch(e){}

        D.noty('🔗 '+m.title);
        try { window.open(url,'_blank'); } catch(e){}
    }

    /* ==========================================================
     *  БЛОК 11: РЕГИСТРАЦИЯ + МЕНЮ + ЗАПУСК
     * ========================================================== */
    Lampa.Component.add('zf_cards', CardsComp);

    var ICO = '<svg viewBox="0 0 24 24" fill="currentColor">'+
        '<path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z'+
        'M8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2z'+
        'm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>';

    function addMenu(){
        if($('[data-action="zonafilm"]').length) return;
        var li = $('<li class="menu__item selector" data-action="zonafilm">'+
            '<div class="menu__ico">'+ICO+'</div>'+
            '<div class="menu__text">ZonaFilm</div></li>');
        li.on('hover:enter', function(){
            showMainMenu();
        });
        var list = $('.menu .menu__list');
        if(list.length){ list.eq(0).append(li); return; }
        var ul = $('.menu ul');
        if(ul.length) ul.eq(0).append(li);
    }

    function init(){
        try {
            addMenu();
            D.noty('🎬 ZonaFilm v'+CONFIG.ver);
            D.log('Boot','✅');
        } catch(e){
            D.err('Boot',e.message);
        }
    }

    if(window.appready) init();
    else Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready') init();
    });

})();
