/* ================= RENDERER + 3D BAG CITY ================= */
const canvas=$('#gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene();
const SKY=new THREE.Color('#a9d6e5');
scene.background=SKY;scene.fog=new THREE.Fog(SKY,180,700);
const camera=new THREE.PerspectiveCamera(68,1,0.3,1500);
const hemi=new THREE.HemisphereLight(0xeaf4ff,0x6b5a48,1.5);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0d6,2.6);sun.position.set(60,110,-40);scene.add(sun);scene.add(sun.target);
sun.castShadow=true;sun.shadow.bias=-0.0004;sun.shadow.normalBias=0.06;
const SH=sun.shadow.camera;SH.left=-90;SH.right=90;SH.top=90;SH.bottom=-90;SH.near=1;SH.far=400;
const baseFov=()=>window.innerWidth<window.innerHeight?80:66;
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=baseFov();camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);

const DEG=Math.PI/180;
let DATA=null,CITY=null;const tiles=null,tilesError=null;
const DETAIL=[{name:'Laag',pr:1,shadow:0,radius:80},{name:'Normaal',pr:1.25,shadow:1024,radius:120},{name:'Hoog',pr:1.5,shadow:2048,radius:170},{name:'Max',pr:2,shadow:4096,radius:230}];
const MAXANISO=renderer.capabilities.getMaxAnisotropy?renderer.capabilities.getMaxAnisotropy():1;
function applyDetail(){const d=DETAIL[settings.detail];renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,d.pr));resize();
  sun.castShadow=d.shadow>0;if(d.shadow){sun.shadow.mapSize.set(d.shadow,d.shadow);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}}
function startTiles(){}
// screenshot helper: window.__gkCam=[x,y,z,lookX,lookY,lookZ] pins the camera
function debugCam(){const c=window.__gkCam;if(c){camera.position.set(c[0],c[1],c[2]);camera.lookAt(c[3],c[4],c[5]);camera.updateMatrixWorld();}}
function probe(){return null;}

/* textures + shared materials (colour textures in sRGB) */
function canvasTex(w,h,draw,clampEdge,data){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=clampEdge?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;if(!data)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;return t;}
const TEX={
 pad:canvasTex(64,128,(g,w,h)=>{g.fillStyle='#ff7a1a';g.fillRect(0,0,w,h);g.fillStyle='#ffcf3f';for(let k=0;k<3;k++){const y=10+k*40;g.beginPath();g.moveTo(6,y+26);g.lineTo(w/2,y);g.lineTo(w-6,y+26);g.lineTo(w-6,y+38);g.lineTo(w/2,y+12);g.lineTo(6,y+38);g.closePath();g.fill();}},true),
 box:canvasTex(64,64,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#5ad19a');gr.addColorStop(1,'#1f7d55');g.fillStyle=gr;g.fillRect(0,0,w,h);g.strokeStyle='#f6f3ea';g.lineWidth=6;g.strokeRect(5,5,w-10,h-10);
  g.fillStyle='#f6f3ea';g.beginPath();const cx=w/2,cy=h/2;for(let k=0;k<8;k++){const r=k%2?7:20,a=k*Math.PI/4;g.lineTo(cx+Math.sin(a)*r,cy-Math.cos(a)*r);}g.closePath();g.fill();},true),
 chk:canvasTex(128,32,(g,w,h)=>{for(let y=0;y<4;y++)for(let x=0;x<16;x++){g.fillStyle=(x+y)%2?'#111':'#f6f3ea';g.fillRect(x*8,y*8,8,8);}}),
 ramp:canvasTex(64,64,(g,w,h)=>{g.fillStyle='#ff7a1a';g.fillRect(0,0,w,h);g.fillStyle='#ffcf3f';for(let y=0;y<h;y+=16)g.fillRect(0,y,w,8);}),
 shadow:canvasTex(64,64,(g,w,h)=>{const r=g.createRadialGradient(32,32,2,32,32,30);r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,w,h);},true),
 // street fallback (shown until the aerial photo has loaded, and if PDOK is unreachable)
 street:canvasTex(256,256,(g,w,h)=>{g.fillStyle='#8a8178';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=16)for(let x=(y/16%2)*8;x<w;x+=16){const v=120+Math.random()*40|0;g.fillStyle=`rgb(${v+10},${v},${v-8})`;g.fillRect(x+1,y+1,14,14);}}),
 roofTile:canvasTex(128,128,(g,w,h)=>{g.fillStyle='#efefef';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=32){g.fillStyle='rgba(0,0,0,.28)';g.fillRect(0,y+26,w,6);for(let x=(y/32%2)*16;x<w;x+=32){g.fillStyle='rgba(0,0,0,.14)';g.fillRect(x,y,2,26);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x+3,y+2,24,6);}}}),
 roofFlat:canvasTex(128,128,(g,w,h)=>{g.fillStyle='#e6e6e6';g.fillRect(0,0,w,h);for(let i=0;i<1600;i++){const v=170+Math.random()*80|0;g.fillStyle=`rgb(${v},${v},${v})`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}g.fillStyle='rgba(0,0,0,.18)';g.fillRect(0,0,w,3);g.fillRect(0,0,3,h);})};
