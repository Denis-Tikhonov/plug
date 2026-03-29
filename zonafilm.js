/**
 * ============================================================
 *  LAMPA PLUGIN — Trahkino v2.3.0 (Подключен InteractionMain)
 * ============================================================
 *
 *  РЕШЕНИЕ v2.3.0:
 *    ✅ Внедрен Lampa.InteractionMain — встроенный менеджер сеток.
 *       Именно он слушает пульт и перемещает фокус по координатам.
 *    ✅ Карточки добавляются через interaction.append(card).
 *    ✅ Удалены все костыли с own/add. Навигация делегирована ядру.
 *
 * ============================================================
 */

(function () {
    'use strict';

    var CONFIG = {
        debug: true,
        ver: '2.3.0',
        site: 'https://trahkino.me',
        proxy: [
            'https://api.codetabs.com/v1/proxy?quest={u}',
            'https://corsproxy.io/?{u}',
            'https://api.allorigins.win/raw?url={u}'
        ],
        pi: 0,
        timeout: 15000
    };

    var D = {
        log: function(t,m){ if(CONFIG.debug) console.log('[TRK]['+t+']',m); },
        err: function(t,m){ console.error('[TRK][ERR]['+t+']',m); },
        noty: function(m){ try{ Lampa.Noty.show(m); }catch(e){} }
    };

    var Net = {
        get: function(url, ok, fail, _i){
            var i = typeof _i === 'number' ? _i : CONFIG.pi;
            if(i >= CONFIG.proxy.length){ if(fail) fail(); return; }
            var pu = CONFIG.proxy[i].replace('{u}', encodeURIComponent(url));
            $.ajax({ url: pu, timeout: CONFIG.timeout, success: function(data){
                CONFIG.pi = i; if(ok) ok(data);
            }, error: function(){ Net.get(url, ok, fail, i+1); }});
        }
    };

    var Src = {
        main: function(page, cb){
            D.noty('⏳ Загрузка каталога...');
            var url = CONFIG.site + (page > 1 ? '/page/'+page+'/' : '/');
            Net.get(url, function(html){
                if(typeof html !== 'string'){ cb([]); return; }
                try {
                    var doc = new DOMParser().parseFromString(html, 'text/html');
                    var cards = doc.querySelectorAll('a[href*="/video/"]');
                    var items = [];
                    cards.forEach(function(a){
                        var href = a.getAttribute('href') || '';
                        if(!href) return;
                        if(href.indexOf('http') === -1) href = CONFIG.site + href;
                        var img = a.querySelector('img');
                        var poster = img ? (img.getAttribute('src') || '') : '';
                        var titleEl = a.querySelector('.title, strong');
                        var title = titleEl ? titleEl.textContent.trim() : 'Без названия';
                        var durEl = a.querySelector('.duration');
                        var duration = durEl ? durEl.textContent.trim() : '';
                        if(title && poster) items.push({ title: title, url: href, poster: poster, duration: duration });
                    });
                    if(items.length > 0) D.noty('✅ Загружено: '+items.length);
                    else D.noty('⚠ Пусто');
                    cb(items);
                } catch(e){ cb([]); }
            }, function(){ D.noty('⚠ Ошибка сети'); cb([]); });
        },
        search: function(q, cb){ D.noty('Поиск на этапе 3'); cb([]); },
        cats: function(){ return []; }
    };

    var CSS = '\
        .cards-grid{padding:1.5em}\
        .card{width:28em;position:relative;transition:transform .2s;margin-bottom:1.5em}\
        .card.focus{transform:scale(1.05)}\
        .card__img{width:100%;height:16em;border-radius:.5em;overflow:hidden;background:#333; position:relative}\
        .card__img img{width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0}\
        .card__title{color:#eee;font-size:1.3em;margin-top:.5em;overflow:hidden;\
            text-overflow:ellipsis;white-space:nowrap; height: 1.5em;}\
        .zf-dur{position:absolute;bottom:.5em;right:.5em;background:rgba(0,0,0,.85);\
            color:#fff;padding:.15em .5em;border-radius:.3em;font-size:1.1em;font-weight:700;z-index:2}\
        .zf-loading{display:flex;align-items:center;justify-content:center;\
            padding:4em;color:#888;font-size:1.3em}\
        .zf-spin{display:inline-block;width:2em;height:2em;border:3px solid #333;\
            border-top-color:#4FC3F7;border-radius:50%;margin-right:.8em;\
            animation:zfspin .7s linear infinite}\
        @keyframes zfspin{to{transform:rotate(360deg)}}\
        .zf-empty{text-align:center;padding:4em;color:#666;font-size:1.3em}\
    ';
    $('#zf-css').remove();
    $('<style>').attr('id','zf-css').text(CSS).appendTo('head');

    function showMainMenu(){
        Lampa.Select.show({
            title: '🎬 Trahkino v' + CONFIG.ver,
            items: [
                { title: '🔍 Поиск', subtitle: '(Этап 3)', action: 'search' },
                { title: '📽 Последние видео', subtitle: 'Каталог', action: 'all' },
                { title: '← Назад', subtitle: '', action: 'back' }
            ],
            onBack: function(){ Lampa.Controller.toggle('content'); },
            onSelect: function(item){
                if(item.action === 'back' || item.action === 'search'){
                    if(item.action === 'back') Lampa.Controller.toggle('content');
                    return;
                }
                if(item.action === 'all'){
                    Lampa.Activity.push({ url: '', title: 'Последние видео', component: 'zf_cards', page: 1 });
                }
            }
        });
    }

    function CardsComp(object){
        var self   = this;
        var scroll = new Lampa.Scroll({mask:true, over:true, step:250});

        // --- СОЗДАЕМ НАТИВНЫЙ МЕНЕДЖЕР СЕТКИ LAMPA ---
        var interaction = new Lampa.InteractionMain({
            wrap: true
        });

        this.create = function(){
            // Добавляем лоадер внутрь interaction
            var loader = $('<div class="zf-loading" id="zf-loader"><div class="zf-spin"></div>Загрузка...</div>');
            interaction.append(loader);
            
            // Помещаем interaction в scroll
            scroll.append(interaction.render());

            Src.main(object.page || 1, function(items){ self.onDataLoaded(items); });
        };

        this.onDataLoaded = function(items){
            $('#zf-loader').remove();
            
            if(!items.length){
                interaction.append('<div class="zf-empty">📭 Пусто</div>');
                self.bindFocus();
                return;
            }

            // Добавляем карточки через метод interaction.append()
            items.forEach(function(m){
                var card = $([
                    '<div class="card selector">',
                      '<div class="card__img"></div>',
                      m.duration ? '<div class="zf-dur">'+m.duration+'</div>' : '',
                      '<div class="card__title">'+m.title+'</div>',
                    '</div>'
                ].join(''));

                card.on('hover:enter', function(){
                    openInBrowser(m.url, m.title);
                });

                card.on('hover:focus', function(){
                    scroll.update($(this));
                });

                // Скармливаем карточку менеджеру сетки!
                interaction.append(card);
            });

            self.bindFocus();
        };

        this.bindFocus = function(){
            setTimeout(function(){
                // Говорим контроллеру следить за фокусом внутри interaction
                Lampa.Controller.collectionSet(interaction.render());
                Lampa.Controller.collectionFocus(false, interaction.render());
            }, 150);
        };

        // --- ИДЕАЛЬНО ЧИСТЫЙ ЖИЗНЕННЫЙ ЦИКЛ ---
        this.start = function(){};
        
        this.toggle = function(){
            Lampa.Controller.collectionSet(interaction.render());
            Lampa.Controller.collectionFocus(false, interaction.render());
        };

        this.pause = function(){};
        this.stop = function(){};
        this.render = function(){ return scroll.render(); };
        
        this.destroy = function(){ 
            scroll.destroy(); 
            interaction.destroy(); // Обязательно уничтожаем менеджер
        };
    }

    function openInBrowser(url, title){
        D.noty('▶ Открываю: ' + title);
        try {
            if(typeof Lampa.Android !== 'undefined' && Lampa.Android.openUrl){
                Lampa.Android.openUrl(url);
                return;
            }
        } catch(e){}
        try { window.open(url,'_blank'); } catch(e){}
    }

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
            D.noty('✅ Trahkino v'+CONFIG.ver+' загружен');
        } catch(e){ D.err('Boot',e.message); }
    }

    if(window.appready) init();
    else Lampa.Listener.follow('app', function(e){ if(e.type === 'ready') init(); });

})();
