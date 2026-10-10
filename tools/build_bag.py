"""Convert 3D BAG CityJSON tiles (LoD 2.2) into compact game geometry for Grunn Kart.

Outputs (in proef/):
  city.bin   - quantised vertex/index buffers for walls, pitched roofs and flat roofs
  city.json  - buffer layout, RD->game affine transform, height grid, PDOK tile setup
  groningen-bag.json - tracks (with street heights) + collision footprints from 3D BAG

Game frame: x = west, z = north (metres), y = NAP height.
"""
import json, math, glob, sys, os, random, statistics
import numpy as np
import mapbox_earcut as earcut
from pyproj import Transformer

UP = sys.argv[1]            # folder with *.city.json
OSMJSON = sys.argv[2]       # groningen.json (tracks from OSM)
OUT = sys.argv[3]           # output folder
random.seed(7)

D = json.load(open(OSMJSON))
LAT0, LON0 = D['origin']
CL = math.cos(math.radians(LAT0))
to_wgs = Transformer.from_crs('EPSG:28992', 'EPSG:4326', always_xy=True)

# --- affine fit RD -> game frame (both are near-linear over 1 km)
xs, ys = np.meshgrid(np.linspace(232900, 234300, 8), np.linspace(581200, 582600, 8))
A = []; B = []
for X, Y in zip(xs.ravel(), ys.ravel()):
    lon, lat = to_wgs.transform(X, Y)
    gx = -(lon - LON0) * CL * 111320.0; gz = (lat - LAT0) * 110574.0
    A.append([X, Y, 1]); B.append([gx, gz])
A = np.array(A); B = np.array(B)
coef, *_ = np.linalg.lstsq(A, B, rcond=None)      # 3x2
resid = np.abs(A @ coef - B).max()
print('affine max residual m', round(float(resid), 3))
def rd2g(X, Y):
    return (coef[0, 0] * X + coef[1, 0] * Y + coef[2, 0], coef[0, 1] * X + coef[1, 1] * Y + coef[2, 1])

# --- track points (game frame)
tpts = np.array([(x, z) for t in D['tracks'].values() for x, z in zip(t['x'], t['z'])])
def near_track(x, z, r):
    d = np.min((tpts[:, 0] - x) ** 2 + (tpts[:, 1] - z) ** 2)
    return d < r * r

# --- facade style per building
BRICK = [(150, 62, 44), (166, 74, 50), (128, 52, 38), (176, 92, 64), (140, 70, 52), (120, 60, 50), (158, 84, 60)]
PLASTER = [(236, 230, 214), (226, 222, 210), (240, 228, 196), (214, 214, 206), (232, 216, 188), (210, 222, 214)]
CONCRETE = [(200, 196, 186), (180, 176, 168), (214, 206, 190), (168, 160, 150)]
GLASS = [(170, 190, 200), (150, 170, 186), (190, 200, 206)]
STONE = [(186, 172, 146), (170, 156, 132)]
ROOF_TILE = [(170, 70, 44), (150, 60, 40), (184, 92, 56), (72, 70, 76), (60, 58, 64)]
ROOF_FLAT = [(150, 150, 152), (164, 160, 152), (136, 138, 142)]
def style_for(year, floors, height):
    if height > 34 and (year or 2000) < 1800:  # church towers & old monuments
        return 4, random.choice(STONE)
    y = year or 1930
    if y < 1880:
        return (1, random.choice(PLASTER)) if random.random() < .38 else (0, random.choice(BRICK))
    if y < 1965:
        return (0, random.choice(BRICK)) if random.random() < .8 else (1, random.choice(PLASTER))
    if y < 1995 or floors < 4:
        return 2, random.choice(CONCRETE)
    return 3, random.choice(GLASS)

# --- geometry buffers
def newell(P):
    nrm = np.zeros(3); n = len(P)
    for i in range(n):
        a, b = P[i], P[(i + 1) % n]
        nrm += np.array([(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])])
    return nrm
