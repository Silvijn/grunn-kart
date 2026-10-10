"""Grunn Kart circuits over the real streets of Groningen (OpenStreetMap).

Waypoints are given in map coordinates (E = metres east, N = metres north of the origin
53.2185 N, 6.5670 E). Consecutive waypoints are joined by the shortest path over the street
graph, corners are rounded with a small street-like radius and the line is resampled every 2 m.

usage: python3 routes.py <map.osm> <groningen.json (updated in place)> [plotdir]
"""
import xml.etree.ElementTree as ET, json, math, heapq, sys, os, collections

OSM, OUT = sys.argv[1], sys.argv[2]
PLOT = sys.argv[3] if len(sys.argv) > 3 else None
LAT0, LON0 = 53.2185, 6.5670
CL = math.cos(math.radians(LAT0))
def xy(lat, lon): return (-(lon - LON0) * CL * 111320.0, (lat - LAT0) * 110574.0)   # game frame: x = west, z = north

root = ET.parse(OSM).getroot()
nodes = {n.get('id'): (float(n.get('lat')), float(n.get('lon'))) for n in root.iter('node')}
KINDS = {'residential': 1, 'tertiary': 1, 'pedestrian': 1, 'service': 1, 'unclassified': 1, 'living_street': 1,
         'footway': 1.6, 'cycleway': 1.3, 'path': 1.8}
G = collections.defaultdict(list)
for w in root.iter('way'):
    t = {x.get('k'): x.get('v') for x in w.iter('tag')}
    hw = t.get('highway')
    if hw not in KINDS or t.get('area') == 'yes': continue
    nds = [nd.get('ref') for nd in w.iter('nd') if nd.get('ref') in nodes]
    nm = t.get('name') or ''
    for a, b in zip(nds, nds[1:]):
        d = math.dist(xy(*nodes[a]), xy(*nodes[b]))
        G[a].append((b, d * KINDS[hw], d, nm)); G[b].append((a, d * KINDS[hw], d, nm))
P = {n: xy(*nodes[n]) for n in G}

def snap(E, N):
    x, z = -E, N
    return min(P, key=lambda n: (P[n][0] - x) ** 2 + (P[n][1] - z) ** 2)