const DS=THREE.DoubleSide;
const MAT={
 rampSide:new THREE.MeshLambertMaterial({color:'#ff7a1a',side:DS}),
 ramp:new THREE.MeshLambertMaterial({map:TEX.ramp,side:DS}),
 pad:new THREE.MeshBasicMaterial({map:TEX.pad,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6}),
 box:new THREE.MeshBasicMaterial({map:TEX.box,transparent:true,opacity:.9}),
 coin:new THREE.MeshLambertMaterial({color:'#ffcf3f',emissive:'#5a3a00'}),
 chk:new THREE.MeshBasicMaterial({map:TEX.chk,polygonOffset:true,polygonOffsetFactor:-6,polygonOffsetUnits:-6})};
function disposeTree(o){o.traverse(c=>{if(c.geometry)c.geometry.dispose();});}

/* ---- facade atlas: 5 styles (columns) x ground floor / upper floor (rows), one 3 m bay per cell ---- */
const FCELL=256;
function drawFacades(g,mask){const W=FCELL;
  const R=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h);};
  for(let s=0;s<6;s++)for(let row=0;row<2;row++){const X=s*W,Y=(1-row)*W; // row 1 (upper) is drawn at the top of the canvas
    const wall=mask?'#ffffff':'#f2eee8';const win=mask?'#000':'#2c3a44',frame=mask?'#000':'#f4f1ea',glass2=mask?'#000':'#3d5463';
    R(X,Y,W,W,wall);
    if(!mask){ // wall material texture
      if(s===0){for(let y=0;y<W;y+=8){g.fillStyle='rgba(0,0,0,.09)';g.fillRect(X,Y+y,W,1);for(let x=((y/8)%2)*12;x<W;x+=24)g.fillRect(X+x,Y+y,1,8);}}
      if(s===1){g.fillStyle='rgba(0,0,0,.05)';for(let i=0;i<300;i++)g.fillRect(X+Math.random()*W,Y+Math.random()*W,2,2);g.fillStyle='rgba(0,0,0,.12)';g.fillRect(X,Y,W,10);}
      if(s===2){g.fillStyle='rgba(0,0,0,.08)';for(let y=0;y<W;y+=64)g.fillRect(X,Y+y,W,2);for(let x=0;x<W;x+=128)g.fillRect(X+x,Y,2,W);}
      if(s===4){for(let y=0;y<W;y+=21){g.fillStyle='rgba(0,0,0,.12)';g.fillRect(X,Y+y,W,2);for(let x=((y/21)%2)*24;x<W;x+=48)g.fillRect(X+x,Y+y,2,21);}}
    }
    if(s===0||s===1){ // Groningen canal house: tall sash windows, white frames
      if(row===1){R(X+70,Y+40,116,170,frame);R(X+80,Y+50,96,72,win);R(X+80,Y+130,96,72,win);R(X+70,Y+124,116,6,frame);R(X+126,Y+50,4,152,frame);
        if(s===1){R(X+60,Y+28,136,10,mask?'#000':'#e0dbd0');}}
      else{R(X+28,Y+36,200,176,frame);R(X+38,Y+46,180,120,glass2);R(X+38,Y+172,180,30,win);R(X+28,Y+212,200,8,mask?'#000':'#6b5b4b');if(!mask){g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.moveTo(X+50,Y+160);g.lineTo(X+120,Y+50);g.lineTo(X+150,Y+50);g.lineTo(X+80,Y+160);g.fill();}}}
    else if(s===2){ // post-war: horizontal window bands
      if(row===1){R(X,Y+70,W,110,frame);R(X,Y+80,W,90,win);for(let x=0;x<W;x+=64)R(X+x,Y+80,5,90,frame);}
      else{R(X,Y+40,W,170,frame);R(X,Y+50,W,150,glass2);for(let x=0;x<W;x+=128)R(X+x,Y+50,6,150,frame);}}
    else if(s===3){ // modern glass
      R(X,Y,W,W,glass2);for(let x=0;x<W;x+=85)R(X+x,Y,6,W,mask?'#000':'#cfd6da');R(X,Y,W,8,mask?'#000':'#cfd6da');
      if(!mask){const gr=g.createLinearGradient(X,Y,X+W,Y+W);gr.addColorStop(0,'rgba(255,255,255,.22)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(X,Y,W,W);}}
    else if(s===5){ // sociëteit Mutua Fides: ornamental brickwork, tall bronze-framed windows, stone plinth
      const brz=mask?'#000':'#4a3a2c',gl=mask?'#000':'#26323a',stone=mask?'#000':'#d8d0c0',rev=mask?'#fff':'rgba(0,0,0,.28)';
      if(!mask){for(let y=0;y<W;y+=7){g.fillStyle='rgba(0,0,0,.10)';g.fillRect(X,Y+y,W,1);for(let x=((y/7)%2)*11;x<W;x+=22)g.fillRect(X+x,Y+y,1,7);}
        // soldier course + diamond relief band at the top of every storey, pilaster strips at the bay edges
        g.fillStyle='rgba(0,0,0,.16)';for(let x=0;x<W;x+=8)g.fillRect(X+x,Y+4,1,16);g.fillRect(X,Y+20,W,2);
        g.fillStyle='rgba(255,255,255,.08)';for(let x=8;x<W;x+=32){g.beginPath();g.moveTo(X+x,Y+28);g.lineTo(X+x+8,Y+34);g.lineTo(X+x,Y+40);g.lineTo(X+x-8,Y+34);g.fill();}
        g.fillStyle='rgba(0,0,0,.12)';g.fillRect(X,Y,10,W);g.fillRect(X+W-10,Y,10,W);}
      if(row===1){R(X+62,Y+50,132,196,rev);R(X+70,Y+54,116,188,brz);R(X+78,Y+62,100,82,gl);R(X+78,Y+152,100,82,gl);
        if(!mask){g.fillStyle='rgba(255,255,255,.12)';g.fillRect(X+84,Y+66,22,74);}}
      else{R(X+40,Y+30,176,200,rev);R(X+46,Y+34,164,192,brz);R(X+54,Y+42,148,176,gl);R(X,Y+226,W,30,stone);
        if(!mask){g.fillStyle='rgba(255,220,150,.10)';g.fillRect(X+54,Y+42,148,176);}}}
    else{ // stone / church: narrow arched windows
      const ax=X+98,aw=60;R(ax,Y+60,aw,150,win);g.fillStyle=win;g.beginPath();g.arc(ax+aw/2,Y+60,aw/2,Math.PI,0);g.fill();R(ax+aw/2-2,Y+30,4,180,mask?'#000':'#5a5148');}
  }}
let facadeMat=null;
function makeFacadeMaterial(){
  const atlas=canvasTex(FCELL*6,FCELL*2,(g)=>drawFacades(g,false));atlas.wrapS=atlas.wrapT=THREE.ClampToEdgeWrapping;
  const mask=canvasTex(FCELL*6,FCELL*2,(g)=>drawFacades(g,true),true,true);
  const m=new THREE.MeshLambertMaterial({color:0xffffff,side:DS});
  m.onBeforeCompile=sh=>{sh.uniforms.gkAtlas={value:atlas};sh.uniforms.gkMask={value:mask};
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec2 fuv;attribute vec4 gkc;varying vec2 vFuv;varying vec3 vTint;varying float vStyle;')
      .replace('#include <uv_vertex>','#include <uv_vertex>\nvFuv=fuv;vTint=pow(gkc.rgb,vec3(2.2));vStyle=floor(gkc.a*255.0+0.5);');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D gkAtlas;uniform sampler2D gkMask;varying vec2 vFuv;varying vec3 vTint;varying float vStyle;')
      .replace('#include <map_fragment>',`
        vec2 cell=fract(vFuv);float row=vFuv.y<1.0?0.0:1.0;
        vec2 auv=vec2((vStyle+cell.x*0.96+0.02)/6.0,(row+cell.y*0.96+0.02)/2.0);
        vec2 gx=dFdx(vFuv)/vec2(6.0,2.0),gy=dFdy(vFuv)/vec2(6.0,2.0);
        vec4 ft=textureGrad(gkAtlas,auv,gx,gy);float fm=textureGrad(gkMask,auv,gx,gy).r;
        diffuseColor.rgb*=mix(ft.rgb,ft.rgb*vTint*1.15,fm);`);};
  return m;}

/* ---- load the 3D BAG city (quantised buffers) ---- */
const cityGroup=new THREE.Group();scene.add(cityGroup);
let cityReady=false;
async function loadCity(){
  const meta=await (await fetch('./city.json')).json();const buf=await (await fetch('./city.bin')).arrayBuffer();
  const c=meta.center,pq=meta.pq;
  const mk=(L,kind)=>{const n=L.count;const p16=new Int16Array(buf,L.pos,n*3),uv16=new Int16Array(buf,L.uv,n*2),col=new Uint8Array(buf,L.col,n*4),idx=new Uint32Array(buf,L.idx,L.index);
    const pos=new Float32Array(n*3);for(let i=0;i<n;i++){pos[3*i]=p16[3*i]*pq+c[0];pos[3*i+1]=p16[3*i+1]*pq+c[1];pos[3*i+2]=p16[3*i+2]*pq+c[2];}
    const uv=new Float32Array(n*2);for(let i=0;i<n*2;i++)uv[i]=uv16[i]/128;
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setIndex(new THREE.BufferAttribute(new Uint32Array(idx),1));
    if(kind==='wall'){g.setAttribute('fuv',new THREE.BufferAttribute(uv,2));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.setAttribute('gkc',new THREE.BufferAttribute(new Uint8Array(col),4,true));}
    else{g.setAttribute('uv',new THREE.BufferAttribute(uv,2));const cc=new Float32Array(n*3);for(let i=0;i<n;i++)for(let k=0;k<3;k++)cc[3*i+k]=Math.pow(col[4*i+k]/255,2.2);g.setAttribute('color',new THREE.BufferAttribute(cc,3));}
    g.computeVertexNormals();g.computeBoundingSphere();return g;};
  facadeMat=makeFacadeMaterial();
  const walls=new THREE.Mesh(mk(meta.layout.walls,'wall'),facadeMat);
  const rp=new THREE.Mesh(mk(meta.layout.roofPitched,'roof'),new THREE.MeshLambertMaterial({map:TEX.roofTile,vertexColors:true,side:DS}));
  const rf=new THREE.Mesh(mk(meta.layout.roofFlat,'roof'),new THREE.MeshLambertMaterial({map:TEX.roofFlat,vertexColors:true,side:DS}));
  [walls,rp,rf].forEach(m=>{m.castShadow=true;m.receiveShadow=true;cityGroup.add(m);});
  buildGround(meta);buildProps(meta);if(meta.vindicat)buildVindicat(meta.vindicat);
  CITY=meta;cityReady=true;}

/* ---- terrain + PDOK aerial photo ---- */
let GRID=null;
function groundH(x,z){const G=GRID;if(!G)return 0;const fx=clamp((x-G.x0)/G.step,0,G.nx-1.001),fz=clamp((z-G.z0)/G.step,0,G.nz-1.001);const i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j;
  const h=(a,b)=>G.h[b*G.nx+a];return (h(i,j)*(1-u)+h(i+1,j)*u)*(1-v)+(h(i,j+1)*(1-u)+h(i+1,j+1)*u)*v;}
const aerial={hi:new Map(),lo:[],loader:new THREE.TextureLoader(),active:0,fails:0,ok:0,queue:[]};
aerial.loader.setCrossOrigin('anonymous');
function rd2g(X,Y){const a=CITY?CITY.affine:aerial.aff;return[a[0][0]*X+a[0][1]*Y+a[0][2],a[1][0]*X+a[1][1]*Y+a[1][2]];}
function tileMesh(level,col,row,span,y0,mat){const TL=aerial.pd.tl,X0=TL[0]+col*span,Y0=TL[1]-row*span;const S=4,pos=[],uv=[],idx=[];
  for(let j=0;j<=S;j++)for(let i=0;i<=S;i++){const X=X0+span*i/S,Y=Y0-span*j/S;const [gx,gz]=rd2g(X,Y);pos.push(gx,groundH(gx,gz)+y0,gz);uv.push(i/S,1-j/S);}
  for(let j=0;j<S;j++)for(let i=0;i<S;i++){const a=j*(S+1)+i;idx.push(a,a+S+1,a+1,a+1,a+S+1,a+S+2);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const m=new THREE.Mesh(g,mat);m.receiveShadow=true;const [cx,cz]=rd2g(X0+span/2,Y0-span/2);m.userData.c={x:cx,z:cz};return m;}
function tileUrl(level,col,row){return aerial.pd.url.replace('{z}',level).replace('{x}',col).replace('{y}',row);}
function loadTex(url,cb){aerial.active++;aerial.loader.load(url,t=>{aerial.active--;aerial.ok++;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=MAXANISO;cb(t);pumpAerial();},undefined,()=>{aerial.active--;aerial.fails++;pumpAerial();});}
function buildGround(meta){GRID=meta.grid;aerial.pd=meta.pdok;aerial.aff=meta.affine;
  // base terrain everywhere (cobbles), raised by the height grid
  const G=GRID,pos=[],uv=[],idx=[];for(let j=0;j<G.nz;j++)for(let i=0;i<G.nx;i++){const x=G.x0+i*G.step,z=G.z0+j*G.step;pos.push(x,G.h[j*G.nx+i]-.05,z);uv.push(x/4,z/4);}
  for(let j=0;j<G.nz-1;j++)for(let i=0;i<G.nx-1;i++){const a=j*G.nx+i;idx.push(a,a+G.nx,a+1,a+1,a+G.nx,a+G.nx+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const base=new THREE.Mesh(g,new THREE.MeshLambertMaterial({map:TEX.street,side:DS}));base.receiveShadow=true;cityGroup.add(base);
  const far=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000).rotateX(-Math.PI/2),new THREE.MeshLambertMaterial({color:'#7d8a6a'}));far.position.y=G.h[0]-1.5;cityGroup.add(far);
  // coarse aerial photo (0.84 m/px) over the whole area
  meta.pdok.lo.tiles.forEach(([c,r])=>{const mat=new THREE.MeshLambertMaterial({color:0xffffff,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,transparent:true,opacity:0});
    const L=meta.pdok.lo.level;const m=tileMesh(L,c,r,meta.pdok.lo.span,.0,mat);cityGroup.add(m);aerial.lo.push(m);
    loadTex(tileUrl(L,c,r),t=>{mat.map=t;mat.opacity=1;mat.transparent=false;mat.needsUpdate=true;});});
  // sharp aerial photo (10 cm/px) along the routes, streamed around the camera
  meta.pdok.hi.tiles.forEach(([c,r])=>{const key=c+','+r;aerial.hi.set(key,{c,r,mesh:null,state:0});});}
const _cam=new THREE.Vector3();
function pumpAerial(){if(!aerial.pd)return;const R=DETAIL[settings.detail].radius;const cp=camera.position;
  // load the closest missing tiles first, at most 6 at a time
  if(aerial.active<6){let best=null,bd=1e18;for(const t of aerial.hi.values()){if(t.state!==0)continue;if(!t.cx){const TL=aerial.pd.tl,s=aerial.pd.hi.span;const [x,z]=rd2g(TL[0]+(t.c+.5)*s,TL[1]-(t.r+.5)*s);t.cx=x;t.cz=z;}
      const d=(t.cx-cp.x)**2+(t.cz-cp.z)**2;if(d<R*R&&d<bd){bd=d;best=t;}}
    if(best){best.state=1;loadTex(tileUrl(15,best.c,best.r),tex=>{const mat=new THREE.MeshLambertMaterial({map:tex,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
      best.mesh=tileMesh(15,best.c,best.r,aerial.pd.hi.span,.0,mat);cityGroup.add(best.mesh);best.state=2;});if(aerial.active<6)pumpAerial();}}}
function unloadFarAerial(){const R=DETAIL[settings.detail].radius*1.8,cp=camera.position;for(const t of aerial.hi.values()){if(t.state===2&&t.cx!=null&&((t.cx-cp.x)**2+(t.cz-cp.z)**2)>R*R){cityGroup.remove(t.mesh);t.mesh.geometry.dispose();t.mesh.material.map.dispose();t.mesh.material.dispose();t.mesh=null;t.state=0;}}}
function aerialNearReady(){if(!aerial.pd)return false;const cp=camera.position;let need=0,have=0;for(const t of aerial.hi.values()){if(t.cx==null)continue;if((t.cx-cp.x)**2+(t.cz-cp.z)**2<60*60){need++;if(t.state===2)have++;}}
  return aerial.fails>20&&aerial.ok===0?true:need===0||have>=need*.8;}

/* ---- props: trees, benches, bike racks (from OpenStreetMap) ---- */
function buildProps(meta){const P=meta.props||{tree:[],bench:[],bike:[]};const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),pv=new THREE.Vector3(),sc=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),col=new THREE.Color();
  const tr=P.tree;if(tr.length){const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.28,3.2,7).translate(0,1.6,0),new THREE.MeshLambertMaterial({color:'#5a4232'}),tr.length);
    const crown=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(2.6,1),new THREE.MeshLambertMaterial({color:'#ffffff'}),tr.length);
    tr.forEach((t,i)=>{const s=.8+((i*7919)%100)/100*.6;m4.makeTranslation(t[0],t[2],t[1]);trunk.setMatrixAt(i,m4);q.setFromAxisAngle(up,i);pv.set(t[0],t[2]+3.4+s*1.6,t[1]);sc.set(s,s*1.15,s);m4.compose(pv,q,sc);crown.setMatrixAt(i,m4);
      col.setHSL(.26+((i*31)%10)/120,.42,.27+((i*13)%10)/90);crown.setColorAt(i,col);});
    trunk.castShadow=crown.castShadow=true;crown.receiveShadow=true;cityGroup.add(trunk);cityGroup.add(crown);}
  const bn=P.bench;if(bn.length){const seat=new THREE.InstancedMesh(new THREE.BoxGeometry(1.8,.12,.5).translate(0,.45,0),new THREE.MeshLambertMaterial({color:'#7a5532'}),bn.length);
    bn.forEach((b,i)=>{q.setFromAxisAngle(up,i*1.3);pv.set(b[0],b[2],b[1]);sc.set(1,1,1);m4.compose(pv,q,sc);seat.setMatrixAt(i,m4);});seat.castShadow=true;cityGroup.add(seat);}
  const bk=P.bike;if(bk.length){const n=bk.length*6;const wheel=new THREE.InstancedMesh(new THREE.TorusGeometry(.33,.03,6,16),new THREE.MeshLambertMaterial({color:'#1b1d20'}),n*2);
    const frame=new THREE.InstancedMesh(new THREE.BoxGeometry(.05,.05,1).translate(0,.55,0),new THREE.MeshLambertMaterial({color:'#ffffff'}),n);let wi=0;
    bk.forEach((b,i)=>{for(let k=0;k<6;k++){const yaw=i*.7,ox=Math.cos(yaw)*(k-2.5)*.7,oz=-Math.sin(yaw)*(k-2.5)*.7;q.setFromAxisAngle(up,yaw+Math.PI/2);
      for(const s of[-.5,.5]){pv.set(b[0]+ox+Math.sin(yaw+Math.PI/2)*s,b[2]+.34,b[1]+oz+Math.cos(yaw+Math.PI/2)*s);sc.set(1,1,1);m4.compose(pv,q.clone().multiply(new THREE.Quaternion().setFromAxisAngle(up,Math.PI/2)),sc);wheel.setMatrixAt(wi++,m4);}
      pv.set(b[0]+ox,b[2],b[1]+oz);m4.compose(pv,q,sc);frame.setMatrixAt(i*6+k,m4);col.setHSL(((i*6+k)*.17)%1,.5,.45);frame.setColorAt(i*6+k,col);}});
    cityGroup.add(wheel);cityGroup.add(frame);}}


