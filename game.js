
import {THREE,TilesRenderer,GoogleCloudAuthPlugin,ReorientationPlugin,GLTFExtensionsPlugin,TileCompressionPlugin,DRACOLoader} from './vendor.js';

const $=s=>document.querySelector(s);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const wrapA=a=>{a=(a+Math.PI)%(2*Math.PI);if(a<0)a+=2*Math.PI;return a-Math.PI;};
const lerpA=(a,b,t)=>a+wrapA(b-a)*t;
const R=Math.random;
let seed=1;function srand(s){seed=s|0;}
function rng(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
const store={get(k,d){try{const v=localStorage.getItem('gk2-'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('gk2-'+k,JSON.stringify(v));}catch(e){}}};
function fmt(t){if(!isFinite(t))return'—';const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(2);}
function fmt1(t){const m=Math.floor(t/60),s=t-m*60;return m+':'+(s<10?'0':'')+s.toFixed(1);}

/* ================= DATA ================= */
let LAPS=3;const SIDE=3, CANAL=16, FARQ=4, GRASS=8, RAMPH=2.0;
const PTS=[15,12,10,9,8,7,6,5,4,3,2,1];
const CHARS=[
 {name:'Femke',w:'L',role:'Student op de fiets',suit:'#d63a3a',skin:'#f1c7a5',hat:'helm',hatC:'#ffffff',kart:'#d63a3a'},
 {name:'Kees de Meeuw',w:'L',role:'Patatdief van de Vismarkt',suit:'#e9eef0',skin:'#ffffff',hat:'beak',hatC:'#f2a33d',kart:'#8fc3d4'},
 {name:'Lotte',w:'L',role:'Barista',suit:'#6b4b3e',skin:'#c99572',hat:'beanie',hatC:'#2fa36b',kart:'#2fa36b'},
 {name:'Jelle',w:'L',role:'Krantenbezorger',suit:'#3b82f6',skin:'#f3cdb0',hat:'cap',hatC:'#ffcf3f',kart:'#e8b81f'},
 {name:'Saskia',w:'M',role:'Studente',suit:'#9b5de5',skin:'#e7b897',hat:'hair',hatC:'#5a3220',kart:'#9b5de5'},
 {name:'Bram',w:'M',role:'Schipper',suit:'#1d4e89',skin:'#e0a98a',hat:'captain',hatC:'#f6f3ea',kart:'#2a62a8'},
 {name:'Mo',w:'M',role:'Snackbarbaas',suit:'#ff7a1a',skin:'#a8704d',hat:'bandana',hatC:'#d63a3a',kart:'#ff7a1a'},
 {name:'Anouk',w:'M',role:'Wielrenster',suit:'#e46b9a',skin:'#f0c3a3',hat:'helm',hatC:'#e46b9a',kart:'#e46b9a'},
 {name:'Gerda',w:'Z',role:'Marktkoopvrouw',suit:'#2b7a78',skin:'#f2c9ad',hat:'straw',hatC:'#e8c46a',kart:'#2b7a78'},
 {name:'Harm',w:'Z',role:'Boer uit het Ommeland',suit:'#3e6b2f',skin:'#e3a888',hat:'cap',hatC:'#3e6b2f',kart:'#7a9a2e'},
 {name:'Sjoerd',w:'Z',role:'Havenmeester',suit:'#22313f',skin:'#d9a07f',hat:'captain',hatC:'#22313f',kart:'#5b6b7a'},
 {name:'Dirk',w:'Z',role:'Bouwvakker',suit:'#f2a900',skin:'#c48a64',hat:'hard',hatC:'#ffcf3f',kart:'#c46a1a'}];
const WCLS={L:{name:'Licht',sp:2,ac:4,wt:1,ha:4.5,tr:3.5,mt:4},M:{name:'Middel',sp:3,ac:3,wt:3,ha:3,tr:3,mt:3},Z:{name:'Zwaar',sp:4,ac:2,wt:5,ha:2,tr:2.5,mt:2}};
const BODIES=[{id:'stad',name:'Stadskart',d:{}},{id:'bak',name:'Bakfiets',d:{sp:.25,ac:-.5,wt:1.5,ha:-.5,tr:1,mt:-.25}},{id:'racer',name:'Racer',d:{sp:1,ac:-.5,wt:.25,ha:-.75,tr:-.5}},{id:'brom',name:'Brommer',d:{sp:-.25,ac:.75,wt:-.5,ha:1,mt:.75}}];
const WHEELS=[{id:'std',name:'Standaard',r:.42,d:{}},{id:'klein',name:'Klein',r:.32,d:{sp:-.5,ac:1,wt:-.25,ha:.5,tr:-.5,mt:.75}},{id:'groot',name:'Groot',r:.56,d:{sp:.25,ac:-.5,wt:.5,ha:-.5,tr:1.5,mt:-.5}}];
const CCS=[{name:'50cc',v:17,ai:.86},{name:'100cc',v:21,ai:.92},{name:'150cc',v:25,ai:.965},{name:'200cc',v:30,ai:.985}];
function statsOf(ci,bi,wi){const b=WCLS[CHARS[ci].w],s={};for(const k of['sp','ac','wt','ha','tr','mt'])s[k]=clamp(b[k]+(BODIES[bi].d[k]||0)+(WHEELS[wi].d[k]||0),0,6);return s;}

/* item icons */
const SV=(inner)=>`<svg viewBox="0 0 48 48" aria-hidden="true">${inner}</svg>`;
const tri=(inner)=>`<g transform="translate(-1 2) scale(.56)">${inner}</g><g transform="translate(21 2) scale(.56)">${inner}</g><g transform="translate(10 21) scale(.56)">${inner}</g>`;
const G_CUP='<path d="M10 17h22v11a10 10 0 0 1-10 10h-2a10 10 0 0 1-10-10z" fill="#f6f3ea" stroke="#5a3a22" stroke-width="2.5"/><path d="M32 20h3a5 5 0 0 1 0 10h-3" fill="none" stroke="#5a3a22" stroke-width="2.5"/><path d="M16 6c0 3 3 4 3 7M23 5c0 3 3 4 3 7" stroke="#ff7a1a" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
const G_GOLD='<path d="M10 17h22v11a10 10 0 0 1-10 10h-2a10 10 0 0 1-10-10z" fill="#ffcf3f" stroke="#8a5a16" stroke-width="2.5"/><path d="M32 20h3a5 5 0 0 1 0 10h-3" fill="none" stroke="#8a5a16" stroke-width="2.5"/><path d="M16 6c0 3 3 4 3 7M23 5c0 3 3 4 3 7" stroke="#fff3b0" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
const G_KLOMP='<path d="M5 31c0-5 5-8 12-8h7c4-6 10-10 16-9 4 1 3 6 0 9l-3 3c-2 5-7 9-15 9H11c-4 0-6-2-6-4z" fill="#f2c14e" stroke="#8a5a16" stroke-width="2.5" stroke-linejoin="round"/><path d="M28 21c3 1 6 1 9-1" stroke="#8a5a16" stroke-width="2" fill="none"/>';
const G_MEEUW='<path d="M4 24c7-9 13-10 20-2 7-8 13-7 20 2-7-3-13-1-20 7-7-8-13-10-20-7z" fill="#f6f3ea" stroke="#3a4a52" stroke-width="2" stroke-linejoin="round"/><path d="M24 28l4 3-4 2z" fill="#f2a33d"/>';
const G_PEERD='<path d="M13 42l2-12c-4-2-6-8-2-14l8-7 2 4 10 4c4 2 5 7 3 10l-5-1-3 4 3 12z" fill="#3a6fd8" stroke="#0b1716" stroke-width="2.2" stroke-linejoin="round"/><circle cx="27" cy="16" r="1.8" fill="#0b1716"/><path d="M15 16c-4-1-7 2-8 6" stroke="#0b1716" stroke-width="2.2" fill="none"/>';
const G_HARING='<path d="M5 24c8-8 22-10 32 0-10 10-24 8-32 0z" fill="#a9bcc6" stroke="#33454f" stroke-width="2"/><path d="M37 24l7-6v12z" fill="#a9bcc6" stroke="#33454f" stroke-width="2" stroke-linejoin="round"/><circle cx="13" cy="22" r="1.8" fill="#0b1716"/>';
const ICON={
 koffie:SV(G_CUP), koffie3:SV(tri(G_CUP)), goud:SV(G_GOLD),
 klomp:SV(G_KLOMP), klomp3:SV(tri(G_KLOMP)), meeuw:SV(G_MEEUW), meeuw3:SV(tri(G_MEEUW)), peerd:SV(G_PEERD),
 haring:SV(G_HARING), haring3:SV(tri(G_HARING)),
 knaller:SV('<rect x="15" y="15" width="16" height="26" rx="3" fill="#d63a3a" stroke="#5a1010" stroke-width="2.5"/><rect x="15" y="23" width="16" height="4" fill="#f6f3ea"/><path d="M23 15c0-4 4-6 8-8" stroke="#3a2a1a" stroke-width="2.2" fill="none"/><circle cx="32" cy="7" r="3.4" fill="#ffcf3f"/>'),
 trein:SV('<rect x="10" y="7" width="28" height="31" rx="6" fill="#ffcf3f" stroke="#1d3c8f" stroke-width="2.5"/><rect x="14" y="12" width="20" height="10" rx="2" fill="#1d3c8f"/><rect x="10" y="26" width="28" height="3" fill="#1d3c8f"/><circle cx="17" cy="33" r="2.5" fill="#f6f3ea"/><circle cx="31" cy="33" r="2.5" fill="#f6f3ea"/><path d="M14 42h20" stroke="#33454f" stroke-width="3" stroke-linecap="round"/>'),
 klok:SV('<path d="M24 6c-8 0-12 6-12 14v8l-4 6h32l-4-6v-8c0-8-4-14-12-14z" fill="#ffcf3f" stroke="#8a5a16" stroke-width="2.5" stroke-linejoin="round"/><circle cx="24" cy="39" r="4" fill="#8a5a16"/><path d="M6 14l4 2M42 14l-4 2M5 24h4M43 24h-4" stroke="#fff3b0" stroke-width="2.5" stroke-linecap="round"/>'),
 hagel:SV('<path d="M12 27a7 7 0 0 1 2-14 9 9 0 0 1 17-2 7 7 0 0 1 5 16z" fill="#c9d3da" stroke="#4a5a66" stroke-width="2.2"/><circle cx="16" cy="35" r="3.2" fill="#f6f3ea" stroke="#4a5a66"/><circle cx="26" cy="40" r="3.2" fill="#f6f3ea" stroke="#4a5a66"/><circle cx="35" cy="33" r="3.2" fill="#f6f3ea" stroke="#4a5a66"/>'),
 plens:SV('<path d="M12 25a7 7 0 0 1 2-14 9 9 0 0 1 17-2 7 7 0 0 1 5 16z" fill="#5f7d91" stroke="#2c3e4a" stroke-width="2.2"/><path d="M16 31l-3 7M25 31l-3 9M34 31l-3 7" stroke="#6ec3ff" stroke-width="3" stroke-linecap="round"/>'),
 munt:SV('<circle cx="17" cy="26" r="11" fill="#ffcf3f" stroke="#8a5a16" stroke-width="2.5"/><circle cx="31" cy="21" r="11" fill="#ffcf3f" stroke="#8a5a16" stroke-width="2.5"/><path d="M31 15v12" stroke="#8a5a16" stroke-width="3.2" stroke-linecap="round"/>'),
 bel:SV('<path d="M10 31a14 14 0 0 1 28 0z" fill="#c9ced3" stroke="#4a5a66" stroke-width="2.5"/><rect x="8" y="31" width="32" height="5" rx="2" fill="#4a5a66"/><circle cx="24" cy="15" r="2.5" fill="#4a5a66"/><path d="M40 17c3 2 4 5 4 9M8 26c0-4 1-7 4-9" stroke="#ffcf3f" stroke-width="2.6" fill="none" stroke-linecap="round"/>')};
const IT={
 koffie:{n:'Turbokoffie',d:'Korte turbo.',m:'Paddenstoel'},
 koffie3:{n:'Drie koffies',d:'Drie korte turbo\'s achter elkaar.',c:3,m:'Drie paddenstoelen'},
 goud:{n:'Gouden koffie',d:'Zeven seconden lang turbo\'s zoveel als je wilt.',m:'Gouden paddenstoel'},
 klomp:{n:'Klomp',d:'Vliegt rechtdoor en kaatst tegen muren. Vasthouden = schild.',trail:1,m:'Groen schild'},
 klomp3:{n:'Drie klompen',d:'Draaien om je kart. Raken wie je aantikt; gooi ze een voor een.',c:3,m:'Drie groene schilden'},
 meeuw:{n:'Meeuw',d:'Duikt op de kart vóór je. Achteruit gegooid vliegt hij rechtdoor.',trail:1,m:'Rood schild'},
 meeuw3:{n:'Drie meeuwen',d:'Drie zoekende meeuwen rond je kart.',c:3,m:'Drie rode schilden'},
 peerd:{n:'Peerd',d:'Galoppeert over iedereen heen naar de koploper en knalt daar.',m:'Blauw schild'},
 haring:{n:'Haring',d:'Achter je laten vallen; wie eroverheen rijdt, tolt. Vasthouden = schild.',trail:1,m:'Banaan'},
 haring3:{n:'Drie haringen',d:'Een sliert van drie achter je kart.',c:3,m:'Drie bananen'},
 knaller:{n:'Knaller',d:'Vooruit gooien; ontploft bij aanraking of na een paar tellen.',trail:1,m:'Bob-omb'},
 trein:{n:'Sneltrein',d:'Je wordt een trein, rijdt op de automaat en ramt alles opzij.',m:'Bullet Bill'},
 klok:{n:'Martiniklok',d:'Onkwetsbaar en sneller; wie je raakt, vliegt weg.',m:'Ster'},
 hagel:{n:'Hagelbui',d:'Alle anderen krimpen, tollen en verliezen hun item.',m:'Bliksem'},
 plens:{n:'Plensbui',d:'Wie vóór je rijdt, krijgt regen op de ruit.',m:'Blooper'},
 munt:{n:'Muntjes',d:'Twee muntjes erbij. Elke munt maakt je iets sneller, tot tien.',m:'Munt'},
 bel:{n:'Fietsbel',d:'Schokgolf om je heen. Houdt ook het Peerd tegen.',m:'Super-claxon'}};
const ITEMKEYS=Object.keys(IT);
// item odds by race position (0 = leading, 1 = last)
const ODDS=[
 [0.10,{haring:24,klomp:20,munt:16,bel:10,haring3:8,meeuw:7,koffie:6,plens:4,knaller:3}],
 [0.36,{meeuw:18,klomp:10,haring:10,koffie:10,klomp3:6,knaller:8,plens:6,bel:6,munt:6,haring3:6,meeuw3:6,peerd:3}],
 [0.66,{koffie3:14,meeuw:14,meeuw3:12,koffie:12,knaller:10,klomp3:8,peerd:6,plens:6,bel:4,goud:6,klok:3,haring:5}],
 [0.91,{koffie3:18,goud:14,meeuw3:14,klok:12,peerd:8,trein:8,knaller:8,koffie:6,hagel:2}],
 [1.01,{klok:20,trein:20,goud:18,koffie3:16,meeuw3:10,hagel:6,peerd:6}]];

/* ================= RENDERER + GOOGLE 3D TILES ================= */
const canvas=$('#gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',logarithmicDepthBuffer:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
const scene=new THREE.Scene();
const SKY=new THREE.Color('#a9d6e5');
scene.background=SKY;
const camera=new THREE.PerspectiveCamera(68,1,0.3,4000);
scene.add(new THREE.HemisphereLight(0xe8f6ff,0x5b4a3a,2.2));
const sun=new THREE.DirectionalLight(0xfff0d6,2.0);sun.position.set(0.6,1,0.35);scene.add(sun);
const baseFov=()=>window.innerWidth<window.innerHeight?80:66;
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=baseFov();camera.updateProjectionMatrix();if(tiles)tiles.setResolutionFromRenderer(camera,renderer);}
window.addEventListener('resize',resize);

const DEG=Math.PI/180;
let DATA=null,tiles=null,tilesError=null,tileBytes=0;
const DETAIL=[{name:'Laag',err:36,pr:1,cache:[600,900]},{name:'Normaal',err:20,pr:1.25,cache:[900,1400]},{name:'Hoog',err:12,pr:1.5,cache:[1400,2200]},{name:'Max',err:6,pr:2,cache:[2200,3600]}];
const MAXANISO=renderer.capabilities.getMaxAnisotropy?renderer.capabilities.getMaxAnisotropy():1;
function startTiles(key){
  if(tiles){scene.remove(tiles.group);tiles.dispose();tiles=null;}
  tilesError=null;
  tiles=new TilesRenderer();
  tiles.registerPlugin(new GoogleCloudAuthPlugin({apiToken:key,autoRefreshToken:true}));
  const draco=new DRACOLoader();draco.setDecoderPath('./draco/');
  tiles.registerPlugin(new GLTFExtensionsPlugin({dracoLoader:draco}));
  tiles.registerPlugin(new TileCompressionPlugin());
  tiles.registerPlugin(new ReorientationPlugin({lat:DATA.origin[0]*DEG,lon:DATA.origin[1]*DEG,height:0}));
  applyDetail();
  // sharper street textures at grazing angles: full anisotropic filtering on every tile texture
  tiles.addEventListener('load-model',({scene:sc})=>{sc.traverse(o=>{const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];ms.forEach(m=>{if(m.map){m.map.anisotropy=MAXANISO;m.map.needsUpdate=true;}});});});
  tiles.addEventListener('load-error',e=>{const msg=String((e&&e.error&&e.error.message)||e&&e.error||'');if(/40[0-3]/.test(msg)||/key|denied|forbidden/i.test(msg)||!tiles.root)tilesError=msg||'Laden mislukt';});
  tiles.setCamera(camera);tiles.setResolutionFromRenderer(camera,renderer);
  scene.add(tiles.group);
}
function applyDetail(){const d=DETAIL[settings.detail];renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,d.pr));resize();if(tiles){tiles.errorTarget=d.err;tiles.lruCache.minSize=d.cache[0];tiles.lruCache.maxSize=d.cache[1];}}

