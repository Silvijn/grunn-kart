import xml.etree.ElementTree as ET, json, math, heapq, sys, collections
F=sys.argv[1]; OUT=sys.argv[2]
root=ET.parse(F).getroot()
nodes={n.get('id'):(float(n.get('lat')),float(n.get('lon'))) for n in root.iter('node')}
LAT0,LON0=53.2185,6.5670
CL=math.cos(math.radians(LAT0))
def xy(lat,lon): return (-(lon-LON0)*CL*111320.0, (lat-LAT0)*110574.0)   # x = west, z = north (3D tiles frame)
ways=[]
for w in root.iter('way'):
    t={x.get('k'):x.get('v') for x in w.iter('tag')}
    nds=[nd.get('ref') for nd in w.iter('nd') if nd.get('ref') in nodes]
    ways.append((w.get('id'),t,nds))
# multipolygon relations for water
rels=[]
wayById={w[0]:w for w in ways}
for r in root.iter('relation'):
    t={x.get('k'):x.get('v') for x in r.iter('tag')}
    mem=[(m.get('type'),m.get('ref'),m.get('role')) for m in r.iter('member')]
    rels.append((t,mem))
DRIVE={'residential','pedestrian','tertiary','service','unclassified','living_street','secondary','primary'}
G=collections.defaultdict(list); nodeName={}
for wid,t,nds in ways:
    hw=t.get('highway')
    if hw in DRIVE and t.get('area')!='yes':
        nm=t.get('name') or ''
        for a,b in zip(nds,nds[1:]):
            pa,pb=xy(*nodes[a]),xy(*nodes[b]);d=math.dist(pa,pb)
            G[a].append((b,d,nm));G[b].append((a,d,nm))
            nodeName.setdefault(a,nm);nodeName.setdefault(b,nm)
gnodes=list(G.keys())
def snap(lat,lon):
    p=xy(lat,lon);return min(gnodes,key=lambda n:math.dist(p,xy(*nodes[n])))
def route(a,b):
    dist={a:0};prev={};pq=[(0,a)]
    while pq:
        d,u=heapq.heappop(pq)
        if u==b:break
        if d>dist.get(u,1e18):continue
        for v,w,_ in G[u]:
            nd=d+w
            if nd<dist.get(v,1e18):dist[v]=nd;prev[v]=(u);heapq.heappush(pq,(nd,v))
    path=[b]
    while path[-1]!=a:path.append(prev[path[-1]])
    return path[::-1]
def edgeName(a,b):
    for v,w,nm in G[a]:
        if v==b:return nm
    return ''
TR={
 'markt':{'name':'Grote Markt','sub':'Rond de Martinitoren, door de Oosterstraat en de Herestraat','wp':[(53.2172,6.5700),(53.21611,6.57111),(53.21540,6.56970),(53.21513,6.56875),(53.21700,6.56745),(53.21805,6.56657),(53.21834,6.56893)]},
 'spil':{'name':'Spilsluizen','sub':'Oude Boteringestraat, langs het water van de Spilsluizen en terug door de Oude Ebbingestraat','wp':[(53.22050,6.56612),(53.21917,6.56702),(53.21906,6.56709),(53.21889,6.56625),(53.21862,6.56529),(53.21924,6.56462),(53.22115,6.56293),(53.22162,6.56456),(53.22189,6.56544)]},
 'vis':{'name':'Vismarkt','sub':'Over het Gedempte Zuiderdiep en de Folkingestraat naar de Vismarkt','wp':[(53.21540,6.56970),(53.21488,6.56778),(53.21456,6.56536),(53.21571,6.56472),(53.21674,6.56398),(53.21706,6.56492),(53.21779,6.56607),(53.21805,6.56657),(53.21834,6.56893),(53.2172,6.5700),(53.21611,6.57111)]},
 'rond':{'name':'Rondje Binnenstad','sub':'De grote ronde: alle straten van de beker in één lange baan','wp':[(53.2172,6.5700),(53.21611,6.57111),(53.21540,6.56970),(53.21488,6.56778),(53.21456,6.56536),(53.21571,6.56472),(53.21674,6.56398),(53.21706,6.56492),(53.21779,6.56607),(53.21805,6.56657),(53.21862,6.56529),(53.21924,6.56462),(53.22115,6.56293),(53.22162,6.56456),(53.22189,6.56544),(53.22050,6.56612),(53.21917,6.56702),(53.21908,6.56807),(53.21834,6.56893)]},
}
def chaikin(pts,it=2):
    for _ in range(it):
        out=[]
        n=len(pts)
        for i in range(n):
            p,q=pts[i],pts[(i+1)%n]
            out.append((p[0]*.75+q[0]*.25,p[1]*.75+q[1]*.25,p[2]));out.append((p[0]*.25+q[0]*.75,p[1]*.25+q[1]*.75,p[2]))
        pts=out
    return pts