class Buf:
    def __init__(s): s.pos = []; s.uv = []; s.col = []; s.sty = []; s.idx = []
    def add_poly(s, pts3, uvs, col, sty, holes):
        """pts3: list of (x,y,z) game coords incl. hole vertices; holes: ring start indices"""
        n = len(pts3)
        if n < 3: return
        P = np.array(pts3)
        # project to plane for earcut (normal from the outer ring only)
        nrm = newell(P[:holes[1] if holes and len(holes) > 1 else n])
        ax = int(np.argmax(np.abs(nrm)))
        keep = [i for i in range(3) if i != ax]
        P2 = P[:, keep].astype(np.float64)
        rings = np.array((holes[1:] if holes else []) + [n], dtype=np.uint32)
        try:
            tri = earcut.triangulate_float64(P2, rings)
        except Exception:
            return
        if len(tri) == 0: return
        # earcut does not keep the facing: make every triangle face along the surface normal
        tri = np.array(tri, dtype=np.int64).reshape(-1, 3)
        a, b, c = P[tri[:, 0]], P[tri[:, 1]], P[tri[:, 2]]
        flip = np.einsum('ij,j->i', np.cross(b - a, c - a), nrm) < 0
        tri[flip] = tri[flip][:, [0, 2, 1]]
        tri = tri.ravel()
        base = len(s.pos)
        s.pos.extend(pts3); s.uv.extend(uvs); s.col.extend([col] * n); s.sty.extend([sty] * n)
        s.idx.extend(int(t) + base for t in tri)