/* height probing against the photo-realistic mesh */
const ray=new THREE.Raycaster();const DOWN=new THREE.Vector3(0,-1,0);const rayO=new THREE.Vector3();
function probe(x,z){if(!tiles||!tiles.root)return null;rayO.set(x,500,z);ray.set(rayO,DOWN);ray.far=900;
  const hits=ray.intersectObject(tiles.group,true);return hits.length?hits[0].point.y:null;}

/* textures + shared materials (colour textures in sRGB) */
function canvasTex(w,h,draw,clampEdge,data){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=clampEdge?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;if(!data)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
const TEX={
 pad:canvasTex(64,128,(g,w,h)=>{g.fillStyle='#ff7a1a';g.fillRect(0,0,w,h);g.fillStyle='#ffcf3f';for(let k=0;k<3;k++){const y=10+k*40;g.beginPath();g.moveTo(6,y+26);g.lineTo(w/2,y);g.lineTo(w-6,y+26);g.lineTo(w-6,y+38);g.lineTo(w/2,y+12);g.lineTo(6,y+38);g.closePath();g.fill();}},true),
 box:canvasTex(64,64,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#5ad19a');gr.addColorStop(1,'#1f7d55');g.fillStyle=gr;g.fillRect(0,0,w,h);g.strokeStyle='#f6f3ea';g.lineWidth=6;g.strokeRect(5,5,w-10,h-10);
  g.fillStyle='#f6f3ea';g.beginPath();const cx=w/2,cy=h/2;for(let k=0;k<8;k++){const r=k%2?7:20,a=k*Math.PI/4;g.lineTo(cx+Math.sin(a)*r,cy-Math.cos(a)*r);}g.closePath();g.fill();},true),
 chk:canvasTex(128,32,(g,w,h)=>{for(let y=0;y<4;y++)for(let x=0;x<16;x++){g.fillStyle=(x+y)%2?'#111':'#f6f3ea';g.fillRect(x*8,y*8,8,8);}}),
 ramp:canvasTex(64,64,(g,w,h)=>{g.fillStyle='#ff7a1a';g.fillRect(0,0,w,h);g.fillStyle='#ffcf3f';for(let y=0;y<h;y+=16)g.fillRect(0,y,w,8);}),
 shadow:canvasTex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,2,32,32,30);r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,w,h);},true)};
const DS=THREE.DoubleSide;
const MAT={
 rampSide:new THREE.MeshLambertMaterial({color:'#ff7a1a',side:DS}),
 ramp:new THREE.MeshLambertMaterial({map:TEX.ramp,side:DS}),
 pad:new THREE.MeshBasicMaterial({map:TEX.pad,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),
 box:new THREE.MeshBasicMaterial({map:TEX.box,transparent:true,opacity:.9}),
 coin:new THREE.MeshLambertMaterial({color:'#ffcf3f',emissive:'#5a3a00'}),
 chk:new THREE.MeshBasicMaterial({map:TEX.chk,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4})};
function disposeTree(o){o.traverse(c=>{if(c.geometry)c.geometry.dispose();});}

/* ================= CITY COLLISION (OSM building outlines + water) ================= */
const CELL=8;let segs=null,grid=null,waterPolys=[];
function buildCity(){const xs=[];
  DATA.buildings.forEach(b=>{const n=b.length/2;for(let i=0;i<n;i++){const j=(i+1)%n;xs.push(b[2*i],b[2*i+1],b[2*j],b[2*j+1]);}});
  segs=new Float32Array(xs);grid=new Map();const S=segs.length/4;
  for(let s=0;s<S;s++){const ax=segs[4*s],az=segs[4*s+1],bx=segs[4*s+2],bz=segs[4*s+3];
    const x0=Math.floor(Math.min(ax,bx)/CELL),x1=Math.floor(Math.max(ax,bx)/CELL),z0=Math.floor(Math.min(az,bz)/CELL),z1=Math.floor(Math.max(az,bz)/CELL);
    for(let gx=x0;gx<=x1;gx++)for(let gz=z0;gz<=z1;gz++){const k=gx*100003+gz;let l=grid.get(k);if(!l){l=[];grid.set(k,l);}l.push(s);}}
  waterPolys=DATA.water.map(w=>{let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;for(let i=0;i<w.length;i+=2){x0=Math.min(x0,w[i]);x1=Math.max(x1,w[i]);z0=Math.min(z0,w[i+1]);z1=Math.max(z1,w[i+1]);}return{w,x0,x1,z0,z1};});}
const _seen=new Set();
// push a circle out of building walls; returns the last wall normal (or null)
function collideCircle(o,r){let hitN=null;_seen.clear();const gx0=Math.floor((o.x-r)/CELL),gx1=Math.floor((o.x+r)/CELL),gz0=Math.floor((o.z-r)/CELL),gz1=Math.floor((o.z+r)/CELL);
  for(let gx=gx0;gx<=gx1;gx++)for(let gz=gz0;gz<=gz1;gz++){const l=grid.get(gx*100003+gz);if(!l)continue;
    for(const s of l){if(_seen.has(s))continue;_seen.add(s);const ax=segs[4*s],az=segs[4*s+1],dx=segs[4*s+2]-ax,dz=segs[4*s+3]-az,L=dx*dx+dz*dz;
      const t=L?clamp(((o.x-ax)*dx+(o.z-az)*dz)/L,0,1):0,cx=ax+dx*t,cz=az+dz*t,ex=o.x-cx,ez=o.z-cz,d=Math.hypot(ex,ez);
      if(d<r&&d>1e-5){const nx=ex/d,nz=ez/d;o.x=cx+nx*r;o.z=cz+nz*r;hitN={x:nx,z:nz};}}}
  return hitN;}
function rayWall(x,z,dx,dz,max){let best=max;const steps=Math.ceil(max/CELL)+1;_seen.clear();
  for(let k=0;k<=steps;k++){const px=x+dx*k*CELL,pz=z+dz*k*CELL;for(let ox=-1;ox<=1;ox++)for(let oz=-1;oz<=1;oz++){const l=grid.get((Math.floor(px/CELL)+ox)*100003+Math.floor(pz/CELL)+oz);if(!l)continue;
    for(const s of l){if(_seen.has(s))continue;_seen.add(s);const ax=segs[4*s],az=segs[4*s+1],ex=segs[4*s+2]-ax,ez=segs[4*s+3]-az;const den=dx*ez-dz*ex;if(Math.abs(den)<1e-9)continue;
      const t=((ax-x)*ez-(az-z)*ex)/den,u=((ax-x)*dz-(az-z)*dx)/den;if(t>0&&t<best&&u>=0&&u<=1)best=t;}}}
  return best;}
function inWater(x,z){for(const p of waterPolys){if(x<p.x0||x>p.x1||z<p.z0||z>p.z1)continue;const w=p.w,n=w.length/2;let inside=false;
  for(let i=0,j=n-1;i<n;j=i++){const xi=w[2*i],zi=w[2*i+1],xj=w[2*j],zj=w[2*j+1];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;}if(inside)return true;}return false;}

/* ================= TRACK BUILD (real streets from OpenStreetMap) ================= */
const TRACK_IDS=['markt','spil','vis','rond'];
const BASE_GUESS=44;
let TR=null;const DBG={items:{},falls:{},hits:0};
function buildTrack(tid){
  if(TR){scene.remove(TR.group);disposeTree(TR.group);TR.ownMats.forEach(m=>m.dispose());}
  const def=DATA.tracks[tid];srand(hashStr(tid));
  const G=new THREE.Group();scene.add(G);const ownMats=[];const LM=c=>{const m=new THREE.MeshLambertMaterial({color:c});ownMats.push(m);return m;};
  const N=def.x.length,P=[],T=[],NR=[],ANG=[];for(let i=0;i<N;i++)P.push(new THREE.Vector3(def.x[i],0,def.z[i]));
  for(let i=0;i<N;i++){const a=P[(i-2+N)%N],b=P[(i+2)%N];const t=new THREE.Vector3().subVectors(b,a).setY(0).normalize();T.push(t);NR.push(new THREE.Vector3(-t.z,0,t.x));ANG.push(Math.atan2(t.x,t.z));}
  const D=[0];for(let i=1;i<=N;i++)D.push(D[i-1]+P[i-1].distanceTo(P[i%N]));const LEN=D[N],SP=LEN/N;
  const latOf=(i,x,z)=>(x-P[i].x)*NR[i].x+(z-P[i].z)*NR[i].z;
  const nearest=(x,z,hint)=>{let best=0,bd=1e18;
    if(hint==null){for(let i=0;i<N;i++){const dx=P[i].x-x,dz=P[i].z-z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=i;}}return best;}
    for(let k=-30;k<=30;k++){const i=(hint+k+N)%N;const dx=P[i].x-x,dz=P[i].z-z,d=dx*dx+dz*dz;if(d<bd){bd=d;best=i;}}return best;};
  const atDist=(d,lat)=>{d=((d%LEN)+LEN)%LEN;let a=0,b=N;while(b-a>1){const m=(a+b)>>1;if(D[m]<=d)a=m;else b=m;}
    const i=a,f=(d-D[i])/(D[i+1]-D[i]),p=P[i],q=P[(i+1)%N],n=NR[i];return{i,x:p.x+(q.x-p.x)*f+n.x*lat,z:p.z+(q.z-p.z)*f+n.z*lat};};
  // free space left (-) and right (+) of the centreline, from the building outlines
  const freeR=new Float32Array(N),freeL=new Float32Array(N);
  for(let i=0;i<N;i++){freeR[i]=rayWall(P[i].x,P[i].z,NR[i].x,NR[i].z,14);freeL[i]=rayWall(P[i].x,P[i].z,-NR[i].x,-NR[i].z,14);}
  const smin=a=>{const o=new Float32Array(N);for(let i=0;i<N;i++){let m=99;for(let k=-2;k<=2;k++)m=Math.min(m,a[(i+k+N)%N]);o[i]=m;}return o;};
  const fR=smin(freeR),fL=smin(freeL);
  const bridge=new Uint8Array(N);(def.br||[]).forEach(i=>bridge[i]=1);
  // ramps: widest straight spots, away from the start
  const rampY=new Float32Array(N),rampOf=new Int8Array(N).fill(-1),gap=new Uint8Array(N),ramps=[];
  const nR=def.len>2000?2:1,used=[];
  for(let r=0;r<nR;r++){let best=-1,bs=-1;for(let i=Math.round(N*.12);i<N*.9;i++){if(used.some(u=>Math.abs(u-i)<N*.25))continue;let ok=true,w=99;
      for(let k=-4;k<12;k++){const j=(i+k+N)%N;w=Math.min(w,fL[j],fR[j]);if(Math.abs(wrapA(ANG[(j+1)%N]-ANG[j]))>.05)ok=false;}if(ok&&w>bs){bs=w;best=i;}}
    if(best<0||bs<4)continue;used.push(best);const rr={r0:best,ramp:7,gap:0,vy:r===0?11:8,glide:r===0,width:Math.min(bs-.5,6)};ramps.push(rr);
    for(let j=0;j<rr.ramp;j++){const i=(best+j)%N;rampY[i]=2*(j+1)/rr.ramp;rampOf[i]=ramps.length-1;}}
  const H=new Float32Array(N);
  const tr={def,id:tid,HW:6,N,P,T,NR,ANG,D,LEN,SP,ST:def.st,group:G,ownMats,latOf,nearest,atDist,fL,fR,bridge,rampY,rampOf,gap,ramps,H,base:BASE_GUESS,calibrated:false,hPass:0,hI:0,raw:new Float32Array(N).fill(NaN),anchors:[]};
  tr.hAt=i=>tr.base+tr.H[i];
  TR=tr;LAPS=def.len>2000?1:def.len>1300?2:3;
  const anchor=(o,i,dy)=>{tr.anchors.push({o,i,dy});G.add(o);return o;};
  // start gantry + finish line
  {const p=P[0],yaw=ANG[0],wl=clamp(fL[0],3,9),wr=clamp(fR[0],3,9);
    const fl=new THREE.Mesh(new THREE.PlaneGeometry(wl+wr,2.6),MAT.chk);fl.geometry.rotateX(-Math.PI/2);fl.geometry.translate((wr-wl)/2*0,0,0);
    const flG=new THREE.Group();flG.add(fl);fl.position.x=0;flG.position.set(p.x+NR[0].x*(wr-wl)/2,0,p.z+NR[0].z*(wr-wl)/2);flG.rotation.y=yaw;anchor(flG,0,.06);
    const pm=LM('#2fa36b');for(const s of[-(wl+.2),wr+.2]){const m=new THREE.Mesh(new THREE.BoxGeometry(.5,6,.5),pm);m.position.set(p.x+NR[0].x*s,0,p.z+NR[0].z*s);anchor(m,0,3);}
    const text='GRUNN KART  ·  '+def.name.toUpperCase();
    const draw=(g,w,h)=>{g.fillStyle='#f6f3ea';g.fillRect(0,0,w,h);g.fillStyle='#2fa36b';g.fillRect(0,0,w,14);g.fillRect(0,h-14,w,14);g.fillStyle='#123a2f';g.font='64px "Bowlby One", "Arial Black", sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2+4,w-40);};
    const ban=canvasTex(1024,128,draw,true);if(document.fonts&&document.fonts.load)document.fonts.load('64px "Bowlby One"').then(()=>{draw(ban.image.getContext('2d'),1024,128);ban.needsUpdate=true;}).catch(()=>{});
    const bmat=new THREE.MeshBasicMaterial({map:ban,side:DS});ownMats.push(bmat);const bw=wl+wr+.8;const b=new THREE.Mesh(new THREE.PlaneGeometry(bw,bw/8),bmat);
    b.position.set(p.x+NR[0].x*(wr-wl)/2,0,p.z+NR[0].z*(wr-wl)/2);b.rotation.y=yaw+Math.PI;anchor(b,0,5.4);}
  // ramps (rebuilt when heights update)
  tr.rampMeshes=[];
  // pads
  const pads=[];[.2,.45,.7].forEach(f=>{const i=Math.round(f*N)%N;if(rampOf[i]>=0)return;const s=clamp((rng()*2-1)*2.5,-fL[i]+1.8,fR[i]-1.8);pads.push({i,s});});
  ramps.forEach(r=>pads.push({i:(r.r0-5+N)%N,s:0,big:1}));
  pads.forEach(pd=>{const p=P[pd.i],n=NR[pd.i];const m=new THREE.Mesh(new THREE.PlaneGeometry(3,5.5),MAT.pad);m.geometry.rotateX(-Math.PI/2);m.position.set(p.x+n.x*pd.s,0,p.z+n.z*pd.s);m.rotation.y=ANG[pd.i]+Math.PI;anchor(m,pd.i,.08);});
  tr.pads=pads;
  // item boxes spread across the real street width
  const boxGeo=new THREE.BoxGeometry(1.6,1.6,1.6);const boxes=[];
  [.1,.33,.56,.8].forEach(f=>{let i=Math.round(f*N)%N;while(rampOf[i]>=0)i=(i+3)%N;const a=-Math.min(fL[i]-1.3,6),b=Math.min(fR[i]-1.3,6),w=b-a;const n=w>9?4:w>5?3:2;
    for(let j=0;j<n;j++){const s=n===1?0:a+w*j/(n-1);const m=new THREE.Mesh(boxGeo,MAT.box);m.position.set(P[i].x+NR[i].x*s,0,P[i].z+NR[i].z*s);m.rotation.set(.5,.3,0);anchor(m,i,1.3);
      boxes.push({m,x:m.position.x,z:m.position.z,i,on:true,t:0,ph:rng()*6});}});
  tr.boxes=boxes;
  // coins
  const coinGeo=new THREE.CylinderGeometry(.5,.5,.14,16);coinGeo.rotateX(Math.PI/2);const coins=[];
  [.05,.25,.4,.62,.72,.92].forEach(f=>{const i0=Math.round(f*N)%N;const s=clamp((rng()*2-1)*3,-fL[i0]+1.5,fR[i0]-1.5);for(let j=0;j<5;j++){const p=atDist(D[i0]+j*3,s);const m=new THREE.Mesh(coinGeo,MAT.coin);m.position.set(p.x,0,p.z);anchor(m,p.i,1);coins.push({m,x:p.x,z:p.z,on:true,t:0});}});
  tr.coins=coins;
  // bounds + minimap backdrop (buildings + route)
  let minX=1e9,maxX=-1e9,minZ=1e9,maxZ=-1e9;P.forEach(p=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);});
  Object.assign(tr,{minX,maxX,minZ,maxZ});
  const mc=$('#map');const pad=14,W=mc.width-2*pad,Hh=mc.height-2*pad;
  // map view: north up, east right (world x points west)
  const ms=Math.min(W/(maxX-minX),Hh/(maxZ-minZ));
  tr.mx=x=>pad+(maxX-x)*ms+(W-(maxX-minX)*ms)/2;tr.mz=z=>pad+(maxZ-z)*ms+(Hh-(maxZ-minZ)*ms)/2;
  const off=document.createElement('canvas');off.width=mc.width;off.height=mc.height;const og=off.getContext('2d');
  og.fillStyle='rgba(246,243,234,.22)';DATA.buildings.forEach(b=>{if(b[0]<minX-30||b[0]>maxX+30||b[1]<minZ-30||b[1]>maxZ+30)return;og.beginPath();for(let i=0;i<b.length;i+=2){const X=tr.mx(b[i]),Y=tr.mz(b[i+1]);i?og.lineTo(X,Y):og.moveTo(X,Y);}og.closePath();og.fill();});
  og.lineJoin='round';og.beginPath();P.forEach((p,i)=>i?og.lineTo(tr.mx(p.x),tr.mz(p.z)):og.moveTo(tr.mx(p.x),tr.mz(p.z)));og.closePath();og.strokeStyle='rgba(58,150,160,.9)';og.lineWidth=10;og.stroke();og.strokeStyle='#f6f3ea';og.lineWidth=4;og.stroke();
  tr.mapBg=off;
  rebuildRamps();updateAnchors();
  return tr;
}
function rebuildRamps(){const tr=TR;tr.rampMeshes.forEach(m=>{tr.group.remove(m);m.geometry.dispose();});tr.rampMeshes=[];
  tr.ramps.forEach(r=>{const pos=[],uv=[],idx=[];const w=r.width;let q=0;
    for(let j=0;j<=r.ramp;j++){const i=(r.r0+Math.min(j,r.ramp-1))%tr.N,p=tr.P[i],n=tr.NR[i],y=tr.hAt(i)+.05+(j===0?0:tr.rampY[i]);
      pos.push(p.x-n.x*w,y,p.z-n.z*w,p.x+n.x*w,y,p.z+n.z*w,p.x-n.x*w,tr.hAt(i),p.z-n.z*w,p.x+n.x*w,tr.hAt(i),p.z+n.z*w);uv.push(0,j/2,1,j/2,0,j/2,1,j/2);
      if(j<r.ramp){const a=j*4;idx.push(a,a+1,a+4,a+1,a+5,a+4, a,a+4,a+2,a+4,a+6,a+2, a+1,a+3,a+5,a+5,a+3,a+7);}q++;}
    const e=r.ramp*4;idx.push(e,e+1,e+2,e+1,e+3,e+2);void q;
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,MAT.ramp);tr.group.add(m);tr.rampMeshes.push(m);});}
function updateAnchors(){TR.anchors.forEach(a=>{a.o.position.y=TR.hAt(a.i)+a.dy;});}
// progressive height sampling of the route against the loaded 3D tiles
function calibrate(at){const tr=TR;const vals=[];const i0=at||0;for(let i=-20;i<20;i+=2){const j=(i0+i+tr.N)%tr.N;for(const s of[-1.5,0,1.5]){const h=probe(tr.P[j].x+tr.NR[j].x*s,tr.P[j].z+tr.NR[j].z*s);if(h!=null)vals.push(h);}}
  if(vals.length<12)return false;vals.sort((a,b)=>a-b);tr.base=vals[Math.floor(vals.length*.3)];tr.calibrated=true;tr.hI=0;tr.hPass=0;tr.raw.fill(NaN);updateAnchors();rebuildRamps();return true;}
