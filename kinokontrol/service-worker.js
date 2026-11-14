const CACHE='kinokontrol-v09-1';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./photos-v09.js'];
const scope=new URL(self.registration.scope);
const assets=new Set(ASSETS.map(x=>new URL(x,scope).href));
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(x=>new Request(new URL(x,scope),{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('kinokontrol-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request,url=new URL(req.url);
  if(req.method!=='GET'||url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).catch(()=>caches.open(CACHE).then(c=>c.match(new URL('./index.html',scope).href))));
  }else if(assets.has(url.href)){
    e.respondWith(caches.open(CACHE).then(c=>c.match(req)).then(r=>r||fetch(req)));
  }
});