walls, rpitch, rflat = Buf(), Buf(), Buf()
vindicat_info = None
footprints = []
landmarks = []
nb = 0
files = sorted(glob.glob(os.path.join(UP, '*.city.json')))
seen = set()
for f in files:
    d = json.load(open(f))
    sc = d['transform']['scale']; tr = d['transform']['translate']
    V = np.array(d['vertices'], dtype=np.float64) * sc + tr
    G = np.array([rd2g(x, y) for x, y in V[:, :2]])
    for oid, o in d['CityObjects'].items():
        if o['type'] != 'Building': continue
        bid = o['attributes'].get('identificatie') or oid
        if bid in seen: continue
        att = o['attributes']
        parts = [d['CityObjects'][c] for c in o.get('children', [])]
        geoms = []
        for p in parts:
            for g in p.get('geometry', []):
                if g['lod'] == '2.2': geoms.append(g)
        if not geoms: continue
        # centroid check
        vids = [v for g in geoms for sh in g['boundaries'] for su in sh for ring in su for v in ring]
        cx, cz = G[vids].mean(axis=0)
        if not near_track(cx, cz, 230): continue
        seen.add(bid); nb += 1
        mv = att.get('b3_h_maaiveld')
        if mv is None: mv = float(V[vids, 2].min())
        top = att.get('b3_h_dak_max') or float(V[vids, 2].max())
        roofmin = att.get('b3_h_dak_min') or top
        floors = att.get('b3_bouwlagen') or max(1, round((roofmin - mv) / 3.2))
        floorH = min(4.2, max(2.6, (roofmin - mv) / max(1, floors)))
        year = att.get('oorspronkelijkbouwjaar')
        sty, col = style_for(year, floors, top - mv)
        is_vindicat = bid == 'NL.IMBAG.Pand.0014100022188032'   # sociëteit Mutua Fides, Grote Markt oostzijde
        if is_vindicat: sty, col = 5, (168, 152, 138); floorH = max(3.6, (roofmin - mv) / 6)
        rcol = random.choice(ROOF_TILE[:3] if (year or 2000) < 1960 and random.random() < .7 else ROOF_TILE[3:])
        if sty == 4: rcol = (88, 120, 108)  # green copper / slate for monuments
        if is_vindicat:
            fp = []
            for g in geoms:
                sem = g.get('semantics', {}); surfs = sem.get('surfaces', []); vals = sem.get('values', [[]])[0]
                for si, su in enumerate(g['boundaries'][0]):
                    if vals and vals[si] is not None and surfs[vals[si]]['type'] == 'GroundSurface':
                        fp.append([tuple(map(float, G[v])) for v in su[0]])
            # facade on the market: longest footprint edge whose outward side faces the middle of the Grote Markt
            gm = (-40.0, 10.0); best = None
            allp = [q for ring in fp for q in ring]; ccx = sum(q[0] for q in allp) / len(allp); ccz = sum(q[1] for q in allp) / len(allp)
            for ring in fp:
                for a, b in zip(ring, ring[1:] + ring[:1]):
                    L = math.dist(a, b)
                    if L < 4: continue
                    mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
                    nx, nz = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
                    if nx * (mx - ccx) + nz * (mz - ccz) < 0: nx, nz = -nx, -nz
                    face = nx * (gm[0] - mx) + nz * (gm[1] - mz)
                    if face > 0 and (best is None or L > best[0]): best = (L, a, b, nx, nz)
            if best:
                L, a, b, nx, nz = best
                # height of the wall along this edge
                hs = []
                for g in geoms:
                    for su in g['boundaries'][0]:
                        for v in su[0]:
                            px, pz = G[v]; dx, dz = b[0] - a[0], b[1] - a[1]
                            t = ((px - a[0]) * dx + (pz - a[1]) * dz) / (L * L)
                            if -.02 < t < 1.02 and abs((px - a[0]) * nx + (pz - a[1]) * nz) < .8: hs.append(float(V[v, 2]))
                hf = round(max(hs) - mv, 2) if hs else round(top - mv, 2)
                vindicat_info = {'a': [round(a[0], 2), round(a[1], 2)], 'b': [round(b[0], 2), round(b[1], 2)], 'n': [round(nx, 3), round(nz, 3)], 'hf': hf,
                                 'mv': round(mv, 2), 'top': round(top, 2), 'floorH': round(floorH, 2), 'floors': floors}
                print('vindicat facade', vindicat_info)
        if top - mv > 60: landmarks.append({'x': round(float(cx), 1), 'z': round(float(cz), 1), 'h': round(top - mv, 1), 'year': year})
        for g in geoms:
            sem = g.get('semantics', {}); surfs = sem.get('surfaces', []); vals = sem.get('values', [[]])[0]
            for si, su in enumerate(g['boundaries'][0]):
                st = surfs[vals[si]]['type'] if vals and vals[si] is not None else 'WallSurface'
                ring_idx = []; pts = []
                for ring in su:
                    ring_idx.append(len(pts))
                    for v in ring:
                        gx, gz = G[v]; pts.append((float(gx), float(V[v, 2]), float(gz)))
                if st == 'GroundSurface':
                    outer = su[0]
                    footprints.append([round(float(c), 2) for v in outer for c in G[v]])
                    continue
                P = np.array(pts)
                if st == 'WallSurface':
                    # horizontal tangent of the wall
                    wn = newell(P[:len(su[0])])
                    hl = math.hypot(wn[0], wn[2])
                    if hl < 1e-9: continue
                    h = np.array([wn[2] / hl, 0, -wn[0] / hl])
                    u = P @ h; u0 = math.floor(u.min() / 3.0) * 3.0
                    uvs = [((uu - u0) / 3.0, (p[1] - mv) / floorH) for uu, p in zip(u, pts)]
                    walls.add_poly(pts, uvs, col, sty, ring_idx)
                else:  # roofs
                    slope = surfs[vals[si]].get('b3_hellingshoek', 0) if vals and vals[si] is not None else 0
                    if slope and slope > 12:
                        az = math.radians(surfs[vals[si]].get('b3_azimut', 0) or 0)
                        # rows of tiles run along the contour; v goes up the slope
                        dirx, dirz = math.sin(az), math.cos(az)
                        uvs = [((p[0] * dirz - p[2] * dirx) / 1.2, (p[0] * dirx + p[2] * dirz) / .45) for p in pts]
                        rpitch.add_poly(pts, uvs, rcol, 0, ring_idx)
                    else:
                        uvs = [(p[0] / 6, p[2] / 6) for p in pts]
                        rflat.add_poly(pts, uvs, random.choice(ROOF_FLAT), 0, ring_idx)
