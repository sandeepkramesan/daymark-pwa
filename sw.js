const CACHE='daymark-v24';
const FILES=['./','./index.html','./manifest.webmanifest','./icons/daymark-192.png','./icons/daymark-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||!req.url.startsWith(self.location.origin))return;
  if(req.mode==='navigate'){
    // Network-first (4s) so new deployments show up; cached shell when offline.
    const timeout=new Promise((_,reject)=>setTimeout(reject,4000));
    e.respondWith(Promise.race([fetch(req),timeout]).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy))}return r}).catch(()=>caches.match('./index.html')));
    return;
  }
  // Static assets: cache first, refresh in background.
  e.respondWith(caches.match(req).then(hit=>{
    const net=fetch(req).then(r=>{if(r.ok&&r.status===200){const copy=r.clone();caches.open(CACHE).then(c=>c.put(req,copy))}return r}).catch(()=>hit||Response.error());
    return hit||net;
  }));
});
