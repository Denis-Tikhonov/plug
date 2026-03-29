/**
 * ============================================================
 *  LAMPA PLUGIN — ZonaFilm v0.8.1
 *  Единственное отличие от v0.8.0:
 *    - Методы Controller выводятся на экран через Noty
 *    - После получения данных — удалите эту версию
 *      и вернитесь к рабочей
 * ============================================================
 */

(function () {
    'use strict';

    var CONFIG = {
        debug: true,
        ver: '0.8.1-diag',
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

    var D = {
        log: function(t,m){ if(CONFIG.debug) console.log('[ZF]['+t+']',m); },
        err: function(t,m){ console.error('[ZF][ERR]['+t+']',m); },
        noty: function(m){ try{Lampa.Noty.show(m)}catch(e){} }
    };

    /**
     * =============================================
     *  ДИАГНОСТИКА: выводим методы Controller
     *  на экран через Lampa.Noty
     * =============================================
     */
    function showDiagnostics(){
        try {
            // Собираем все методы Controller
            var methods = [];
            for(var key in Lampa.Controller){
                if(typeof Lampa.Controller[key] === 'function'){
                    methods.push(key);
                }
            }

            var msg = 'Controller: ' + methods.join(', ');
            D.log('Diag', msg);

            // Показываем на экране (Noty исчезает быстро)
            // Используем Select для долгого отображения
            Lampa.Select.show({
                title: 'ZonaFilm Диагностика',
                items: [
                    { title: 'Controller methods:', subtitle: methods.join(', ') },
                    { title: 'Scroll methods:', subtitle: (function(){
                        try {
                            var s = new Lampa.Scroll({mask:true});
                            var sm = [];
                            for(var k in s){
                                if(typeof s[k] === 'function') sm.push(k);
                            }
                            s.destroy();
                            return sm.join(', ');
                        } catch(e){ return 'error: '+e.message; }
                    })() },
                    { title: 'Activity methods:', subtitle: (function(){
                        var am = [];
                        for(var k in Lampa.Activity){
                            if(typeof Lampa.Activity[k] === 'function') am.push(k);
                        }
                        return am.join(', ');
                    })() },
                    { title: '← Назад (закрыть)', back: true }
                ],
                onBack: function(){
                    Lampa.Controller.toggle('settings');
                },
                onSelect: function(){}
            });

        } catch(e){
            D.err('Diag', e.message);
            // Fallback: просто Noty
            try {
                var methods2 = [];
                for(var key2 in Lampa.Controller){
                    if(typeof Lampa.Controller[key2] === 'function') methods2.push(key2);
                }
                Lampa.Noty.show('Ctrl: ' + methods2.join(','));
            } catch(e2){}
        }
    }

    // Простейший плагин — только кнопка в меню + диагностика
    var ICO = '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z' +
        'M8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2z' +
        'm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>';

    function addMenu(){
        if($('[data-action="zonafilm"]').length) return;

        var li = $('<li class="menu__item selector" data-action="zonafilm">' +
            '<div class="menu__ico">' + ICO + '</div>' +
            '<div class="menu__text">ZF Диагностика</div></li>');

        li.on('hover:enter', function(){
            showDiagnostics();
        });

        var list = $('.menu .menu__list');
        if(list.length) list.eq(0).append(li);
    }

    function init(){
        try {
            addMenu();
            D.noty('🔧 ZF Диагностика v' + CONFIG.ver);
        } catch(e){}
    }

    if(window.appready) init();
    else Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready') init();
    });

})();
