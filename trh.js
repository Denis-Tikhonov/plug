/* Lampa Parser: HDTube v1.3.1 */
(function () {
    'use strict';

    function HDTube(object) {
        var network = new Lampa.RegExp();
        
        function cleanUrl(url) {
            if (!url) return '';
            return url.replace(/^.*?\/function\/0\//, '');
        }

        this.search = function (query) {
            // Формируем запрос к поиску HDTube
            var searchUrl = 'https://hdtube.porn/search/' + encodeURIComponent(query) + '/';
            
            network.silent(searchUrl, function (str) {
                var container = $('<div>' + str + '</div>');
                var videos = container.find('.video-item');
                
                var results = [];
                videos.each(function () {
                    var link = $(this).find('a').attr('href');
                    var title = $(this).find('.title').text();
                    if (link) results.push({ title: title, url: link });
                });

                // Отображение и выбор видео (упрощено)
                if (results.length > 0) {
                    resolveVideo(results[0].url);
                }
            });
        };

        function resolveVideo(url) {
            network.silent(cleanUrl(url), function (str) {
                // Ищем скрипт плеера или прямые ссылки get_file
                var videoData = str.match(/video_url:\s*'(.*?)'/);
                if (!videoData) videoData = str.match(/file:\s*"(.*?)"/);

                if (videoData) {
                    var streamUrl = videoData[1];
                    
                    // Если ссылка относительная, добавляем домен cdn1 или основной
                    if (streamUrl.indexOf('http') !== 0) {
                        streamUrl = 'https://cdn1.hdtube.porn' + streamUrl;
                    }

                    // Проксируем через Cloudflare Worker
                    var proxyUrl = 'https://W138.js.workers.dev/?url=' + encodeURIComponent(streamUrl);

                    Lampa.Player.play({
                        url: proxyUrl,
                        title: object.movie.title
                    });
                }
            });
        }
    }

    Lampa.Plugins.add('hdtube', HDTube);
})();
