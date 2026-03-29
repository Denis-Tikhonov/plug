/**
 * ZonaFilm v1.3-diag — РАСШИРЕННАЯ ДИАГНОСТИКА
 * Показывает ЧТО именно вернул каждый прокси
 */
(function(){
    'use strict';

    /**
     * Расширенный список прокси
     * Добавлены новые варианты
     */
    var PROXIES = [
        { name: 'codetabs',       tpl: 'https://api.codetabs.com/v1/proxy?quest={u}' },
        { name: 'corsproxy.io',   tpl: 'https://corsproxy.io/?{u}' },
        { name: 'allorigins-raw', tpl: 'https://api.allorigins.win/raw?url={u}' },
        { name: 'allorigins-get', tpl: 'https://api.allorigins.win/get?url={u}' },
        { name: 'cors-anywhere',  tpl: 'https://cors-anywhere.herokuapp.com/{u_raw}' },
        { name: 'corslol',        tpl: 'https://api.cors.lol/?url={u}' },
        { name: 'corsfix',        tpl: 'https://corsfix.com/?{u}' },
        { name: 'noproxy-direct', tpl: '{u_raw}' }
    ];

    /**
     * ДВА тестовых URL:
     * 1) Data API (JSON) — может блокироваться
     * 2) Обычная страница (HTML) — проще пройти
     */
    var TARGETS = {
        json: 'https://zonafilm.ru/_next/data/39MEgPaxeFXNBOSc6BloZ/movies.json',
        html: 'https://zonafilm.ru/movies'
    };

    var ICO = '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z' +
        'M8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2z' +
        'm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>';

    /**
     * Тест одного прокси с одним URL
     */
    function testOne(proxy, targetUrl, cb){
        var url;

        if(proxy.tpl.indexOf('{u_raw}') !== -1){
            url = proxy.tpl.replace('{u_raw}', targetUrl);
        } else {
            url = proxy.tpl.replace('{u}', encodeURIComponent(targetUrl));
        }

        var start = Date.now();

        $.ajax({
            url: url,
            timeout: 12000,
            success: function(data){
                var ms = Date.now() - start;
                var info = analyzeResponse(data);
                cb({
                    ok: true,
                    ms: ms,
                    info: info
                });
            },
            error: function(xhr, status, err){
                var ms = Date.now() - start;
                cb({
                    ok: false,
                    ms: ms,
                    info: 'ОШИБКА: ' + status +
                          (err ? ' ' + err : '') +
                          ' (HTTP ' + (xhr.status||'?') + ')'
                });
            }
        });
    }

    /**
     * Анализ ответа — определить что пришло
     */
    function analyzeResponse(data){
        if(!data) return 'Пустой ответ';

        var str = typeof data === 'string' ? data : JSON.stringify(data);
        var len = str.length;

        /* Попробовать как JSON с фильмами */
        try {
            var j = typeof data === 'string' ? JSON.parse(data) : data;

            /* allorigins-get оборачивает в {contents: "..."} */
            if(j.contents){
                try {
                    var inner = JSON.parse(j.contents);
                    var pp2 = inner.pageProps || inner;
                    if(pp2.data && Array.isArray(pp2.data) && pp2.data.length > 0){
                        return '✅ ФИЛЬМЫ (через contents): ' +
                               pp2.data.length + ' шт, первый: ' +
                               pp2.data[0].title;
                    }
                } catch(e2){}

                /* contents есть но не JSON — может HTML */
                if(typeof j.contents === 'string'){
                    if(j.contents.indexOf('__NEXT_DATA__') !== -1){
                        return '✅ HTML с __NEXT_DATA__ (через contents), ' +
                               j.contents.length + ' символов';
                    }
                    return 'contents есть (' + j.contents.length +
                           ' симв), начало: ' +
                           j.contents.substring(0, 80);
                }
            }

            /* Прямой JSON */
            var pp = j.pageProps || j;
            if(pp.data && Array.isArray(pp.data) && pp.data.length > 0){
                return '✅ ФИЛЬМЫ: ' + pp.data.length +
                       ' шт, первый: ' + pp.data[0].title;
            }

            /* JSON но без фильмов */
            return 'JSON без фильмов, ключи: ' +
                   Object.keys(j).slice(0,5).join(',') +
                   ' (' + len + ' байт)';

        } catch(e){}

        /* Не JSON — проверяем HTML */
        if(typeof str === 'string'){
            if(str.indexOf('__NEXT_DATA__') !== -1){
                return '✅ HTML с __NEXT_DATA__ (' + len + ' симв)';
            }
            if(str.indexOf('<html') !== -1 || str.indexOf('<!DOCTYPE') !== -1){
                /* Какой-то HTML — показать заголовок */
                var titleMatch = str.match(/<title>([^<]*)<\/title>/i);
                var titleText = titleMatch ? titleMatch[1] : '?';
                return 'HTML страница: "' + titleText + '" (' + len + ' симв)';
            }

            return 'Текст (' + len + ' симв), начало: ' +
                   str.substring(0, 100);
        }

        return 'Неизвестный тип: ' + typeof data + ' (' + len + ' байт)';
    }

    /**
     * Главный тест — проверяем все прокси с JSON и HTML
     */
    function runFullTest(){
        Lampa.Noty.show('🔧 Тестирую ' + PROXIES.length + ' прокси...');

        var results = [];
        var done = 0;
        var total = PROXIES.length * 2;  // JSON + HTML для каждого

        PROXIES.forEach(function(proxy, idx){
            /* Тест с JSON */
            testOne(proxy, TARGETS.json, function(r){
                results.push({
                    name: proxy.name,
                    target: 'JSON',
                    ok: r.ok,
                    ms: r.ms,
                    info: r.info,
                    hasMovies: r.info.indexOf('✅') === 0,
                    proxyTpl: proxy.tpl
                });
                done++;
                Lampa.Noty.show('🔧 '+done+'/'+total);
                if(done >= total) showFullResults(results);
            });

            /* Тест с HTML */
            testOne(proxy, TARGETS.html, function(r){
                results.push({
                    name: proxy.name,
                    target: 'HTML',
                    ok: r.ok,
                    ms: r.ms,
                    info: r.info,
                    hasMovies: r.info.indexOf('✅') === 0,
                    proxyTpl: proxy.tpl
                });
                done++;
                Lampa.Noty.show('🔧 '+done+'/'+total);
                if(done >= total) showFullResults(results);
            });
        });
    }

    /**
     * Показать результаты
     */
    function showFullResults(results){
        var items = [];

        /* Сортируем: сначала рабочие */
        results.sort(function(a,b){
            if(a.hasMovies && !b.hasMovies) return -1;
            if(!a.hasMovies && b.hasMovies) return 1;
            if(a.ok && !b.ok) return -1;
            if(!a.ok && b.ok) return 1;
            return a.ms - b.ms;
        });

        var working = results.filter(function(r){ return r.hasMovies; });

        items.push({
            title: '🔧 Результат: работает ' +
                   working.length + ' из ' + results.length,
            subtitle: ''
        });

        items.push({ title: '━━━━━━━━━━━━', subtitle: '' });

        results.forEach(function(r){
            var icon = r.hasMovies ? '✅' : (r.ok ? '⚠' : '❌');
            items.push({
                title: icon + ' ' + r.name + ' [' + r.target + '] ' + r.ms + 'мс',
                subtitle: r.info
            });
        });

        items.push({ title: '━━━━━━━━━━━━', subtitle: '' });

        /* Если есть рабочий — кнопка запуска плагина */
        if(working.length > 0){
            items.push({
                title: '🎬 ЗАПУСТИТЬ с рабочим прокси',
                subtitle: working[0].name + ' [' + working[0].target + ']',
                action: 'launch',
                proxyTpl: working[0].proxyTpl,
                useHtml: working[0].target === 'HTML'
            });
        }

        items.push({
            title: '🔄 Повторить тест',
            subtitle: '',
            action: 'retest'
        });

        items.push({
            title: '← Назад',
            subtitle: '',
            action: 'back'
        });

        Lampa.Select.show({
            title: '🔧 ZonaFilm — Диагностика сети v2',
            items: items,
            onBack: function(){
                Lampa.Controller.toggle('content');
            },
            onSelect: function(item){
                if(item.action === 'back'){
                    Lampa.Controller.toggle('content');
                    return;
                }
                if(item.action === 'retest'){
                    runFullTest();
                    return;
                }
                if(item.action === 'launch'){
                    Lampa.Noty.show('🎬 Рабочий прокси: ' + item.subtitle);
                    Lampa.Noty.show('Используйте эту информацию для настройки плагина');
                }
            }
        });
    }

    /* Кнопка в меню */
    function addMenu(){
        if($('[data-action="zonafilm"]').length) return;
        var li = $('<li class="menu__item selector" data-action="zonafilm">'+
            '<div class="menu__ico">'+ICO+'</div>'+
            '<div class="menu__text">ZF Тест v2</div></li>');
        li.on('hover:enter', function(){
            runFullTest();
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
        Lampa.Noty.show('🔧 ZF Тест сети v2');
    }

    if(window.appready) init();
    else Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready') init();
    });
})();