/* ---- the kart road: crisp asphalt with kerbs along the route, plus chevron boards in sharp corners ---- */
TEX.asphalt=canvasTex(256,512,(g,w,h)=>{g.fillStyle='#45474d';g.fillRect(0,0,w,h);for(let i=0;i<9000;i++){const v=50+Math.random()*55|0;g.fillStyle=`rgba(${v},${v},${v+4},.55)`;g.fillRect(Math.random()*w,Math.random()*h,2,2);}
  g.fillStyle='#f3f1ea';g.fillRect(10,0,9,h);g.fillRect(w-19,0,9,h);g.fillStyle='rgba(243,241,234,.85)';g.fillRect(w/2-4,0,8,h*.4);});
TEX.kerb=canvasTex(64,128,(g,w,h)=>{g.fillStyle='#e8e4dc';g.fillRect(0,0,w,h);g.fillStyle='#d63a3a';g.fillRect(0,0,w,h/2);g.fillStyle='rgba(0,0,0,.18)';g.fillRect(w-6,0,6,h);});
TEX.chev=canvasTex(256,96,(g,w,h)=>{g.fillStyle='#d63a3a';g.fillRect(0,0,w,h);g.fillStyle='#f6f3ea';for(let k=0;k<3;k++){const x=30+k*72;g.beginPath();g.moveTo(x,10);g.lineTo(x+40,h/2);g.lineTo(x,h-10);g.lineTo(x+20,h-10);g.lineTo(x+60,h/2);g.lineTo(x+20,10);g.closePath();g.fill();}},true);
function buildKartRoad(tr){const N=tr.N,P=tr.P,NR=tr.NR,D=tr.D,LEN=tr.LEN;
  // width follows the real street, between 2.2 and 5.5 m on each side, smoothed
  const raw=(a)=>Float32Array.from(a,v=>clamp(v-.4,2.2,5.5));const sm=a=>{const o=new Float32Array(N);for(let i=0;i<N;i++){let s=0;for(let k=-6;k<=6;k++)s+=a[(i+k+N)%N];o[i]=s/13;}return o;};
  const WL=sm(raw(tr.fL)),WR=sm(raw(tr.fR));tr.roadL=WL;tr.roadR=WR;
  const strip=(o1,o2,dy,mat,rep,u0,u1)=>{const pos=[],uv=[],idx=[];const reps=Math.max(1,Math.round(LEN/rep));
    for(let i=0;i<=N;i++){const ii=i%N,p=P[ii],n=NR[ii],a=o1(ii),b=o2(ii),y=tr.hAt(ii)+dy;pos.push(p.x+n.x*a,y,p.z+n.z*a,p.x+n.x*b,y,p.z+n.z*b);const v=D[i]/LEN*reps;uv.push(u0,v,u1,v);if(i<N){const q=i*2;idx.push(q,q+2,q+1,q+1,q+2,q+3);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,mat);m.receiveShadow=true;tr.group.add(m);return m;};
  const road=new THREE.MeshLambertMaterial({map:TEX.asphalt,side:DS,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
  const kerb=new THREE.MeshLambertMaterial({map:TEX.kerb,side:DS,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});tr.ownMats.push(road,kerb);
  strip(i=>-WL[i],i=>WR[i],.04,road,10,0,1);
  strip(i=>-WL[i]-.7,i=>-WL[i],.06,kerb,2,0,1);strip(i=>WR[i],i=>WR[i]+.7,.06,kerb,2,1,0);
  // chevron boards on the outside of sharp corners
  const cm=new THREE.MeshLambertMaterial({map:TEX.chev,side:DS});const pm=new THREE.MeshLambertMaterial({color:'#2b2f33'});tr.ownMats.push(cm,pm);
  let last=-99;for(let i=0;i<N;i+=2){const turn=wrapA(tr.ANG[(i+14)%N]-tr.ANG[i]);if(Math.abs(turn)<.75||i-last<10)continue;last=i;
    const j=(i+10)%N;const rs=Math.sign(NR[j].x*-Math.cos(tr.ANG[j])+NR[j].z*Math.sin(tr.ANG[j]))||1; // +1 when s>0 is the driver's right
    const offR=rs>0?WR[j]+1.2:-(WL[j]+1.2),offL=rs>0?-(WL[j]+1.2):WR[j]+1.2;const side=turn>0?-1:1; // left turn (yaw +): board on the right, arrows pointing left
    const off=turn>0?offR:offL,p=P[j],n=NR[j];const x=p.x+n.x*off,z=p.z+n.z*off,y=tr.hAt(j);
    const b=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1),cm);b.position.set(x,y+1.5,z);b.rotation.y=tr.ANG[j]+Math.PI;if(side<0)b.scale.x=-1;tr.group.add(b);
    for(const s of[-1,1]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1.5,6),pm);post.position.set(x+tr.T[j].x*0+Math.cos(tr.ANG[j])*s*1.1,y+.75,z-Math.sin(tr.ANG[j])*s*1.1);tr.group.add(post);}}
}

