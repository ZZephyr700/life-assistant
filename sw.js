/* 生活助手 Service Worker：离线缓存应用外壳
   策略：安装预缓存核心文件；请求采用缓存优先、后台更新（stale-while-revalidate）。
   用户数据走 localStorage / IndexedDB，不经过网络，因此不缓存任何接口数据。 */
const CACHE='lifeapp-v1';
const CORE=['./','./index.html','./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return; // 跨域请求不干预
  /* 页面导航：网络优先（保证拿到最新版），离线时回退缓存的应用外壳 */
  if(req.mode==='navigate'){
    e.respondWith(
      fetch(req).then(res=>{
        if(res&&res.status===200){
          const copy=res.clone();
          caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});
        }
        return res;
      }).catch(()=>caches.match('./index.html').then(h=>h||caches.match('./')))
    );
    return;
  }
  /* 静态资源：缓存优先，后台更新 */
  e.respondWith(
    caches.match(req).then(hit=>{
      const fetcher=fetch(req).then(res=>{
        if(res&&res.status===200){
          const copy=res.clone();
          caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
        }
        return res;
      }).catch(()=>hit);
      return hit||fetcher;
    })
  );
});