def resample(pts,step=2.0):
    n=len(pts);seg=[];total=0
    for i in range(n):
        a,b=pts[i],pts[(i+1)%n];d=math.dist(a[:2],b[:2]);seg.append(d);total+=d
    m=max(20,round(total/step));st=total/m;out=[];i=0;acc=0;t=0
    for k in range(m):
        target=k*st
        while acc+seg[i]<target and i<n-1:acc+=seg[i];i+=1
        f=(target-acc)/seg[i] if seg[i]>0 else 0
        a,b=pts[i],pts[(i+1)%n];out.append((a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]))
    return out,total
tracks={}
for tid,d in TR.items():
    wps=[snap(*w) for w in d['wp']]
    path=[]
    for i in range(len(wps)):
        seg=route(wps[i],wps[(i+1)%len(wps)])
        path+=seg[:-1] if i<len(wps)-1 else seg[:-1]
    # remove immediate backtracks (A,B,A)
    changed=True
    while changed:
        changed=False
        for i in range(len(path)):
            if path[i]==path[(i+2)%len(path)] and len(path)>4:
                del path[(i+1)%len(path)];del path[i% len(path)];changed=True;break
    pts=[]
    for i,n in enumerate(path):
        x,z=xy(*nodes[n]);nm=edgeName(n,path[(i+1)%len(path)]) or nodeName.get(n,'')
        if pts and math.dist(pts[-1][:2],(x,z))<0.3:continue
        pts.append((x,z,nm))
    sm=chaikin(pts,3);rs,total=resample(sm,2.0)
    # names: forward-fill blanks
    names=[p[2] for p in rs];last=next((n for n in names if n),'')
    for i in range(len(names)):
        if names[i]:last=names[i]
        else:names[i]=last
    tracks[tid]={'name':d['name'],'sub':d['sub'],'len':round(total,1),'x':[round(p[0],2) for p in rs],'z':[round(p[1],2) for p in rs],'st':names}
    print(tid,len(rs),'pts',round(total),'m',len(path),'nodes',sorted(set(names)))
# buildings & water polygons (only near any track)
allpts=[(x,z) for t in tracks.values() for x,z in zip(t['x'],t['z'])]
import bisect
def near(poly,r=60):
    for (x,z) in poly[::max(1,len(poly)//6)]:
        for (a,b) in allpts[::3]:
            if abs(a-x)<r and abs(b-z)<r:return True
    return False
blds=[];water=[]
for wid,t,nds in ways:
    if len(nds)<4 or nds[0]!=nds[-1]:continue
    poly=[xy(*nodes[n]) for n in nds[:-1]]
    if 'building' in t:
        if near(poly,45):blds.append([round(v,2) for p in poly for v in p])
    elif t.get('natural')=='water' or t.get('waterway')=='riverbank' or t.get('water'):
        water.append([round(v,2) for p in poly for v in p])
for t,mem in rels:
    if t.get('natural')=='water' or t.get('water'):
        for ty,ref,role in mem:
            if ty=='way' and role=='outer' and ref in wayById:
                nds=wayById[ref][2];
                if len(nds)>3:water.append([round(v,2) for n in nds for v in xy(*nodes[n])])
print('buildings near tracks',len(blds),'water polys',len(water))
json.dump({'origin':[LAT0,LON0],'tracks':tracks,'buildings':blds,'water':water},open(OUT,'w'),separators=(',',':'))
import os;print('bytes',os.path.getsize(OUT))

# ---- post-process: drop buildings that block the routed centrelines; flag samples over water (bridges)
def pip(x,z,poly):
    n=len(poly)//2;inside=False;j=n-1
    for i in range(n):
        xi,zi,xj,zj=poly[2*i],poly[2*i+1],poly[2*j],poly[2*j+1]
        if (zi>z)!=(zj>z) and x<(xj-xi)*(z-zi)/(zj-zi)+xi:inside=not inside
        j=i
    return inside
def segdist(px,pz,ax,az,bx,bz):
    dx,dz=bx-ax,bz-az;L=dx*dx+dz*dz
    t=0 if L==0 else max(0,min(1,((px-ax)*dx+(pz-az)*dz)/L))
    return math.hypot(px-ax-dx*t,pz-az-dz*t)
D=json.load(open(OUT))
pts=[(x,z) for t in D['tracks'].values() for x,z in zip(t['x'],t['z'])]
keep=[];dropped=0
for b in D['buildings']:
    xs,zs=b[0::2],b[1::2];x0,x1,z0,z1=min(xs)-2,max(xs)+2,min(zs)-2,max(zs)+2
    block=False
    for (x,z) in pts:
        if x0<x<x1 and z0<z<z1:
            if pip(x,z,b):block=True;break
            n=len(b)//2
            if any(segdist(x,z,b[2*i],b[2*i+1],b[2*((i+1)%n)],b[2*((i+1)%n)+1])<1.6 for i in range(n)):block=True;break
    if block:dropped+=1
    else:keep.append(b)
D['buildings']=keep
for tid,t in D['tracks'].items():
    br=[i for i,(x,z) in enumerate(zip(t['x'],t['z'])) if any(pip(x,z,w) for w in D['water'])]
    t['br']=br;print(tid,'samples over water',len(br))
print('collision buildings',len(keep),'dropped (blocking route)',dropped)
json.dump(D,open(OUT,'w'),separators=(',',':'))
print('bytes',os.path.getsize(OUT))
