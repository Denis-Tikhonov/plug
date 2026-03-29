/**
 * TrahKino v0.1-diag — Изучение структуры сайта
 */
(function(){
    'use strict';

    var WORKER = 'https://zonaproxy.777b737.workers.dev';
    var SITE = 'https://trahkino.me';

    var ICO = '<svg viewBox="0 0 24 24" fill="currentColor">' +
        '<path d="M18 3v2h-2V3H8v2H6V3H4v18h2v-2h2v2h8v-2h2v2h2V3h-2z' +
        'M8 17H6v-2h2v2zm0-4H6v-2h2v2zm0-4H6V7h2v2z' +
        'm10 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V7h2v2z"/></svg>';

    function get(url, cb){
        var full = WORKER + '/?url=' + encodeURIComponent(url);

        $.ajax({
            url: full,
            timeout: 20000,
            success: function(data){
                cb(null, data);
            },
            error: function(xhr, status, err){
                cb(status + ' ' + err + ' HTTP=' + xhr.status, null);
            }
        });
    }

    function runDiag(){
        var steps = [];

        function add(t, s){
            steps.push({ title: t, subtitle: s || '' });
        }

        function show(){
            steps.push({ title: '━━━━━━━━━━━', subtitle: '' });
            steps.push({ title: '← Назад', subtitle: '', action: 'back' });

            Lampa.Select.show({
                title: '🔧 Диагностика сайта',
                items: steps,
                onBack: function(){ Lampa.Controller.toggle('content'); },
                onSelect: function(item){
                    if(item.action === 'back') Lampa.Controller.toggle('content');
                }
            });
        }

        Lampa.Noty.show('⏳ Проверяю сайт...');

        add('1️⃣ Сайт: ' + SITE);
        add('2️⃣ Worker: ' + WORKER);
        add('3️⃣ Загрузка главной...');

        get(SITE, function(err, data){
            if(err){
                add('❌ Главная: ' + err);
                show();
                return;
            }

            var html = typeof data === 'string' ? data : JSON.stringify(data);
            add('✅ Главная: ' + html.length + ' символов');

            /* Определяем тип сайта */
            if(html.indexOf('__NEXT_DATA__') !== -1){
                add('📋 Тип: Next.js');
                var m = html.match(/"buildId"\s*:\s*"([^"]+)"/);
                if(m) add('BuildId: ' + m[1]);
            }

            /* Ищем ссылки на видео/категории */
            var links = [];
            var linkRe = /<a[^>]+href="([^"]*)"[^>]*>/gi;
            var match;
            var seen = {};
            while((match = linkRe.exec(html)) !== null){
                var href = match[1];
                if(href && href.length > 1 && href.length < 100 && !seen[href]){
                    seen[href] = true;
                    links.push(href);
                }
            }
            add('🔗 Ссылок: ' + links.length);

            /* Показываем первые 15 уникальных путей */
            var paths = {};
            links.forEach(function(l){
                var p = l.replace(/https?:\/\/[^\/]+/, '');
                var parts = p.split('/').filter(function(x){ return x; });
                if(parts.length > 0) paths['/' + parts[0]] = true;
            });

            add('📁 Разделы:');
            Object.keys(paths).slice(0, 15).forEach(function(p){
                add('   ' + p);
            });

            /* Ищем категории */
            var cats = [];
            var catRe = /<a[^>]+href="([^"]*(?:categor|genre|tag|razd)[^"]*)"[^>]*>([^<]*)</gi;
            while((match = catRe.exec(html)) !== null){
                cats.push(match[1] + ' → ' + match[2].trim());
            }
            if(cats.length > 0){
                add('📂 Категории:');
                cats.slice(0, 10).forEach(function(c){ add('   ' + c); });
            }

            /* Ищем видео-элементы */
            var videos = [];
            var vidRe = /<a[^>]+href="([^"]*)"[^>]*class="[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]*)"[\s\S]*?<\/a>/gi;
            while((match = vidRe.exec(html)) !== null){
                videos.push({ href: match[1], img: match[2] });
            }
            add('🎬 Видео-блоков: ' + videos.length);
            videos.slice(0, 3).forEach(function(v){
                add('   ' + v.href.substring(0, 60));
            });

            /* Ищем заголовки */
            var titles = [];
            var titleRe = /<(?:h[1-3]|title)[^>]*>([^<]+)<\//gi;
            while((match = titleRe.exec(html)) !== null){
                var t = match[1].trim();
                if(t.length > 2 && t.length < 100) titles.push(t);
            }
            if(titles.length > 0){
                add('📝 Заголовки:');
                titles.slice(0, 8).forEach(function(t){ add('   ' + t); });
            }

            /* HTML начало для анализа */
            add('━━━ HTML начало: ━━━');
            add(html.substring(0, 200));

            /* Загружаем вторую страницу для анализа пагинации */
            add('');
            add('4️⃣ Проверяю пагинацию...');

            /* Ищем паттерн пагинации */
            var pageLinks = html.match(/href="[^"]*(?:page|p)=?\d+[^"]*"/gi) || [];
            if(pageLinks.length > 0){
                add('📄 Пагинация:');
                pageLinks.slice(0, 5).forEach(function(p){ add('   ' + p); });
            } else {
                var numLinks = html.match(/href="[^"]*\/\d+\/?"/gi) || [];
                if(numLinks.length > 0){
                    add('📄 Числовые ссылки:');
                    numLinks.slice(0, 5).forEach(function(p){ add('   ' + p); });
                } else {
                    add('📄 Пагинация не найдена');
                }
            }

            show();
        });
    }

    function addMenu(){
        if($('[data-action="tkdiag"]').length) return;
        var li = $('<li class="menu__item selector" data-action="tkdiag">'+
            '<div class="menu__ico">'+ICO+'</div>'+
            '<div class="menu__text">TK Диагностика</div></li>');
        li.on('hover:enter', function(){
            runDiag();
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
        Lampa.Noty.show('🔧 TK Диагностика');
    }

    if(window.appready) init();
    else Lampa.Listener.follow('app', function(e){
        if(e.type === 'ready') init();
    });
})();