let calT=0;
function sampleHeights(budget){const tr=TR;if(!tr||!tiles||!tiles.root)return;if(!tr.calibrated){if(--calT<=0){calT=10;calibrate(player&&state!=='menu'?player.idx:0);}return;}
  for(let n=0;n<budget;n++){const i=tr.hI;const h=probe(tr.P[i].x,tr.P[i].z);if(h!=null)tr.raw[i]=clamp(h-tr.base,-4,4);
    tr.hI=(i+1)%tr.N;if(tr.hI===0){tr.hPass++;smoothHeights();}}
  if(tr.hPass===0&&tr.hI%60===0)smoothHeights();}
function smoothHeights(){const tr=TR,N=tr.N,raw=tr.raw,out=new Float32Array(N);const win=[];
  for(let i=0;i<N;i++){win.length=0;for(let k=-8;k<=8;k++){const v=raw[(i+k+N)%N];if(!isNaN(v))win.push(v);}
    if(win.length){win.sort((a,b)=>a-b);out[i]=win[Math.floor(win.length*.35)];}else out[i]=tr.H[i];}
  const o2=new Float32Array(N);for(let i=0;i<N;i++){let s=0;for(let k=-3;k<=3;k++)s+=out[(i+k+N)%N];o2[i]=s/7;}
  tr.H.set(o2);updateAnchors();rebuildRamps();}

/* ================= KART MODELS ================= */
const KART_SCALE=.78;
function makeKartMesh(ci,bi,wi,ghost){
  const ch=CHARS[ci],body=BODIES[bi].id,wh=WHEELS[wi];
  const g=new THREE.Group(),bodyG=new THREE.Group();g.add(bodyG);const mats=[];
  const Mt=(c,basic,opts)=>{const m=basic?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshPhongMaterial(Object.assign({color:c,shininess:60,specular:0x333333},opts||{}));if(ghost){m.transparent=true;m.opacity=.38;m.depthWrite=false;}mats.push(m);return m;};
  const kc=Mt(ch.kart,false,{shininess:90,specular:0x666666}),dk=Mt('#24272b'),chrome=Mt('#c9ced3',false,{shininess:120,specular:0xffffff});
  const add=(geo,mat,x,y,z,par)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);(par||bodyG).add(m);return m;};
  // side profile (forward = +x of the shape, up = +y) extruded sideways with rounded edges
  const shell=(pts,width,bevel)=>{const s=new THREE.Shape();s.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++){const p=pts[i];if(p.length===4)s.quadraticCurveTo(p[0],p[1],p[2],p[3]);else s.lineTo(p[0],p[1]);}s.closePath();
    const geo=new THREE.ExtrudeGeometry(s,{depth:width-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:4,curveSegments:14});geo.rotateY(-Math.PI/2);geo.translate((width-2*bevel)/2,0,0);return geo;};
  const capsule=(r,len,mat,x,y,z,rx,rz)=>{const m=add(new THREE.CapsuleGeometry(r,len,6,14),mat,x,y,z);if(rx)m.rotation.x=rx;if(rz)m.rotation.z=rz;return m;};
  let drvY=1.42,drvZ=-.38,wheelBase=[.88,-.82],track=.86;
  if(body==='stad'){
    add(shell([[-1.15,.25],[1.3,.25],[1.72,.28,1.68,.5],[.55,.66],[.15,.74,-.25,.68],[-.95,.86],[-1.22,.88,-1.18,.55]],1.22,.13),kc,0,0,0);
    capsule(.11,1.7,dk,.7,.36,0,Math.PI/2);capsule(.11,1.7,dk,-.7,.36,0,Math.PI/2);
    add(new THREE.TorusGeometry(.18,.035,8,20),dk,0,1.02,.42).rotation.x=-.9;
    capsule(.07,.25,chrome,.32,.62,-1.25,Math.PI/2);capsule(.07,.25,chrome,-.32,.62,-1.25,Math.PI/2);}
  else if(body==='bak'){
    add(shell([[-1.1,.25],[.55,.25],[.6,.5],[.2,.7],[-.9,.86],[-1.15,.88,-1.12,.55]],1.15,.12),kc,0,0,0);
    const crate=shell([[0,0],[1.1,0],[1.1,.85],[0,.85]],1.45,.08);const cm=Mt('#a0723f');add(crate,cm,0,.42,.55);
    for(const x of[-.5,0,.5])add(new THREE.BoxGeometry(.06,.7,1.12),Mt('#7a5530'),x,.85,1.1);
    add(new THREE.TorusGeometry(.18,.035,8,20),dk,0,1.02,.35).rotation.x=-.9;drvZ=-.5;wheelBase=[1.25,-.85];}
  else if(body==='racer'){
    add(shell([[-1.25,.22],[1.6,.22],[2.05,.24,1.95,.4],[.5,.58],[.1,.66,-.3,.6],[-1.05,.7],[-1.3,.72,-1.27,.45]],1.1,.11),kc,0,0,0);
    const wing=shell([[-.25,0],[.25,0],[.2,.08],[-.25,.12]],1.7,.03);add(wing,dk,0,1.12,-1.25);
    for(const x of[-.55,.55])add(new THREE.CylinderGeometry(.04,.04,.42,8),dk,x,.9,-1.25);
    capsule(.1,1.9,kc,.64,.34,.1,Math.PI/2);capsule(.1,1.9,kc,-.64,.34,.1,Math.PI/2);
    add(new THREE.TorusGeometry(.17,.032,8,20),dk,0,.92,.42).rotation.x=-1;drvY=1.32;wheelBase=[1.08,-.95];track=.9;}
  else{ // brom: scooter
    add(shell([[-1.0,.3],[.85,.3],[1.05,.32,1.0,.6],[.9,1.25],[.78,1.32,.7,1.2],[.55,.55],[-.6,.62],[-1.0,.72,-1.05,.45]],.62,.12),kc,0,0,0);
    add(new THREE.CapsuleGeometry(.13,.9,6,12),dk,0,1.5,.86).rotation.z=Math.PI/2;
    add(new THREE.SphereGeometry(.13,12,10),Mt('#fff7c0',true),0,1.18,1.02);drvY=1.62;drvZ=-.2;wheelBase=[.88,-.82];track=0;}
  // driver
  const suit=Mt(ch.suit),skin=Mt(ch.skin),hat=Mt(ch.hatC,false,{shininess:70}),eye=Mt('#101418');
  add(new THREE.CapsuleGeometry(.3,.3,6,14),suit,0,drvY-.55,drvZ);
  for(const s of[-1,1]){capsule(.08,.32,suit,s*.26,drvY-.42,drvZ+.3,-1.0);add(new THREE.SphereGeometry(.085,10,8),skin,s*.2,drvY-.38,drvZ+.58);}
  add(new THREE.SphereGeometry(.44,24,18),skin,0,drvY,drvZ);
  const hy=drvY,hz=drvZ;
  if(ch.hat!=='helm'){for(const s of[-1,1]){add(new THREE.SphereGeometry(.075,10,8),Mt('#ffffff'),s*.16,hy+.08,hz+.39);add(new THREE.SphereGeometry(.04,8,6),eye,s*.16,hy+.08,hz+.45);}
    add(new THREE.SphereGeometry(.07,10,8),skin,0,hy-.04,hz+.44);}
  if(ch.hat==='helm'){const h=add(new THREE.SphereGeometry(.5,24,18),hat,0,hy+.04,hz);h.scale.set(1,.94,1.02);const v=add(new THREE.SphereGeometry(.3,20,14),Mt('#16202a',false,{shininess:140,specular:0xffffff}),0,hy+.02,hz+.3);v.scale.set(1.25,.62,.62);}
  else if(ch.hat==='cap'){const c=add(new THREE.SphereGeometry(.46,20,12,0,Math.PI*2,0,Math.PI/2),hat,0,hy+.08,hz);c.scale.set(1,.7,1);add(new THREE.CylinderGeometry(.28,.3,.04,16),hat,0,hy+.12,hz+.36);}
  else if(ch.hat==='beanie'){const h=add(new THREE.SphereGeometry(.47,20,14,0,Math.PI*2,0,Math.PI/2),hat,0,hy+.06,hz);h.scale.set(1,.9,1);add(new THREE.SphereGeometry(.13,12,10),hat,0,hy+.5,hz);add(new THREE.TorusGeometry(.44,.06,8,24),hat,0,hy+.08,hz).rotation.x=Math.PI/2;}
  else if(ch.hat==='captain'){add(new THREE.CylinderGeometry(.42,.4,.26,20),hat,0,hy+.4,hz);add(new THREE.CylinderGeometry(.47,.47,.05,20),Mt('#101418'),0,hy+.27,hz+.04);}
  else if(ch.hat==='bandana'){add(new THREE.TorusGeometry(.43,.08,8,24),hat,0,hy+.16,hz).rotation.x=Math.PI/2;}
  else if(ch.hat==='hair'){const h=add(new THREE.SphereGeometry(.47,20,14,0,Math.PI*2,0,Math.PI*.55),hat,0,hy+.04,hz-.03);h.scale.set(1.04,1,1.06);add(new THREE.SphereGeometry(.17,12,10),hat,0,hy-.06,hz-.5);}
  else if(ch.hat==='straw'){add(new THREE.CylinderGeometry(.85,.88,.05,24),hat,0,hy+.28,hz);add(new THREE.CylinderGeometry(.36,.42,.3,20),hat,0,hy+.44,hz);}
  else if(ch.hat==='beak'){const bk=add(new THREE.ConeGeometry(.14,.5,12),hat,0,hy-.06,hz+.62);bk.rotation.x=Math.PI/2;}
  else if(ch.hat==='hard'){const h=add(new THREE.SphereGeometry(.48,20,12,0,Math.PI*2,0,Math.PI/2),hat,0,hy+.08,hz);h.scale.set(1,.8,1);add(new THREE.CylinderGeometry(.58,.58,.04,24),hat,0,hy+.1,hz);}
  // wheels: rounded tyre + coloured hub
  const wheels=[];const wr=wh.r*.95,ww=wh.id==='groot'?.5:.38;
  const tyre=new THREE.CylinderGeometry(wr,wr,ww,24,1);tyre.rotateZ(Math.PI/2);const tread=new THREE.TorusGeometry(wr-.03,.05,8,24);tread.rotateY(Math.PI/2);
  const hub=new THREE.CylinderGeometry(wr*.55,wr*.55,ww+.02,16);hub.rotateZ(Math.PI/2);
  const tm=Mt('#1b1d20',false,{shininess:10}),hm=Mt(ch.kart,false,{shininess:120,specular:0xffffff});
  const wp=track===0?[[0,wheelBase[0]],[0,wheelBase[1]]]:[[track,wheelBase[0]],[-track,wheelBase[0]],[track+.04,wheelBase[1]],[-track-.04,wheelBase[1]]];
  wp.forEach(([x,z])=>{const w=new THREE.Group();const wm=new THREE.Group();wm.add(new THREE.Mesh(tyre,tm));const t1=new THREE.Mesh(tread,tm);t1.position.x=ww/2-.02;wm.add(t1);const t2=t1.clone();t2.position.x=-ww/2+.02;wm.add(t2);wm.add(new THREE.Mesh(hub,hm));
    w.add(wm);w.position.set(x,wr,z);g.add(w);wheels.push({w,wm,front:z>0});});
  bodyG.position.y=wr-.4;
  const shm=new THREE.MeshBasicMaterial({map:TEX.shadow,transparent:true,depthWrite:false,opacity:ghost?.3:1});mats.push(shm);
  const sh=new THREE.Mesh(new THREE.PlaneGeometry(track===0?1.8:2.8,3.6),shm);sh.geometry.rotateX(-Math.PI/2);sh.position.y=.02;g.add(sh);
  const sparks=[];const sg=new THREE.SphereGeometry(.2,8,6);for(const x of(track===0?[0]:[.8,-.8])){const s=new THREE.Mesh(sg,Mt('#ffffff',true));s.position.set(x,.3,-1.2);s.visible=false;g.add(s);sparks.push(s);}
  const fm=Mt('#ffb23f',true);fm.transparent=true;fm.opacity=.9;const flame=new THREE.Mesh(new THREE.ConeGeometry(.3,1.4,12),fm);flame.rotation.x=-Math.PI/2;flame.position.set(0,.65,-1.85);flame.visible=false;g.add(flame);
  const glider=new THREE.Group();const gs=new THREE.Shape();gs.moveTo(-2,0);gs.quadraticCurveTo(0,.9,2,0);gs.quadraticCurveTo(0,.35,-2,0);const gw=new THREE.Mesh(new THREE.ShapeGeometry(gs,16),Mt(ch.kart));gw.material.side=THREE.DoubleSide;gw.rotation.x=-Math.PI/2+.2;glider.add(gw);
  for(const x of[-1.2,1.2]){const st=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.5,6),dk);st.position.set(x,-.75,0);glider.add(st);}glider.position.set(0,3.1,-.3);glider.visible=false;g.add(glider);
  const train=new THREE.Group();const ty=Mt('#ffcf3f'),tb=Mt('#1d3c8f');
  const tbody=shell([[-2.3,0],[2.0,0],[2.5,.1,2.4,.9],[2.0,1.9],[-2.3,1.9]],2.1,.15);train.add(new THREE.Mesh(tbody,ty));
  const stripe=new THREE.Mesh(new THREE.BoxGeometry(2.14,.3,4.4),tb);stripe.position.y=.55;train.add(stripe);const win=new THREE.Mesh(new THREE.BoxGeometry(1.8,.6,.1),tb);win.position.set(0,1.45,2.18);win.rotation.x=-.45;train.add(win);
  train.position.y=.2;train.visible=false;g.add(train);
  g.scale.setScalar(KART_SCALE);
  scene.add(g);
  return{g,bodyG,wheels,sparks,flame,glider,train,kc,mats};
}
function disposeKartMesh(v){scene.remove(v.g);disposeTree(v.g);v.mats.forEach(m=>m.dispose());}

/* item meshes */
const IGEO={klomp:new THREE.SphereGeometry(1,14,10),bodyS:new THREE.SphereGeometry(.6,10,8),wing:new THREE.BoxGeometry(1.6,.08,.5),beak:new THREE.ConeGeometry(.12,.4,6),
  pbody:new THREE.BoxGeometry(1.2,1.1,2.4),phead:new THREE.BoxGeometry(.7,.8,1.1),pleg:new THREE.BoxGeometry(.25,1,.25),fish:new THREE.SphereGeometry(.5,10,8),tail:new THREE.ConeGeometry(.35,.5,4),
  bomb:new THREE.CylinderGeometry(.45,.45,1.2,12),ring:new THREE.RingGeometry(.8,1,32),boom:new THREE.SphereGeometry(1,16,12)};
