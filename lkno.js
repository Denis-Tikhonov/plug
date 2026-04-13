(function () {
  var NAME = 'lkno';
  var BASE_URL = 'https://wes.lenkino.adult';

  var LenkinoParser = {
    // 1. Установка стартовой страницы
    list: function (url, success, error) {
      if (!url || url === 'lkno') {
        url = BASE_URL + '/top-porno';
      } else if (url.indexOf('http') !== 0) {
        url = BASE_URL + url.replace(NAME + ':', '');
      }

      window.AdultPlugin.networkRequest(url, function (html) {
        var items = [];
        var doc = document.createElement('div');
        doc.innerHTML = html;

        var cards = doc.querySelectorAll('.item'); // Селектор карточки
        cards.forEach(function (card) {
          var link = card.querySelector('a');
          var img = card.querySelector('img');
          if (link && img) {
            items.push({
              title: img.getAttribute('alt') || 'Без названия',
              url: link.getAttribute('href'),
              img: img.getAttribute('data-src') || img.getAttribute('src'),
              json: true // Обязательно true для вызова метода qualities
            });
          }
        });

        success({ items: items });
      }, error);
    },

    // 2. Исправленный поиск прямой ссылки на видео
    qualities: function (url, success, error) {
      if (url.indexOf('http') !== 0) url = BASE_URL + url;

      window.AdultPlugin.networkRequest(url, function (html) {
        // Поиск прямой ссылки в теге video или в скриптах плеера
        var videoMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i) || 
                         html.match(/source\s*:\s*["']([^"']+\.mp4[^"']*)["']/i);

        if (videoMatch && videoMatch[1]) {
          var streamUrl = videoMatch[1];
          // Если ссылка относительная, добавляем домен
          if (streamUrl.indexOf('//') === 0) streamUrl = 'https:' + streamUrl;
          if (streamUrl.indexOf('/') === 0) streamUrl = BASE_URL + streamUrl;

          success({
            qualities: {
              'Auto': streamUrl
            }
          });
        } else {
          // Запасной вариант: поиск по регулярному выражению для ссылок .mp4
          var regex = /(https?:\/\/[^"']+\.mp4[^"']*)/g;
          var matches = html.match(regex);
          if (matches && matches.length > 0) {
            success({ qualities: { 'HD': matches[0] } });
          } else {
            error('Видео поток не найден. Возможно, требуется авторизация или обход защиты.');
          }
        }
      }, error);
    },

    search: function (query, success, error) {
      this.list(BASE_URL + '/search/?q=' + encodeURIComponent(query), success, error);
    }
  };

  // Регистрация
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, LenkinoParser);
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    var _poll = setInterval(function () {
      if (tryRegister()) clearInterval(_poll);
    }, 200);
  }
})();
