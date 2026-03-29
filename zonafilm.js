/**
 * ============================================================
 *  LAMPA PLUGIN — Trahkino v1.2.0
 * ============================================================
 *
 *  ЭТАП 2: Парсинг реального каталога + Внешнее воспроизведение
 *    ✅ Парсинг HTML через DOMParser (постеры 16:9, названия, время)
 *    ✅ Отображение каталога внутри Lampa (Cards Component)
 *    ✅ Воспроизведение через системный браузер (из-за динамической подписи .mp4)
 *    ✅ Настроен CSS под горизонтальные превью (402x226)
 *
 * ============================================================
 */

(function () {
    'use strict';

    /* ==========================================================
     *  БЛОК 1: КОНФИГУРАЦИЯ
     * ========================================================== */
    var CONFIG = {
        debug: true,
        ver: '1.2.0',
        site: 'https://trahkino.me',
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
        log: function(t,m){ if(CONFIG.debug) console.log('[TRK]['+t+']',m); },
        err: function(t,m){ console.error('[TRK][ERR]['+t+']',m); },
        noty: function(m){ try{ Lampa.Noty.show(m); }catch(e){} }
    };

    /* ==========================================================
     *  БЛОК 3: СЕТЬ
     * ========================================================== */
    var Net = {
        get: function(url, ok, fail, _i){
            var i = typeof _i === 'number' ? _i : CONFIG.pi;
            if(i >= CONFIG.proxy.length){
                D.err('Net','Все прокси недоступны: '+url);
                if(fail) fail(); return;
            }
            var pu = CONFIG.proxy[i].replace('{u}', encodeURIComponent(url));
            D.log('Net','Прокси #'+i);
            $.ajax({ url: pu, timeout: CONFIG.timeout, success: function(data){
                CONFIG.pi = i; if(ok) ok(data);
            }, error: function(){
                Net.get(url, ok, fail, i+1);
            }});
        }
    };

    /* ==========================================================
     *  БЛОК 4: ПАРСЕР ИСТОЧНИКА
     * ========================================================== */
    var Src = {
        main: function(page, cb){
            D.log('Src','Парсинг главной, страница: '+page);
            D.noty('⏳ Загрузка каталога...');

            // Формируем URL пагинации (обычно /page/2/ и т.д.)
            var url = CONFIG.site + (page > 1 ? '/page/'+page+'/' : '/');
            
            Net.get(url, function(html){
                if(typeof html !== 'string'){ cb([]); return; }

                try {
                    var parser = new DOMParser();
                    var doc = parser.parseFromString(html, 'text/html');
                    var cards = doc.querySelectorAll('a[href*="/video/"]');
                    var items = [];

                    cards.forEach(function(a){
                        // Берем ссылку
                        var href = a.getAttribute('href') || '';
                        if(!href) return;
                        if(href.indexOf('http') === -1) href = CONFIG.site + href;

                        // Берем превью
                        var img = a.querySelector('img');
                        var poster = img ? (img.getAttribute('src') || img.getAttribute('data-webp') || '') : '';

                        // Берем название
                        var titleEl = a.querySelector('.title, strong');
                        var title = titleEl ? titleEl.textContent.trim() : 'Без названия';

                        // Берем длительность
                        var durEl = a.querySelector('.duration');
                        var duration = durEl ? durEl.textContent.trim() : '';

                        if(title && poster){
                            items.push({
                                title: title,
                                url: href,
                                poster: poster,
                                duration: duration
                            });
                        }
                    });

                    D.log('Src','Найдено карточек: '+items.length);
                    if(items.length > 0) D.noty('✅ Загружено: '+items.length);
                    else D.noty('⚠ Карточки не найдены');
                    cb(items);

                } catch(e){
                    D.err('Src','Ошибка парсинга: '+e.message);
                    cb([]);
                }
            }, function(){
                D.noty('⚠ Ошибка сети');
                cb([]);
            });
        },

        // Заглушки для следующих этапов
        search: function(q, cb){ D.noty('Поиск будет на этапе 3'); cb([]); },
        cats: function(){ return []; }
    };

    /* ==========================================================
     *  БЛОК 5: CSS (Адаптирован под горизонтальные превью 16:9)
     * ========================================================== */
    var CSS = '\
        .zf-wrap{padding:1em}\
        .zf-grid{display:flex;flex-wrap:wrap;gap:.8em}\
        .zf-card{width:14em;position:relative;transition:transform .15s}\
        .zf-card.focus{transform:scale(1.05)}\
        .zf-poster{width:100%;height:8em;border-radius:.4em;overflow:hidden;background:#111; position:relative}\
        .zf-poster img{width:100%;height:100%;object-fit:cover}\
        .zf-dur{position:absolute;bottom:.3em;right:.3em;background:rgba(0,0,0,.8);\
            color:#fff;padding:.1em .4em;border-radius:.2em;font-size:.75em;font-weight:700}\
        .zf-name{color:#eee;font-size:.85em;margin-top:.4em;overflow:hidden;\
            text-overflow:ellipsis;white-space:nowrap; height: 1.2em;}\
        .zf-loading{display:flex;align-items:center;justify-content:center;\
            padding:3em;color:#888;font-size:1.1em}\
        .zf-spin{display:inline-block;width:1.5em;height:1.5em;border:3px solid #333;\
            border-top-color:#4FC3F7;border-radius:50%;margin-right:.6em;\
            animation:zfspin .7s linear infinite}\
        @keyframes zfspin{to{transform:rotate(360deg)}}\
        .zf-empty{text-align:center;padding:3em;color:#666;font-size:1.1em;width:100%}\
    ';
    $('#zf-css').remove();
    $('<style>').attr('id','zf-css').text(CSS).appendTo('head');

    /* ==========================================================
     *  БЛОК 6: ГЛАВНОЕ МЕНЮ
     * ========================================================== */
    function showMainMenu(){
        var items = [
            { title: '🔍 Поиск', subtitle: '(Следующий этап)', action: 'search' },
            { title: '📽 Последние видео', subtitle: 'Каталог сайта', action: 'all' },
            { title: '← Назад', subtitle: 'В Lampa', action: 'back' }
        ];

        Lampa.Select.show({
            title: '🎬 Trahkino',
            items: items,
            onBack: function(){ Lampa.Controller.toggle('content'); },
            onSelect: function(item){
                if(item.action === 'back' || item.action === 'search'){
                    if(item.action === 'back') Lampa.Controller.toggle('content');
                    return;
                }
                if(item.action === 'all'){
                    Lampa.Activity.push({
                        url: '', title: 'Последние видео', component: 'zf_cards', page: 1
                    });
                }
            }
        });
    }

    /* ==========================================================
     *  БЛОК 7: КОМПОНЕНТ КАРТОЧЕК
     * ========================================================== */
    function CardsComp(object){
        var self   = this;
        var scroll = new Lampa.Scroll({mask:true, over:true, step:250});
        var body   = $('<div class="zf-wrap"></div>');
        var grid   = $('<div class="zf-grid"></div>');

        this.create = function(){
            body.append('<div class="zf-loading" id="zf-loader"><div class="zf-spin"></div>Загрузка...</div>');
            body.append(grid);
            scroll.append(body);

            Src.main(object.page || 1, function(items){ self.onDataLoaded(items); });
        };

        this.onDataLoaded = function(items){
            $('#zf-loader').remove();
            if(!items.length){
                grid.html('<div class="zf-empty">📭 Пусто</div>');
                this.activate(); return;
            }

            items.forEach(function(m){
                var card = $([
                    '<div class="zf-card selector">',
                      '<div class="zf-poster">',
                        '<img src="'+m.poster+'" loading="lazy"/>',
                        m.duration ? '<div class="zf-dur">'+m.duration+'</div>' : '',
                      '</div>',
                      '<div class="zf-name">'+m.title+'</div>',
                    '</div>'
                ].join(''));

                // При нажатии открываем через системный браузер (из-за динамического .mp4)
                card.on('hover:enter', function(){
                    openInBrowser(m.url, m.title);
                });

                card.on('hover:focus', function(){ scroll.update($(this)); });
                grid.append(card);
            });
            this.activate();
        };

        this.activate = function(){
            Lampa.Controller.add('content', {
                back: function(){ Lampa.Activity.backward(); setTimeout(showMainMenu, 300); }
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
     *  БЛОК 8: ВОСПРОИЗВЕДЕНИЕ (Внешний вызов)
     * ========================================================== */
    function openInBrowser(url, title){
        D.log('Play','Открытие в браузере: '+url);
        D.noty('▶ Открываю: ' + title);

        try {
            // Стандартный метод Lampa для Android TV, чтобы открыть ссылку в системном браузере/WebView
            if(typeof Lampa.Android !== 'undefined' && Lampa.Android.openUrl){
                Lampa.Android.openUrl(url);
                return;
            }
        } catch(e){}

        // Запасной вариант
        try { window.open(url,'_blank'); } catch(e){}
    }

    /* ==========================================================
     *  БЛОК 9: РЕГИСТРАЦИЯ + ЗАПУСК
     * ========================================================== */
    Lampa.Component.add('zf_cards', CardsComp);

    var ICO = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>';

    function addMenu(){
        if($('[data-action="trahkino"]').length) return;
        var li = $('<li class="menu__item selector" data-action="trahkino">'+
            '<div class="menu__ico">'+ICO+'</div>'+
            '<div class="menu__text">Trahkino</div></li>');
        li.on('hover:enter', function(){ showMainMenu(); });
        var list = $('.menu .menu__list');
        if(list.length){ list.eq(0).append(li); return; }
        var ul = $('.menu ul');
        if(ul.length) ul.eq(0).append(li);
    }

    function init(){
        try {
            addMenu();
            D.noty('🎬 Trahkino v'+CONFIG.ver);
        } catch(e){ D.err('Boot',e.message); }
    }

    if(window.appready) init();
    else Lampa.Listener.follow('app', function(e){ if(e.type === 'ready') init(); });

})();