const IMAT={klomp:new THREE.MeshLambertMaterial({color:'#f2c14e'}),white:new THREE.MeshLambertMaterial({color:'#f6f3ea'}),grey:new THREE.MeshLambertMaterial({color:'#9aa7ad'}),beak:new THREE.MeshLambertMaterial({color:'#f2a33d'}),
  peerd:new THREE.MeshLambertMaterial({color:'#3a6fd8',emissive:'#0d1d55'}),fish:new THREE.MeshLambertMaterial({color:'#a9bcc6',emissive:'#202a30'}),bomb:new THREE.MeshLambertMaterial({color:'#d63a3a'}),
  boom:new THREE.MeshBasicMaterial({color:'#ffb23f',transparent:true,opacity:.8}),wave:new THREE.MeshBasicMaterial({color:'#ffcf3f',transparent:true,opacity:.8,side:DS}),splash:new THREE.MeshBasicMaterial({color:'#e8fbff',transparent:true,opacity:.95})};
function itemMesh(kind){const g=new THREE.Group();
  if(kind==='klomp'){const m=new THREE.Mesh(IGEO.klomp,IMAT.klomp);m.scale.set(.6,.42,1.05);g.add(m);}
  else if(kind==='meeuw'){const b=new THREE.Mesh(IGEO.bodyS,IMAT.white);b.scale.set(.8,.7,1.3);g.add(b);for(const s of[-1,1]){const w=new THREE.Mesh(IGEO.wing,IMAT.grey);w.position.set(s*.9,.15,0);w.name='w'+s;g.add(w);}const bk=new THREE.Mesh(IGEO.beak,IMAT.beak);bk.rotation.x=Math.PI/2;bk.position.set(0,.05,.95);g.add(bk);}
  else if(kind==='peerd'){const b=new THREE.Mesh(IGEO.pbody,IMAT.peerd);g.add(b);const h=new THREE.Mesh(IGEO.phead,IMAT.peerd);h.position.set(0,.9,1.3);h.rotation.x=-.5;g.add(h);for(const [x,z] of[[.4,.9],[-.4,.9],[.4,-.9],[-.4,-.9]]){const l=new THREE.Mesh(IGEO.pleg,IMAT.peerd);l.position.set(x,-.9,z);g.add(l);}
    for(const s of[-1,1]){const w=new THREE.Mesh(IGEO.wing,IMAT.white);w.scale.set(1.6,1,2);w.position.set(s*1.5,.5,0);w.name='w'+s;g.add(w);}}
  else if(kind==='haring'){const b=new THREE.Mesh(IGEO.fish,IMAT.fish);b.scale.set(.55,.35,1.3);g.add(b);const t=new THREE.Mesh(IGEO.tail,IMAT.fish);t.rotation.x=Math.PI/2;t.position.z=-.75;g.add(t);}
  else if(kind==='knaller'){const b=new THREE.Mesh(IGEO.bomb,IMAT.bomb);g.add(b);const r=new THREE.Mesh(new THREE.CylinderGeometry(.47,.47,.25,12),IMAT.white);g.add(r);}
  scene.add(g);return g;}

/* ================= AUDIO ================= */
let AC=null,eng=null;
const settings=store.get('settings',{autoGas:null,smart:null,mute:false,detail:null,cam:0});if(settings.cam==null)settings.cam=0;
function audioInit(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator();o.type='sawtooth';const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=420;const g=AC.createGain();g.gain.value=0;o.connect(f);f.connect(g);g.connect(AC.destination);o.start();eng={o,g};}catch(e){AC=null;}}
function beep(freq,dur,type,vol){if(!AC||settings.mute)return;try{const o=AC.createOscillator(),g=AC.createGain();o.type=type||'square';o.frequency.value=freq;const t=AC.currentTime;g.gain.setValueAtTime(vol||.07,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+dur+.02);}catch(e){}}
const ICON_SND='<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#f6f3ea"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#f6f3ea" stroke-width="2" fill="none" stroke-linecap="round"/></svg>';
const ICON_MUTE='<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#f6f3ea"/><path d="m16 9 5 6m0-6-5 6" stroke="#f6f3ea" stroke-width="2" stroke-linecap="round"/></svg>';
function syncMute(){$('#muteBtn').innerHTML=settings.mute?ICON_MUTE:ICON_SND;}
syncMute();
$('#muteBtn').addEventListener('click',()=>{settings.mute=!settings.mute;store.set('settings',settings);syncMute();});

/* ================= RACE STATE ================= */
let state='menu';            // menu | intro | count | race | done
let paused=false;
let race=null;               // {mode,cc,track,gp}
let gp=null;                 // {cc,race,roster,pts}
let karts=[],player=null,RANK=[];
let proj=[],hazards=[],fx=[];
let loadT=0,raceTime=0,countT=0,introT=0,lastBeep=9,finishTimer=0,lookBack=false;
let ghost=null,ghostRec=null,ghostMesh=null,recT=0;
let isTouch=(window.matchMedia&&matchMedia('(pointer: coarse)').matches)||('ontouchstart' in window&&navigator.maxTouchPoints>0);
if(settings.autoGas==null)settings.autoGas=isTouch;
if(settings.smart==null)settings.smart=isTouch;
if(settings.detail==null||settings.detail>3)settings.detail=isTouch?1:3;
const sel=store.get('sel',{ci:0,bi:0,wi:0,cc:2});
const input={up:false,down:false,left:false,right:false,drift:false,tl:false,tr:false,tb:false,td:false,driftEdge:false};

function makeKart(cfg,id){const st=statsOf(cfg.ci,cfg.bi,cfg.wi);const v=makeKartMesh(cfg.ci,cfg.bi,cfg.wi);
  return{id,cfg,st,v,ai:!!cfg.ai,skill:cfg.skill||1,name:CHARS[cfg.ci].name,color:CHARS[cfg.ci].kart,
    wt:1+st.wt*.25,acc:14+st.ac*2.6,turn:1.6+st.ha*.1,offV:10+st.tr*1.5,mt:.85+st.mt*.06};}
function resetKartState(k,idx,lat){const P=TR.P[idx],n=TR.NR[idx];
  Object.assign(k,{x:P.x+n.x*lat,z:P.z+n.z*lat,y:0,vy:0,air:false,glide:false,launchRamp:-1,trickOk:false,trickDone:false,trickT:0,
    yaw:TR.ANG[idx],moveYaw:TR.ANG[idx],camYaw:TR.ANG[idx],speed:0,idx,prevIdx:idx,prog:idx-TR.N,coins:0,
    item:null,itemCount:0,roll:0,rollKey:'',itemHold:0,trailing:false,trailMesh:null,orbit:[],chain:[],goldT:0,goldOn:false,
    drift:0,driftDir:0,charge:0,driftWant:0,hop:0,boost:0,spin:0,spinVis:0,tumble:0,squash:0,shrinkT:0,starT:0,trainT:0,trainD:0,inkT:0,invulnT:0,stall:0,
    respawn:0,wallCD:0,steerVis:0,wheelRot:0,finished:false,finishTime:0,startPress:null,lane:(R()*2-1)*3.5,laneT:R()*2,cv:0,
    autopilot:false,lapStart:0,laps:[],lastLap:1,rank:0,aiMul:1,wasHit:false});
  k.v.g.visible=true;}

function clearItems(){proj.forEach(p=>scene.remove(p.m));hazards.forEach(h=>scene.remove(h.m));fx.forEach(f=>{scene.remove(f.m);});proj=[];hazards=[];fx=[];}
function startRace(cfg){
  race=cfg;audioInit();if(AC&&AC.state==='suspended')AC.resume();
  try{navigator.wakeLock&&navigator.wakeLock.request('screen').catch(()=>{});}catch(e){}
  clearItems();karts.forEach(k=>{dropHeld(k);disposeKartMesh(k.v);});if(ghostMesh){disposeKartMesh(ghostMesh);ghostMesh=null;}
  if(!TR||TR.id!==TRACK_IDS[cfg.track])buildTrack(TRACK_IDS[cfg.track]);
  removePreview();
  TR.boxes.forEach(b=>{b.on=cfg.mode!=='tt';b.m.visible=b.on;});TR.coins.forEach(c=>{c.on=true;c.m.visible=true;});
  const N=TR.N;
  let roster;
  if(cfg.mode==='tt')roster=[{ci:sel.ci,bi:sel.bi,wi:sel.wi,ai:false}];
  else if(cfg.mode==='gp')roster=gp.roster;
  else roster=makeRoster();
  karts=roster.map((r,i)=>makeKart(r,i));player=karts[0];
  // grid order
  // grid: race 1 the player starts last; later GP races the standings leader starts at the back
  let order;
  if(cfg.mode==='tt')order=[0];
  else if(cfg.mode==='gp'&&gp.race>0)order=karts.map(k=>k.id).sort((a,b)=>(gp.pts[a]-gp.pts[b])||(b-a));
  else{order=karts.map(k=>k.id).filter(id=>id!==0);order.sort(()=>R()-.5);order.push(0);}
  order.forEach((id,slot)=>{const k=karts[id];const row=slot>>1,idx=(N-4-row*4+N)%N;const lat=cfg.mode==='tt'?0:clamp(slot%2?2.4:-2.4,-TR.fL[idx]+1.2,TR.fR[idx]-1.2);resetKartState(k,idx,lat);});
  karts.forEach(k=>{k.vbase=CCS[cfg.cc].v*(1+(k.ai?.02:.035)*(k.st.sp-3));});
  if(cfg.mode==='tt'){player.item='koffie3';player.itemCount=3;
    const g=store.get('ghost-'+TRACK_IDS[cfg.track],null);ghost=g&&g.f&&g.f.length?g:null;
    if(ghost){ghostMesh=makeKartMesh(ghost.ci,ghost.bi,ghost.wi,true);}
    ghostRec={ci:sel.ci,bi:sel.bi,wi:sel.wi,f:[]};recT=0;}else{ghost=null;ghostRec=null;}
  raceTime=0;introT=2.6;countT=3.2;lastBeep=9;finishTimer=0;paused=false;
  loadT=0;if(TR.hPass>=1&&tiles&&tiles.loadProgress>.9){state='intro';showOverlay(null);}else{state='loading';screenLoading();}$('#hud').hidden=false;$('#posOf').textContent='/ '+karts.length;
  hudCache={};setSlot('','empty',false,0);streetShown='';
}
function makeRoster(){const others=CHARS.map((c,i)=>i).filter(i=>i!==sel.ci);const ros=[{ci:sel.ci,bi:sel.bi,wi:sel.wi,ai:false}];
  const rivals=new Set([others[(R()*others.length)|0],others[(R()*others.length)|0]]);
  others.forEach(ci=>ros.push({ci,bi:(R()*BODIES.length)|0,wi:(R()*WHEELS.length)|0,ai:true,skill:rivals.has(ci)?1.01+R()*.025:.95+R()*.05}));return ros;}

/* ================= HUD ================= */
let hudCache={},msgTimer=0,slotShown='',streetShown='';
function setText(id,v){if(hudCache[id]!==v){hudCache[id]=v;$('#'+id).textContent=v;}}
function setSlot(html,key,ready,count){const k=key+'|'+count;if(slotShown===k)return;slotShown=k;const s=$('#itemSlot');s.innerHTML=html+'<span id="itemCount"'+(count>1?'':' hidden')+'>'+count+'</span>';s.classList.toggle('ready',!!ready);}
function showMsg(t,dur,small){const m=$('#msg');m.textContent=t;m.classList.toggle('small',!!small);m.classList.add('show');msgTimer=dur||1.2;}
const mg=$('#map').getContext('2d');
function drawMap(){const c=$('#map');mg.clearRect(0,0,c.width,c.height);mg.drawImage(TR.mapBg,0,0);
  if(ghost&&ghostMesh&&ghostMesh.g.visible){mg.fillStyle='rgba(246,243,234,.6)';mg.beginPath();mg.arc(TR.mx(ghostMesh.g.position.x),TR.mz(ghostMesh.g.position.z),6,0,7);mg.fill();}
  proj.forEach(p=>{if(p.kind==='peerd'){mg.fillStyle='#3a6fd8';mg.beginPath();mg.arc(TR.mx(p.x),TR.mz(p.z),6,0,7);mg.fill();}});
  for(let j=karts.length-1;j>=0;j--){const k=karts[j];if(k.respawn>0)continue;mg.fillStyle=k.color;mg.strokeStyle='#0b1716';mg.lineWidth=3;mg.beginPath();mg.arc(TR.mx(k.x),TR.mz(k.z),k===player?8:5.5,0,7);mg.fill();mg.stroke();}}

/* ================= ITEMS ================= */
function pickItem(k){const n=karts.length;const r=n>1?k.rank/(n-1):0;let tbl=ODDS[ODDS.length-1][1];for(const [lim,t] of ODDS){if(r<lim){tbl=t;break;}}
  const peerdLive=proj.some(p=>p.kind==='peerd');const recentHagel=raceTime-(lastHagel||-99)<20;
  for(let tries=0;tries<6;tries++){let sum=0;for(const key in tbl)sum+=tbl[key];let x=R()*sum,pick='koffie';for(const key in tbl){x-=tbl[key];if(x<=0){pick=key;break;}}
    if(pick==='peerd'&&peerdLive)continue;if(pick==='hagel'&&recentHagel)continue;if(race.mode==='tt')pick='koffie';return pick;}
  return'meeuw';}
let lastHagel=-99;
function giveItem(k){if(k.item||k.roll>0)return;k.rollKey=pickItem(k);k.roll=k===player&&!k.autopilot?1.0:.25;}
function finishRoll(k){k.item=k.rollKey;k.itemCount=IT[k.item].c||1;k.itemHold=.6+R()*3;k.goldOn=false;
  if(k.item==='klomp3'||k.item==='meeuw3'){const kind=k.item==='klomp3'?'klomp':'meeuw';for(let j=0;j<3;j++)k.orbit.push({m:itemMesh(kind),kind});}
  if(k.item==='haring3'){for(let j=0;j<3;j++)k.chain.push(itemMesh('haring'));}
  if(k===player)beep(880,.08,'square',.05);}
function dropHeld(k){if(k.trailMesh){scene.remove(k.trailMesh);k.trailMesh=null;}k.trailing=false;k.orbit.forEach(o=>scene.remove(o.m));k.orbit=[];k.chain.forEach(m=>scene.remove(m));k.chain=[];}
function clearItem(k){dropHeld(k);k.item=null;k.itemCount=0;k.goldT=0;k.goldOn=false;}
function defend(k){if(k.trailing){clearItem(k);return true;}if(k.orbit.length){scene.remove(k.orbit.pop().m);if(--k.itemCount<=0)clearItem(k);return true;}if(k.chain.length){scene.remove(k.chain.pop());if(--k.itemCount<=0)clearItem(k);return true;}return false;}
function fwd(k){return{fx:Math.sin(k.yaw),fz:Math.cos(k.yaw)};}
function useItemPress(k){if(!k.item||k.roll>0||k.respawn>0||k.trainT>0)return;const key=k.item;
  if(IT[key].trail&&!k.trailing){k.trailing=true;const kind=key==='klomp'?'klomp':key==='meeuw'?'meeuw':key==='haring'?'haring':'knaller';k.trailMesh=itemMesh(kind);return;}
  if(!IT[key].trail)fireItem(k,itemDir(k));}
function useItemRelease(k){if(k.trailing)fireItem(k,itemDir(k));}
function itemDir(k){if(k!==player||k.autopilot)return k.aiDir||0;if(input.down||input.tb)return-1;if(input.up&&!isTouch)return 1;return 0;}
function boostK(k,t){k.boost=Math.max(k.boost,t);}
function fireItem(k,dir){const key=k.item;if(!key)return;DBG.items[key]=(DBG.items[key]||0)+1;const {fx,fz}=fwd(k);const single=()=>clearItem(k);
  const s=TR.latOf(k.idx,k.x,k.z);
  switch(key){
  case'koffie':boostK(k,1.25);single();if(k===player)beep(520,.2,'triangle',.08);break;
  case'koffie3':boostK(k,1.25);if(--k.itemCount<=0)single();if(k===player)beep(520,.2,'triangle',.08);break;
  case'goud':if(!k.goldOn){k.goldOn=true;k.goldT=7.5;}boostK(k,1.0);if(k===player)beep(560,.15,'triangle',.07);break;
  case'klomp':case'klomp3':{const forward=dir>=0;spawnBounce(k,forward?1:-1,'klomp');if(key==='klomp3'){const o=k.orbit.pop();if(o)scene.remove(o.m);if(--k.itemCount<=0)single();}else single();break;}
  case'meeuw':case'meeuw3':{if(dir<0)spawnBounce(k,-1,'meeuw');else spawnHoming(k);if(key==='meeuw3'){const o=k.orbit.pop();if(o)scene.remove(o.m);if(--k.itemCount<=0)single();}else single();break;}
  case'peerd':spawnPeerd(k);single();break;
  case'haring':case'haring3':{if(dir>0)spawnLob(k);else addHazard(k.x-fx*2.8,k.z-fz*2.8,k);if(key==='haring3'){const m=k.chain.pop();if(m)scene.remove(m);if(--k.itemCount<=0)single();}else single();break;}
  case'knaller':spawnBomb(k,dir<0?-1:1);single();break;
  case'trein':single();k.trainT=6;k.trainD=TR.D[k.idx];k.trainLat=s;k.drift=0;k.spin=k.tumble=k.squash=0;if(k===player){showMsg('Sneltrein!',1,true);beep(300,.4,'sawtooth',.06);}break;
  case'klok':single();k.starT=7.5;if(k===player)beep(990,.3,'triangle',.07);break;
  case'hagel':single();lastHagel=raceTime;karts.forEach(o=>{if(o===k||o.starT>0||o.trainT>0||o.respawn>0)return;clearItem(o);o.roll=0;o.shrinkT=3+(1-o.rank/Math.max(1,karts.length-1))*4;hit(o,'spin',{force:true});});
    const f=$('#flash');f.classList.remove('on');void f.offsetWidth;f.classList.add('on');beep(140,.5,'sawtooth',.09);if(k!==player)showMsg('Hagelbui!',1,true);break;
  case'plens':single();karts.forEach(o=>{if(o!==k&&o.rank<k.rank&&o.starT<=0)o.inkT=4.5;});if(player.inkT>0&&k!==player)showMsg('Plensbui!',.9,true);break;
  case'munt':single();k.coins=Math.min(10,k.coins+2);boostK(k,.35);if(k===player)beep(1200,.08,'square',.05);break;
  case'bel':single();bellWave(k);break;}
}
function spawnBounce(k,dir,kind){const {fx,fz}=fwd(k);const sp=dir>0?48+Math.max(0,k.speed)*.3:18;const m=itemMesh(kind);
  proj.push({kind:'bounce',look:kind,m,x:k.x+fx*dir*2.8,z:k.z+fz*dir*2.8,y:.6,vx:fx*dir*sp,vz:fz*dir*sp,i:k.idx,life:dir>0?9:14,grace:.35,owner:k,bounces:0});}
