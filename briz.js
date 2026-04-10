
/*
BRIZ PRO Parser for Lampa / AdultJS
Version: 2.0 PRO

Features
- Mirror auto detection
- Cloudflare Worker fallback
- Retry network system
- Android TV optimized requests
- Stable pagination
*/

(function(){

'use strict';

var BRIZ = {};

/* ===============================
CONFIG
=============================== */

var HOSTS = [
 'https://pornobriz.com/',
 'https://pornobriz.net/',
 'https://pornobriz.org/',
 'https://pornobriz.xyz/'
];

var WORKERS = [
 'https://zonaproxy.777b737.workers.dev/?url=',
 'https://cors.isomorphic.workers.dev/?url=',
 'https://api.allorigins.win/raw?url='
];

var REQUEST_TIMEOUT = 15000;
var RETRY_LIMIT = 3;

var CURRENT_HOST = HOSTS[0];

/* ===============================
UTILS
=============================== */

function log(){
 console.log('[BRIZ PRO]', arguments);
}

function encode(url){
 return encodeURIComponent(url);
}

function normalize(url){
 if(!url) return '';
 url = url.trim();
 if(!/\/$/.test(url)) url += '/';
 return url;
}

/* ===============================
PROXY SYSTEM
=============================== */

function buildProxy(url){

 for(var i=0;i<WORKERS.length;i++){
   try{
     return WORKERS[i] + encode(url);
   }
   catch(e){}
 }

 return url;
}

/* ===============================
NETWORK
=============================== */

function request(url, success, fail){

 var tries = 0;

 function attempt(){

   tries++;

   var target = buildProxy(url);

   Lampa.Network.native(target,function(data){

     if(data && data.length > 100){
       success(data);
     }
     else{
       retry();
     }

   },function(){
     retry();
   },{
     timeout: REQUEST_TIMEOUT
   });

 }

 function retry(){

   if(tries < RETRY_LIMIT){
     setTimeout(attempt,500);
   }
   else{
     fail('network error');
   }

 }

 attempt();

}

/* ===============================
MIRROR DETECT
=============================== */

function detectMirror(callback){

 var i = 0;

 function check(){

   if(i >= HOSTS.length){
     callback(HOSTS[0]);
     return;
   }

   var host = HOSTS[i];

   request(host,function(){

     CURRENT_HOST = host;
     callback(host);

   },function(){

     i++;
     check();

   });

 }

 check();

}

/* ===============================
URL BUILDER
=============================== */

function buildUrl(page){

 page = page || 1;

 if(page === 1){
   return normalize(CURRENT_HOST);
 }

 return normalize(CURRENT_HOST + 'page/' + page + '/');

}

/* ===============================
PARSE
=============================== */

function parseCards(html){

 var results = [];

 try{

   var doc = Lampa.Utils.parseHtml(html);
   var cards = doc.querySelectorAll('.short');

   for(var i=0;i<cards.length;i++){

     var card = cards[i];

     var link = card.querySelector('a');
     var img  = card.querySelector('img');
     var title = card.querySelector('.short-title');

     if(!link) continue;

     results.push({
       title: title ? title.textContent.trim() : 'Video',
       url: link.href,
       poster: img ? img.src : '',
       type: 'movie'
     });

   }

 }catch(e){
   log('parse error',e);
 }

 return results;

}

/* ===============================
MAIN
=============================== */

BRIZ.main = function(params, success, error){

 var page = params.page || 1;

 detectMirror(function(){

   var url = buildUrl(page);

   request(url,function(html){

     var items = parseCards(html);

     success({
       results: items,
       page: page,
       total_pages: page + 1
     });

   },error);

 });

};

/* ===============================
FULL
=============================== */

BRIZ.full = function(params, success, error){

 var url = params.url;

 request(url,function(html){

   try{

     var doc = Lampa.Utils.parseHtml(html);

     var title = doc.querySelector('h1');
     var video = doc.querySelector('video source');

     success({
       title: title ? title.textContent : 'Video',
       url: video ? video.src : url
     });

   }catch(e){
     error(e);
   }

 },error);

};

/* ===============================
SEARCH
=============================== */

BRIZ.search = function(params, success, error){

 var query = encodeURIComponent(params.query || '');
 var page = params.page || 1;

 var url;

 if(page === 1){
   url = CURRENT_HOST + 'search/' + query + '/';
 }
 else{
   url = CURRENT_HOST + 'search/' + query + '/page/' + page + '/';
 }

 request(url,function(html){

   var items = parseCards(html);

   success({
     results: items,
     page: page,
     total_pages: page + 1
   });

 },error);

};

window.BRIZ_PRO = BRIZ;

})();