print('buildings', nb, 'wall verts', len(walls.pos), 'tris', len(walls.idx) // 3, 'pitched', len(rpitch.idx) // 3, 'flat', len(rflat.idx) // 3)

# --- binary packing: positions int16 (2.5 cm), uv int16 (1/128), colour uint8x3 + style uint8, indices uint32
allpos = np.array(walls.pos + rpitch.pos + rflat.pos)
cen = np.round((allpos.min(axis=0) + allpos.max(axis=0)) / 2, 1)
PQ = 0.025
blob = bytearray(); layout = {}
def pad4():
    while len(blob) % 4: blob.append(0)
for name, b in (('walls', walls), ('roofPitched', rpitch), ('roofFlat', rflat)):
    p = np.round((np.array(b.pos) - cen) / PQ).astype(np.int16)
    uv = np.clip(np.round(np.array(b.uv) * 128), -32767, 32767).astype(np.int16)
    c = np.array([[*cc, s] for cc, s in zip(b.col, b.sty)], dtype=np.uint8)
    idx = np.array(b.idx, dtype=np.uint32)
    ent = {'count': len(b.pos), 'index': len(idx)}
    for key, arr in (('pos', p), ('uv', uv), ('col', c), ('idx', idx)):
        pad4(); ent[key] = len(blob); blob.extend(arr.tobytes())
    layout[name] = ent
open(os.path.join(OUT, 'city.bin'), 'wb').write(blob)

# --- street heights: median ground level (maaiveld) of nearby buildings
fp_pts = []
for f in files:
    d = json.load(open(f))
    for oid, o in d['CityObjects'].items():
        if o['type'] == 'Building' and o['attributes'].get('b3_h_maaiveld') is not None:
            sc = d['transform']['scale']; trn = d['transform']['translate']
            ch = o.get('children', [])
            vs = [v for c in ch for g in d['CityObjects'][c].get('geometry', [])[:1] for sh in g['boundaries'] for su in sh for ring in su for v in ring]
            if not vs: continue
            V = np.array([d['vertices'][v] for v in vs[:8]], dtype=np.float64) * sc + trn
            gx, gz = rd2g(V[:, 0].mean(), V[:, 1].mean())
            fp_pts.append((gx, gz, o['attributes']['b3_h_maaiveld']))
FP = np.array(fp_pts)
def ground_at(x, z, k=8):
    d2 = (FP[:, 0] - x) ** 2 + (FP[:, 1] - z) ** 2
    idx = np.argsort(d2)[:k]
    return float(np.median(FP[idx, 2]))
for tid, t in D['tracks'].items():
    h = [ground_at(x, z) for x, z in zip(t['x'], t['z'])]
    n = len(h); hs = [statistics.mean(h[(i + k) % n] for k in range(-6, 7)) for i in range(n)]
    t['h'] = [round(v, 2) for v in hs]
# height grid for the terrain under the aerial photo
minx, maxx = tpts[:, 0].min() - 160, tpts[:, 0].max() + 160
minz, maxz = tpts[:, 1].min() - 160, tpts[:, 1].max() + 160
STEP = 8.0
nx = int((maxx - minx) / STEP) + 2; nz = int((maxz - minz) / STEP) + 2
grid = [round(ground_at(minx + i * STEP, minz + j * STEP), 2) for j in range(nz) for i in range(nx)]

# --- collision footprints from 3D BAG (match the visible buildings exactly)
def pip(x, z, poly):
    n = len(poly) // 2; inside = False; j = n - 1
    for i in range(n):
        xi, zi, xj, zj = poly[2 * i], poly[2 * i + 1], poly[2 * j], poly[2 * j + 1]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi: inside = not inside
        j = i
    return inside
def segdist(px, pz, ax, az, bx, bz):
    dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (pz - az) * dz) / L))
    return math.hypot(px - ax - dx * t, pz - az - dz * t)
keep = []; dropped = 0
for b in footprints:
    xs_, zs_ = b[0::2], b[1::2]
    x0, x1, z0, z1 = min(xs_) - 2, max(xs_) + 2, min(zs_) - 2, max(zs_) + 2
    m = (tpts[:, 0] > x0) & (tpts[:, 0] < x1) & (tpts[:, 1] > z0) & (tpts[:, 1] < z1)
    block = False
    for x, z in tpts[m]:
        if pip(x, z, b): block = True; break
        n = len(b) // 2
        if any(segdist(x, z, b[2 * i], b[2 * i + 1], b[2 * ((i + 1) % n)], b[2 * ((i + 1) % n) + 1]) < 1.4 for i in range(n)): block = True; break
    if block: dropped += 1
    else: keep.append(b)
print('footprints', len(footprints), 'kept for collision', len(keep), 'dropped (on route)', dropped)
D2 = {'origin': D['origin'], 'tracks': D['tracks'], 'buildings': keep, 'water': D['water']}
json.dump(D2, open(os.path.join(OUT, 'groningen-bag.json'), 'w'), separators=(',', ':'))