function spawnHoming(k){const target=RANK[k.rank-1]||null;const m=itemMesh('meeuw');const s=TR.latOf(k.idx,k.x,k.z);
  proj.push({kind:'home',m,d:TR.D[k.idx]+3,lat:s,x:k.x,z:k.z,y:1.4,target,life:10,grace:.3,owner:k,homing:false,i:k.idx});}
function spawnPeerd(k){const m=itemMesh('peerd');m.scale.set(1.3,1.3,1.3);proj.push({kind:'peerd',m,d:TR.D[k.idx],lat:0,x:k.x,z:k.z,y:7,trav:0,life:24,dive:0,owner:k,i:k.idx});
  if(k!==player)showMsg('Het Peerd galoppeert!',1.1,true);beep(200,.3,'sawtooth',.06);}
function spawnLob(k){const {fx,fz}=fwd(k);const m=itemMesh('haring');proj.push({kind:'lob',m,x:k.x+fx*2,z:k.z+fz*2,y:1.5,vx:fx*(k.speed+14),vz:fz*(k.speed+14),vy:7,owner:k,life:3,i:k.idx});}
function spawnBomb(k,dir){const {fx,fz}=fwd(k);const m=itemMesh('knaller');const sp=dir>0?Math.max(0,k.speed)+16:3;
  proj.push({kind:'bomb',m,x:k.x+fx*dir*2.5,z:k.z+fz*dir*2.5,y:1.2,vx:fx*dir*sp,vz:fz*dir*sp,vy:dir>0?7:1,fuse:dir>0?3.2:2.6,grace:.6,owner:k,i:k.idx});}
function addHazard(x,z,owner){const m=itemMesh('haring');const i=TR.nearest(x,z,owner?owner.idx:null);m.position.set(x,TR.hAt(i)+.35,z);m.rotation.y=R()*6;
  hazards.push({m,x,z,i,lat:TR.latOf(i,x,z),life:45,owner,grace:.6});if(hazards.length>30){scene.remove(hazards[0].m);hazards.shift();}}
function explode(x,z,r,owner){const m=new THREE.Mesh(IGEO.boom,IMAT.boom.clone());m.position.set(x,TR.hAt(TR.nearest(x,z))+1,z);scene.add(m);fx.push({kind:'boom',m,t:0,r});
  karts.forEach(k=>{if(Math.hypot(k.x-x,k.z-z)<r)hit(k,'tumble',{force:true});});beep(90,.5,'sawtooth',.1);}
function bellWave(k){const m=new THREE.Mesh(IGEO.ring,IMAT.wave.clone());m.rotation.x=-Math.PI/2;m.position.set(k.x,TR.hAt(k.idx)+1,k.z);scene.add(m);fx.push({kind:'wave',m,t:0,r:9});
  karts.forEach(o=>{if(o!==k&&Math.hypot(o.x-k.x,o.z-k.z)<9)hit(o,'spin',{force:true});});
  proj=proj.filter(p=>{if(Math.hypot(p.x-k.x,p.z-k.z)<12&&!(p.kind==='peerd'&&p.trav<20&&p.owner===k)){scene.remove(p.m);return false;}return true;});
  hazards=hazards.filter(h=>{if(Math.hypot(h.x-k.x,h.z-k.z)<12){scene.remove(h.m);return false;}return true;});
  beep(1400,.12,'square',.07);setTimeout(()=>beep(1700,.12,'square',.06),130);}
function splash(x,z){for(let i=0;i<12;i++){const m=new THREE.Mesh(IGEO.fish,IMAT.splash.clone());m.scale.setScalar(.5);const g=TR.hAt(TR.nearest(x,z));m.position.set(x,g+.3,z);scene.add(m);
  const a=R()*6.28,v=2+R()*4;fx.push({kind:'splash',m,g,vx:Math.cos(a)*v,vz:Math.sin(a)*v,vy:5+R()*5,t:0});}}

function hit(k,kind,opt){DBG.hits++;if(k.respawn>0||k.starT>0||k.trainT>0||k.invulnT>0)return false;
  if(!(opt&&opt.force)&&defend(k))return'block';
  k.drift=0;k.charge=0;k.boost=0;k.goldT=Math.min(k.goldT,0);
  if(kind==='spin'){k.spin=1.0;k.speed*=.3;}else if(kind==='tumble'){k.tumble=1.5;k.speed*=.1;if(!k.air){k.air=true;k.vy=9;k.trickOk=false;k.launchRamp=-1;}}else{k.squash=1.6;k.speed*=.4;}
  k.coins=Math.max(0,k.coins-3);if(k.trailing)clearItem(k);k.wasHit=true;
  if(k===player){showMsg(kind==='squash'?'Platgereden!':'Geraakt!',.9,true);beep(160,.35,'sawtooth',.08);}
  return true;}

function updateProjectiles(dt){
  const N=TR.N,HW=TR.HW;
  for(const p of proj){p.life-=dt;if(p.grace!=null)p.grace-=dt;
    if(p.kind==='bounce'){p.x+=p.vx*dt;p.z+=p.vz*dt;p.i=TR.nearest(p.x,p.z,p.i);
      if(!TR.bridge[p.i]&&inWater(p.x,p.z)){p.life=0;continue;}
      const wn=collideCircle(p,.5);if(wn){const dot=p.vx*wn.x+p.vz*wn.z;if(dot<0){p.vx-=2*dot*wn.x;p.vz-=2*dot*wn.z;p.bounces++;}}
      if(Math.abs(TR.latOf(p.i,p.x,p.z))>26){p.life=0;continue;}
      p.y=.6+TR.rampY[p.i];p.m.position.set(p.x,TR.hAt(p.i)+p.y,p.z);p.m.rotation.y=Math.atan2(p.vx,p.vz);
      if(p.look==='meeuw')flap(p.m,p.life);}
    else if(p.kind==='home'){const t=p.target;
      if(t&&!t.finished&&t.respawn<=0&&!p.homing){const dx=t.x-p.x,dz=t.z-p.z;if(dx*dx+dz*dz<16*16)p.homing=true;}
      if(p.homing&&t){const dx=t.x-p.x,dz=t.z-p.z,d=Math.hypot(dx,dz)||1;p.x+=dx/d*62*dt;p.z+=dz/d*62*dt;p.i=TR.nearest(p.x,p.z,p.i);if(t.respawn>0)p.homing=false;}
      else{p.d+=58*dt;if(t)p.lat+=(clamp(TR.latOf(t.idx,t.x,t.z),-HW+1,HW-1)-p.lat)*Math.min(1,dt*2);const c=TR.atDist(p.d,p.lat);p.x=c.x;p.z=c.z;p.i=c.i;}
      p.y=1.4+TR.rampY[p.i];p.m.position.set(p.x,TR.hAt(p.i)+p.y,p.z);p.m.rotation.y=p.homing&&t?Math.atan2(t.x-p.x,t.z-p.z):TR.ANG[p.i];flap(p.m,p.life);}
    else if(p.kind==='peerd'){const t=RANK.find(k=>!k.finished)||RANK[0];
      if(p.dive>0){p.dive+=dt;const f=Math.min(1,p.dive/.4);p.x+=(t.x-p.x)*f;p.z+=(t.z-p.z)*f;p.y=7*(1-f)+.5;if(f>=1){explode(t.x,t.z,6.5,p.owner);p.life=0;}}
      else{p.d+=74*dt;p.trav+=74*dt;const tl=TR.latOf(t.idx,t.x,t.z);p.lat+=(tl-p.lat)*Math.min(1,dt*3);const c=TR.atDist(p.d,p.lat);p.x=c.x;p.z=c.z;p.i=c.i;p.y=7+Math.sin(p.life*10)*.5;
        const ahead=((TR.D[t.idx]-p.d)%TR.LEN+TR.LEN)%TR.LEN;if(p.trav>30&&ahead<8)p.dive=.001;}
      p.m.position.set(p.x,TR.hAt(p.i)+p.y,p.z);p.m.rotation.y=TR.ANG[p.i];flap(p.m,p.life);}
    else if(p.kind==='lob'){p.vy-=22*dt;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.i=TR.nearest(p.x,p.z,p.i);collideCircle(p,.4);p.m.position.set(p.x,TR.hAt(p.i)+p.y,p.z);
      if(p.y<=.35){p.life=0;if(!inWater(p.x,p.z))addHazard(p.x,p.z,p.owner);}}
    else if(p.kind==='bomb'){p.i=TR.nearest(p.x,p.z,p.i);const gy=TR.rampY[p.i]+.5;p.vy-=22*dt;p.y+=p.vy*dt;if(p.y<=gy){p.y=gy;p.vy=0;p.vx*=Math.max(0,1-dt*3);p.vz*=Math.max(0,1-dt*3);p.fuse-=dt;}
      p.x+=p.vx*dt;p.z+=p.vz*dt;collideCircle(p,.5);
      p.m.position.set(p.x,TR.hAt(p.i)+p.y,p.z);p.m.scale.setScalar(p.fuse<1?1+Math.sin(p.fuse*40)*.12:1);
      if(p.fuse<=0){explode(p.x,p.z,7.5,p.owner);p.life=0;continue;}}
    // hits on karts
    if(p.life>0&&(p.kind==='bounce'||p.kind==='home'||p.kind==='bomb')){for(const k of karts){if(k.respawn>0||(k===p.owner&&p.grace>0))continue;const dx=k.x-p.x,dz=k.z-p.z,r=k.shrinkT>0?1.6:2.1;
      if(dx*dx+dz*dz<r*r&&Math.abs(k.y-(p.y-.5))<2.5){if(p.kind==='bomb')explode(p.x,p.z,7.5,p.owner);else hit(k,'spin');p.life=0;break;}}}
    // projectiles vs hazards
    if(p.life>0&&(p.kind==='bounce'||p.kind==='home')){for(const h of hazards){if(h.life>0&&Math.hypot(h.x-p.x,h.z-p.z)<1.7){h.life=0;p.life=0;break;}}}
  }
  proj=proj.filter(p=>{if(p.life<=0){scene.remove(p.m);return false;}return true;});
  for(const h of hazards){h.life-=dt;h.grace-=dt;for(const k of karts){if(k.respawn>0||(k===h.owner&&h.grace>0)||k.air)continue;const dx=k.x-h.x,dz=k.z-h.z;if(dx*dx+dz*dz<3.2){if(k.starT>0||k.trainT>0){h.life=0;break;}hit(k,'spin',{force:true});h.life=0;break;}}}
  hazards=hazards.filter(h=>{if(h.life<=0){scene.remove(h.m);return false;}return true;});
  for(const f of fx){f.t+=dt;if(f.kind==='boom'){const s=1+f.t*f.r*2.2;f.m.scale.setScalar(Math.min(s,f.r));f.m.material.opacity=Math.max(0,.8-f.t*1.6);}
    else if(f.kind==='wave'){f.m.scale.setScalar(1+f.t*20);f.m.material.opacity=Math.max(0,.8-f.t*2);}
    else{f.vy-=22*dt;f.m.position.x+=f.vx*dt;f.m.position.y=Math.max(f.g+.05,f.m.position.y+f.vy*dt);f.m.position.z+=f.vz*dt;f.m.material.opacity=Math.max(0,.95-f.t*1.1);}}
  fx=fx.filter(f=>{const end=f.kind==='boom'?.5:f.kind==='wave'?.4:.85;if(f.t>end){scene.remove(f.m);f.m.material.dispose();return false;}return true;});
}
function flap(m,t){const a=Math.sin(t*18)*.5;m.children.forEach(c=>{if(c.name==='w1')c.rotation.z=a;if(c.name==='w-1')c.rotation.z=-a;});}
function updateHeld(k,t){const {fx,fz}=fwd(k);const ky=TR.hAt(k.idx)+k.y+.1;
  if(k.trailMesh){k.trailMesh.position.set(k.x-fx*2.4,ky+.5,k.z-fz*2.4);k.trailMesh.rotation.y=k.yaw;}
  k.orbit.forEach((o,j)=>{const a=t*4+j*2.094;o.m.position.set(k.x+Math.sin(a)*2.3,ky+.7,k.z+Math.cos(a)*2.3);o.m.rotation.y=a+Math.PI/2;if(o.kind==='meeuw')flap(o.m,t+j);});
  k.chain.forEach((m,j)=>{m.position.set(k.x-fx*(2.4+j*1.3),ky+.4,k.z-fz*(2.4+j*1.3));m.rotation.y=k.yaw;});
  // contact of held items with other karts
  for(const o of karts){if(o===k||o.respawn>0)continue;
    for(let j=k.orbit.length-1;j>=0;j--){const p=k.orbit[j].m.position;if((o.x-p.x)**2+(o.z-p.z)**2<3.2){if(hit(o,'spin')){}scene.remove(k.orbit[j].m);k.orbit.splice(j,1);if(--k.itemCount<=0)clearItem(k);break;}}
    const tm=k.trailMesh;if(tm&&(o.x-tm.position.x)**2+(o.z-tm.position.z)**2<2.6){hit(o,'spin');clearItem(k);}
    for(let j=k.chain.length-1;j>=0;j--){const p=k.chain[j].position;if((o.x-p.x)**2+(o.z-p.z)**2<2.6){hit(o,'spin',{force:true});scene.remove(k.chain[j]);k.chain.splice(j,1);if(--k.itemCount<=0)clearItem(k);break;}}}}

/* ================= DRIVING ================= */
const inR=(i,a,len)=>((i-a)%TR.N+TR.N)%TR.N<len;
function playerInput(){
  if(player.autopilot)return aiControl(player,0);
  const l=input.left||input.tl,r=input.right||input.tr,brake=input.down||input.tb;
  const gas=settings.autoGas?!brake:input.up;
  const de=input.driftEdge;input.driftEdge=false;
  return{gas,brake,steer:(l?1:0)-(r?1:0),drift:input.drift||input.td,driftPress:de};}

function aiControl(k,dt){
  const N=TR.N,HW=TR.HW;
  k.laneT-=dt;if(k.laneT<0){k.laneT=2+R()*3;k.lane=(R()*2-1)*4;}
  // dodge hazards ahead
  for(const h of hazards){const df=(h.i-k.idx+N)%N;if(df<14&&Math.abs(h.lat-k.lane)<2.8){k.lane=h.lat+(h.lat>0?-4.2:4.2);k.laneT=1.5;}}
  for(const pd of TR.pads){const df=(pd.i-k.idx+N)%N;if(df<20&&df>3&&R()<.02*k.skill)k.lane=pd.s;}
  const look=Math.round(9+Math.abs(k.speed)*.32);const ti=(k.idx+look)%N;
  let mL=99,mR=99;for(let j=0;j<=look;j+=3){const q=(k.idx+j)%N;mL=Math.min(mL,TR.fL[q]);mR=Math.min(mR,TR.fR[q]);}if(k.stuckT>.8)k.lane=0;
  const turnA=Math.abs(wrapA(TR.ANG[ti]-TR.ANG[k.idx]));const lane=clamp(k.lane*(turnA>.45?.2:1),-Math.max(0,mL-1.5),Math.max(0,mR-1.5));const tx=TR.P[ti].x+TR.NR[ti].x*lane,tz=TR.P[ti].z+TR.NR[ti].z*lane;
  let diff=wrapA(Math.atan2(tx-k.x,tz-k.z)-k.yaw);if(k.inkT>0)diff+=Math.sin(raceTime*3+k.id)*.25;
  const curv=Math.abs(wrapA(TR.ANG[(k.idx+26)%N]-TR.ANG[k.idx]));
  if(k.cv>.55&&curv<.3&&R()<(k.skill-.8)*1.5)boostK(k,.55);k.cv=curv;
  const behind=(player.prog-k.prog)*TR.SP;const rub=k===player||race.mode==='tt'?1:1+clamp(behind/800,-.08,.12);
  k.aiMul=(k===player?1:CCS[race.cc].ai*k.skill)*rub*(1-Math.min(.3,curv*.31))*(k.inkT>0?.93:1);
  // items
  if(k.item&&k.roll<=0){k.itemHold-=dt;aiItems(k);}
  return{gas:true,brake:false,steer:clamp(diff*2.4,-1,1),drift:false,driftPress:false};}
