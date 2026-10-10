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