def route(a, b, banned):
    dist = {a: 0}; prev = {}; pq = [(0, a)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == b: break
        if d > dist.get(u, 1e18): continue
        for v, w, _, _ in G[u]:
            nd = d + w * (25 if frozenset((u, v)) in banned else 1)
            if nd < dist.get(v, 1e18): dist[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
    if b not in dist: raise SystemExit(f'no path {a}->{b}')
    p = [b]
    while p[-1] != a: p.append(prev[p[-1]])
    return p[::-1]
def edge_name(a, b):
    for v, _, _, nm in G[a]:
        if v == b: return nm
    return ''

def fillet(pts, rmax=7.0):
    """round every corner with a circular arc of radius <= rmax (and <= 45% of the shorter leg)"""
    n = len(pts); out = []
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        a = (p0[0] - p1[0], p0[1] - p1[1]); b = (p2[0] - p1[0], p2[1] - p1[1])
        la, lb = math.hypot(*a), math.hypot(*b)
        if la < 1e-6 or lb < 1e-6: continue
        cosang = max(-1, min(1, (a[0] * b[0] + a[1] * b[1]) / (la * lb)))
        ang = math.acos(cosang)                     # interior angle
        turn = math.pi - ang
        if turn < math.radians(4): out.append(p1); continue
        tlen = min(.45 * la, .45 * lb, rmax / math.tan(ang / 2))
        s = (p1[0] + a[0] / la * tlen, p1[1] + a[1] / la * tlen, p1[2])
        e = (p1[0] + b[0] / lb * tlen, p1[1] + b[1] / lb * tlen, p2[2])
        k = max(2, int(turn / math.radians(10)))
        for j in range(k + 1):                      # quadratic Bezier s -> p1 -> e (close to a circular arc)
            t = j / k
            x = (1 - t) ** 2 * s[0] + 2 * (1 - t) * t * p1[0] + t * t * e[0]
            z = (1 - t) ** 2 * s[1] + 2 * (1 - t) * t * p1[1] + t * t * e[1]
            out.append((x, z, p1[2] if t < .5 else p2[2]))
    return out
BAGF = '../proef/groningen-bag.json'
import numpy as np
_S = []
for b in json.load(open(BAGF))['buildings']:
    n = len(b) // 2
    for i in range(n): j = (i + 1) % n; _S.append((b[2 * i], b[2 * i + 1], b[2 * j], b[2 * j + 1]))
_S = np.array(_S)
def ray(x, z, dx, dz, mx=14.0):
    ax, az, bx, bz = _S[:, 0], _S[:, 1], _S[:, 2], _S[:, 3]; ex, ez = bx - ax, bz - az; den = dx * ez - dz * ex
    with np.errstate(divide='ignore', invalid='ignore'):
        t = ((ax - x) * ez - (az - z) * ex) / den; u = ((ax - x) * dz - (az - z) * dx) / den
    ok = (np.abs(den) > 1e-9) & (t > 0) & (u >= 0) & (u <= 1)
    return float(min(mx, t[ok].min())) if ok.any() else mx
def centre(rs, iters=4):
    """push the line towards the middle of the street wherever a wall is closer than 2.5 m"""
    for _ in range(iters):
        N = len(rs); sh = []
        for i in range(N):
            a, b = rs[i - 2], rs[(i + 2) % N]; tx, tz = b[0] - a[0], b[1] - a[1]; L = math.hypot(tx, tz) or 1; nx, nz = -tz / L, tx / L
            l = ray(rs[i][0], rs[i][1], -nx, -nz); r = ray(rs[i][0], rs[i][1], nx, nz)
            sh.append((max(-2.0, min(2.0, (r - l) / 2)) if min(l, r) < 2.5 else 0.0, nx, nz))
        sm = [sum(sh[(i + k) % N][0] for k in range(-3, 4)) / 7 for i in range(N)]
        rs = [(p[0] + sh[i][1] * sm[i], p[1] + sh[i][2] * sm[i], p[2]) for i, p in enumerate(rs)]
        rs, _ = resample(rs, 2.0)
    return rs
def clearance(rs, want=2.4, iters=10):
    """keep the line at least `want` metres from every wall (also diagonal building corners in bends)"""
    ax, az, bx, bz = _S[:, 0], _S[:, 1], _S[:, 2], _S[:, 3]; ex, ez = bx - ax, bz - az; L2 = ex * ex + ez * ez + 1e-12
    for _ in range(iters):
        N = len(rs); moved = 0; out = []
        for (x, z, nm) in rs:
            m = (np.minimum(ax, bx) < x + 6) & (np.maximum(ax, bx) > x - 6) & (np.minimum(az, bz) < z + 6) & (np.maximum(az, bz) > z - 6)
            if not m.any(): out.append((x, z, nm)); continue
            t = np.clip(((x - ax[m]) * ex[m] + (z - az[m]) * ez[m]) / L2[m], 0, 1)
            px, pz = ax[m] + ex[m] * t, az[m] + ez[m] * t; dx, dz = x - px, z - pz; d = np.hypot(dx, dz)
            close = d < want
            if close.any():
                w = (want - d[close]) / np.maximum(d[close], 1e-3)
                x += .5 * float((dx[close] * w).sum()); z += .5 * float((dz[close] * w).sum()); moved += 1
            out.append((x, z, nm))
        # light smoothing so the corrections stay round
        rs = [((out[i - 1][0] + 2 * out[i][0] + out[(i + 1) % N][0]) / 4, (out[i - 1][1] + 2 * out[i][1] + out[(i + 1) % N][1]) / 4, out[i][2]) for i in range(N)]
        rs, _ = resample(rs, 2.0)
        if not moved: break
    return rs
def resample(pts, step=2.0):
    n = len(pts); seg = [math.dist(pts[i][:2], pts[(i + 1) % n][:2]) for i in range(n)]; total = sum(seg)
    m = max(20, round(total / step)); st = total / m; out = []; i = 0; acc = 0
    for k in range(m):
        target = k * st
        while acc + seg[i] < target and i < n - 1: acc += seg[i]; i += 1
        f = (target - acc) / seg[i] if seg[i] > 0 else 0
        a, b = pts[i], pts[(i + 1) % n]
        out.append((a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2]))
    return out, total

# ---------------------------------------------------------------------------------------------
# The circuits. Waypoints (E, N) sit on the streets in the order they are driven.
TRACKS = collections.OrderedDict()
TRACKS['soep'] = dict(name='Soephuisstraatje', sub='Door het Soephuisstraatje, om de A-kerk, door de Akerkstraat en terug over de Broerstraat', start=(-150, -4),
    wp=[(-114, 13), (-183, -21), (-170, -50), (-252, -73), (-218, -153), (-216, -159), (-306, -190), (-315, -100), (-307, -55), (-267, -41),
        (-283, -11), (-311, 39), (-287, 48), (-250, 64), (-227, 73), (-204, 15), (-137, 44)])
TRACKS['mutua'] = dict(name='Mutua Fides', sub='Over de Grote Markt langs de sociëteit, om de Martinikerk en door de Kreupelstraat', start=(-40, 46),
    wp=[(-114, 13), (-50, 43), (6, 62), (64, 81), (59, 87), (51, 108), (45, 141), (46, 220), (104, 219), (181, 185), (175, 150), (176, 101),
        (165, 98), (134, 86), (117, 81), (72, 65), (129, -18), (-21, -65), (-29, -50), (-48, -17), (-62, 5), (-94, -13)])
TRACKS['akerk'] = dict(name='A-kerk', sub='Over de Vismarkt, rond de A-kerk, door Schoolholm en Nieuwstad en terug over de Pelsterstraat', start=(-139, -118),
    wp=[(-62, -78), (-216, -159), (-306, -190), (-346, -201), (-324, -260), (-296, -247), (-236, -342), (-209, -405), (-121, -386), (-50, -362),
        (28, -337), (18, -319), (-43, -191), (-56, -161), (-75, -118)])
TRACKS['acad'] = dict(name='Academie', sub='Langs het Academiegebouw, door de Hofstraat, de Jacobijnerstraat en de Oude Ebbingestraat', start=(-205, 165),
    wp=[(-160, 98), (-200, 140), (-250, 200), (-210, 290), (-150, 300), (-100, 305), (72, 306), (46, 220), (-33, 193), (-20, 139),
        (-52, 130), (-75, 121), (-121, 102)])

def build(tid, d):
    wps = [snap(*w) for w in d['wp']]
    path = []; banned = set()
    for i in range(len(wps)):
        seg = route(wps[i], wps[(i + 1) % len(wps)], banned)
        for a, b in zip(seg, seg[1:]): banned.add(frozenset((a, b)))
        path += seg[:-1]
    # remove immediate back-tracks A,B,A
    changed = True
    while changed:
        changed = False
        for i in range(len(path)):
            if len(path) > 4 and path[i] == path[(i + 2) % len(path)]:
                j = (i + 1) % len(path); del path[max(i, j)]; del path[min(i, j)]; changed = True; break
    pts = []
    for i, n in enumerate(path):
        x, z = P[n]; nm = edge_name(n, path[(i + 1) % len(path)])
        if pts and math.dist(pts[-1][:2], (x, z)) < .5: continue
        pts.append((x, z, nm))
    sm = fillet(pts); rs, total = resample(sm, 2.0)
    rs = centre(rs); rs = clearance(rs)
    if d.get('start'):                                # rotate so the start/finish line sits on a straight
        sx, sz = -d['start'][0], d['start'][1]
        k0 = min(range(len(rs)), key=lambda k: (rs[k][0] - sx) ** 2 + (rs[k][1] - sz) ** 2)
        rs = rs[k0:] + rs[:k0]
    names = [p[2] for p in rs]; last = next((n for n in names if n), d['name'])
    for i in range(len(names)):
        if names[i]: last = names[i]
        else: names[i] = last
    # checks: reused streets, parts of the route that come too close to each other
    used = collections.Counter(frozenset((a, b)) for a, b in zip(path, path[1:] + path[:1]))
    dup = sum(1 for v in used.values() if v > 1)
    close = 0
    for i in range(0, len(rs), 3):
        for j in range(i + 25, len(rs) - (25 if i < 25 else 0), 3):
            if math.dist(rs[i][:2], rs[j][:2]) < 7: close += 1
    print(f"{tid:6s} {d['name']:18s} {total:6.0f} m  {len(rs)} samples  reused edges {dup}  close passes {close}  streets: {', '.join(dict.fromkeys(names))}")
    return {'name': d['name'], 'sub': d['sub'], 'len': round(total, 1), 'x': [round(p[0], 2) for p in rs], 'z': [round(p[1], 2) for p in rs], 'st': names}

D = json.load(open(OUT))
D['tracks'] = {tid: build(tid, d) for tid, d in TRACKS.items()}
json.dump(D, open(OUT, 'w'), separators=(',', ':'))

if PLOT:
    import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    for tid, t in D['tracks'].items():
        xs, zs = t['x'], t['z']
        x0, x1, z0, z1 = min(xs) - 40, max(xs) + 40, min(zs) - 40, max(zs) + 40
        fig, ax = plt.subplots(figsize=(10, 10 * (z1 - z0) / (x1 - x0)))
        for b in D['buildings']:
            bx, bz = b[0::2], b[1::2]
            if max(bx) < x0 or min(bx) > x1 or max(bz) < z0 or min(bz) > z1: continue
            ax.fill([-v for v in bx], bz, color='#cfcfcf', lw=.3, ec='#999')
        ax.plot([-v for v in xs] + [-xs[0]], zs + [zs[0]], 'r-', lw=2.2)
        for i in range(0, len(xs), 25):
            j = (i + 2) % len(xs); ax.annotate('', xy=(-xs[j], zs[j]), xytext=(-xs[i], zs[i]), arrowprops=dict(arrowstyle='->', color='darkred', lw=1.5))
        ax.plot(-xs[0], zs[0], 'go', ms=10)
        for k, w in enumerate(TRACKS[tid]['wp']): ax.text(w[0], w[1], str(k), fontsize=9, color='blue')
        ax.set_xlim(-x1, -x0); ax.set_ylim(z0, z1); ax.set_aspect('equal'); ax.set_title(f"{t['name']} {t['len']:.0f} m")
        plt.tight_layout(); plt.savefig(os.path.join(PLOT, f'route_{tid}.png'), dpi=65); plt.close()
