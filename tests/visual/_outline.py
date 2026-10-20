import json,sys
f,maxdepth=sys.argv[1],int(sys.argv[2])
start=sys.argv[3] if len(sys.argv)>3 else None
lines=json.load(open(f,encoding='utf-8'))[0]['text'].split('\n')
if start:
    i=[k for k,l in enumerate(lines) if 'id="%s"'%start in l][0]
    base=(len(lines[i])-len(lines[i].lstrip()))//2
    lines=lines[i:]
else: base=0
for n,l in enumerate(lines):
    ind=(len(l)-len(l.lstrip()))//2-base
    if n>0 and ind<0: break
    if ind<=maxdepth and not l.strip().startswith('</') and 'hidden="true"' not in l:
        print('  '*ind+l.strip()[:170])