function aiItems(k){const key=k.item,N=TR.N;if(k.itemHold>0&&key!=='goud')return;
  const ahead=o=>o!==k&&o.respawn<=0&&o.prog-k.prog>2&&o.prog-k.prog<34&&Math.abs(TR.latOf(o.idx,o.x,o.z)-TR.latOf(k.idx,k.x,k.z))<3.5;
  const behind=n=>karts.some(o=>o!==k&&k.prog-o.prog>1&&k.prog-o.prog<n);
  const straight=Math.abs(wrapA(TR.ANG[(k.idx+30)%N]-TR.ANG[k.idx]))<.35;
  k.aiDir=1;
  switch(key){
  case'koffie':case'koffie3':if(straight&&!k.air)fireItem(k,1);break;
  case'goud':if(!k.goldOn||k.boost<.15){if(straight||k.goldOn)fireItem(k,1);}break;
  case'klomp':if(!k.trailing){useItemPress(k);break;}if(karts.some(ahead)||k.itemHold<-12){k.aiDir=1;useItemRelease(k);}else if(behind(6)&&k.itemHold<-3){k.aiDir=-1;useItemRelease(k);}break;
  case'klomp3':if(karts.some(ahead))fireItem(k,1);break;
  case'meeuw':if(!k.trailing){useItemPress(k);break;}if(k.rank>0&&RANK[k.rank-1]&&RANK[k.rank-1].prog-k.prog<140){k.aiDir=1;useItemRelease(k);}else if(k.rank===0&&behind(8)){k.aiDir=-1;useItemRelease(k);}break;
  case'meeuw3':if(k.rank>0&&RANK[k.rank-1]&&RANK[k.rank-1].prog-k.prog<120)fireItem(k,1);break;
  case'haring':if(!k.trailing){useItemPress(k);break;}if(behind(14)||k.itemHold<-10){k.aiDir=-1;useItemRelease(k);}break;
  case'haring3':if(behind(12)||k.itemHold<-8){k.itemHold=.8;fireItem(k,-1);}break;
  case'knaller':if(!k.trailing){useItemPress(k);break;}if(karts.some(ahead)||k.itemHold<-8){k.aiDir=1;useItemRelease(k);}break;
  case'bel':{const danger=proj.some(p=>p.kind==='peerd'&&Math.hypot(p.x-k.x,p.z-k.z)<26&&(RANK.find(o=>!o.finished)===k))||karts.some(o=>o!==k&&Math.hypot(o.x-k.x,o.z-k.z)<5);if(danger||k.itemHold<-15)fireItem(k,1);break;}
  default:fireItem(k,1);}}

function trainDrive(k,dt){k.trainT-=dt;k.trainD+=40*dt;k.trainLat*=Math.max(0,1-dt*1.5);const c=TR.atDist(k.trainD+3,k.trainLat);const pi=k.idx;
  k.x=c.x;k.z=c.z;k.idx=TR.nearest(k.x,k.z,k.idx);k.yaw=k.moveYaw=TR.ANG[k.idx];k.y=TR.gap[k.idx]?1.2:TR.rampY[k.idx];k.air=false;k.speed=40;
  let d=k.idx-pi;if(d<-TR.N/2)d+=TR.N;if(d>TR.N/2)d-=TR.N;k.prog+=d;
  karts.forEach(o=>{if(o!==k&&Math.hypot(o.x-k.x,o.z-k.z)<3.2)hit(o,'tumble',{force:true});});
  if(k.trainT<=0&&(TR.gap[k.idx]||TR.rampOf[k.idx]>=0))k.trainT=.05;
  if(k.trainT<=0){k.trainT=0;k.speed=30;boostK(k,.6);k.invulnT=1;}}

function respawnAt(k){const N=TR.N;let i=k.idx,steps=0;while((TR.gap[i]||TR.rampOf[i]>=0)&&steps<60){i=(i+1)%N;steps++;}
  k.prog+=steps;k.idx=i;k.prevIdx=i;const p=TR.P[i];k.x=p.x;k.z=p.z;k.y=0;k.vy=0;k.air=false;k.glide=false;k.yaw=k.moveYaw=TR.ANG[i];k.speed=0;k.v.g.visible=true;k.spin=k.tumble=k.squash=0;k.invulnT=1.2;}

function updateKart(k,dt,inp){
  const racing=state==='race'||state==='done';const HW=TR.HW,N=TR.N;
  if(k.respawn>0){k.respawn-=dt;if(k.respawn<=0)respawnAt(k);return;}
  if(k.roll>0){k.roll-=dt;if(k.roll<=0)finishRoll(k);}
  const hadHit=k.spin>0||k.tumble>0||k.squash>0;
  k.wallCD-=dt;k.invulnT-=dt;k.inkT-=dt;k.shrinkT-=dt;k.stall-=dt;
  if(k.starT>0)k.starT-=dt;if(k.goldOn){k.goldT-=dt;if(k.goldT<=0&&k.item==='goud')clearItem(k);}
  if(k.spin>0){k.spin-=dt;k.spinVis+=dt*14;}else k.spinVis=0;
  if(k.tumble>0)k.tumble-=dt;if(k.squash>0)k.squash-=dt;
  if(hadHit&&k.spin<=0&&k.tumble<=0&&k.squash<=0){k.invulnT=.6;k.wasHit=false;}
  if(k.trainT>0){trainDrive(k,dt);return;}
  let gas=racing&&inp.gas,brake=racing&&inp.brake,steer=racing?inp.steer:0;
  if(k.stall>0)gas=false;
  const stunned=k.spin>0||k.tumble>0||k.squash>0;if(stunned){gas=false;brake=false;steer=0;}
  const off=false;
  let vmax=k.vbase*(1+k.coins*.007)*(k.shrinkT>0?.78:1)*(k.starT>0?1.12:1)*(k.ai||k.autopilot?k.aiMul:1);
  if(off&&k.starT<=0&&k.boost<=0)vmax=Math.min(vmax,k.offV);
  if(k.boost>0)vmax=Math.max(vmax,k.vbase*1.36);
  const acc=k.boost>0?52:k.acc;
  if(k.speed>vmax)k.speed-=(k.speed-vmax)*Math.min(1,dt*(off?3:1.5));
  else if(gas)k.speed=Math.min(vmax,k.speed+acc*dt);
  if(brake){k.speed-=(k.speed>0?42:14)*dt;if(k.speed<-9)k.speed=-9;}
  else if(!gas&&!k.air)k.speed-=Math.sign(k.speed)*Math.min(Math.abs(k.speed),9*dt);
  if(k.boost>0)k.boost-=dt;
  // drift & tricks
  if(inp.driftPress){if(!k.air&&!stunned){k.hop=.3;k.driftWant=.25;}else if(k.air&&k.trickOk&&!k.trickDone){k.trickDone=true;k.trickT=.45;if(k===player)beep(760,.08,'square',.05);}}
  if(k.driftWant>0){k.driftWant-=dt;if(!k.drift&&inp.drift&&Math.abs(steer)>.3&&k.speed>12&&!k.air&&!off){k.drift=1;k.driftDir=Math.sign(steer);k.charge=0;k.driftWant=0;}}
  if(k.drift&&(!inp.drift||k.speed<9||stunned||k.air)){if(!stunned&&!k.air){const c=k.charge,m=k.mt;
    if(c>2.5){boostK(k,1.35*m);if(k===player){showMsg('Ultra-turbo!',.7,true);beep(820,.2,'triangle',.07);}}
    else if(c>1.6){boostK(k,.95*m);if(k===player){showMsg('Super-turbo!',.7,true);beep(700,.18,'triangle',.07);}}
    else if(c>.8){boostK(k,.55*m);if(k===player)beep(600,.12,'triangle',.06);}}
    k.drift=0;k.charge=0;}
  const sf=Math.min(1,Math.abs(k.speed)/8)*(k.speed<0?-1:1);
  let yr;if(k.drift){const s2=steer*k.driftDir;yr=k.driftDir*(1.1+.55*s2)*(k.turn*.8);k.charge+=dt*k.mt*(1+.6*Math.max(0,s2));}
  else yr=steer*(k.turn+.3-Math.min(.5,Math.abs(k.speed)/80))*(k.air?(k.glide?.7:.35):1);
  k.yaw=wrapA(k.yaw+yr*sf*dt);
  k.moveYaw=lerpA(k.moveYaw,k.yaw,1-Math.exp(-(k.drift?2.4:k.air?2:10)*dt));
  if(stunned)k.moveYaw=lerpA(k.moveYaw,k.yaw,dt);
  k.px=k.x;k.pz=k.z;k.x+=Math.sin(k.moveYaw)*k.speed*dt;k.z+=Math.cos(k.moveYaw)*k.speed*dt;
  if(k.hop>0)k.hop=Math.max(0,k.hop-dt*1.6);
  if(k.trickT>0)k.trickT-=dt;
  k.steerVis+=(steer-k.steerVis)*Math.min(1,dt*10);
  // progress
  k.prevIdx=k.idx;k.idx=TR.nearest(k.x,k.z,k.idx);let d=k.idx-k.prevIdx;if(d<-N/2)d+=N;if(d>N/2)d-=N;k.prog+=d;
  // vertical
  const gy=TR.rampY[k.idx];
  if(!k.air){const pr=TR.rampOf[k.prevIdx];
    if(pr>=0&&TR.rampOf[k.idx]<0&&d>0){const r=TR.ramps[pr];k.air=true;k.vy=r.vy*(.55+.45*Math.min(1,k.speed/30));k.y=TR.rampY[k.prevIdx];k.trickOk=true;k.trickDone=false;k.launchRamp=pr;k.glide=!!r.glide;k.drift=0;
      if(k.ai&&R()<.65){k.trickDone=true;k.trickT=.45;}}
    else k.y=gy;}
  if(k.air){k.vy-=(k.glide&&k.vy<0?5.5:24)*dt;k.y+=k.vy*dt;if(k.glide)k.speed=Math.max(k.speed,Math.min(k.vbase,30));
    if(k.y<=gy&&k.vy<0){k.air=false;k.y=gy;const wasGlide=k.glide;k.glide=false;if(k.trickDone&&!stunned){boostK(k,.7*k.mt);if(k===player)beep(640,.12,'triangle',.06);}k.trickDone=false;k.trickOk=false;void wasGlide;}}
  // real walls (OSM building outlines), canals, getting lost
  const s=TR.latOf(k.idx,k.x,k.z);const smart=k===player&&settings.smart;
  if(!k.air&&TR.gap[k.idx]){fall(k);return;}
  const wn=collideCircle(k,k.shrinkT>0?.5:.82);
  if(wn&&!k.air&&k.wallCD<=0){const into=-(Math.sin(k.moveYaw)*wn.x+Math.cos(k.moveYaw)*wn.z);if(into>.3){k.speed*=1-.5*into;k.wallCD=.3;if(k===player)beep(90,.12,'square',.05);}}
  if(wn)k.speed*=Math.max(0,1-1.2*dt);
  if(!TR.bridge[k.idx]&&(!k.air||k.y<.6)&&inWater(k.x,k.z)){if(smart){k.x=k.px;k.z=k.pz;k.speed*=.5;}else{fall(k);return;}}
  if(Math.abs(s)>24){fall(k,true);return;}
  // stuck against a wall: a sloep-crew (or for AI: a quick hop) puts you back on the route
  if(racing&&!stunned&&!k.air&&Math.abs(k.speed)<3&&(gas||k.ai)){k.stuckT=(k.stuckT||0)+dt;}else k.stuckT=Math.max(0,(k.stuckT||0)-dt*2);
  if(racing&&!k.finished){k.pcT=(k.pcT||0)+dt;if(k.pcT>1.6){if(k.prog-(k.pcProg??-1e9)<2&&!stunned&&k.trainT<=0)k.stuckT=99;k.pcT=0;k.pcProg=k.prog;}}
  if(k.stuckT>(k.ai||k.autopilot?2.5:5)){k.stuckT=0;const j=(k.idx+3)%N;k.prog+=3;k.idx=j;k.x=TR.P[j].x;k.z=TR.P[j].z;k.yaw=k.moveYaw=TR.ANG[j];k.speed=4;if(k===player)showMsg('Terug op de baan',1,true);}
  // pads
  if(!k.air)for(const pd of TR.pads){const di=Math.abs(((k.idx-pd.i+N+N/2)%N)-N/2);if(di<=2&&Math.abs(s-pd.s)<2.1&&k.boost<.6){boostK(k,pd.big?1.2:.9);if(k===player)beep(480,.16,'triangle',.06);}}
  // laps / finish
  const lapNow=Math.floor(k.prog/N)+1;
  if(lapNow>k.lastLap&&lapNow>=2&&!k.finished){k.laps.push(raceTime-k.lapStart);k.lapStart=raceTime;}
  if(lapNow>k.lastLap)k.lastLap=lapNow;
  if(racing&&!k.finished&&k.prog>=LAPS*N){k.finished=true;k.finishTime=raceTime;if(k===player)onPlayerFinish();}
}
function fall(k,lost){DBG.falls[k.name]=(DBG.falls[k.name]||0)+1;k.respawn=1.5;k.v.g.visible=false;k.drift=0;k.speed=0;k.boost=0;k.coins=Math.max(0,k.coins-3);dropHeld(k);if(k.item&&IT[k.item].trail)clearItem(k);
  if(!lost)splash(k.x,k.z);if(k===player){showMsg(lost?'Terug naar de baan':'Plons! Een sloep vist je op',1.4,true);beep(220,.5,'sine',.1);}}

function collide(){
  for(let i=0;i<karts.length;i++)for(let j=i+1;j<karts.length;j++){const a=karts[i],b=karts[j];if(a.respawn>0||b.respawn>0||Math.abs(a.y-b.y)>2)continue;
    const dx=b.x-a.x,dz=b.z-a.z,d2=dx*dx+dz*dz;const ra=a.shrinkT>0?.58:.95,rb=b.shrinkT>0?.58:.95,rr=ra+rb;if(d2>=rr*rr||d2<1e-4)continue;
    const aInv=a.starT>0||a.trainT>0,bInv=b.starT>0||b.trainT>0;
    if(aInv&&!bInv){hit(b,'tumble',{force:true});continue;}if(bInv&&!aInv){hit(a,'tumble',{force:true});continue;}
    if(a.shrinkT>0&&b.shrinkT<=0){hit(a,'squash',{force:true});continue;}if(b.shrinkT>0&&a.shrinkT<=0){hit(b,'squash',{force:true});continue;}
    const d=Math.sqrt(d2),ov=rr-d,nx=dx/d,nz=dz/d,wa=a.wt,wb=b.wt;a.x-=nx*ov*wb/(wa+wb);a.z-=nz*ov*wb/(wa+wb);b.x+=nx*ov*wa/(wa+wb);b.z+=nz*ov*wa/(wa+wb);
    if(a.boost>0&&b.boost<=0)b.speed*=.88;else if(b.boost>0&&a.boost<=0)a.speed*=.88;}}

function updatePickups(dt){
  for(const b of TR.boxes){if(race.mode==='tt')break;if(!b.on){b.t-=dt;if(b.t<=0){b.on=true;b.m.visible=true;}continue;}
    b.m.rotation.y+=dt*1.4;b.m.position.y=1.4+Math.sin(raceTime*3+b.ph)*.18;
    for(const k of karts){if(k.respawn>0||k.trainT>0)continue;const dx=k.x-b.x,dz=k.z-b.z;if(dx*dx+dz*dz<5.3&&k.y<3){b.on=false;b.m.visible=false;b.t=2.5;giveItem(k);break;}}}
  for(const c of TR.coins){if(!c.on){c.t-=dt;if(c.t<=0){c.on=true;c.m.visible=true;}continue;}c.m.rotation.y+=dt*3;
    for(const k of karts){if(k.respawn>0)continue;const dx=k.x-c.x,dz=k.z-c.z;if(dx*dx+dz*dz<3.6&&k.y<3){c.on=false;c.m.visible=false;c.t=9;if(k.coins<10)k.coins++;boostK(k,.12);if(k===player)beep(1320,.06,'square',.04);break;}}}}

function drawKart(k,t){const v=k.v;v.g.position.set(k.x,TR.hAt(k.idx)+k.y+.06+k.hop*1.2,k.z);v.g.rotation.y=k.yaw+k.spinVis;
  const sc=(k.shrinkT>0?.55:1)*KART_SCALE;v.g.scale.set(sc,k.squash>0?.25*KART_SCALE:sc,sc);
  v.bodyG.rotation.z=-k.steerVis*.08*(k.drift?2.2:1)+(k.v.wheels.length===2?-k.steerVis*.25:0);
  v.bodyG.rotation.x=k.tumble>0?(1.5-k.tumble)*8:k.trickT>0?(1-k.trickT/.45)*Math.PI*2:-Math.min(.05,k.speed/700);
  k.wheelRot+=k.speed*.04;v.wheels.forEach(w=>{w.wm.rotation.x=k.wheelRot;if(w.front)w.w.rotation.y=k.steerVis*.45;});
  const on=k.drift&&k.charge>.25;const col=k.charge>2.5?0xc45bff:k.charge>1.6?0xff9a2a:k.charge>.8?0x48b8ff:0xffffff;
  v.sparks.forEach(s=>{s.visible=on;if(on){s.material.color.setHex(col);const z=.6+R()*(k.charge>.8?1.4:.6);s.scale.set(z,z,z);}});
  v.flame.visible=k.boost>0;if(k.boost>0){const f=.8+R()*.5;v.flame.scale.set(f,f*(1+Math.min(1.5,k.boost)*.3),f);}
  v.glider.visible=k.glide;const tr=k.trainT>0;v.train.visible=tr;v.bodyG.visible=!tr;v.wheels.forEach(w=>w.w.visible=!tr);
  if(k.starT>0)v.kc.emissive.setHSL((t*2)%1,1,.35);else v.kc.emissive.setHex(k.invulnT>0&&Math.sin(t*40)>0?0x333333:0);
  updateHeld(k,t);}

function onPlayerFinish(){player.autopilot=true;const r=RANK.indexOf(player)+1;
  if(race.mode==='tt'){showMsg('Finish!',2);}else showMsg(r===1?'Winnaar!':`${r}e plaats`,2.4);
  beep(r===1?990:660,.5,'triangle',.08);finishTimer=3;}

