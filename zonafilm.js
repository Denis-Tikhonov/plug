/**
 * ============================================================
 *  LAMPA PLUGIN — ZonaFilm v1.3.0
 * ============================================================
 *  
 *  ✅ Cloudflare Worker прокси (ваш персональный)
 *  ✅ Select-меню с навигацией D-pad
 *  ✅ Поиск, жанры, каталог
 *  ✅ Детали фильма
 *  ✅ Воспроизведение
 * ============================================================
 */
(function(){
    'use strict';

    /* ==========================================================
     *  КОНФИГУРАЦИЯ
     *  ⚠️ ЗАМЕНИТЕ WORKER URL НА ВАШ!
     * ========================================================== */
    var WORKER = 'https://zonaproxy.777и737.workers.dev';

    var CONFIG = {
        ver: '1.3.0',
        site: 'https://zonafilm.ru',
        buildId: '39MEgPaxeFXNBOSc6BloZ',
        timeout: 15000
    };

    /* ==========================================================
     *  ОТЛАДКА
     * ========================================================== */
    function log(m){ console.log('[ZF]', m); }
    function noty(m){ try{ Lampa.Noty.show(m); }catch(e){} }

    log('v' + CONFIG.ver + ' Worker: ' + WORKER);

    /* ==========================================================
     *  СЕТЬ — через Worker
     * ========================================================== */
    function get(targetUrl, ok, fail){
        var url = WORKER + '/?url=' + encodeURIComponent(targetUrl);
        log('GET: ' + targetUrl);

        $.ajax({
            url: url,
            timeout: CONFIG.timeout,
            success: function(data){
                log('OK: ' + (typeof data === 'string' ? data.length + ' chars' : 'object'));
                if(ok) ok(data);
            },
            error: function(xhr, status, err){
                log('FAIL: ' + status + ' ' + err);
                if(fail) fail(status);
            }
        });
    }

    /* ==========================================================
     *  ИСТОЧНИК ZONAFILM
     * ========================================================== */

    /**
     * Автоопределение buildId из HTML
     */
    function ensureBuildId(cb){
        if(CONFIG.buildId){
            cb(CONFIG.buildId);
            return;
        }

        noty('⏳ Определяю buildId...');

        get(CONFIG.site + '/movies', function(html){
            if(typeof html !== 'string'){
                cb(null);
                return;
            }
            var m = html.match(/"buildId"\s*:\s*"([^"]+)"/);
            if(m && m[1]){
                CONFIG.buildId = m[1];
                log('BuildId: ' + m[1]);
                cb(m[1]);
            } else {
                log('BuildId не найден');
                cb(null);
            }
        }, function(){
            cb(null);
        });
    }

    /**
     * Парсинг списка фильмов из pageProps
     */
    function parseList(pp){
        var a = pp.data || pp.items || pp.movies || [];
        if(!Array.isArray(a)) a = a.items || a.results || [];
        return a.map(function(m){
            return {
                title: m.title || '',
                slug: m.slug || '',
                year: m.year || 0,
                poster: m.cover_url || '',
                rating: m.rating || 0,
                quality: m.best_quality || ''
            };
        });
    }

    /**
     * Загрузить JSON через Data API
     */
    function loadJson(path, cb){
        ensureBuildId(function(bid){
            if(!bid){
                noty('⚠ Нет buildId');
                cb(null);
                return;
            }

            var url = CONFIG.site + '/_next/data/' + bid + path;

            get(url, function(data){
                try {
                    var j = typeof data === 'string' ? JSON.parse(data) : data;
                    cb(j);
                } catch(e){
                    log('Parse error: ' + e.message);

                    /* Fallback: может это HTML */
                    if(typeof data === 'string' && data.indexOf('__NEXT_DATA__') !== -1){
                        log('Trying HTML fallback');
                        var pp = parseHtml(data);
                        if(pp) cb({ pageProps: pp });
                        else cb(null);
                    } else {
                        cb(null);
                    }
                }
            }, function(){
                cb(null);
            });
        });
    }

    /**
     * Парсинг __NEXT_DATA__ из HTML
     */
    function parseHtml(html){
        try {
            var tag = '__NEXT_DATA__" type="application/json">';
            var s = html.indexOf(tag);
            if(s === -1) return null;
            s += tag.length;
            var e = html.indexOf('</script>', s);
            if(e === -1) return null;
            var j = JSON.parse(html.substring(s, e));
            if(j.buildId) CONFIG.buildId = j.buildId;
            return j.pageProps || (j.props && j.props.pageProps) || null;
        } catch(ex){
            return null;
        }
    }

    /**
     * Каталог фильмов
     */
    function loadCatalog(page, cb){
        var path = '/movies.json' + (page > 1 ? '?page=' + page : '');
        loadJson(path, function(j){
            if(!j){ cb([]); return; }
            var pp = j.pageProps || j;
            cb(parseList(pp));
        });
    }

    /**
     * По жанру
     */
    function loadGenre(slug, cb){
        var path = '/movies/filter/genre-' + slug + '.json';
        loadJson(path, function(j){
            if(!j){ cb([]); return; }
            var pp = j.pageProps || j;
            cb(parseList(pp));
        });
    }

    /**
     * Поиск (загружаем каталог и фильтруем)
     */
    function searchMovies(query, cb){
        var q = query.toLowerCase();
        loadCatalog(1, function(items){
            var found = items.filter(function(m){
                return m.title.toLowerCase().indexOf(q) !== -1;
            });
            cb(found);
        });
    }

    /**
     * Детали фильма
     */
    function loadDetails(slug, cb){
        var path = '/movies/' + slug + '.json';
        loadJson(path, function(j){
            if(!j){ cb(null); return; }
            var d = (j.pageProps || j).data;
            if(!d){ cb(null); return; }

            var genres = [], countries = [];
            ((d.meta && d.meta.tags) || []).forEach(function(t){
                if(t.type === 'genre') genres.push(t.title);
                if(t.type === 'country') countries.push(t.title);
            });

            var actors = ((d.meta && d.meta.actors) || []).map(function(a){
                return a.name || '';
            });

            cb({
                title: d.title || '',
                originalTitle: d.title_original || '',
                slug: d.slug || '',
                year: d.year || 0,
                description: d.description || '',
                poster: d.cover_url || '',
                duration: d.duration || 0,
                rating: d.rating || 0,
                ratingKP: d.rating_kp || 0,
                ratingIMDB: d.rating_imdb || 0,
                quality: d.best_quality || '',
                genres: genres,
                countries: countries,
                directors: d.directors || '',
                actors: actors,
                ageLimit: d.age_limit || 0
            });
        });
    }

    /**
     * Жанры
     */
    var GENRES = [
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

    /* ==========================================================
     *  CSS
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
        .zf-load{display:flex;align-items:center;justify-content:center;\
            padding:3em;color:#888}\
        .zf-spin{display:inline-block;width:1.5em;height:1.5em;border:3px solid #333;\
            border-top-color:#4FC3F7;border-radius:50%;margin-right:.6em;\
            animation:zfspin .7s linear infinite}\
        @keyframes zfspin{to{transform:rotate(360deg)}}\
    ';
    $('#zf-css').remove();
    $('<style>').attr('id','zf-css').text(CSS).appendTo('head');

    /* ==========================================================
     *  ГЛАВНОЕ МЕНЮ
     * ========================================================== */
    function showMainMenu(){
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

        items.push({ title: '━━━ Жанры ━━━', subtitle: '' });

        GENRES.forEach(function(g){
            items.push({
                title: '📂 ' + g.title,
                subtitle: '',
                action: 'genre',
                genre: g.slug,
                genreTitle: g.title
            });
        });

        items.push({ title: '━━━━━━━━━━━', subtitle: '' });
        items.push({ title: '← Назад', subtitle: '', action: 'back' });

        Lampa.Select.show({
            title: '🎬 ZonaFilm',
            items: items,
            onBack: function(){
                Lampa.Controller.toggle('content');
            },
            onSelect: function(item){
                if(item.action === 'back'){
                    Lampa.Controller.toggle('content');
                    return;
                }
                if(item.action === 'search'){
                    doSearch();
                    return;
                }
                if(item.action === 'all'){
                    Lampa.Activity.push({
                        url: '', title: 'Все фильмы',
                        component: 'zf_cards', page: 1,
                        zf_mode: 'all'
                    });
                    return;
                }
                if(item.action === 'genre'){
                    Lampa.Activity.push({
                        url: '', title: item.genreTitle,
                        component: 'zf_cards', page: 1,
                        zf_mode: 'genre',
                        zf_genre: item.genre
                    });
                    return;
                }
            }
        });
    }

    /* ==========================================================
     *  ПОИСК
     * ========================================================== */
    function doSearch(){
        Lampa.Input.edit({
            title: 'Поиск фильмов',
            value: '', free: true, nosave: true
        }, function(val){
            if(val && val.trim()){
                Lampa.Activity.push({
                    url: '', title: '🔍 ' + val.trim(),
                    component: 'zf_cards', page: 1,
                    zf_mode: 'search',
                    zf_query: val.trim()
                });
            } else {
                showMainMenu();
            }
        });
    }

    /* ==========================================================
     *  КОМПОНЕНТ КАРТОЧЕК
     * ========================================================== */
    function CardsComp(object){
        var self = this;
        var scroll = new Lampa.Scroll({mask:true, over:true, step:250});
        var body = $('<div class="zf-wrap"></div>');
        var grid = $('<div class="zf-grid"></div>');
        var mode = object.zf_mode || 'all';
        var genre = object.zf_genre || '';
        var query = object.zf_query || '';

        this.create = function(){
            log('Cards create mode=' + mode);

            body.append(
                '<div class="zf-load" id="zf-loader">' +
                '<div class="zf-spin"></div>Загрузка...</div>'
            );
            body.append(grid);
            scroll.append(body);

            noty('⏳ Загрузка...');

            if(mode === 'search'){
                searchMovies(query, function(items){ self.onData(items); });
            } else if(mode === 'genre'){
                loadGenre(genre, function(items){ self.onData(items); });
            } else {
                loadCatalog(1, function(items){ self.onData(items); });
            }
        };

        this.onData = function(items){
            log('Cards data: ' + items.length);
            $('#zf-loader').remove();

            if(!items.length){
                grid.html('<div style="padding:2em;color:#888;text-align:center">📭 Ничего не найдено</div>');
                noty('📭 Ничего не найдено');
                self.activate();
                return;
            }

            noty('✅ ' + items.length + ' фильмов');

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
                      m.rating > 0 ? '<div class="zf-badge '+rc+'">★ '+m.rating.toFixed(1)+'</div>' : '',
                      ql ? '<div class="zf-ql">'+ql+'</div>' : '',
                      '<div class="zf-name">'+m.title+'</div>',
                      '<div class="zf-year">'+(m.year||'')+'</div>',
                    '</div>'
                ].join(''));

                card.on('hover:enter', function(){
                    showDetails(m.slug, m.title);
                });

                card.on('hover:focus', function(){
                    scroll.update($(this));
                });

                grid.append(card);
            });

            self.activate();
        };

        this.activate = function(){
            log('Cards activate: ' + scroll.render().find('.selector').length + ' selectors');

            Lampa.Controller.add('content', {
                back: function(){
                    Lampa.Activity.backward();
                    setTimeout(showMainMenu, 300);
                }
            });

            Lampa.Controller.enable('content');
            Lampa.Controller.collectionSet(scroll.render());
            Lampa.Controller.collectionFocus(false, scroll.render());
        };

        this.start = function(){ this.activate(); };
        this.pause = function(){};
        this.stop = function(){};
        this.render = function(){ return scroll.render(); };
        this.destroy = function(){ scroll.destroy(); };
    }

    /* ==========================================================
     *  ДЕТАЛИ ФИЛЬМА
     * ========================================================== */
    function showDetails(slug, title){
        noty('⏳ ' + title);

        loadDetails(slug, function(m){
            if(!m){
                noty('⚠ Ошибка загрузки');
                return;
            }

            var rating = '';
            if(m.rating > 0) rating += '★' + m.rating.toFixed(1);
            if(m.ratingKP > 0) rating += '  КП:' + m.ratingKP.toFixed(1);
            if(m.ratingIMDB > 0) rating += '  IMDb:' + m.ratingIMDB.toFixed(1);

            var ql = m.quality ? m.quality.toUpperCase() : '';
            if(ql === 'LQ') ql = 'CAM';
            if(ql === 'MQ') ql = 'HD';

            var items = [];

            items.push({
                title: '▶ Смотреть',
                subtitle: m.title + (m.year ? ' ('+m.year+')' : ''),
                action: 'play'
            });

            if(rating) items.push({ title: '⭐ ' + rating, subtitle: '' });

            var info = '';
            if(m.year) info += m.year;
            if(m.duration) info += ' • ' + m.duration + ' мин';
            if(ql) info += ' • ' + ql;
            if(m.ageLimit) info += ' • ' + m.ageLimit + '+';
            if(info) items.push({ title: '📅 ' + info, subtitle: '' });

            if(m.genres.length){
                items.push({ title: '🎭 ' + m.genres.join(', '), subtitle: '' });
            }
            if(m.countries.length){
                items.push({ title: '🌍 ' + m.countries.join(', '), subtitle: '' });
            }
            if(m.directors){
                items.push({ title: '🎬 ' + m.directors, subtitle: '' });
            }
            if(m.actors.length){
                items.push({ title: '👥 ' + m.actors.slice(0,5).join(', '), subtitle: '' });
            }
            if(m.description){
                var desc = m.description.length > 300 ?
                    m.description.substring(0,300) + '...' : m.description;
                items.push({ title: '📝 Описание', subtitle: desc });
            }

            items.push({ title: '← Назад', subtitle: '', action: 'back' });

            Lampa.Select.show({
                title: '🎬 ' + m.title,
                items: items,
                onBack: function(){ Lampa.Controller.toggle('content'); },
                onSelect: function(item){
                    if(item.action === 'play'){
                        playMovie(m);
                    }
                    if(item.action === 'back'){
                        Lampa.Controller.toggle('content');
                    }
                }
            });
        });
    }

    /* ==========================================================
     *  ВОСПРОИЗВЕДЕНИЕ
     * ========================================================== */
    function playMovie(m){
        var url = CONFIG.site + '/movies/' + m.slug;
        log('Play: ' + url);
        noty('▶ ' + m.title);

        try {
            if(Lampa.Android && Lampa.Android.openUrl){
                Lampa.Android.openUrl(url);
                return;
            }
        } catch(e){}

        try { window.open(url, '_blank'); } catch(e){}
    }

    /* ==========================================================
     *  РЕГИСТРАЦИЯ + МЕНЮ + ЗАПУСК
     * ========================================================== */
    Lampa.Component.add('zf_cards', CardsComp);

    var ICO = '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z' +
        'M8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2z' +
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
        if(list.length) list.eq(0).append(li);
        else {
            var ul = $('.menu ul');
            if(ul.length) ul.eq(0).append(li);
        }
    }

    function init(){
        addMenu();
        noty('🎬 ZonaFilm v' + CONFIG.ver);
        log('✅ Ready');
    }

    if(window.appready) init();
    else Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready') init();
    });
})();
