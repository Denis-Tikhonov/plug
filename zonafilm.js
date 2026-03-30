/**
 * ============================================================
 *  LAMPA PLUGIN — Trahkino v3.6.1 (Эталонная интеграция скролла)
 * ============================================================
 *
 *  ИЗМЕНЕНИЯ v3.6.1:
 *    ✅ Структура DOM: карточки теперь строго внутри .scroll__content.
 *    ✅ Tabindex и классы добавлены корректно для навигации.
 *    ✅ setFocus использует card[0].focus() и расчет колонок по первой строке.
 *    ✅ initNavigation переписан с математическим расчетом колонок.
 *    ✅ Визуальный CSS фокуса привязан к классу .focus (без reliance на hover).
 *
 * ============================================================
 */

(function () {
    'use strict';

    var CONFIG = {
        debug: true,
        ver: '3.6.1',
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

    /* ==========================================================
     *  СТИЛИ (Интеграция визуального фокуса из плана)
     * ========================================================== */
    var CSS = '\
        .items-cards .items-cards__inner{display:flex;flex-wrap:wrap;gap:1em;padding:1.5em}\
        .items-cards .card{transition:all 0.2s ease;cursor:pointer;outline:none}\
        .items-cards .card.focus,\
        .items-cards .card:focus{transform:scale(1.05);border:2px solid #ff9800 !important;\
            box-shadow:0 0 20px rgba(255,152,0,0.5);z-index:10}\
        .items-cards .zf-empty{text-align:center;padding:4em;color:#666;font-size:1.3em;width:100%}\
        .items-cards .zf-loading{display:flex;align-items:center;justify-content:center;\
            padding:4em;color:#888;font-size:1.3em;width:100%}\
        .items-cards .zf-spin{display:inline-block;width:2em;height:2em;border:3px solid #333;\
            border-top-color:#4FC3F7;border-radius:50%;margin-right:.8em;\
            animation:zfspin .7s linear infinite}\
        @keyframes zfspin{to{transform:rotate(360deg)}}\
        .zf-menu-wrap{padding:2em 0}\
        .zf-menu-item{padding:1.4em 1.5em;color:#eee;font-size:1.5em;margin:0.5em 1em;\
            background:#222;border-radius:0.5em;cursor:pointer;transition:background .2s}\
        .zf-menu-item:hover,.zf-menu-item.focus{background:#333}\
    ';
    $('#zf-css').remove();
    $('<style>').attr('id','zf-css').text(CSS).appendTo('head');

    /* ==========================================================
     *  КОМПОНЕНТ ГЛАВНОГО МЕНЮ (Без изменений, работает отлично)
     * ========================================================== */
    function MenuComp(){
        var self   = this;
        var scroll = new Lampa.Scroll({mask:true, over:true, scroll_by_item: true, end_ratio: 2});
        var wrap   = $('<div class="zf-menu-wrap"></div>');
        var list   = $('<div></div>');
        
        var isActiveMenu = false;
        var items = [
            { title: '🔍 Поиск', action: 'search' },
            { title: '📽 Последние видео', action: 'all' },
            { title: '← Назад', action: 'back' }
        ];

        this.setFocusMenu = function(el) {
            list.find('.zf-menu-item').removeClass('focus');
            el.addClass('focus');
        };

        this.initMenuNav = function(e) {
            if (!isActiveMenu) return;
            var key = e.key;
            if (key === 'Escape' || key === 'Backspace') { Lampa.Activity.backward(); return; }
            if (!['ArrowUp', 'ArrowDown', 'Enter'].includes(key)) return;

            var current = list.find('.zf-menu-item.focus');
            if(!current.length) { self.setFocusMenu(list.find('.zf-menu-item').first()); return; }
            var target = null;

            switch(key) {
                case 'ArrowDown': target = current.next('.zf-menu-item'); break;
                case 'ArrowUp': target = current.prev('.zf-menu-item'); break;
                case 'Enter':
                    e.preventDefault(); e.stopPropagation();
                    current.trigger('hover:enter'); return;
            }

            if(target && target.length) {
                e.preventDefault(); e.stopPropagation();
                self.setFocusMenu(target);
            }
        };

        this.create = function(){
            isActiveMenu = false;
            wrap.append(list);
            scroll.append(wrap);

            items.forEach(function(item){
                var el = $('<div class="zf-menu-item selector">' + item.title + '</div>');
                el.on('hover:enter', function(){
                    if(item.action === 'back' || item.action === 'search'){
                        if(item.action === 'back') Lampa.Activity.backward();
                        return;
                    }
                    if(item.action === 'all'){
                        Lampa.Activity.push({ url: '', title: 'Последние видео', component: 'zf_cards', page: 1 });
                    }
                });
                list.append(el);
            });

            window.addEventListener('keydown', self.initMenuNav, true);
            setTimeout(function(){
                isActiveMenu = true;
                self.setFocusMenu(list.find('.zf-menu-item').first());
            }, 200);
        };

        this.start = function(){ isActiveMenu = true; };
        this.toggle = function(){ isActiveMenu = true; };
        this.pause = function(){ isActiveMenu = false; };
        this.stop = function(){ isActiveMenu = false; };
        this.render = function(){ return scroll.render(); };
        this.destroy = function(){ 
            isActiveMenu = false;
            window.removeEventListener('keydown', self.initMenuNav, true); 
            scroll.destroy(); wrap.remove(); 
        };
    }

    /* ==========================================================
     *  КОМПОНЕНТ КАРТОЧЕК (Эталонная интеграция)
     * ========================================================== */
    function CardsComp(object){
        var self   = this;
        
        // Инициализация по эталону
        var scroll = new Lampa.Scroll({mask:true, over:true, scroll_by_item: true, end_ratio: 2});
        
        // Внутренняя обертка для нашего лоадера
        var inner  = $('<div class="items-cards__inner"></div>');

        var isActive = false;
        var lastBrowserOpenTime = 0;
        var navHandler = null; // Сохраняем для точного удаления

        // --- ШАГ 3: Улучшенный setFocus ---
        this.setFocus = function(card) {
            if(!card || !card.length || !isActive) return;
            
            // Убираем фокус у всех карточек внутри скролла
            scroll.render().find('.card').removeClass('focus');
            
            // Добавляем класс текущей
            card.addClass('focus');
            
            // Программный фокус для надежности
            try { card[0].focus(); } catch(e){}
            
            // Вычисляем контейнер скролла
            var container = scroll.render().find('.scroll__content')[0] || scroll.render()[0];
            var cardElement = card[0];
            
            // Если карточка не видна на экране - прокручиваем к ней
            if(container && cardElement) {
                var containerRect = container.getBoundingClientRect();
                var cardRect = cardElement.getBoundingClientRect();
                
                if(cardRect.top < containerRect.top || cardRect.bottom > containerRect.bottom) {
                    cardElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'center'
                    });
                }
            }
            
            // Передаем позицию в нативный скролл Lampa
            try { scroll.position(card[0]); } catch(e) {
                D.log('Focus', 'scroll.position error: ' + e.message);
            }
        };

        // --- ШАГ 4: Навигация с расчетом колонок ---
        this.initNavigation = function(e) {
            if (!isActive) return;
            
            var key = e.key;
            
            if (key === 'Backspace' || key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                Lampa.Activity.backward();
                return;
            }
            
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(key)) {
                return; // Пусть Lampa обрабатывает обычные кнопки
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            var allCards = scroll.render().find('.card');
            var current = allCards.filter('.focus');
            
            // Если нет фокуса, ставим на первую
            if(!current.length) {
                var firstCard = allCards.first();
                if(firstCard.length) {
                    self.setFocus(firstCard);
                }
                return;
            }
            
            var target = null;
            var currentIndex = allCards.index(current);
            
            switch(key) {
                case 'ArrowRight':
                    if(currentIndex + 1 < allCards.length) {
                        target = allCards.eq(currentIndex + 1);
                    }
                    break;
                    
                case 'ArrowLeft':
                    if(currentIndex - 1 >= 0) {
                        target = allCards.eq(currentIndex - 1);
                    }
                    break;
                    
                case 'ArrowDown': {
                    // Считаем количество колонок по первой строке
                    var firstRowCards = [];
                    var firstCardTop = allCards.first().offset().top;
                    
                    allCards.each(function() {
                        if(Math.abs($(this).offset().top - firstCardTop) < 10) {
                            firstRowCards.push($(this));
                        }
                    });
                    
                    var columns = firstRowCards.length;
                    if(columns > 0 && currentIndex + columns < allCards.length) {
                        target = allCards.eq(currentIndex + columns);
                    }
                    break;
                }
                    
                case 'ArrowUp': {
                    // Считаем количество колонок по первой строке
                    var firstRowCards = [];
                    var firstCardTop = allCards.first().offset().top;
                    
                    allCards.each(function() {
                        if(Math.abs($(this).offset().top - firstCardTop) < 10) {
                            firstRowCards.push($(this));
                        }
                    });
                    
                    var columns = firstRowCards.length;
                    if(columns > 0 && currentIndex - columns >= 0) {
                        target = allCards.eq(currentIndex - columns);
                    }
                    break;
                }
            }
            
            if(target && target.length) {
                self.setFocus(target);
            } else {
                // На границе сетки — выходим из плагина
                isActive = false;
                Lampa.Activity.backward();
            }
        };

        // --- ШАГ 1: Правильная структура DOM ---
        this.create = function(){
            isActive = false;
            
            // Получаем внутренний контейнер скролла
            var scrollContainer = scroll.render();
            var content = scrollContainer.find('.scroll__content');
            
            // Если контент не найден, используем body (для совместимости)
            if(!content.length) content = scrollContainer.find('.scroll__body');
            
            content.addClass('items-cards');
            content.append(inner);
            
            inner.append('<div class="zf-loading" id="zf-loader"><div class="zf-spin"></div>Загрузка...</div>');
            
            Src.main(object.page || 1, function(items){ self.onDataLoaded(items); });
        };

        // --- ШАГ 2: Добавление данных и Tabindex ---
        this.onDataLoaded = function(items){
            $('#zf-loader').remove();
            
            if(!items.length){
                inner.html('<div class="zf-empty">📭 Пусто</div>');
                try { Lampa.Layer.visible(scroll.render()); } catch(e){}
                return;
            }
            
            inner.empty();
            
            items.forEach(function(m, index){
                try {
                    var card = Lampa.Template.get('card', {
                        title: m.title + (m.duration ? ' ('+m.duration+')' : ''),
                        poster: m.poster,
                        id: index
                    });
                    
                    // Критические атрибуты для фокуса
                    card.attr('tabindex', '0');
                    card.addClass('card');
                    
                    card.data('card-url', m.url);
                    card.data('title', m.title);
                    
                    // Обработчики
                    card.on('hover:enter', function(){
                        openInBrowser($(this).data('card-url'), $(this).data('title'));
                    });
                    
                    // Фокус просто делегируем нашему методу setFocus
                    card.on('hover:focus', function(){
                        self.setFocus($(this));
                    });
                    
                    inner.append(card);
                } catch(e) {
                    D.err('Template', e.message);
                }
            });
            
            // Сообщаем Lampa об обновлении контента для активации скролла
            try { Lampa.Layer.visible(scroll.render()); } catch(e){}
            
            // Корректная установка обработчика
            if(navHandler) {
                window.removeEventListener('keydown', navHandler, true);
            }
            navHandler = function(e) { self.initNavigation(e); };
            window.addEventListener('keydown', navHandler, true);
            
            setTimeout(function(){
                isActive = true;
                var firstCard = inner.find('.card').first();
                if(firstCard.length) {
                    self.setFocus(firstCard);
                }
            }, 200);
        };

        this.start = function(){ isActive = true; };
        this.toggle = function(){ isActive = true; };
        this.pause = function(){ isActive = false; };
        this.stop = function(){ isActive = false; };
        this.render = function(){ return scroll.render(); };
        
        // --- ШАГ 6: Правильное уничтожение ---
        this.destroy = function(){ 
            isActive = false;
            if(navHandler) {
                window.removeEventListener('keydown', navHandler, true);
                navHandler = null;
            }
            scroll.destroy(); 
        };
    }

    /* ==========================================================
     *  БЕЗОПАСНОЕ ВОСПРОИЗВЕДЕНИЕ (Без изменений)
     * ========================================================== */
    function openInBrowser(url, title){
        D.noty('▶ Открываю: ' + title);
        lastBrowserOpenTime = Date.now(); 
        
        var link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.style.display = 'none'; 
        document.body.appendChild(link);
        link.click();
        setTimeout(function() {
            if (link.parentNode) document.body.removeChild(link);
        }, 100);
    }

    /* ==========================================================
     *  РЕГИСТРАЦИЯ И ЗАПУСК
     * ========================================================== */
    Lampa.Component.add('zf_menu', MenuComp);
    Lampa.Component.add('zf_cards', CardsComp);

    var ICO = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>';

    function addMenu(){
        if($('[data-action="trahkino"]').length) return;
        var li = $('<li class="menu__item selector" data-action="trahkino">'+
            '<div class="menu__ico">'+ICO+'</div>'+
            '<div class="menu__text">Trahkino</div></li>');
        
        li.on('hover:enter', function(){
            Lampa.Activity.push({ 
                url: '', 
                title: 'Trahkino v' + CONFIG.ver, 
                component: 'zf_cards' 
            });
        });
        
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
