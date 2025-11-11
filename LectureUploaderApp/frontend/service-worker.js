'use strict';
const CACHE_NAME = 'lectureuploader-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/student.html',
  '/teacher.html',
  '/styles.css',
  '/app.js',
  '/summaries.js',
  '/student-files.js',
  '/manifest.json'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k)=> k!==CACHE_NAME ? caches.delete(k): null))).then(()=>self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Network-first for API
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).then((res)=>{
        return res;
      }).catch(()=> caches.match(event.request))
    );
    return;
  }
  // Cache-first for static
  event.respondWith(
    caches.match(event.request).then((cached)=>{
      return cached || fetch(event.request).then((res)=>{
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache)=> cache.put(event.request, copy));
        return res;
      }).catch(()=> cached);
    })
  );
});