# --- PDOK aerial photo tiles (RD New WMTS) along the routes
TL = (-285401.92, 903401.92)
def span(level): return 256 * 12288000.0 / (2 ** level) * 0.00028 * (2 ** 0)
# scale denominators halve per level; level 12 = 3000
def span_l(level): return 256 * 3000.0 * (0.5 ** (level - 12)) * 0.00028
inv = np.linalg.inv(np.array([[coef[0, 0], coef[1, 0]], [coef[0, 1], coef[1, 1]]]))
def g2rd(gx, gz):
    v = inv @ np.array([gx - coef[2, 0], gz - coef[2, 1]]); return float(v[0]), float(v[1])
def tiles_for(level, buf, step):
    s = span_l(level); out = set()
    for x, z in tpts[::step]:
        for ox in (-buf, 0, buf):
            for oz in (-buf, 0, buf):
                X, Y = g2rd(x + ox, z + oz)
                out.add((int((X - TL[0]) // s), int((TL[1] - Y) // s)))
    return sorted(out)
hi = tiles_for(15, 22, 2)
lo = tiles_for(13, 170, 6)
print('aerial tiles hi', len(hi), 'lo', len(lo))
meta = {'center': [float(c) for c in cen], 'pq': PQ, 'layout': layout, 'bytes': len(blob),
        'affine': [[float(coef[0, 0]), float(coef[1, 0]), float(coef[2, 0])], [float(coef[0, 1]), float(coef[1, 1]), float(coef[2, 1])]],
        'grid': {'x0': round(float(minx), 2), 'z0': round(float(minz), 2), 'step': STEP, 'nx': nx, 'nz': nz, 'h': grid},
        'pdok': {'url': 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:28992/{z}/{x}/{y}.jpeg', 'tl': TL,
                 'hi': {'level': 15, 'span': span_l(15), 'tiles': hi}, 'lo': {'level': 13, 'span': span_l(13), 'tiles': lo}},
        'landmarks': landmarks, 'vindicat': vindicat_info}
json.dump(meta, open(os.path.join(OUT, 'city.json'), 'w'), separators=(',', ':'))
print('city.bin MB', round(len(blob) / 1e6, 2), 'city.json KB', round(os.path.getsize(os.path.join(OUT, 'city.json')) / 1e3))
print('landmarks', landmarks)

# --- props from OpenStreetMap: trees, benches, bicycle parking
if len(sys.argv) > 4:
    import xml.etree.ElementTree as ET
    root = ET.parse(sys.argv[4]).getroot()
    nodes = {n.get('id'): n for n in root.iter('node')}
    def gxz(n):
        lat, lon = float(n.get('lat')), float(n.get('lon'))
        return (-(lon - LON0) * CL * 111320.0, (lat - LAT0) * 110574.0)
    props = {'tree': [], 'bench': [], 'bike': []}
    for n in root.iter('node'):
        t = {x.get('k'): x.get('v') for x in n.iter('tag')}
        kind = 'tree' if t.get('natural') == 'tree' else 'bench' if t.get('amenity') == 'bench' else 'bike' if t.get('amenity') == 'bicycle_parking' else None
        if not kind: continue
        x, z = gxz(n)
        if not near_track(x, z, 200): continue
        props[kind].append([round(x, 2), round(z, 2), round(ground_at(x, z), 2)])
    for w in root.iter('way'):
        t = {x.get('k'): x.get('v') for x in w.iter('tag')}
        if t.get('natural') == 'tree_row':
            pts = [gxz(nodes[nd.get('ref')]) for nd in w.iter('nd') if nd.get('ref') in nodes]
            for (ax, az), (bx, bz) in zip(pts, pts[1:]):
                L = math.hypot(bx - ax, bz - az)
                for k in range(int(L // 8) + 1):
                    x, z = ax + (bx - ax) * k * 8 / max(L, 1), az + (bz - az) * k * 8 / max(L, 1)
                    if near_track(x, z, 200): props['tree'].append([round(x, 2), round(z, 2), round(ground_at(x, z), 2)])
    # trees on the racing line are left out so nobody hits a trunk in the middle of the road
    props['tree'] = [p for p in props['tree'] if not near_track(p[0], p[1], 3.0)]
    for k in ('bench', 'bike'): props[k] = [p for p in props[k] if not near_track(p[0], p[1], 6.5)]
    meta['props'] = props
    json.dump(meta, open(os.path.join(OUT, 'city.json'), 'w'), separators=(',', ':'))
    print('props', {k: len(v) for k, v in props.items()})
