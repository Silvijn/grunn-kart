# Derive proef/game.js (3D BAG city) from game.js (Google 3D tiles)
import re
s=open('game.js').read()
world=open('tools/part_bag_world.js').read()
def rep(old,new,cnt=1):
    global s
    assert s.count(old)==cnt,(s.count(old),old[:90]);s=s.replace(old,new)
rep("import {THREE,TilesRenderer,GoogleCloudAuthPlugin,ReorientationPlugin,GLTFExtensionsPlugin,TileCompressionPlugin,DRACOLoader} from './vendor.js';","import {THREE} from '../vendor.js';")
i=s.index('/* ================= RENDERER + GOOGLE 3D TILES ================= */');j=s.index('/* ================= CITY COLLISION')
s=s[:i]+world+s[j:]
# heights come from the 3D BAG ground levels
rep("const H=new Float32Array(N);","const H=Float32Array.from(def.h||new Array(N).fill(0));")
rep("H,base:BASE_GUESS,calibrated:false,hPass:0,","H,base:0,calibrated:true,hPass:1,")
i=s.index('// progressive height sampling of the route against the loaded 3D tiles');j=s.index('/* ================= KART MODELS')
s=s[:i]+"function sampleHeights(){}\n\n"+s[j:]
rep("  loadT=0;if(TR.hPass>=1&&tiles&&tiles.loadProgress>.9){state='intro';showOverlay(null);}else{state='loading';screenLoading();}",
    "  loadT=0;state='loading';screenLoading();")
rep("if(state==='loading'){loadT+=dt;sampleHeights(80);const p=player,gy=TR.hAt(p.idx);const hi=TR.calibrated&&TR.hPass>=1?0:1;",
    "if(state==='loading'){loadT+=dt;const p=player,gy=TR.hAt(p.idx);const hi=0;")
rep("    const prog=tiles?Math.round(Math.min(!TR.calibrated?.2:TR.hPass>=1?1:.5+.5*TR.hI/TR.N,tiles.loadProgress||0)*100):0;",
    "    const prog=!cityReady?10:Math.round(Math.min(1,.4+.6*(aerial.ok/Math.max(1,aerial.ok+aerial.active)))*100);")
rep("if((TR.calibrated&&TR.hPass>=1&&tiles&&tiles.loadProgress>.9&&loadT>1.5)||loadT>30){state='intro';showOverlay(null);}",
    "if((cityReady&&aerialNearReady()&&loadT>.8)||loadT>12){state='intro';showOverlay(null);}")
rep("""function render(){camera.updateMatrixWorld();if(tiles){tiles.setCamera(camera);tiles.update();}
  if(state==='menu')sampleHeights(24);
  if(TR&&TR.calibrated&&!TR.logged){TR.logged=true;console.log('[Grunn Kart] straathoogte',TR.id,TR.base.toFixed(2),'m');}
  attrT-=1/60;if(attrT<=0&&tiles){attrT=1;const a=tiles.getAttributions?tiles.getAttributions():[];const txt=a.filter(x=>x.type==='string').map(x=>x.value).join(' ');$('#attrTxt').textContent=txt;}
  if(tilesError&&!keyErrShown){keyErrShown=true;screenKey('Google laadt het 3D-model niet met deze sleutel. Controleer of de Map Tiles API aan staat en of de sleutel dit adres toestaat. Melding: '+String(tilesError).slice(0,140));}
  renderer.render(scene,camera);}""",
"""function render(){camera.updateMatrixWorld();
  // shadows follow the camera focus
  const f=player&&state!=='menu'?player:{x:camera.position.x,z:camera.position.z,idx:0};const fy=TR?TR.hAt(f.idx||0):0;
  sun.target.position.set(f.x,fy,f.z);sun.position.set(f.x+60,fy+110,f.z-40);sun.target.updateMatrixWorld();
  attrT-=1/60;if(attrT<=0){attrT=.5;pumpAerial();unloadFarAerial();}
  renderer.render(scene,camera);}""")
# no key needed: boot straight into the menu
rep("  const key=store.get('key','');if(key){startTiles(key);screenTitle();}else screenKey('');",
    "  applyDetail();screenTitle();loadCity().catch(e=>{console.error(e);showMsg('Stad laden mislukt',3,true);});")
rep("fetch('./groningen.json')","fetch('./groningen-bag.json')")
rep("""   <div class="navrow"><button class="back" id="bBack">Terug</button><button class="back" id="bKeyEdit">Google-sleutel wijzigen</button></div></div>`);""",
    """   <div class="navrow"><button class="back" id="bBack">Terug</button></div></div>`);""")
rep("  on('bKeyEdit',()=>screenKey(''));\n","")
rep("Max laadt de scherpste gevels die Google heeft, maar vraagt een snelle computer en meer data.","Hoog en Max tekenen schaduwen en laden de luchtfoto verder vooruit.")
rep("<p class=\"fine\">Het 3D-model is gemaakt vanuit de lucht en ziet er van iets hoger het scherpst uit.</p>","")
rep("<p class=\"fine\">Het 3D-model van de binnenstad komt binnen bij Google en de hoogte van de straten wordt gemeten.</p>","<p class=\"fine\">De gebouwen uit het 3D BAG en de luchtfoto van PDOK worden geladen.</p>")
rep("  scene.add(g);\n  return{g,bodyG,wheels,sparks,flame,glider,train,kc,mats};","  g.traverse(o=>{if(o.isMesh&&o!==sh)o.castShadow=true;});scene.add(g);\n  return{g,bodyG,wheels,sparks,flame,glider,train,kc,mats};")
import time
VER=time.strftime('%Y%m%d%H%M')
s=s.replace("fetch('./city.json')","fetch('./city.json?v="+VER+"')").replace("fetch('./city.bin')","fetch('./city.bin?v="+VER+"')").replace("fetch('./groningen-bag.json')","fetch('./groningen-bag.json?v="+VER+"')")
open('proef/game.js','w').write(s)
h=open('index.html').read()
h=h.replace('<div id="attr"><b>Google</b><span id="attrTxt"></span></div>','<div id="attr"><span id="attrTxt">Gebouwen © 3D BAG (3DGI, TU Delft) · Luchtfoto © PDOK · Kaart © OpenStreetMap</span></div>')
h=h.replace('<script type="module" src="./game.js"></script>','<script type="module" src="./game.js?v='+VER+'"></script>')
open('proef/index.html','w').write(h)
print('ok')