/* ---- sociëteit Mutua Fides (Vindicat), Grote Markt oostzijde: entrance, name, balcony and lanterns on the market facade ---- */
function buildVindicat(v){const g=new THREE.Group();const a=v.a,b=v.b,n=v.n;const L=Math.hypot(b[0]-a[0],b[1]-a[1]);const tx=(b[0]-a[0])/L,tz=(b[1]-a[1])/L;
  const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,y0=v.mv,fh=v.floorH;
  // local frame: x along the facade, z out towards the market
  g.position.set(mx,y0,mz);g.rotation.y=Math.atan2(n[0],n[1]);
  const M=c=>new THREE.MeshLambertMaterial({color:c});const stone=M('#d8d0c0'),wood=M('#3b2618'),metal=M('#2a2622'),gold=new THREE.MeshPhongMaterial({color:'#d4a63a',shininess:90,specular:0xffffff});
  const box=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
  // monumental entrance with stone surround, double doors and steps
  box(4.2,.35,.5,stone,0,4.4,.25);box(.45,4.4,.5,stone,-1.9,2.2,.25);box(.45,4.4,.5,stone,1.9,2.2,.25);
  box(3.3,4.0,.12,wood,0,2.0,.06);box(.05,3.6,.14,metal,0,2.0,.13);for(const s of[-1,1])box(.06,.5,.08,gold,s*.25,1.6,.17);
  box(5,.16,.9,stone,0,.08,.45);box(4.4,.16,.55,stone,0,.24,.3);
  // name above the door
  const sg=canvasTex(1024,128,(c,w,h)=>{c.fillStyle='#1f1a16';c.fillRect(0,0,w,h);c.fillStyle='#d4a63a';c.font='600 84px Georgia,"Times New Roman",serif';c.textAlign='center';c.textBaseline='middle';c.fillText('MUTUA FIDES',w/2,h/2+4,w-60);},true);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(5.6,.7),new THREE.MeshBasicMaterial({map:sg}));sign.position.set(0,5.1,.52);g.add(sign);
  // balcony overlooking the Grote Markt
  const by=fh*2+.1;box(Math.min(10,L*.42),.28,1.5,stone,0,by,.75);
  for(let i=0;i<=24;i++){const x=-Math.min(10,L*.42)/2+.2+i*(Math.min(10,L*.42)-.4)/24;box(.05,1.05,.05,metal,x,by+.66,1.42);}
  box(Math.min(10,L*.42),.07,.08,metal,0,by+1.18,1.42);for(const s of[-1,1])box(.07,1.05,1.45,metal,s*Math.min(10,L*.42)/2,by+.66,.75);
  // lanterns by the door
  const glow=new THREE.MeshBasicMaterial({color:'#ffd98a'});for(const s of[-1,1]){box(.08,.5,.25,metal,s*2.6,3.2,.15);const l=new THREE.Mesh(new THREE.BoxGeometry(.32,.5,.32),glow);l.position.set(s*2.6,3.05,.38);g.add(l);box(.4,.06,.4,metal,s*2.6,3.33,.38);}
  // cornice under the penthouse
  box(L*.98,.35,.4,stone,0,(v.top-v.mv)-3.6,.2);
  cityGroup.add(g);}