/* ================= INPUT ================= */
const KEYMAP={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'drift',ShiftLeft:'drift',ShiftRight:'drift'};
window.addEventListener('keydown',e=>{if(e.repeat&&KEYMAP[e.code]){e.preventDefault();return;}const k=KEYMAP[e.code];
  if(k){if(k==='drift'&&!input.drift)input.driftEdge=true;input[k]=true;e.preventDefault();}
  if(state==='count'&&k==='up'&&player&&player.startPress==null)player.startPress=countT;
  if(state==='intro'&&k){introT=0;}
  if((e.code==='KeyE'||e.code==='KeyX')&&!e.repeat&&state==='race'&&!paused){useItemPress(player);e.preventDefault();}
  if(e.code==='KeyQ')lookBack=true;
  if(e.code==='Escape'||e.code==='KeyP'){if(state==='race'||state==='count')togglePause();}});
window.addEventListener('keyup',e=>{const k=KEYMAP[e.code];if(k){input[k]=false;e.preventDefault();}
  if((e.code==='KeyE'||e.code==='KeyX')&&state==='race'&&!paused)useItemRelease(player);if(e.code==='KeyQ')lookBack=false;});
window.addEventListener('blur',()=>{for(const k in input)input[k]=false;});
function hold(el,key){const on=e=>{e.preventDefault();if(key==='td'&&!input.td)input.driftEdge=true;input[key]=true;el.classList.add('on');try{el.setPointerCapture(e.pointerId);}catch(_){}};
  const off=()=>{input[key]=false;el.classList.remove('on');};
  el.addEventListener('pointerdown',on);el.addEventListener('pointerup',off);el.addEventListener('pointercancel',off);el.addEventListener('lostpointercapture',off);el.addEventListener('contextmenu',e=>e.preventDefault());}
hold($('#tLeft'),'tl');hold($('#tRight'),'tr');hold($('#tBrake'),'tb');hold($('#tDrift'),'td');
{const ti=$('#tItem');ti.addEventListener('pointerdown',e=>{e.preventDefault();ti.classList.add('on');try{ti.setPointerCapture(e.pointerId);}catch(_){}if(state==='race'&&!paused)useItemPress(player);});
 const up=()=>{ti.classList.remove('on');if(state==='race'&&!paused)useItemRelease(player);};ti.addEventListener('pointerup',up);ti.addEventListener('pointercancel',up);}
$('#app').addEventListener('pointerdown',()=>{if(state==='count'&&player&&player.startPress==null)player.startPress=countT;if(state==='intro')introT=0;},true);
window.addEventListener('touchstart',()=>{if(!isTouch){isTouch=true;$('#touch').hidden=false;}},{passive:true});
document.addEventListener('gesturestart',e=>e.preventDefault());
$('#pauseBtn').addEventListener('click',()=>{if(state==='race'||state==='count'||state==='intro')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state==='race'||state==='count')&&!paused)togglePause();});
function togglePause(){paused=!paused;if(paused)screenPause();else showOverlay(null);}

/* ================= MENUS ================= */
const ov=$('#ov');
function showOverlay(html,low){if(html==null){ov.hidden=true;ov.innerHTML='';return;}ov.hidden=false;ov.className='ov'+(low?' low':'');ov.innerHTML=html;ov.scrollTop=0;}
function on(id,fn){const el=document.getElementById(id);if(el)el.addEventListener('click',fn);}
function onAll(sel,fn){ov.querySelectorAll(sel).forEach(el=>el.addEventListener('click',()=>fn(el)));}
function portrait(ci){const c=CHARS[ci];let hat='';const hc=c.hatC;
  if(c.hat==='helm')hat=`<path d="M10 24a14 14 0 0 1 28 0v4H10z" fill="${hc}"/><rect x="14" y="24" width="20" height="5" rx="2" fill="#101418"/>`;
  else if(c.hat==='cap')hat=`<path d="M11 20a13 11 0 0 1 26 0z" fill="${hc}"/><rect x="24" y="18" width="16" height="4" rx="2" fill="${hc}"/>`;
  else if(c.hat==='beanie')hat=`<path d="M11 21a13 12 0 0 1 26 0z" fill="${hc}"/><circle cx="24" cy="8" r="3.5" fill="${hc}"/>`;
  else if(c.hat==='captain')hat=`<rect x="12" y="11" width="24" height="8" rx="3" fill="${hc}"/><rect x="10" y="18" width="28" height="3" rx="1.5" fill="#101418"/>`;
  else if(c.hat==='bandana')hat=`<rect x="11" y="16" width="26" height="6" rx="3" fill="${hc}"/>`;
  else if(c.hat==='hair')hat=`<path d="M10 26a14 14 0 0 1 28 0c0-4-6-8-14-8s-14 4-14 8z" fill="${hc}"/><circle cx="37" cy="30" r="4" fill="${hc}"/>`;
  else if(c.hat==='straw')hat=`<ellipse cx="24" cy="18" rx="18" ry="3.5" fill="${hc}"/><rect x="16" y="9" width="16" height="9" rx="3" fill="${hc}"/>`;
  else if(c.hat==='beak')hat=`<path d="M24 28l9 3-9 3z" fill="${hc}"/>`;
  else if(c.hat==='hard')hat=`<path d="M11 21a13 12 0 0 1 26 0z" fill="${hc}"/><rect x="8" y="20" width="32" height="3" rx="1.5" fill="${hc}"/>`;
  const eyes=c.hat==='helm'?'':'<circle cx="19.5" cy="27" r="1.6" fill="#101418"/><circle cx="28.5" cy="27" r="1.6" fill="#101418"/>';
  return`<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="${c.kart}" opacity=".35"/><rect x="14" y="36" width="20" height="12" rx="5" fill="${c.suit}"/><circle cx="24" cy="27" r="12" fill="${c.skin}"/>${eyes}${hat}</svg>`;}

let preview=null,previewKey='';
function setPreview(){const key=sel.ci+'-'+sel.bi+'-'+sel.wi;if(preview&&previewKey===key)return;removePreview();previewKey=key;preview=makeKartMesh(sel.ci,sel.bi,sel.wi);
  const P=TR.P[6];preview.g.position.set(P.x,TR.hAt(6)+.06,P.z);preview.pos={x:P.x,z:P.z};}
function removePreview(){if(preview){disposeKartMesh(preview);preview=null;previewKey='';}}
let menuCam='orbit';

function toMenu(){state='menu';paused=false;clearItems();karts.forEach(k=>{dropHeld(k);disposeKartMesh(k.v);});karts=[];player=null;RANK=[];
  if(ghostMesh){disposeKartMesh(ghostMesh);ghostMesh=null;}$('#hud').hidden=true;$('#rain').style.opacity='0';$('#msg').classList.remove('show');}
function screenTitle(){toMenu();menuCam='orbit';removePreview();
  showOverlay(`<div class="panel"><h1 class="logo">Grunn <span>Kart</span></h1>
   <p class="lede">Kartracen door Groningen. Vier banen, twaalf Stadjers, zeventien items.</p>
   <div class="btns">
    <button class="btn primary" id="bGP">Grand Prix<small>Diepbeker: vier banen, punten, podium</small></button>
    <button class="btn" id="bVS">Losse race<small>Kies één baan</small></button>
    <button class="btn" id="bTT">Tijdrit<small>Alleen tegen de klok en je ghost</small></button>
   </div>
   <div class="navrow"><button class="back" id="bGuide">Items & karts</button><button class="back" id="bSet">Instellingen</button></div></div>`);
  on('bGP',()=>{race={mode:'gp'};screenCC();});on('bVS',()=>{race={mode:'vs'};screenCC();});on('bTT',()=>{race={mode:'tt',cc:2};screenChar();});
  on('bGuide',screenGuide);on('bSet',screenSettings);}
function screenCC(){showOverlay(`<div class="panel"><p class="eyebrow">${race.mode==='gp'?'Grand Prix':'Losse race'}</p><h2>Kies de klasse</h2>
  <div class="btns">${CCS.map((c,i)=>`<button class="btn${i===sel.cc?' primary':''}" data-cc="${i}">${c.name}<small>${['Rustig aan, om te leren','Lekker tempo','Het echte werk','Remmen in de bochten verplicht'][i]}</small></button>`).join('')}</div>
  <div class="navrow"><button class="back" id="bBack">Terug</button></div></div>`);
  onAll('[data-cc]',el=>{sel.cc=+el.dataset.cc;race.cc=sel.cc;store.set('sel',sel);screenChar();});on('bBack',screenTitle);}
function screenChar(){menuCam='orbit';removePreview();
  showOverlay(`<div class="panel"><p class="eyebrow">Stap 1 van 2</p><h2>Kies je coureur</h2>
   <div class="chars">${CHARS.map((c,i)=>`<button class="ch${i===sel.ci?' sel':''}" data-ci="${i}">${portrait(i)}<span>${c.name.replace(' de Meeuw','')}</span><em>${WCLS[c.w].name}</em></button>`).join('')}</div>
   <p class="fine" id="chInfo"></p>
   <div class="navrow"><button class="back" id="bBack">Terug</button><button class="btn primary" id="bNext">Kart kiezen</button></div></div>`);
  const info=()=>{const c=CHARS[sel.ci];$('#chInfo').textContent=`${c.name}, ${c.role.toLowerCase()}. ${WCLS[c.w].name}: ${c.w==='L'?'snel op gang en wendbaar, maar je wordt makkelijk weggeduwd.':c.w==='Z'?'hoge topsnelheid en je duwt anderen opzij, maar trager op gang.':'overal gemiddeld.'}`;};info();
  onAll('[data-ci]',el=>{sel.ci=+el.dataset.ci;ov.querySelectorAll('.ch').forEach(b=>b.classList.toggle('sel',b===el));info();});
  on('bBack',()=>race.mode==='tt'?screenTitle():screenCC());on('bNext',()=>{store.set('sel',sel);screenKart();});}
function statBars(){const s=statsOf(sel.ci,sel.bi,sel.wi);return[['Snelheid','sp'],['Acceleratie','ac'],['Gewicht','wt'],['Besturing','ha'],['Grip','tr'],['Mini-turbo','mt']].map(([l,k])=>`<span>${l}</span><div class="bar"><i style="width:${(s[k]/6*100).toFixed(0)}%"></i></div>`).join('');}
function screenKart(){menuCam='preview';setPreview();
  showOverlay(`<div class="panel"><p class="eyebrow">Stap 2 van 2</p><h2>Stel je kart samen</h2>
   <p class="seglbl">Kart</p><div class="seg" id="segB">${BODIES.map((b,i)=>`<button data-bi="${i}" class="${i===sel.bi?'sel':''}">${b.name}</button>`).join('')}</div>
   <p class="seglbl">Banden</p><div class="seg" id="segW">${WHEELS.map((w,i)=>`<button data-wi="${i}" class="${i===sel.wi?'sel':''}">${w.name}</button>`).join('')}</div>
   <div class="stats" id="stats">${statBars()}</div>
   <div class="navrow"><button class="back" id="bBack">Terug</button><button class="btn primary" id="bNext">${race.mode==='gp'?'Naar de beker':'Baan kiezen'}</button></div></div>`,true);
  const upd=()=>{$('#stats').innerHTML=statBars();setPreview();};
  onAll('[data-bi]',el=>{sel.bi=+el.dataset.bi;ov.querySelectorAll('[data-bi]').forEach(b=>b.classList.toggle('sel',b===el));upd();});
  onAll('[data-wi]',el=>{sel.wi=+el.dataset.wi;ov.querySelectorAll('[data-wi]').forEach(b=>b.classList.toggle('sel',b===el));upd();});
  on('bBack',screenChar);on('bNext',()=>{store.set('sel',sel);if(race.mode==='gp')screenCup();else screenTrack();});}
function screenCup(){menuCam='orbit';removePreview();
  showOverlay(`<div class="panel"><p class="eyebrow">Grand Prix · ${CCS[sel.cc].name}</p><h2>De Diepbeker</h2>
   <div class="btns" style="gap:8px">${TRACK_IDS.map((id,i)=>{const t=DATA.tracks[id];return`<div class="trk"><b>${i+1}. ${t.name}</b><span>${t.sub} · ${(t.len/1000).toFixed(1)} km</span></div>`;}).join('')}</div>
   <p class="fine">Punten per race: ${PTS.join(', ')}. Na vier races krijgen de beste drie een beker.</p>
   <div class="navrow"><button class="back" id="bBack">Terug</button><button class="btn primary" id="bGo">Start</button></div></div>`);
  on('bBack',screenKart);on('bGo',()=>{const roster=makeRoster();gp={cc:sel.cc,race:0,roster,pts:roster.map(()=>0),last:roster.map(()=>0)};startRace({mode:'gp',cc:sel.cc,track:0});});}
function screenTrack(){toMenu();menuCam='orbit';removePreview();const tt=race.mode==='tt';
  showOverlay(`<div class="panel"><p class="eyebrow">${tt?'Tijdrit · 150cc':'Losse race · '+CCS[sel.cc].name}</p><h2>Kies een baan</h2>
   <div class="btns" style="gap:8px">${TRACK_IDS.map((id,i)=>{const t=DATA.tracks[id];const b=store.get('best-'+id,null);return`<button class="trk" data-tr="${i}"><b>${t.name}</b><span>${t.sub} · ${(t.len/1000).toFixed(1)} km</span>${b?`<em>Record ${fmt(b)}</em>`:''}</button>`;}).join('')}</div>
   <div class="navrow"><button class="back" id="bBack">Terug</button></div></div>`);
  onAll('[data-tr]',el=>{const t=+el.dataset.tr;startRace({mode:race.mode,cc:tt?2:sel.cc,track:t});});on('bBack',screenKart);}
function screenGuide(){showOverlay(`<div class="panel"><p class="eyebrow">Hoe het werkt</p><h2>Items & karts</h2>
   <p class="fine">Rij door een groene doos voor een item. Wie achteraan rijdt, krijgt sterkere items. Houd de itemknop ingedrukt om een klomp, meeuw, haring of knaller achter je te houden als schild; loslaten gooit hem. Met Rem (of pijl omlaag) ingedrukt gooi je naar achteren.</p>
   <div class="itemlist">${ITEMKEYS.map(k=>`<div class="it">${ICON[k]}<div><b>${IT[k].n}</b><span>${IT[k].d}</span></div></div>`).join('')}</div>
   <h2 style="font-size:26px">Rijden</h2>
   <dl class="keys"><dt>Drift</dt><dd>Houd vast in de bocht. Blauwe vonken, dan oranje, dan paars: hoe langer, hoe sterker de turbo als je loslaat.</dd>
    <dt>Raketstart</dt><dd>Geef gas (of tik op het scherm) precies als de 2 verschijnt. Te vroeg en je verslikt je.</dd>
    <dt>Trucje</dt><dd>Druk op Drift vlak na een schans. Bij de landing krijg je een turbo.</dd>
    <dt>Muntjes</dt><dd>Tot tien. Elke munt maakt je iets sneller; geraakt worden kost er drie.</dd>
    <dt>Toetsen</dt><dd>Pijltjes/WASD rijden, Spatie drift, E item, Q achterom kijken, Esc pauze.</dd></dl>
   <div class="navrow"><button class="back" id="bBack">Terug</button></div></div>`);on('bBack',screenTitle);}
function screenSettings(){showOverlay(`<div class="panel"><p class="eyebrow">Instellingen</p><h2>Rijhulp</h2>
   <label class="tog"><span>Automatisch gas<small>De kart geeft zelf gas; jij stuurt en remt.</small></span><input type="checkbox" id="sGas" ${settings.autoGas?'checked':''}></label>
   <label class="tog"><span>Slim sturen<small>Houdt je uit de gracht. Vallen na een gemiste sprong kan nog wel.</small></span><input type="checkbox" id="sSmart" ${settings.smart?'checked':''}></label>
   <label class="tog"><span>Geluid</span><input type="checkbox" id="sSnd" ${settings.mute?'':'checked'}></label>
   <p class="seglbl">Detail van de stad</p><div class="seg">${DETAIL.map((d,i)=>`<button data-det="${i}" class="${i===settings.detail?'sel':''}">${d.name}</button>`).join('')}</div>
   <p class="fine">Laag loopt het soepelst op een telefoon. Max laadt de scherpste gevels die Google heeft, maar vraagt een snelle computer en meer data.</p>
   <p class="seglbl">Camera</p><div class="seg">${['Dichtbij','Hoog'].map((d,i)=>`<button data-cam="${i}" class="${i===settings.cam?'sel':''}">${d}</button>`).join('')}</div>
   <p class="fine">Het 3D-model is gemaakt vanuit de lucht en ziet er van iets hoger het scherpst uit.</p>
   <div class="navrow"><button class="back" id="bBack">Terug</button><button class="back" id="bKeyEdit">Google-sleutel wijzigen</button></div></div>`);
  onAll('[data-det]',el=>{settings.detail=+el.dataset.det;store.set('settings',settings);applyDetail();ov.querySelectorAll('[data-det]').forEach(b=>b.classList.toggle('sel',b===el));});
  onAll('[data-cam]',el=>{settings.cam=+el.dataset.cam;store.set('settings',settings);ov.querySelectorAll('[data-cam]').forEach(b=>b.classList.toggle('sel',b===el));});
  on('bKeyEdit',()=>screenKey(''));
  const save=()=>{settings.autoGas=$('#sGas').checked;settings.smart=$('#sSmart').checked;settings.mute=!$('#sSnd').checked;store.set('settings',settings);syncMute();};
  ['sGas','sSmart','sSnd'].forEach(id=>document.getElementById(id).addEventListener('change',save));on('bBack',screenTitle);}
