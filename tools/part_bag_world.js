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
    else if(s===5){ // sociëteit Mutua Fides: light grey-brown brick, white stone window surrounds
      const wf=mask?'#000':'#ecebe6',gl=mask?'#000':'#4d6070';
      if(!mask){for(let y=0;y<W;y+=6){g.fillStyle='rgba(0,0,0,.07)';g.fillRect(X,Y+y,W,1);for(let x=((y/6)%2)*9;x<W;x+=18)g.fillRect(X+x,Y+y,1,6);}
        for(let i=0;i<500;i++){g.fillStyle=Math.random()<.5?'rgba(60,45,35,.10)':'rgba(255,255,255,.10)';g.fillRect(X+((Math.random()*W/18)|0)*18,Y+((Math.random()*W/6)|0)*6,17,5);}}
      if(row===1){R(X+60,Y+46,136,180,wf);R(X+76,Y+62,104,148,gl);R(X+126,Y+62,4,148,wf);R(X+76,Y+134,104,4,wf);}
      else{R(X+30,Y+30,196,196,wf);R(X+42,Y+42,172,184,gl);R(X+126,Y+42,4,184,wf);}}
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

/* ---- sociëteit Mutua Fides (Vindicat), Grote Markt oostzijde (2014), modelled after a photo of the market facade ---- */
// facade layout in fractions: u = 0 (left, towards the Martinitoren) .. 1 (right, entrance); v = 0 (street) .. 1 (parapet)
const VF={ground:.215,balcony:.235,f1:[.30,.475],f2:[.52,.835],f3:[.705,.835],band:[.872,.915],top:[.932,.985],
  entranceU:[.665,.995],leftBays:[.045,.125,.205,.285,.37,.455,.545],rightCols:[.715,.82,.925]};
function paintVindicat(c,W,H){const U=u=>u*W, V=v=>H-v*H; // canvas y grows downward
  // brick: mixed grey-brown waal format, light joints
  c.fillStyle='#d9d2c8';c.fillRect(0,0,W,H);const bw=W/120,bh=H/(19.8/.068);
  const tones=['#8f8073','#9a8a7c','#85776b','#a39484','#7c6e64','#988474','#8a7d74','#a8998b','#6f625a'];
  for(let r=0,y=0;y<H;r++,y+=bh){for(let x=-(r%2)*bw/2;x<W;x+=bw){c.fillStyle=tones[(Math.random()*tones.length)|0];c.fillRect(x+.6,y+.6,bw-1.2,bh-1.2);}}
  const shade=(x,y,w,h,a)=>{c.fillStyle=`rgba(0,0,0,${a})`;c.fillRect(x,y,w,h);};
  const glass=(x,y,w,h,dark)=>{const gr=c.createLinearGradient(x,y,x+w*.4,y+h);gr.addColorStop(0,dark?'#2b343b':'#8ea4b6');gr.addColorStop(.55,dark?'#3c4a55':'#5c7184');gr.addColorStop(1,dark?'#1f262c':'#3e4f5e');c.fillStyle=gr;c.fillRect(x,y,w,h);
    c.fillStyle='rgba(255,255,255,.10)';c.beginPath();c.moveTo(x+w*.1,y+h);c.lineTo(x+w*.55,y);c.lineTo(x+w*.75,y);c.lineTo(x+w*.3,y+h);c.fill();};
  const win=(u0,u1,v0,v1,frame,mullion,transom)=>{const x=U(u0),y=V(v1),w=U(u1)-x,h=V(v0)-y;glass(x,y,w,h);c.fillStyle=frame;const t=Math.max(2,w*.035);
    c.fillRect(x,y,w,t);c.fillRect(x,y+h-t,w,t);c.fillRect(x,y,t,h);c.fillRect(x+w-t,y,t,h);if(mullion)c.fillRect(x+w/2-t/2,y,t,h);if(transom)c.fillRect(x,y+h*transom,w,t);};
  const piers=(u0,u1)=>{c.fillStyle='rgba(0,0,0,.18)';c.fillRect(U(u0)-2,0,3,H);c.fillStyle='rgba(255,255,255,.10)';c.fillRect(U(u1),0,3,H);};
  // ground floor: tall glass shopfronts between brick piers, dark plinth
  c.fillStyle='#6d665f';c.fillRect(0,V(.02),U(VF.entranceU[0]),H-V(.02));
  VF.leftBays.forEach(bu=>{const hw=.032;win(bu-hw,bu+hw,.02,VF.ground-.012,'#2c2a28',true,.18);shade(U(bu-hw)-2,V(VF.ground-.012),U(2*hw)+4,6,.35);piers(bu-hw,bu+hw);});
  // first floor above the balcony: white-framed windows, 2x2 panes
  VF.leftBays.forEach(bu=>win(bu-.028,bu+.028,VF.f1[0],VF.f1[1],'#ecebe6',true,.5));
  // floors 2-3 left: three deep loggias, then tall slender windows
  VF.leftBays.forEach((bu,i)=>{if(i<3){const x=U(bu-.034),y=V(VF.f2[1]),w=U(.068),h=V(VF.f2[0])-y;
      const gr=c.createLinearGradient(x,y,x,y+h);gr.addColorStop(0,'#3a3029');gr.addColorStop(1,'#5a4b40');c.fillStyle=gr;c.fillRect(x,y,w,h);
      c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x,y,w,h*.08);c.fillRect(x,y,w*.12,h);
      glass(x+w*.22,y+h*.12,w*.62,h*.84,true);c.fillStyle='#d8d6cf';c.fillRect(x+w*.22,y+h*.53,w*.62,2);
      c.fillStyle='#24211e';for(let k=0;k<=8;k++)c.fillRect(x+w*.05+k*w*.11,y+h*.78,2,h*.2);c.fillRect(x+w*.05,y+h*.78,w*.9,3);}
    else win(bu-.022,bu+.022,VF.f2[0]+.02,VF.f2[1]-.005,'#d4d2cb',false,.48);});
  // right part: windows on three floors (the white stone surrounds are added in 3D), emblem panel in the middle column
  VF.rightCols.forEach((cu,k)=>{win(cu-.035,cu+.035,VF.f1[0],VF.f1[1]-.02,'#ecebe6',true,.5);
    win(cu-.035,cu+.035,VF.f2[0]+.005,.665,'#ecebe6',true,.5);win(cu-.035,cu+.035,VF.f3[0],VF.f3[1]-.005,'#ecebe6',true,.5);});
  // top storey above the white band: small windows across the facade
  for(let u=.04;u<.98;u+=.0875)win(u,u+.045,VF.top[0],VF.top[1]-.01,'#ecebe6',false,0);
  // entrance block (white stone) on the right
  c.fillStyle='#ebe8e1';c.fillRect(U(VF.entranceU[0]),V(VF.balcony),U(VF.entranceU[1]-VF.entranceU[0]),V(0)-V(VF.balcony));
  const lg=c.createLinearGradient(0,0,W,H);lg.addColorStop(0,'rgba(255,250,240,.06)');lg.addColorStop(1,'rgba(0,0,0,.06)');c.fillStyle=lg;c.fillRect(0,0,W,H);}
