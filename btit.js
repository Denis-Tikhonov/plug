// =============================================================
// btit.js — Парсер BigTitsLust (v1.3.0)
// Strategy: Delegate video extraction to Worker /resolve-page
// =============================================================

(function () {
  'use strict';

  var NAME = 'btit';
  var HOST = 'https://www.bigtitslust.com';
  var TAG  = '[' + NAME + ']';

  // Функция получения базового URL воркера из ядра
  function getWorkerBase() {
    var base = window.AdultPlugin.workerUrl || 'https://zonaproxy.777b737.workers.dev/?url=';
    return base.replace(/[/?&]url=?$/, '').replace(/\/+$/, '');
  }

  function httpGet(url, success, error) {
    if (window.AdultPlugin && typeof window.AdultPlugin.networkRequest === 'function') {
      window.AdultPlugin.networkRequest(url, success, error);
    } else {
      fetch(url).then(function(r){ return r.text(); }).then(success).catch(error);
    }
  }

  var Parser = {
    // Основной метод поиска видео
    qualities: function (videoPageUrl, success, error) {
    console.log(TAG, 'qualities() → ручной поиск remote_control...');
    
    // Используем прямой запрос через ядро, чтобы получить HTML целиком
    window.AdultPlugin.networkRequest(videoPageUrl, function (html) {
        // Ищем remote_control.php в коде страницы
        var rcMatch = html.match(/(https?:\/\/[^"'\s]+remote_control\.php[^"'\s]*)/i);
        
        if (rcMatch && rcMatch[1]) {
            var finalUrl = rcMatch[1].replace(/\\/g, '');
            console.log(TAG, 'Найдена рабочая ссылка:', finalUrl);
            success({ qualities: { 'HD': finalUrl } });
        } else {
            // Если в HTML нет, значит сайт очень хитрый. 
            // Последняя попытка: передать в Worker, но с флагом "искать remote_control"
            error('Ссылка remote_control не найдена в HTML. Попробуйте другой парсер.');
        }
    }, error);
    },

    main: function (params, success, error) { /* ... реализация из 1.2.0 ... */ },
    view: function (params, success, error) { /* ... реализация из 1.2.0 ... */ },
    search: function (params, success, error) { /* ... реализация из 1.2.0 ... */ }
  };

  // Регистрация
  function tryRegister() {
    if (window.AdultPlugin && typeof window.AdultPlugin.registerParser === 'function') {
      window.AdultPlugin.registerParser(NAME, Parser);
      return true;
    }
    return false;
  }
  var poll = setInterval(function () { if (tryRegister()) clearInterval(poll); }, 200);
})();