function screenKey(err){toMenu();const cur=store.get('key','');
  showOverlay(`<div class="panel"><p class="eyebrow">Eenmalig instellen</p><h2>Google-sleutel</h2>
   <p class="fine">Grunn Kart haalt het fotorealistische 3D-model van Groningen live op bij Google. Vul je API-sleutel voor de Map Tiles API in. Hij wordt alleen op dit apparaat bewaard en staat niet in de code van het spel.</p>
   <input id="keyIn" class="field" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="AIza…" value="${cur.replace(/[^A-Za-z0-9_-]/g,'')}">
   ${err?`<p class="fine err">${err}</p>`:''}
   <div class="navrow">${cur?'<button class="back" id="bBack">Terug</button>':'<span></span>'}<button class="btn primary" id="bKey">Opslaan en starten</button></div></div>`);
  on('bKey',()=>{const v=$('#keyIn').value.trim();if(!/^[A-Za-z0-9_-]{20,}$/.test(v)){screenKey('Dit lijkt geen geldige sleutel. Een Google-sleutel begint meestal met AIza en is zo\'n 39 tekens lang.');return;}
    store.set('key',v);keyErrShown=false;startTiles(v);screenTitle();});
  on('bBack',screenTitle);}
function screenLoading(){showOverlay(`<div class="panel"><p class="eyebrow">${DATA.tracks[TR.id].name}</p><h2>Groningen laden</h2><p class="lede" id="loadPct">0%</p>
   <p class="fine">Het 3D-model van de binnenstad komt binnen bij Google en de hoogte van de straten wordt gemeten.</p></div>`);}
function screenPause(){showOverlay(`<div class="panel"><h2>Pauze</h2><div class="btns">
   <button class="btn primary" id="pRes">Doorgaan</button><button class="btn" id="pRe">Opnieuw beginnen</button><button class="btn" id="pQuit">Stoppen</button></div>
   <label class="tog"><span>Slim sturen</span><input type="checkbox" id="sSmart2" ${settings.smart?'checked':''}></label>
   <label class="tog"><span>Automatisch gas</span><input type="checkbox" id="sGas2" ${settings.autoGas?'checked':''}></label></div>`);
  on('pRes',togglePause);on('pRe',()=>{paused=false;startRace(race);});on('pQuit',()=>{paused=false;gp=null;screenTitle();});
  $('#sSmart2').addEventListener('change',e=>{settings.smart=e.target.checked;store.set('settings',settings);});
  $('#sGas2').addEventListener('change',e=>{settings.autoGas=e.target.checked;store.set('settings',settings);});}

function finalOrder(){const est=karts.map(k=>k.finished?k.finishTime:raceTime+Math.max(0,LAPS*TR.N-k.prog)*TR.SP/(k.vbase*.85));
  return karts.map((k,i)=>({k,t:est[i],real:k.finished})).sort((a,b)=>a.t-b.t);}
function screenResults(){state='done';$('#hud').hidden=true;const tid=TRACK_IDS[race.track];const tname=DATA.tracks[tid].name;
  if(race.mode==='tt'){const t=player.finishTime;const best=store.get('best-'+tid,null);let rec=false;
    if(!best||t<best){rec=true;store.set('best-'+tid,t);if(ghostRec&&ghostRec.f.length<6000)store.set('ghost-'+tid,ghostRec);}
    showOverlay(`<div class="panel"><p class="eyebrow">Tijdrit · ${tname}</p><h2>${fmt(t)}</h2>
     <table>${player.laps.map((l,i)=>`<tr><td class="n">${i+1}</td><td>Ronde ${i+1}</td><td class="r">${fmt(l)}</td></tr>`).join('')}</table>
     <p class="fine">${rec?'Nieuw record. Je ghost rijdt de volgende keer met je mee.':'Record: '+fmt(best)+'. Je ghost staat klaar.'}</p>
     <div class="navrow"><button class="back" id="bMenu">Menu</button><button class="btn primary" id="bAgain">Opnieuw</button></div></div>`);
    on('bMenu',screenTitle);on('bAgain',()=>startRace(race));return;}
  const order=finalOrder();
  if(race.mode==='gp'){order.forEach((o,i)=>{gp.last[o.k.id]=PTS[i]||0;gp.pts[o.k.id]+=PTS[i]||0;});}
  const myRank=order.findIndex(o=>o.k===player)+1;
  showOverlay(`<div class="panel"><p class="eyebrow">${tname}${race.mode==='gp'?` · race ${gp.race+1} van 4`:''}</p><h2>${myRank===1?'Gewonnen!':myRank+'e plaats'}</h2>
   <table>${order.map((o,i)=>`<tr class="${o.k===player?'me':''}"><td class="n">${i+1}</td><td><span class="dot" style="background:${o.k.color}"></span>${o.k.name}</td><td class="r">${o.real?fmt(o.t):'—'}</td>${race.mode==='gp'?`<td class="p">+${PTS[i]}</td>`:''}</tr>`).join('')}</table>
   <div class="navrow">${race.mode==='gp'?`<span></span><button class="btn primary" id="bStand">Klassement</button>`:`<button class="back" id="bMenu">Menu</button><button class="back" id="bTrack">Andere baan</button><button class="btn primary" id="bAgain">Opnieuw</button>`}</div></div>`);
  on('bStand',screenStandings);on('bMenu',screenTitle);on('bTrack',()=>{race={mode:'vs',cc:race.cc};screenTrack();});on('bAgain',()=>startRace(race));}
function screenStandings(){const rows=gp.roster.map((r,i)=>({i,pts:gp.pts[i],last:gp.last[i]})).sort((a,b)=>b.pts-a.pts||a.i-b.i);const last=gp.race>=TRACK_IDS.length-1;
  showOverlay(`<div class="panel"><p class="eyebrow">Diepbeker · na race ${gp.race+1}</p><h2>Klassement</h2>
   <table>${rows.map((r,j)=>`<tr class="${r.i===0?'me':''}"><td class="n">${j+1}</td><td><span class="dot" style="background:${CHARS[gp.roster[r.i].ci].kart}"></span>${CHARS[gp.roster[r.i].ci].name}</td><td class="r">+${r.last}</td><td class="p">${r.pts}</td></tr>`).join('')}</table>
   <div class="navrow"><button class="back" id="bQuit">Stoppen</button><button class="btn primary" id="bNext">${last?'Naar het podium':'Volgende: '+DATA.tracks[TRACK_IDS[gp.race+1]].name}</button></div></div>`);
  on('bQuit',()=>{gp=null;screenTitle();});on('bNext',()=>{if(last)screenPodium();else{gp.race++;startRace({mode:'gp',cc:gp.cc,track:gp.race});}});}
function screenPodium(){const rows=gp.roster.map((r,i)=>({i,pts:gp.pts[i]})).sort((a,b)=>b.pts-a.pts||a.i-b.i);const me=rows.findIndex(r=>r.i===0)+1;
  const cup=c=>`<svg viewBox="0 0 48 48"><path d="M14 6h20v8a10 10 0 0 1-20 0z" fill="${c}"/><path d="M14 9H8a6 6 0 0 0 6 8M34 9h6a6 6 0 0 1-6 8" fill="none" stroke="${c}" stroke-width="3"/><rect x="21" y="23" width="6" height="9" fill="${c}"/><rect x="14" y="32" width="20" height="6" rx="2" fill="${c}"/></svg>`;
  const col=['#ffcf3f','#c9ced3','#c7834a'];const pod=[1,0,2].map(j=>{const r=rows[j];const h=[110,140,90][[1,0,2].indexOf(j)];return`<div style="height:${h}px">${cup(col[j])}<span>${CHARS[gp.roster[r.i].ci].name}</span><b>${j+1}</b></div>`;}).join('');
  const title=me<=3?['Gouden','Zilveren','Bronzen'][me-1]+' Diepbeker!':me+'e in het klassement';
  showOverlay(`<div class="panel"><p class="eyebrow">Diepbeker · ${CCS[gp.cc].name}</p><h2>${title}</h2><div class="podium">${pod}</div>
   <p class="fine">${me<=3?'Gefeliciteerd. Probeer de volgende klasse.':'Volgende keer beter. Probeer een andere kart of een lagere klasse.'}</p>
   <div class="navrow"><span></span><button class="btn primary" id="bMenu">Naar het menu</button></div></div>`);
  if(gp){const k='cup-'+gp.cc;const prev=store.get(k,99);if(me<prev)store.set(k,me);}
  on('bMenu',()=>{gp=null;screenTitle();});}

/* ================= LOOP ================= */
let last=performance.now(),orbit=0,tAll=0;
const camPos=new THREE.Vector3(),camLook=new THREE.Vector3();
function frame(now){requestAnimationFrame(frame);let dt=Math.min(.05,(now-last)/1000);last=now;tAll+=dt;
  if(msgTimer>0){msgTimer-=dt;if(msgTimer<=0)$('#msg').classList.remove('show');}
  if(state==='menu'){orbit+=dt*.08;
    if(menuCam==='preview'&&preview){preview.g.rotation.y+=dt*.7;const p=preview.pos,gy=TR.hAt(6);preview.g.position.y=gy+.06;camera.position.set(p.x+Math.sin(orbit*2)*4.6,gy+2.1,p.z+Math.cos(orbit*2)*4.6);camera.lookAt(p.x,gy-(window.innerHeight>window.innerWidth?1.6:.6),p.z);
      preview.wheels.forEach(w=>w.wm.rotation.x+=dt*4);}
    else{const cx=(TR.minX+TR.maxX)/2,cz=(TR.minZ+TR.maxZ)/2,r=Math.max(TR.maxX-TR.minX,TR.maxZ-TR.minZ)*.55+60;camera.position.set(cx+Math.sin(orbit)*r,TR.base+r*.42,cz+Math.cos(orbit)*r);camera.lookAt(cx,TR.base+8,cz);}
    TR.boxes.forEach(b=>b.m.rotation.y+=dt);TR.coins.forEach(c=>c.m.rotation.y+=dt*3);
    render();return;}
  if(paused){render();return;}
  if(state==='loading'){loadT+=dt;sampleHeights(80);const p=player,gy=TR.hAt(p.idx);const hi=TR.calibrated&&TR.hPass>=1?0:1;camera.position.set(p.x-Math.sin(p.yaw)*(10+40*hi),gy+5+85*hi,p.z-Math.cos(p.yaw)*(10+40*hi));camera.lookAt(p.x,gy+1.5,p.z);
    const prog=tiles?Math.round(Math.min(!TR.calibrated?.2:TR.hPass>=1?1:.5+.5*TR.hI/TR.N,tiles.loadProgress||0)*100):0;const el=document.getElementById('loadPct');if(el)el.textContent=prog+'%';
    karts.forEach(k=>drawKart(k,tAll));if((TR.calibrated&&TR.hPass>=1&&tiles&&tiles.loadProgress>.9&&loadT>1.5)||loadT>30){state='intro';showOverlay(null);}render();return;}
  if(state==='intro'){introT-=dt;const p=player,gy=TR.hAt(p.idx);const f=clamp(1-introT/2.6,0,1),e=f*f*(3-2*f);const a=p.yaw+Math.PI*(1-e)*1.3;const dist=60*(1-e)+9*e,h=34*(1-e)+4.2*e;
    camera.position.set(p.x-Math.sin(a)*dist,gy+h,p.z-Math.cos(a)*dist);camera.lookAt(p.x,gy+1.6,p.z);if(introT<=0){state='count';showMsg('3',.8);beep(440,.18,'square',.07);lastBeep=3;}
    karts.forEach(k=>drawKart(k,tAll));render();return;}
  if(state==='count'){countT-=dt;const c=Math.ceil(countT);if(c<lastBeep&&c>=1&&c<=3){lastBeep=c;showMsg(String(c),.8);beep(440,.18,'square',.07);}
    if(countT<=0){state='race';showMsg('GA!',.8);beep(880,.35,'square',.08);
      karts.forEach(k=>{let sp=k.startPress;if(k.ai){const r=R();sp=r<.45?1.5:r<.52?2.6:null;}
        if(sp!=null){if(sp>2.05){k.stall=.9;if(k===player)showMsg('Verslikt!',.9,true);}else if(sp>.95){boostK(k,1.2);if(k===player)showMsg('Raketstart!',.9,true);}}});}}
  if(state==='race'||state==='done')raceTime+=dt;
  RANK=karts.slice().sort((a,b)=>{if(a.finished&&b.finished)return a.finishTime-b.finishTime;if(a.finished)return-1;if(b.finished)return 1;return b.prog-a.prog;});RANK.forEach((k,i)=>k.rank=i);
  for(const k of karts){const inp=(k.ai||k.autopilot)?aiControl(k,dt):playerInput();updateKart(k,dt,inp);}
  if(state==='race'||state==='done'){updatePickups(dt);updateProjectiles(dt);collide();}
  karts.forEach(k=>drawKart(k,tAll));
  // ghost
  if(race.mode==='tt'){if(state==='race'&&!player.finished){recT+=dt;while(recT>=.1){recT-=.1;ghostRec.f.push([+player.x.toFixed(2),+player.z.toFixed(2),+player.yaw.toFixed(3),+(TR.hAt(player.idx)+player.y).toFixed(2)]);}}
    if(ghostMesh&&ghost){const t=raceTime/.1,i=Math.floor(t),f=t-i,a=ghost.f[Math.min(i,ghost.f.length-1)],b=ghost.f[Math.min(i+1,ghost.f.length-1)];
      if(a&&b){ghostMesh.g.position.set(a[0]+(b[0]-a[0])*f,a[3]+(b[3]-a[3])*f+.1,a[1]+(b[1]-a[1])*f);ghostMesh.g.rotation.y=lerpA(a[2],b[2],f);}}}
  // finish → results
  if(finishTimer>0){finishTimer-=dt;if(finishTimer<=0&&state==='race')screenResults();}
  // camera
  const p=player;p.camYaw=lerpA(p.camYaw,p.moveYaw+wrapA(p.yaw-p.moveYaw)*.35,1-Math.exp(-dt*(p.spin>0?2:5)));
  const cy=p.camYaw+(lookBack?Math.PI:0),hiCam=settings.cam===1,dist=(hiCam?13:8.6)+Math.max(0,p.speed)*.04;
  const pgy=TR.hAt(p.idx)+p.y;camPos.set(p.x-Math.sin(cy)*dist,pgy+(hiCam?7.5:3.6)+Math.max(0,p.speed)*.02,p.z-Math.cos(cy)*dist);
  if(p.respawn>0)camPos.y+=2;
  camera.position.lerp(camPos,1-Math.exp(-dt*8));camLook.set(p.x+Math.sin(cy)*6,pgy+1.5,p.z+Math.cos(cy)*6);camera.lookAt(camLook);
  const tf=baseFov()+(p.boost>0?10:0)+Math.max(0,p.speed-20)*.15;camera.fov+=(tf-camera.fov)*Math.min(1,dt*4);camera.updateProjectionMatrix();
  if(eng&&AC){const t=AC.currentTime;eng.o.frequency.setTargetAtTime(48+Math.abs(p.speed)*3.2+(p.boost>0?30:0),t,.06);eng.g.gain.setTargetAtTime(settings.mute||state==='done'||p.respawn>0?0:.026,t,.1);}
  // HUD
  if(state!=='done'){setText('posN',String(p.rank+1));setText('lap',`Ronde ${clamp(Math.floor(p.prog/TR.N)+1,1,LAPS)}/${LAPS}`);setText('time',fmt1(raceTime));setText('coinN',String(p.coins));
    const lap=clamp(Math.floor(p.prog/TR.N)+1,1,LAPS);if(lap>(hudCache.lapShown||1)){showMsg(lap===LAPS?'Laatste ronde!':`Ronde ${lap}`,1.4,true);}hudCache.lapShown=Math.max(hudCache.lapShown||1,lap);
    setText('speed',String(Math.round(Math.max(0,p.speed)*3)));
    const st=TR.ST[p.idx];if(st!==streetShown){streetShown=st;$('#street').textContent=st;}
    if(p.roll>0){const key=ITEMKEYS[Math.floor(p.roll*14)%ITEMKEYS.length];setSlot(ICON[key],'roll'+key,false,0);}
    else if(p.item)setSlot(ICON[p.item],p.item+(p.trailing?'t':''),true,p.itemCount);else setSlot('','empty',false,0);
    $('#rain').style.opacity=String(clamp(p.inkT/1.2,0,1));
    drawMap();}
  sampleHeights(4);
  render();}
let attrT=0,keyErrShown=false;
function render(){camera.updateMatrixWorld();if(tiles){tiles.setCamera(camera);tiles.update();}
  if(state==='menu')sampleHeights(24);
  if(TR&&TR.calibrated&&!TR.logged){TR.logged=true;console.log('[Grunn Kart] straathoogte',TR.id,TR.base.toFixed(2),'m');}
  attrT-=1/60;if(attrT<=0&&tiles){attrT=1;const a=tiles.getAttributions?tiles.getAttributions():[];const txt=a.filter(x=>x.type==='string').map(x=>x.value).join(' ');$('#attrTxt').textContent=txt;}
  if(tilesError&&!keyErrShown){keyErrShown=true;screenKey('Google laadt het 3D-model niet met deze sleutel. Controleer of de Map Tiles API aan staat en of de sleutel dit adres toestaat. Melding: '+String(tilesError).slice(0,140));}
  renderer.render(scene,camera);}

/* ================= BOOT ================= */
resize();
$('#touch').hidden=!isTouch;
fetch('./groningen.json').then(r=>r.json()).then(d=>{DATA=d;buildCity();buildTrack(TRACK_IDS[0]);
  const key=store.get('key','');if(key){startTiles(key);screenTitle();}else screenKey('');
  window.__gk={get karts(){return karts;},get player(){return player;},get state(){return state;},get TR(){return TR;},get gp(){return gp;},startRace,screenResults,sel,setGP:g=>{gp=g;},makeRoster,
    get raceTime(){return raceTime;},DBG,collideCircle,inWater};
  requestAnimationFrame(frame);
}).catch(e=>{showOverlay(`<div class="panel"><h2>Laden mislukt</h2><p class="fine">De stratenkaart kon niet worden geladen (${String(e).slice(0,120)}). Ververs de pagina.</p></div>`);});
