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
  if(ch.hat==='helm'){const h=add(new THREE.SphereGeometry(.5,24,18),hat,0,hy+.04,hz);h.scale.set(1,.94,1.02);const v=add(new THREE.SphereGeometry(.42,20,12,-.9,1.8,1.1,.7),Mt('#101418',false,{shininess:140,specular:0xffffff}),0,hy+.02,hz+.08);v.rotation.y=Math.PI/2;}
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
