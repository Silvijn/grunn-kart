import xml.etree.ElementTree as ET,math,json,sys,matplotlib;matplotlib.use('Agg');import matplotlib.pyplot as plt
F='/root/.claude/uploads/4a0dff68-10eb-5510-8cdc-eaec2250435f/bbf7b50a-map.osm'
root=ET.parse(F).getroot()
nodes={n.get('id'):(float(n.get('lat')),float(n.get('lon'))) for n in root.iter('node')}
LAT0,LON0=53.2185,6.5670;CL=math.cos(math.radians(LAT0))
xy=lambda la,lo:(-(lo-LON0)*CL*111320,(la-LAT0)*110574)
B=json.load(open('../proef/groningen-bag.json'))['buildings']
x0,x1,z0,z1=[float(v) for v in sys.argv[1:5]];out=sys.argv[5]
fig,ax=plt.subplots(figsize=(14,14*(z1-z0)/(x1-x0)))
for b in B:
    xs=b[0::2];zs=b[1::2]
    if max(xs)<x0-20 or min(xs)>x1+20 or max(zs)<z0-20 or min(zs)>z1+20:continue
    ax.fill([-v for v in xs],zs,color='#d0d0d0',lw=.3,ec='#999')
col={'residential':'#1f77b4','tertiary':'#d62728','pedestrian':'#2ca02c','service':'#9467bd','footway':'#ff7f0e','unclassified':'#8c564b','living_street':'#17becf','cycleway':'#bcbd22','path':'#e377c2'}
seen=set()
for w in root.iter('way'):
    t={x.get('k'):x.get('v') for x in w.iter('tag')}
    hw=t.get('highway')
    if hw not in col or t.get('area')=='yes':continue
    pts=[xy(*nodes[nd.get('ref')]) for nd in w.iter('nd') if nd.get('ref') in nodes]
    if not any(x0<p[0]<x1 and z0<p[1]<z1 for p in pts):continue
    ax.plot([-p[0] for p in pts],[p[1] for p in pts],'-',color=col[hw],lw=2 if hw!='footway' else 1)
    nm=t.get('name')
    if nm and (nm,round(pts[0][0]/40)) not in seen:
        seen.add((nm,round(pts[0][0]/40)));m=pts[len(pts)//2];ax.text(-m[0],m[1],nm,fontsize=7,color='k',ha='center',bbox=dict(fc='white',alpha=.6,lw=0,pad=.5))
ax.set_xlim(-x1,-x0);ax.set_ylim(z0,z1);ax.set_aspect('equal');ax.grid(alpha=.3)
ax.set_xticks(range(int(-x1)//50*50,int(-x0),50));ax.set_yticks(range(int(z0)//50*50,int(z1),50));ax.tick_params(labelsize=7)
plt.tight_layout();plt.savefig(out,dpi=70)
