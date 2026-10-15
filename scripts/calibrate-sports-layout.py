# Calibrate one fixed transform per sport from its visible anchor silhouette.
# A 60/40 ink-centroid / bounding-box blend balances thick bodies and thin gear.
# Ground lines count as part of the composition. Playback keeps the source motion.
import json,re,math
from pathlib import Path
base=Path(__file__).resolve().parents[1]
p=base/'sports-catalog.js';raw=p.read_text();prefix=raw[:raw.index('[')];items=json.loads(raw[raw.index('['):].rstrip().rstrip(';'))
def centroid(f):
 area=cx=cy=0
 for d in re.findall('M[^z]*z',f['path']):
  x=y=0;points=[]
  for cmd,arg in re.findall('([Mhv])([^Mhvz]*)',d):
   v=list(map(float,arg.split()))
   if cmd=='M':x,y=v
   elif cmd=='h':x+=v[0]
   else:y+=v[0]
   points.append((x,y))
  for a,b in zip(points,points[1:]+points[:1]):
   cross=a[0]*b[1]-b[0]*a[1];area+=cross;cx+=(a[0]+b[0])*cross;cy+=(a[1]+b[1])*cross
 return area/2,cx/(3*area),cy/(3*area)
report=[]
for item in items:
 id=item['id'];d=json.load(open(base/'sports-data'/f'{id}.json'));f=d['frames'][d['anchor']];b=f['bbox'];area,cx,cy=centroid(f);s=.42;x=227-480*s;y=294.94-b[3]*s
 if id=='tabletennis':s=324.22/704;x=53.28-128*s;y=294.94-658.5*s
 mass=[x+cx*s,y+cy*s];box=[x+(b[0]+b[2])/2*s,y+(b[1]+b[3])/2*s];ground=None
 if id in ['running','cycling']:
  ground=[53.28,294.94,377.5,294.94];a=324.22*9.46+math.pi*(9.46/2)**2;nativeArea=area*s*s
  mass=[(mass[0]*nativeArea+215.39*a)/(nativeArea+a),(mass[1]*nativeArea+294.94*a)/(nativeArea+a)]
  box=[(min(x+b[0]*s,53.28-4.73)+max(x+b[2]*s,377.5+4.73))/2,(min(y+b[1]*s,294.94-4.73)+max(y+b[3]*s,294.94+4.73))/2]
 optical=[.6*mass[i]+.4*box[i] for i in range(2)];dx=227-optical[0];dy=227-optical[1]
 layout={'x':round(x+dx,4),'y':round(y+dy,4),'s':s}
 if ground:layout['ground']=[round(ground[0]+dx,4),round(ground[1]+dy,4),round(ground[2]+dx,4),round(ground[3]+dy,4)]
 item['layout']=layout;report.append({'id':id,'offset':[round(dx,2),round(dy,2)],'layout':layout})
p.write_text(prefix+json.dumps(items,ensure_ascii=False,separators=(',',':'))+';\n')
print('\n'.join(f"{r['id']:12} shift {r['offset']}" for r in report))
