/**
 * ============================================================
 *  LAMPA PLUGIN — ZonaFilm v0.9.0
 * ============================================================
 *
 *  Навигация под bylampa:
 *    Controller.add('content', {back:...})
 *    Controller.enable('content')
 *    Controller.collectionSet(scroll.render())
 *    Controller.collectionFocus(element, scroll.render())
 *
 *  Scroll: append, update, render, destroy (БЕЗ toggle!)
 *
 *  БЛОКИ:
 *    1. Конфигурация
 *    2. Отладка
 *    3. Сеть
 *    4. Источник ZonaFilm
 *    5. CSS
 *    6. Каталог (с рабочей навигацией)
 *    7. Детали фильма
 *    8. Регистрация + Меню + Запуск
 * ============================================================
 */

(function () {
    'use strict';

    /* ==========================================================
     *  БЛОК 1: КОНФИГУРАЦИЯ
     * ========================================================== */
    var CONFIG = {
        debug: true,
        ver: '0.9.0',
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
        log: function(t,m){ if(CONFIG.debug) console.log('[ZF]['+t+']',m); },
        warn: function(t,m){ console.warn('[ZF]['+t+']',m); },
        err: function(t,m){ console.error('[ZF][ERR]['+t+']',m); },
        noty: function(m){ try{Lampa.Noty.show(m)}catch(e){} }
    };

    D.log('Boot','v'+CONFIG.ver);

    /* ==========================================================
     *  БЛОК 3: СЕТЬ
     * ========================================================== */
    var Net = {
        get: function(url, ok, fail, _i){
            var i = typeof _i==='number' ? _i : CONFIG.pi;
            if(i >= CONFIG.proxy.length){
                if(fail) fail();
                return;
            }
            var pu = CONFIG.proxy[i].replace('{u}', encodeURIComponent(url));
            $.ajax({
                url: pu,
                timeout: CONFIG.timeout,
                success: function(data){ CONFIG.pi=i; if(ok) ok(data); },
                error: function(){ Net.get(url,ok,fail,i+1); }
            });
        }
    };

    /* ==========================================================
     *  БЛОК 4: ИСТОЧНИК ZONAFILM
     * ========================================================== */
    var Src = {
        _bid: function(cb){
            if(CONFIG.buildId){ cb(CONFIG.buildId); return; }
            Net.get(CONFIG.site+'/movies', function(html){
                if(typeof html!=='string'){ cb(null); return; }
                var m=html.match(/"buildId"\s*:\s*"([^"]+)"/);
                if(m&&m[1]){ CONFIG.buildId=m[1]; cb(m[1]); }
                else cb(null);
            }, function(){ cb(null); });
        },

        _html2pp: function(html){
            try{
                var tag='__NEXT_DATA__" type="application/json">';
                var s=html.indexOf(tag); if(s===-1) return null;
                s+=tag.length;
                var e=html.indexOf('</script>',s); if(e===-1) return null;
                var j=JSON.parse(html.substring(s,e));
                if(j.buildId) CONFIG.buildId=j.buildId;
                return j.pageProps||(j.props&&j.props.pageProps)||null;
            }catch(ex){ return null; }
        },

        _list: function(pp){
            var a=pp.data||pp.items||pp.movies||[];
            if(!Array.isArray(a)) a=a.items||a.results||[];
            return a.map(function(m){
                return {
                    title:m.title||'', slug:m.slug||'',
                    year:m.year||0, poster:m.cover_url||'',
                    rating:m.rating||0, quality:m.best_quality||''
                };
            });
        },

        main: function(page, cb){
            var self=this;
            this._bid(function(bid){
                if(!bid){ self._mainHTML(page,cb); return; }
                var url=CONFIG.site+'/_next/data/'+bid+'/movies.json';
                if(page>1) url+='?page='+page;
                Net.get(url, function(raw){
                    try{
                        var j=typeof raw==='string'?JSON.parse(raw):raw;
                        var pp=j.pageProps||j;
                        var items=self._list(pp);
                        var more=!!(pp.links&&pp.links.next);
                        if(items.length>0){ cb(items,more); return; }
                    }catch(e){}
                    CONFIG.buildId='';
                    self._mainHTML(page,cb);
                }, function(){
                    CONFIG.buildId='';
                    self._mainHTML(page,cb);
                });
            });
        },

        _mainHTML: function(page, cb){
            var self=this;
            var url=CONFIG.site+'/movies'+(page>1?'?page='+page:'');
            Net.get(url, function(html){
                var pp=self._html2pp(html);
                if(pp){ var i=self._list(pp); cb(i,!!(pp.links&&pp.links.next)); }
                else cb([],false);
            }, function(){ cb([],false); });
        },

        getDetails: function(slug, cb){
            var self=this;
            this._bid(function(bid){
                if(!bid){ self._detHTML(slug,cb); return; }
                var url=CONFIG.site+'/_next/data/'+bid+'/movies/'+slug+'.json';
                Net.get(url, function(raw){
                    try{
                        var j=typeof raw==='string'?JSON.parse(raw):raw;
                        var d=(j.pageProps||j).data;
                        if(d){ cb(self._det(d,j.pageProps)); return; }
                    }catch(e){}
                    self._detHTML(slug,cb);
                }, function(){ self._detHTML(slug,cb); });
            });
        },

        _detHTML: function(slug, cb){
            var self=this;
            Net.get(CONFIG.site+'/movies/'+slug, function(html){
                var pp=self._html2pp(html);
                if(pp&&pp.data) cb(self._det(pp.data,pp));
                else cb(null);
            }, function(){ cb(null); });
        },

        _det: function(d, pp){
            var g=[],c=[];
            ((d.meta&&d.meta.tags)||[]).forEach(function(t){
                if(t.type==='genre') g.push(t.title);
                if(t.type==='country') c.push(t.title);
            });
            var act=((d.meta&&d.meta.actors)||[]).map(function(a){
                return {name:a.name||'',photo:a.cover_url||''};
            });
            return {
                title:d.title||'', originalTitle:d.title_original||'',
                slug:d.slug||'', year:d.year||0, description:d.description||'',
                poster:d.cover_url||'',
                backdrop:(pp&&pp.backdropUrl)||d.backdrop_url||'',
                duration:d.duration||0, rating:d.rating||0,
                ratingKP:d.rating_kp||0, ratingIMDB:d.rating_imdb||0,
                quality:d.best_quality||'', genres:g, countries:c,
                directors:d.directors||'', writers:d.writers||'',
                actors:act, ageLimit:d.age_limit||0
            };
        },

        search: function(q, cb){
            var lq=q.toLowerCase();
            this.main(1, function(items){
                cb(items.filter(function(m){
                    return m.title.toLowerCase().indexOf(lq)!==-1;
                }));
            });
        },

        streamUrl: function(slug){ return CONFIG.site+'/movies/'+slug; },

        cats: function(){
            return [
                {title:'Все',slug:''},{title:'Боевик',slug:'boevik'},
                {title:'Комедия',slug:'komediia'},{title:'Драма',slug:'drama'},
                {title:'Ужасы',slug:'uzhasy'},{title:'Фантастика',slug:'fantastika'},
                {title:'Триллер',slug:'triller'},{title:'Мелодрама',slug:'melodrama'},
                {title:'Детектив',slug:'detektiv'},{title:'Криминал',slug:'kriminal'},
                {title:'Приключения',slug:'prikliucheniia'},{title:'Фэнтези',slug:'fentezi'},
                {title:'Мультфильм',slug:'multfilm'},{title:'Семейный',slug:'semeinyi'},
                {title:'Военный',slug:'voennyi'}
            ];
        },

        byGenre: function(slug, page, cb){
            var self=this;
            this._bid(function(bid){
                if(!bid){ cb([],false); return; }
                var url=CONFIG.site+'/_next/data/'+bid+
                    '/movies/filter/genre-'+slug+'.json';
                if(page>1) url+='?page='+page;
                Net.get(url, function(raw){
                    try{
                        var j=typeof raw==='string'?JSON.parse(raw):raw;
                        var pp=j.pageProps||j;
                        cb(self._list(pp), !!(pp.links&&pp.links.next));
                    }catch(e){ cb([],false); }
                }, function(){ cb([],false); });
            });
        }
    };

    /* ==========================================================
     *  БЛОК 5: CSS
     * ========================================================== */
    var CSS = '\
        .zf{padding:1.5em}\
        .zf-sb{display:inline-block;background:#1e1e3a;border:2px solid #333;\
            border-radius:.5em;color:#888;padding:.5em 1.2em;font-size:1em;\
            margin-bottom:.8em;margin-right:.5em}\
        .zf-sb.focus{border-color:#4FC3F7;color:#fff}\
        .zf-cats{display:flex;flex-wrap:wrap;gap:.4em;margin-bottom:1em}\
        .zf-cat{background:#1e1e3a;color:#aaa;border:2px solid transparent;\
            border-radius:.4em;padding:.3em .8em;font-size:.85em}\
        .zf-cat.focus,.zf-cat--a{border-color:#4FC3F7;color:#fff;background:#2a2a5a}\
        .zf-ht{color:#fff;font-size:1.3em;font-weight:700;margin-bottom:.5em}\
        .zf-grid{display:flex;flex-wrap:wrap;gap:.6em}\
        .zf-c{width:10.5em;position:relative;transition:transform .15s}\
        .zf-c.focus{transform:scale(1.08)}\
        .zf-p{width:100%;height:15em;border-radius:.4em;overflow:hidden;background:#111}\
        .zf-p img{width:100%;height:100%;object-fit:cover}\
        .zf-b{position:absolute;top:.3em;left:.3em;background:rgba(0,0,0,.75);\
            padding:.1em .35em;border-radius:.2em;font-size:.7em;font-weight:700}\
        .zf-bg{color:#66BB6A}.zf-by{color:#FFA726}.zf-br{color:#EF5350}\
        .zf-q{position:absolute;top:.3em;right:.3em;background:#E65100;color:#fff;\
            padding:.05em .3em;border-radius:.2em;font-size:.6em;font-weight:700;\
            text-transform:uppercase}\
        .zf-n{color:#eee;font-size:.78em;margin-top:.3em;overflow:hidden;\
            text-overflow:ellipsis;white-space:nowrap}\
        .zf-yr{color:#666;font-size:.7em}\
        .zf-ld{display:flex;align-items:center;justify-content:center;padding:2em;color:#888}\
        .zf-sp{display:inline-block;width:1.4em;height:1.4em;border:3px solid #333;\
            border-top-color:#4FC3F7;border-radius:50%;margin-right:.5em;\
            animation:zfsp .7s linear infinite}\
        @keyframes zfsp{to{transform:rotate(360deg)}}\
        .zf-em{text-align:center;padding:3em;color:#555}\
        .zf-mr{text-align:center;padding:1em;color:#4FC3F7;margin-top:1em}\
        .zf-mr.focus{color:#fff}\
        .zf-dt{padding:1.5em;color:#fff}\
        .zf-dt-top{display:flex;gap:1.5em;margin-bottom:1em}\
        .zf-dt-poster{width:12em;height:17em;border-radius:.5em;overflow:hidden;\
            flex-shrink:0;background:#111}\
        .zf-dt-poster img{width:100%;height:100%;object-fit:cover}\
        .zf-dt-info{flex:1}\
        .zf-dt-title{font-size:1.5em;font-weight:800}\
        .zf-dt-orig{color:#888;font-size:.85em;margin-bottom:.3em}\
        .zf-dt-tags{display:flex;flex-wrap:wrap;gap:.3em;margin:.4em 0}\
        .zf-tg{background:#2a2a4a;padding:.15em .5em;border-radius:.3em;\
            font-size:.8em;color:#aaa}\
        .zf-tg-g{background:#1565C0;color:#fff}\
        .zf-dt-desc{color:#bbb;font-size:.85em;line-height:1.5;margin:.8em 0}\
        .zf-pl{display:inline-block;background:#E53935;color:#fff;border-radius:.5em;\
            padding:.5em 1.8em;font-size:1.1em;font-weight:700;margin:.5em 0 1em;\
            transition:transform .15s,background .15s}\
        .zf-pl.focus{background:#F44336;transform:scale(1.06)}\
    ';
    $('#zf-css').remove();
    $('<style>').attr('id','zf-css').text(CSS).appendTo('head');


    /* ==========================================================
     *  БЛОК 6: КОМПОНЕНТ КАТАЛОГА
     *  ---------------------------------------------------------
     *  ✅ НАВИГАЦИЯ bylampa (проверенные методы):
     *
     *  Controller.add('content', { back: fn })
     *    → регистрирует контроллер с обработкой Back
     *
     *  Controller.enable('content')
     *    → активирует контроллер по имени (строка!)
     *
     *  Controller.collectionSet(scroll.render())
     *    → указывает DOM-контейнер с .selector элементами
     *
     *  Controller.collectionFocus(element|false, scroll.render())
     *    → ставит фокус на элемент (false = первый)
     *
     *  scroll.update(element)
     *    → прокрутка к элементу при hover:focus
     * ========================================================== */

    function CatComp(object){
        var self   = this;
        var scroll = new Lampa.Scroll({mask:true, over:true, step:250});
        var body   = $('<div class="zf"></div>');
        var grid   = $('<div class="zf-grid"></div>');
        var page   = 1;
        var hasMore = true;
        var busy   = false;
        var mode   = 'catalog';
        var gSlug  = '';
        var last_focus = false;  // последний элемент с фокусом

        /* ---- Навигация ---- */
        function nav(focus_elem){
            D.log('Cat','nav() selectors='+scroll.render().find('.selector').length);

            /**
             * Шаг 1: Регистрируем контроллер с обработкой Back
             */
            Lampa.Controller.add('content', {
                back: function(){
                    D.log('Cat','← back');
                    Lampa.Activity.backward();
                }
            });

            /**
             * Шаг 2: Активируем контроллер по имени
             * enable() принимает строку — имя контроллера
             */
            Lampa.Controller.enable('content');

            /**
             * Шаг 3: Указываем DOM-контейнер с .selector
             * collectionSet() сканирует контейнер,
             * находит все .selector и строит навигационную сетку
             */
            Lampa.Controller.collectionSet(scroll.render());

            /**
             * Шаг 4: Устанавливаем фокус
             * false = первый элемент
             * element = конкретный элемент
             */
            Lampa.Controller.collectionFocus(focus_elem || last_focus || false, scroll.render());
        }

        this.create = function(){
            D.log('Cat','create');

            /* --- Поиск --- */
            var sb = $('<div class="zf-sb selector">🔍 Поиск...</div>');
            sb.on('hover:enter', function(){
                Lampa.Input.edit({
                    title:'Поиск фильмов', value:'',
                    free:true, nosave:true
                }, function(v){
                    if(v && v.trim()) self.doSearch(v.trim());
                });
            });
            sb.on('hover:focus', function(){
                last_focus = $(this);
                scroll.update($(this));
            });
            body.append(sb);

            /* --- Категории --- */
            var cats = $('<div class="zf-cats"></div>');
            Src.cats().forEach(function(c){
                var b = $('<div class="zf-cat selector' +
                    (c.slug==='' ? ' zf-cat--a' : '') + '">' +
                    c.title + '</div>');

                b.on('hover:enter', function(){
                    cats.find('.zf-cat').removeClass('zf-cat--a');
                    b.addClass('zf-cat--a');
                    grid.empty();
                    page = 1;
                    hasMore = true;
                    last_focus = false;

                    if(c.slug === ''){
                        mode = 'catalog';
                        body.find('.zf-ht').first().text('📽 Каталог');
                        self.load(1);
                    } else {
                        mode = 'genre';
                        gSlug = c.slug;
                        body.find('.zf-ht').first().text('📂 ' + c.title);
                        self.loadG(c.slug, 1);
                    }
                });

                b.on('hover:focus', function(){
                    last_focus = $(this);
                    scroll.update($(this));
                });

                cats.append(b);
            });
            body.append(cats);

            /* --- Заголовок --- */
            body.append('<div class="zf-ht">📽 Каталог</div>');

            /* --- Загрузка --- */
            body.append('<div class="zf-ld" id="zfl">' +
                '<div class="zf-sp"></div>Загрузка...</div>');

            /* --- Сетка --- */
            body.append(grid);

            /* --- Ещё --- */
            var mr = $('<div class="zf-mr selector" id="zfm" style="display:none">⬇ Ещё</div>');
            mr.on('hover:enter', function(){
                page++;
                if(mode==='catalog') self.load(page);
                else if(mode==='genre') self.loadG(gSlug, page);
            });
            mr.on('hover:focus', function(){
                last_focus = $(this);
                scroll.update($(this));
            });
            body.append(mr);

            scroll.append(body);
            this.load(1);
        };

        /* ---- Загрузка каталога ---- */
        this.load = function(p){
            if(busy) return;
            busy = true;
            $('#zfl').show();

            Src.main(p, function(items, more){
                busy = false;
                hasMore = more;
                $('#zfl').hide();

                if(!items.length && p===1){
                    grid.html('<div class="zf-em">📭 Нет данных</div>');
                } else {
                    self.addCards(items);
                }

                $('#zfm').toggle(hasMore && mode!=='search');
                nav();
            });
        };

        /* ---- По жанру ---- */
        this.loadG = function(slug, p){
            if(busy) return;
            busy = true;
            $('#zfl').show();

            Src.byGenre(slug, p, function(items, more){
                busy = false;
                hasMore = more;
                $('#zfl').hide();

                if(!items.length && p===1){
                    grid.html('<div class="zf-em">📭 Ничего</div>');
                } else {
                    self.addCards(items);
                }

                $('#zfm').toggle(more);
                nav();
            });
        };

        /* ---- Поиск ---- */
        this.doSearch = function(q){
            mode = 'search';
            grid.empty();
            busy = true;
            last_focus = false;
            $('#zfl').show();
            $('#zfm').hide();
            body.find('.zf-ht').first().text('🔍 ' + q);

            Src.search(q, function(items){
                busy = false;
                $('#zfl').hide();

                if(!items.length){
                    grid.html('<div class="zf-em">📭 Не найдено</div>');
                } else {
                    self.addCards(items);
                }

                nav();
            });
        };

        /* ---- Карточки ---- */
        this.addCards = function(items){
            items.forEach(function(m){
                var rc = m.rating>=7 ? 'zf-bg' : (m.rating>=5 ? 'zf-by' : 'zf-br');
                var ql = m.quality ? m.quality.toUpperCase() : '';
                if(ql==='LQ') ql='CAM';
                if(ql==='MQ') ql='HD';

                var c = $([
                    '<div class="zf-c selector">',
                      '<div class="zf-p">',
                        m.poster ?
                          '<img src="'+m.poster+'" loading="lazy"/>' :
                          '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#333;font-size:2.5em">🎬</div>',
                      '</div>',
                      m.rating>0 ? '<div class="zf-b '+rc+'">★ '+m.rating.toFixed(1)+'</div>' : '',
                      ql ? '<div class="zf-q">'+ql+'</div>' : '',
                      '<div class="zf-n">'+m.title+'</div>',
                      '<div class="zf-yr">'+(m.year||'')+'</div>',
                    '</div>'
                ].join(''));

                c.on('hover:enter', function(){
                    Lampa.Activity.push({
                        url:'', title:m.title,
                        component:'zf_det', slug:m.slug, page:1
                    });
                });

                c.on('hover:focus', function(){
                    last_focus = $(this);
                    scroll.update($(this));
                });

                grid.append(c);
            });
        };

        /* ---- Стандартные методы ---- */

        this.start = function(){
            D.log('Cat','start');
            nav();
        };

        this.pause = function(){};
        this.stop = function(){};
        this.render = function(){ return scroll.render(); };
        this.destroy = function(){ scroll.destroy(); };
    }


    /* ==========================================================
     *  БЛОК 7: КОМПОНЕНТ ДЕТАЛЕЙ
     * ========================================================== */
    function DetComp(object){
        var self   = this;
        var scroll = new Lampa.Scroll({mask:true, over:true, step:250});
        var body   = $('<div class="zf-dt"></div>');
        var slug   = object.slug || '';
        var last_focus = false;

        function nav(){
            Lampa.Controller.add('content', {
                back: function(){
                    D.log('Det','← back');
                    Lampa.Activity.backward();
                }
            });
            Lampa.Controller.enable('content');
            Lampa.Controller.collectionSet(scroll.render());
            Lampa.Controller.collectionFocus(last_focus || false, scroll.render());
        }

        this.create = function(){
            D.log('Det','create slug='+slug);
            body.append('<div class="zf-ld" id="zfdl">' +
                '<div class="zf-sp"></div>Загрузка...</div>');
            scroll.append(body);

            Src.getDetails(slug, function(m){
                $('#zfdl').remove();
                if(!m){
                    body.append('<div class="zf-em">⚠ Ошибка</div>');
                    nav();
                    return;
                }
                self.show(m);
                nav();
            });
        };

        this.show = function(m){
            if(m.backdrop){
                body.append(
                    '<div style="width:100%;height:15em;overflow:hidden;' +
                    'border-radius:.5em;margin-bottom:1em">' +
                    '<img src="'+m.backdrop+'" style="width:100%;height:100%;' +
                    'object-fit:cover;filter:brightness(.35)"/></div>'
                );
            }

            var top = $('<div class="zf-dt-top"></div>');
            top.append('<div class="zf-dt-poster">' +
                (m.poster ? '<img src="'+m.poster+'"/>' : '') + '</div>');

            var inf = $('<div class="zf-dt-info"></div>');
            inf.append('<div class="zf-dt-title">'+m.title+'</div>');
            if(m.originalTitle){
                inf.append('<div class="zf-dt-orig">'+m.originalTitle+'</div>');
            }

            var t = '<div class="zf-dt-tags">';
            if(m.year) t += '<span class="zf-tg">'+m.year+'</span>';
            if(m.duration) t += '<span class="zf-tg">'+m.duration+' мин</span>';
            if(m.ageLimit) t += '<span class="zf-tg">'+m.ageLimit+'+</span>';
            var ql = m.quality ? m.quality.toUpperCase() : '';
            if(ql==='LQ') ql='CAM'; if(ql==='MQ') ql='HD';
            if(ql) t += '<span class="zf-tg" style="background:#E65100;color:#fff">'+ql+'</span>';
            m.genres.forEach(function(g){ t += '<span class="zf-tg zf-tg-g">'+g+'</span>'; });
            m.countries.forEach(function(c){ t += '<span class="zf-tg">'+c+'</span>'; });
            t += '</div>';
            inf.append(t);

            if(m.rating > 0){
                var rc = m.rating>=7 ? '#66BB6A' : (m.rating>=5 ? '#FFA726' : '#EF5350');
                inf.append(
                    '<div style="margin:.5em 0">' +
                    '<span style="font-size:1.6em;font-weight:800;color:'+rc+'">★ '+m.rating.toFixed(1)+'</span>' +
                    (m.ratingKP ? '<span style="color:#FF6F00;margin-left:1em;font-size:.85em">КП '+m.ratingKP.toFixed(1)+'</span>' : '') +
                    (m.ratingIMDB ? '<span style="color:#F5C518;margin-left:1em;font-size:.85em">IMDb '+m.ratingIMDB.toFixed(1)+'</span>' : '') +
                    '</div>'
                );
            }

            if(m.directors){
                inf.append('<div style="color:#aaa;font-size:.8em">🎬 '+m.directors+'</div>');
            }

            top.append(inf);
            body.append(top);

            /* Кнопка Смотреть */
            var pb = $('<div class="zf-pl selector">▶ Смотреть</div>');
            pb.on('hover:enter', function(){ self.play(m); });
            pb.on('hover:focus', function(){
                last_focus = $(this);
                scroll.update($(this));
            });
            body.append(pb);

            /* Описание */
            if(m.description){
                body.append(
                    '<div class="zf-ht" style="margin-top:1em">Описание</div>' +
                    '<div class="zf-dt-desc">'+m.description+'</div>'
                );
            }

            /* Актёры */
            if(m.actors && m.actors.length){
                var ah = '<div class="zf-ht">Актёры</div>' +
                    '<div style="display:flex;flex-wrap:wrap;gap:.7em">';
                m.actors.slice(0,12).forEach(function(a){
                    ah += '<div style="text-align:center;width:5.5em">' +
                        '<div style="width:4em;height:4em;border-radius:50%;overflow:hidden;' +
                        'margin:0 auto .2em;background:#222">' +
                        (a.photo ? '<img src="'+a.photo+'" style="width:100%;height:100%;object-fit:cover"/>' : '') +
                        '</div><div style="color:#ccc;font-size:.65em;overflow:hidden;' +
                        'text-overflow:ellipsis;white-space:nowrap">'+a.name+'</div></div>';
                });
                ah += '</div>';
                body.append(ah);
            }
        };

        this.play = function(m){
            var url = Src.streamUrl(m.slug);
            D.log('Det','Play: '+url);

            try{
                if(typeof Lampa.Android!=='undefined' && Lampa.Android.openUrl){
                    Lampa.Android.openUrl(url);
                    return;
                }
            }catch(e){}

            /* iframe overlay */
            var ov = $(
                '<div style="position:fixed;top:0;left:0;right:0;bottom:0;' +
                'z-index:99999;background:#000">' +
                '<iframe src="'+url+'" style="width:100%;height:100%;border:none" ' +
                'allowfullscreen></iframe>' +
                '<div class="selector" style="position:absolute;top:.5em;right:.5em;' +
                'background:rgba(0,0,0,.8);color:#fff;padding:.4em .8em;' +
                'border-radius:.3em;z-index:100000;font-size:1.2em">✕</div></div>'
            );

            var close = function(){
                ov.remove();
                nav();
            };

            ov.find('.selector').on('hover:enter click', close);

            /* Перехватываем Back для overlay */
            Lampa.Controller.add('content', { back: close });
            Lampa.Controller.enable('content');

            $('body').append(ov);
        };

        this.start = function(){ nav(); };
        this.pause = function(){};
        this.stop = function(){};
        this.render = function(){ return scroll.render(); };
        this.destroy = function(){ scroll.destroy(); };
    }


    /* ==========================================================
     *  БЛОК 8: РЕГИСТРАЦИЯ + МЕНЮ + ЗАПУСК
     * ========================================================== */
    Lampa.Component.add('zf_main', CatComp);
    Lampa.Component.add('zf_det', DetComp);

    var ICO = '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z' +
        'M8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2z' +
        'm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>';

    function addMenu(){
        if($('[data-action="zonafilm"]').length) return;
        var li = $('<li class="menu__item selector" data-action="zonafilm">' +
            '<div class="menu__ico">'+ICO+'</div>' +
            '<div class="menu__text">ZonaFilm</div></li>');

        li.on('hover:enter', function(){
            try{ Lampa.Menu.close(); }catch(e){}
            Lampa.Activity.push({
                url:'', title:'ZonaFilm',
                component:'zf_main', page:1
            });
        });

        var list = $('.menu .menu__list');
        if(list.length){ list.eq(0).append(li); return; }
        var ul = $('.menu ul');
        if(ul.length) ul.eq(0).append(li);
    }

    function init(){
        try{
            addMenu();
            D.noty('🎬 ZonaFilm v'+CONFIG.ver);
            D.log('Boot','✅');
        }catch(e){ D.err('Boot',e.message); }
    }

    if(window.appready) init();
    else Lampa.Listener.follow('app', function(e){
        if(e.type==='ready') init();
    });

})();
