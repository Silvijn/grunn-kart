import xml.etree.ElementTree as ET,math,sys,collections
OSM='/root/.claude/uploads/4a0dff68-10eb-5510-8cdc-eaec2250435f/bbf7b50a-map.osm'
root=ET.parse(OSM).getroot()
nodes={n.get('id'):(float(n.get('lat')),float(n.get('lon'))) for n in root.iter('node')}
LAT0,LON0=53.2185,6.5670;CL=math.cos(math.radians(LAT0))
E=lambda la,lo:((lo-LON0)*CL*111320.0,(la-LAT0)*110574.0)
KINDS={'residential','tertiary','pedestrian','service','unclassified','living_street','footway','cycleway','path'}
names=collections.defaultdict(set);deg=collections.Counter()
for w in root.iter('way'):
    t={x.get('k'):x.get('v') for x in w.iter('tag')}
    if t.get('highway') not in KINDS or t.get('area')=='yes':continue
    nds=[nd.get('ref') for nd in w.iter('nd') if nd.get('ref') in nodes]
    nm=(t.get('name') or '?')+('' if t['highway'] not in('footway','path','cycleway') else '*')
    for i,n in enumerate(nds):
        names[n].add(nm);deg[n]+=1 if i in(0,len(nds)-1) else 2
e0,e1,n0,n1=[float(v) for v in sys.argv[1:5]]
rows=[]
for n,ns in names.items():
    if len(ns)<2:continue
    e,nn=E(*nodes[n])
    if e0<=e<=e1 and n0<=nn<=n1: rows.append((round(nn),round(e),' / '.join(sorted(ns))))
for r in sorted(rows,reverse=True):print(f"N{r[0]:5d} E{r[1]:5d}  {r[2]}")
