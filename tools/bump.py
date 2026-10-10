# proef/game.js is now edited directly; this only refreshes the cache-busting version numbers.
import re,time
V=time.strftime('%Y%m%d%H%M%S')
for f in ('proef/game.js','proef/index.html'):
    s=open(f).read();s=re.sub(r'\?v=\d+','?v='+V,s);open(f,'w').write(s)
print('version',V)