function buildVindicat(v){const g=new THREE.Group();const a=v.a,b=v.b,n=v.n;const L=Math.hypot(b[0]-a[0],b[1]-a[1]),Hf=v.hf||19.8;
  // local frame: x along the facade (+x = right as seen from the market), y up from the street, z out towards the market
  g.position.set((a[0]+b[0])/2,v.mv,(a[1]+b[1])/2);g.rotation.y=Math.atan2(n[0],n[1]);
  const xl=u=>(u-.5)*L, yv=t=>t*Hf;
  const tex=canvasTex(2048,Math.round(2048*Hf/L/8)*8,(c,w,h)=>paintVindicat(c,w,h),true);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(L,Hf),new THREE.MeshLambertMaterial({map:tex}));face.position.set(0,Hf/2,.07);face.receiveShadow=true;g.add(face);
  const M=(c)=>new THREE.MeshLambertMaterial({color:c});const white=M('#efede7'),dark=M('#2b2b2c'),under=M('#3a3a3c');
  const box=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o;};
  // white band and parapet coping
  box(L*(.995-.02),yv(VF.band[1]-VF.band[0]),.32,white,(xl(.02)+xl(.995))/2,yv((VF.band[0]+VF.band[1])/2),.2);
  box(L,.22,.4,white,0,Hf-.11,.15);
  // white stone surrounds around the right-hand windows
  const surround=(cu,v0,v1)=>{const x0=xl(cu-.043),x1=xl(cu+.043),w=x1-x0,y0=yv(v0)-.25,y1=yv(v1)+.25,t=.32,d=.22;
    box(w,t,d,white,(x0+x1)/2,y1,d/2+.06);box(w,t,d,white,(x0+x1)/2,y0,d/2+.06);box(t,y1-y0,d,white,x0+t/2,(y0+y1)/2,d/2+.06);box(t,y1-y0,d,white,x1-t/2,(y0+y1)/2,d/2+.06);};
  VF.rightCols.forEach((cu,k)=>{surround(cu,VF.f1[0],k===1?.50:VF.f1[1]-.02);surround(cu,VF.f2[0]+.005,.665);surround(cu,VF.f3[0],VF.f3[1]-.005);});
  // emblem plaque (a plain shield) above the middle first-floor window
  const em=canvasTex(128,128,(c,w,h)=>{c.fillStyle='#ecebe6';c.fillRect(0,0,w,h);c.strokeStyle='#8c877d';c.lineWidth=6;c.beginPath();c.moveTo(34,24);c.lineTo(94,24);c.lineTo(94,64);c.quadraticCurveTo(94,96,64,108);c.quadraticCurveTo(34,96,34,64);c.closePath();c.stroke();},true);
  const ep=new THREE.Mesh(new THREE.PlaneGeometry(L*.06,yv(.5-.455)),new THREE.MeshLambertMaterial({map:em}));ep.position.set(xl(VF.rightCols[1]),yv(.477),.3);g.add(ep);
  // long balcony over the market: pale slab, dark underside, brackets, black railing
  const b0=xl(.005),b1=xl(VF.entranceU[1]-.12),bw=b1-b0,by=yv(VF.balcony),bd=1.35;
  box(bw,.12,bd,M('#9a948c'),(b0+b1)/2,by+.06,bd/2);box(bw,.22,bd,under,(b0+b1)/2,by-.11,bd/2);
  for(let x=b0+.6;x<b1;x+=L*.085)box(.14,.5,bd*.9,under,x,by-.45,bd*.45);
  const nb=Math.round(bw/.13);const bar=new THREE.InstancedMesh(new THREE.BoxGeometry(.03,1.0,.03),dark,nb);const m4=new THREE.Matrix4();
  for(let i=0;i<nb;i++){m4.makeTranslation(b0+.05+i*(bw-.1)/(nb-1),by+.62,bd-.06);bar.setMatrixAt(i,m4);}bar.castShadow=true;g.add(bar);
  box(bw,.06,.06,dark,(b0+b1)/2,by+1.12,bd-.06);box(bw,.04,.04,dark,(b0+b1)/2,by+.2,bd-.06);
  for(const x of[b0+.02,b1-.02])box(.05,1.0,bd,dark,x,by+.62,bd/2);
  // entrance: white stone block, wide oak door, MVTVA FIDES carved in the lintel
  const e0=xl(VF.entranceU[0]),e1=xl(VF.entranceU[1]),ew=e1-e0,eh=yv(VF.balcony);
  box(ew,.5,.45,white,(e0+e1)/2,eh-.25,.25);box(.55,eh,.45,white,e0+.27,eh/2,.25);box(.55,eh,.45,white,e1-.27,eh/2,.25);
  box(ew-1.1,eh*.32,.3,white,(e0+e1)/2,eh-.5-eh*.16,.2);
  const dh=eh*.62;const slat=canvasTex(256,256,(c,w,h)=>{c.fillStyle='#c79b67';c.fillRect(0,0,w,h);for(let x=0;x<w;x+=16){c.fillStyle=`rgba(${90+Math.random()*30|0},${60+Math.random()*20|0},30,.25)`;c.fillRect(x,0,3,h);
    for(let k=0;k<6;k++){c.fillStyle='rgba(255,240,210,.12)';c.fillRect(x+5,Math.random()*h,8,30);}}});
  const door=new THREE.Mesh(new THREE.BoxGeometry(ew-1.1,dh,.12),new THREE.MeshLambertMaterial({map:slat}));door.position.set((e0+e1)/2,dh/2,.12);door.receiveShadow=true;g.add(door);
  box(.9,dh*.95,.05,M('#3c2e22'),(e0+e1)/2-ew*.18,dh*.475,.2); // the open door leaf
  const lt=canvasTex(1024,128,(c,w,h)=>{c.fillStyle='#eeebe4';c.fillRect(0,0,w,h);c.font='400 92px "Trajan Pro","Times New Roman",Georgia,serif';c.textAlign='center';c.textBaseline='middle';
    c.fillStyle='rgba(0,0,0,.14)';c.fillText('MVTVA  FIDES',w/2+2,h/2+9,w-40);c.fillStyle='#a79c8d';c.fillText('MVTVA  FIDES',w/2,h/2+6,w-40);},true);
  const lint=new THREE.Mesh(new THREE.PlaneGeometry(ew-1.3,(ew-1.3)/8),new THREE.MeshLambertMaterial({map:lt}));lint.position.set((e0+e1)/2,eh-.5-eh*.16,.36);g.add(lint);
  box(.7,.6,.08,M('#3b3a37'),e1-1.1,dh*.7,.4); // house number plate
  g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  cityGroup.add(g);}
