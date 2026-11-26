"""Sculpt the original Giovanna avatar and export its self-contained glTF 2.0 asset.

Run with Python 3 and Pillow from any directory. Measurements and pivots are in model space,
facing +Z. Parts sharing a pivot and finish are batched for the mobile renderer.
"""
import json
import math
import struct
from collections import defaultdict
from pathlib import Path

from avatar_face_paint import face_colors

TAU = math.tau
sin, cos, pi = math.sin, math.cos, math.pi
TARGET = Path(__file__).resolve().parents[1] / 'src/assets/avatar/giovanna.glb'
mesh_parts = defaultdict(lambda: ([], []))
pivots = {}


def pivot(name, parent, position):
    pivots[name] = (parent, position)


def minus(a, b):
    return tuple(x-y for x, y in zip(a, b))


def cross(a, b):
    return (a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0])


def unit(v):
    length = math.sqrt(sum(x*x for x in v)) or 1
    return tuple(x/length for x in v)


def add_mesh(group, finish, vertices, faces):
    positions, triangles = mesh_parts[group, finish]
    offset = len(positions)
    positions.extend(vertices)
    triangles.extend((offset+a, offset+b, offset+c) for a,b,c in faces)


def wrap(group, finish, sections, n, point, cap=True):
    """Loft a stack of closed rings, in ascending order along its axis."""
    vertices = [point(i,j*TAU/n) for i in range(sections) for j in range(n)]
    faces = []
    for i in range(sections-1):
        for j in range(n):
            a = i*n+j
            b = i*n+(j+1)%n
            faces.extend(((a,b,b+n),(a,b+n,a+n)))
    # Cap the two terminal rings.
    for j in range(1,n-1) if cap else []:
        faces.extend(((0,j+1,j),((sections-1)*n,(sections-1)*n+j,(sections-1)*n+j+1)))
    add_mesh(group,finish,vertices,faces)


def loft(group, finish, rings, n=24, flutes=0, cap=True):
    """Cross sections use y, center x/z, and horizontal/depth radii."""
    def point(i, a):
        y,x,z,rx,rz = rings[i]
        wave = 1 + flutes*cos(10*a)*max(0,1-i/(len(rings)-1))**1.5
        return (x+rx*sin(a)*wave, y, z+rz*cos(a)*wave)
    wrap(group, finish, len(rings), n, point, cap=cap)


def ell(group, finish, x,y,z, rx,ry,rz, tilt=0, n=16, m=9):
    def point(i,a):
        lat = -pi/2+pi*i/m
        dx,dy = rx*cos(lat)*sin(a), ry*sin(lat)
        return (x+dx*cos(tilt)-dy*sin(tilt), y+dy*cos(tilt)+dx*sin(tilt), z+rz*cos(lat)*cos(a))
    wrap(group, finish, m+1, n, point)


def tube(group, finish, path, widths, n=8):
    """Parallel-frame swept detail with round ends tapered by the author."""
    if isinstance(widths,(float,int)):
        widths=[widths]*len(path)
    frames=[]
    for i,p in enumerate(path):
        tangent=unit(minus(path[min(i+1,len(path)-1)],path[max(0,i-1)]))
        # Keep frame orientation stable even for strands that turn towards depth.
        ref=frames[-1][0] if frames else ((1,0,0) if abs(tangent[0])<.85 else (0,0,1))
        side=unit(cross(tangent,ref))
        right=unit(cross(side,tangent))
        frames.append((right,side))
    def point(i,a):
        right,side=frames[i]
        return tuple(path[i][j]+widths[i]*(cos(a)*right[j]+sin(a)*side[j]) for j in range(3))
    wrap(group,finish,len(path),n,point)


def arc(group, finish, start, mid, end, radius, steps=10):
    path=[]
    for i in range(steps+1):
        t=i/steps
        path.append(tuple((1-t)**2*a+2*(1-t)*t*b+t*t*c for a,b,c in zip(start,mid,end)))
    tube(group,finish,path,[radius*(.2+.8*sin(pi*i/steps)**.45) for i in range(steps+1)])


pivot('Giovanna',None,(0,0,0))
pivot('Torso','Giovanna',(0,1.065,0))
pivot('Head','Torso',(0,1.48,0))
pivot('Mouth','Head',(0,1.596,.156))

# Scoop-neck cropped tee, exposed midriff and drawstring joggers match the reference.
def heart(group, finish, x,y,z, size, pitch=0):
    points=[]
    for i in range(49):
        a=TAU*i/48
        dx=size*sin(a)**3
        dy=size*(13*cos(a)-5*cos(2*a)-2*cos(3*a)-cos(4*a))/16
        points.append((x+dx,y+dy*cos(pitch),z-dy*sin(pitch)))
    tube(group,finish,points,size*.092,7)


loft('Torso','skin',[(.988,0,.001,.159,.112),(1.026,0,.002,.147,.109),
    (1.064,0,.002,.139,.105),(1.105,0,.003,.142,.111),(1.14,0,.004,.156,.121)])
ell('Torso','nostril',0,1.039,.111,.004,.009,.002)
tee=[(1.075,0,.001,.144,.110),(1.082,0,.001,.147,.112),
    (1.109,0,.004,.149,.113),(1.15,0,.008,.161,.124),(1.210,0,.013,.183,.145),
    (1.256,0,.009,.192,.143),(1.301,0,.002,.196,.129),(1.329,0,0,.189,.116),
    (1.350,0,-.004,.160,.100),(1.364,0,-.002,.116,.091)]
def neckline(i,a):
    y,x,z,rx,rz=tee[i]
    w=max(0,(i-5)/4)
    return (x+rx*sin(a),y-.073*w*max(0,cos(a))**2,z+rz*cos(a)+.030*w*max(0,cos(a))**2)
wrap('Torso','lavender',len(tee),40,neckline,cap=False)
# The exposed collar fills the scoop and flows into the neck.
def collar(i,a):
    f=i/4
    x,y,z=neckline(len(tee)-1,a)
    return (x*(1-.42*f),y*(1-f)+1.41*f,z*(1-f)+(.061*cos(a)+.003)*f)
wrap('Torso','skin',5,40,collar,cap=False)
tube('Torso','rib',[neckline(len(tee)-1,a*TAU/48) for a in range(49)],.0040,8)
loft('Torso','rib',[(1.075,0,.001,.145,.111),(1.081,0,.002,.148,.113)],36)
heart('Torso','piping',.056,1.25,.153,.023)
# Broad waist, joined hip and relaxed tapered trouser legs. Soft gathers at ankles.
loft('Giovanna','rib',[(.985,0,-.003,.180,.131),(.994,0,-.003,.177,.130),
    (1.015,0,-.003,.164,.120),(1.019,0,-.003,.160,.117)],36)
for side in [-1,1]:
    arc('Giovanna','cord',(0,1.002,.122),(side*.051,1.042,.132),(side*.037,.993,.135),.0047)
    arc('Giovanna','cord',(side*.037,.993,.135),(side*.028,.975,.144),(0,1.002,.125),.0044)
    arc('Giovanna','cord',(0,1.002,.127),(side*.018,.979,.152),(side*.020,.933,.146),.0043)
ell('Giovanna','cord',0,1.002,.130,.010,.009,.008)
loft('Torso','skin',[(1.399,0,.002,.067,.063),(1.416,0,.003,.062,.059),
                      (1.450,0,.010,.062,.057),(1.480,0,.010,.067,.061),
                      (1.51,0,.010,.080,.072)],cap=False)
# Tapered arms and shaped hands. The gentle asymmetric pose leaves the waist visible.
for s,label in [(-1,'R'),(1,'L')]:
    g='Arm'+label
    pivot(g,'Torso',(s*.181,1.324,0))
    fore='Forearm'+label
    pivot(fore,g,(s*.261,1.092,0))
    wrist_y=.881 if s==-1 else .963
    wrist_x=.273 if s==-1 else .307
    wrist_z=.085 if s==-1 else .165
    elbow=(1.093,s*.264,.003,.045,.047)
    loft(fore,'skin',[(wrist_y,s*wrist_x,wrist_z,.027,.027),
        (wrist_y+.030,s*(wrist_x+.002),wrist_z-.007,.031,.032),
        (wrist_y+.063,s*(wrist_x+.001),wrist_z*.68,.038,.039),
        (1.052,s*(.281 if s<0 else .284),wrist_z*.39,.043,.044),
        (1.073,s*.273,wrist_z*.19,.046,.047),elbow],cap=False)
    loft(g,'skin',[elbow,
        (1.12,s*.259,-.002,.048,.051),(1.184,s*.235,-.003,.054,.056),
        (1.262,s*.210,-.004,.056,.058),(1.315,s*.183,0,.047,.049)],cap=False)
    sleeve=[(1.222,s*.223,.001,.057,.062),(1.234,s*.220,.001,.061,.065),
        (1.258,s*.214,.002,.066,.071),(1.286,s*.205,.002,.071,.077),
        (1.312,s*.192,.001,.073,.080),(1.334,s*.182,0,.067,.072),
        (1.35,s*.169,-.001,.049,.056),(1.356,s*.160,-.001,.030,.038)]
    def sleeve_point(i,a):
        y,x,z,rx,rz=sleeve[i]
        return (x+rx*sin(a),y-.014*s*sin(a)*max(0,1-i/5),z+rz*cos(a))
    wrap(g,'lavender',len(sleeve),28,sleeve_point)
    tube(g,'rib',[sleeve_point(0,TAU*i/36) for i in range(37)],.0027,7)
    hx=s*wrist_x
    loft(fore,'skin',[(wrist_y-.088,hx-.003*s,wrist_z+.025,.026,.018),
        (wrist_y-.069,hx,wrist_z+.022,.037,.023),(wrist_y-.037,hx,wrist_z+.013,.036,.024),
        (wrist_y-.014,hx,wrist_z+.004,.027,.025),(wrist_y+.012,hx,wrist_z,.026,.025)],18)
    for j,length in enumerate([.043,.053,.051,.041]):
        fx=hx+(j-1.5)*.0165*s
        tube(fore,'skin',[(fx,wrist_y-.074,wrist_z+.022),(fx-.002*s,wrist_y-.087,wrist_z+.027),
             (fx-.004*s,wrist_y-.075-length+.007,wrist_z+.035),(fx-.004*s,wrist_y-.075-length,wrist_z+.036)],
             [.010,.0094,.008,.002],10)
    arc(fore,'skin',(hx-.025*s,wrist_y-.032,wrist_z+.012),(hx-.052*s,wrist_y-.063,wrist_z+.026),
        (hx-.048*s,wrist_y-.080,wrist_z+.041),.012)
    lx=s*.100
    # Slight contrapposto and turned-out toes keep the pose soft and readable.
    stride=.027 if s<0 else -.015
    loft('Giovanna','skin',[(.062,lx,0+stride,.039,.043),(.120,lx,-.004+stride,.038,.041),
        (.181,lx,-.009+stride,.039,.044),(.22,lx,-.011+stride,.048,.054)],24)
    leg=[(.137,.046,.048,0),(.161,.051,.053,0),(.174,.062,.065,0),
        (.205,.071,.075,0),(.267,.073,.079,0),(.35,.077,.086,0),
        (.445,.084,.093,0),(.535,.092,.100,0),(.627,.096,.109,0),
        (.715,.099,.117,0),(.753,.102,.121,.09),(.790,.106,.125,.30),
        (.829,.107,.131,.62),(.867,.108,.141,.89),(.902,.106,.147,1),
        (.940,.102,.145,1),(.975,.092,.139,1),(1.001,.083,.126,1)]
    points=[]; faces=[]
    for row,(y,rx,rz,blend) in enumerate(leg):
        for col in range(41):
            t=col/40
            # A circular ankle grows into half of the continuous elliptical hip.
            knee=.010*math.exp(-((y-.52)/.15)**2)
            center=.099+knee
            lower_x=center-rx*cos(TAU*t)
            upper_x=2*rx*sin(pi*t)
            x=s*((1-blend)*lower_x+blend*upper_x)
            z=(1-blend)*rz*sin(TAU*t)+blend*rz*cos(pi*t)-.007
            z+=stride*max(0,(.73-y)/.60)
            points.append((x,y,z))
            if row and col:
                i=row*41+col
                faces.extend(((i-42,i-41,i),(i-42,i,i-1)) if s>0 else ((i-42,i,i-41),(i-42,i-1,i)))
    add_mesh('Giovanna','pants',points,faces)
    loft('Giovanna','rib',[(.123,lx,-.007+stride,.046,.052),(.131,lx,-.007+stride,.048,.053),
        (.154,lx,-.007+stride,.051,.057)],26)
    sz=.048+stride
    loft('Giovanna','slipper',[(.011,lx,sz,.059,.108),(.020,lx,sz,.068,.117),
        (.041,lx,sz,.071,.120),(.060,lx,sz,.069,.118),(.077,lx,sz+.007,.064,.107),
        (.091,lx,sz+.025,.057,.085),(.101,lx,sz+.035,.048,.065),(.107,lx,sz+.040,.029,.040)],28)
    loft('Giovanna','sole',[(.004,lx,sz,.057,.105),(.009,lx,sz,.062,.111),(.019,lx,sz,.067,.116)],24)
    heart('Giovanna','pink',lx,.089,sz+.111,.020,.75)

# A continuous facial surface. Front, cheeks and jaw are sculpted with distinct profiles.
face_rings=[(1.491,.018,.048,.045),(1.496,.050,.077,.043),(1.511,.084,.102,.040),
 (1.536,.125,.130,.033),(1.573,.150,.145,.025),(1.619,.168,.154,.017),
 (1.667,.188,.165,.013),(1.709,.194,.167,.013),(1.757,.193,.165,.011),
 (1.81,.189,.159,.008),(1.866,.177,.150,.004),(1.914,.152,.133,0),
 (1.949,.106,.100,-.003),(1.972,.025,.031,-.004)]
dense=[]
for current,nxt in zip(face_rings,face_rings[1:]):
    steps=math.ceil((nxt[0]-current[0])/.0065)
    previous=face_rings[max(0,face_rings.index(current)-1)]
    following=face_rings[min(len(face_rings)-1,face_rings.index(nxt)+1)]
    dy=nxt[0]-current[0]
    for j in range(steps):
        t=j/steps
        sample=[current[0]+dy*t]
        for k in [1,2,3]:
            a,b=current[k],nxt[k]
            m0=(b-previous[k])/(nxt[0]-previous[0])*dy
            m1=(following[k]-a)/(following[0]-current[0])*dy
            sample.append((2*t**3-3*t*t+1)*a+(t**3-2*t*t+t)*m0+
                          (-2*t**3+3*t*t)*b+(t**3-t*t)*m1)
        dense.append(sample)
dense.append(face_rings[-1])
def face(i,a):
    y,rx,rz,zc=dense[i]
    x=rx*sin(a)
    z=zc+rz*cos(a)
    cheek=.015*math.exp(-((abs(x)-.112)/.056)**2-((y-1.679)/.038)**2)
    bridge=.016*math.exp(-(x/.024)**2-((y-1.710)/.044)**2)
    tip=.043*math.exp(-(x/.031)**2-((y-1.667)/.018)**2)
    alas=.021*math.exp(-((abs(x)-.027)/.012)**2-((y-1.658)/.012)**2)
    return (x,y,z+(cheek+bridge+tip+alas)*max(0,cos(a)))
wrap('Head','skin',len(dense),72,face)
for s in [-1,1]:
    ell('Head','skin',s*.026,1.654,.181,.018,.012,.015,n=14)
    ell('Head','nostril',s*.022,1.654,.197,.005,.002,.0014,n=12)
    ell('Head','skin',s*.180,1.675,.009,.032,.050,.022,tilt=-s*.12)
    ell('Head','rose',s*.198,1.673,.024,.013,.025,.005,tilt=-s*.14)
    ear_path=[(s*(.184+.017*cos(TAU*i/28)),1.627+.025*sin(TAU*i/28),.090+.007*cos(TAU*i/28)) for i in range(29)]
    tube('Head','gold',ear_path,.0057,9)

# Almond-shaped eyes made from trimmed domes instead of exposed spheres.
for s,label in [(-1,'R'),(1,'L')]:
    cx=s*.077
    cy=1.732
    pivot('Eye'+label,'Head',(cx,cy,.171))
    def eyez(x,y):
        u=(x-cx)/.060
        v=(y-cy-s*.14*(x-cx))/.038
        return .179-s*.36*(x-cx)+.012*(1-u*u)-.006*v*v
    def eye_outline(t,upper):
        x=cx+.061*t
        y=cy+s*.14*(x-cx)+(1 if upper else -1)*(.034 if upper else .030)*max(0,1-t*t)**.72
        return (x,y,eyez(x,y))
    verts=[]; inds=[]
    for j in range(7):
        for i in range(23):
            t=i/11-1
            x,ylo,_=eye_outline(t,False)
            _,yhi,_=eye_outline(t,True)
            y=ylo+(yhi-ylo)*j/6
            verts.append((x,y,eyez(x,y)))
            if j and i:
                k=j*23+i
                inds.extend(((k-24,k-23,k),(k-24,k,k-1)))
    add_mesh('Eye'+label,'ivory',verts,inds)
    # Iris, limbal ring, pupil and highlights conform to the corneal surface.
    def disc(finish,x,y,rx,ry,d):
        vertices=[(x,y,eyez(x,y)+d)]
        faces=[]
        n=28
        rings = 5 if finish=='iris' else 2
        for row in range(1,rings+1):
            for j in range(n):
                px=x+rx*cos(TAU*j/n)*row/rings
                py=y+ry*sin(TAU*j/n)*row/rings
                vertices.append((px,py,eyez(px,py)+d))
                k=1+(row-1)*n+j
                nxt=1+(row-1)*n+(j+1)%n
                if row==1:
                    faces.append((0,k,nxt))
                else:
                    faces.extend(((k-n,k,nxt),(k-n,nxt,nxt-n)))
        add_mesh('Eye'+label,finish,vertices,faces)
    ix=cx-s*.003
    disc('lash',ix,cy,.030,.029,.0030)
    disc('iris',ix,cy-.0005,.027,.026,.0048)
    disc('pupil',ix,cy+.001,.019,.021,.0065)
    disc('ivory',ix-.006,cy+.012,.0064,.0062,.0090)
    disc('pearl',ix+.007,cy-.009,.0023,.0022,.0095)
    path=[eye_outline(i/10-1,True) for i in range(21)]
    tube('Eye'+label,'lash',[(x,y,z+.002) for x,y,z in path],[.0007+.0032*sin(pi*i/20)**.48 for i in range(21)])
    x,y,z=eye_outline(s*.90,True)
    arc('Eye'+label,'lash',(x-s*.009,y+.004,z+.003),(x+s*.005,y,z+.002),(x+s*.012,y+.007,z-.003),.0027)
    for j in range(4):
        u=.52+j*.122
        x,y,z=eye_outline(s*u,True)
        arc('Eye'+label,'lash',(x,y,z+.002),(x+.009*s,y+.001,z+.003),
            (x+(.009+.002*j)*s,y+.008-.0007*j,z-.001),.0024,7)
    b='Brows'+label
    pivot(b,'Head',(cx,1.781,.165))
    arc(b,'hair',(s*.028,1.790,.178),(s*.077,1.822,.177),(s*.139,1.790,.146),.0103,16)
# Two shaped lips with raised corners, resting in a gentle smile.
for upper in [False,True]:
    verts=[]; inds=[]
    for j in range(5):
        f=j/4
        for i in range(25):
            t=i/12-1
            w=1-t*t
            x=.061*t
            seam=1.594+.013*t*t+(.007 if upper else -.003)*w
            lip=(.009+.007*math.exp(-((abs(t)-.30)/.23)**2))*w if upper else -.012*w
            y=seam+f*lip
            z=.177-.021*t*t+.010*w*sin(pi*f*.9)
            verts.append((x,y,z))
            if i and j:
                k=j*25+i
                faces=((k-26,k-25,k),(k-26,k,k-1))
                inds.extend(faces if upper else [t[::-1] for t in faces])
    add_mesh('Mouth','lipTop' if upper else 'lip',verts,inds)
# A small visible upper dental arc softens the resting smile.
for j in range(2):
    points=[]; faces=[]
    for row in range(2):
        for i in range(31):
            t=i/15-1
            w=1-t*t
            top=1.594+.013*t*t+.007*w
            y=top-(.0045 if j==0 else .010)*w*row-(0 if j==0 else .0045)*w*(1-row)
            points.append((.061*t,y,.1765-.021*t*t))
            if row and i:
                k=row*31+i
                faces.extend(((k-32,k,k-31),(k-32,k-1,k)))
    add_mesh('Mouth','ivory' if j==0 else 'crease',points,faces)
# The bob opens into a wide cascade of curls at the jaw. Each overlapping section
# has a flattened lens profile with three longitudinal ridges, like sculpted hair.
def hair_edge(a):
    f=cos(a)
    if f>.77:
        return 1.828+.047*sin(a)+.027*f
    if f>.20:
        t=(f-.20)/.57
        t=t*t*(3-2*t)
        return 1.526+.016*cos(7*a)+(1.854+.044*sin(a)-1.526)*t
    return 1.511+.020*cos(5*a+.7)+.010*f


def hair_surface(a,t):
    y=hair_edge(a)+(2.016-hair_edge(a))*t
    if y<1.747:
        f=.94+.08*sin(pi*max(0,(y-1.48))/.25)
    else:
        f=math.sqrt(max(.0001,1-((y-1.747)/.269)**2))
    # Broad changing direction in the curl pattern is visible from the silhouette.
    wave=1+.039*cos(8*a+3.5*sin(5*t))*(1-t)+.027*sin(12*a-4*t)*(1-t)
    side=abs(sin(a))
    return (.043*t+(.235+.041*side*(1-t))*f*sin(a)*wave,y,-.013+.218*f*cos(a)*wave)


wrap('Head','hair',19,80,lambda i,a:hair_surface(a,i/18),cap=False)
# Underturned lower edge gives the free ends of the bob a soft, solid thickness.
def edge(i,a):
    x,y,z=hair_surface(a,0)
    depth=(i/4)
    return (x*(.53+.47*depth),y-.013*sin(pi*depth)+.064*(1-depth),z*(.53+.47*depth))
wrap('Head','hair',5,80,edge,cap=False)


def lock(path,widths,thickness,finish='hairRidge',strand=True):
    frames=[]
    for i,p in enumerate(path):
        tangent=unit(minus(path[min(i+1,len(path)-1)],path[max(i-1,0)]))
        # A broad cross section lies along the scalp instead of making cylindrical ropes.
        outward=unit((p[0]-.015,(p[1]-1.73)*.78,p[2]+.012))
        w=unit(cross(tangent,outward))
        normal=unit(cross(w,tangent))
        frames.append((w,normal))
    def point(i,a):
        w,normal=frames[i]
        ridge=.82+.18*cos(5*a)
        return tuple(path[i][k]+widths[i]*w[k]*cos(a)
                     -thickness[i]*normal[k]*sin(a)*ridge for k in range(3))
    wrap('Head',finish,len(path),10,point,cap=False)
    if strand:
        for a in [-.92]:
            line=[point(i,a) for i in range(1,len(path)-1,2)]
            tube('Head','strand',line,[max(.0003,min(.00135,v*.052)) for v in widths[1:-1:2]],5)


def smooth(points,steps=3):
    """Catmull-Rom interpolation gives the side-swept tips a sculpted tangent."""
    output=[]
    for i in range(len(points)-1):
        a,b,c,d=points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)]
        for j in range(steps):
            t=j/steps
            output.append(tuple(.5*(2*bb+(-aa+cc)*t+(2*aa-5*bb+4*cc-dd)*t*t+
                              (-aa+3*bb-3*cc+dd)*t**3) for aa,bb,cc,dd in zip(a,b,c,d)))
    return output+[points[-1]]


for j in range(27):
    a=-pi+TAU*(j+.21)/27
    path=[]; widths=[]; depths=[]
    for i in range(22):
        t=i/21
        sway=.19*sin(t*TAU*1.20+j*.51)*(1-t)**.65
        angle=a+sway+.36*t+.12*sin(pi*t)
        x,y,z=hair_surface(angle,.005+.968*t)
        f=sin(pi*t)**.54
        puff=.004+.009*f
        path.append((x+puff*sin(angle),y+.007,z+puff*cos(angle)))
        widths.append(.001+(.032+.006*cos(j))*f)
        depths.append(.001+.014*f)
    lock(path,widths,depths,'hairSheen' if j%5==0 else 'hairRidge')

# Broad interwoven S-shaped sections create a side part and a sweep over the left brow.
for j in range(5):
    ofs=j*.010
    path=smooth([(.101+ofs,1.908,.133-ofs),(.089+ofs,1.971+.1*ofs,.139-ofs),
        (.041+ofs,1.995,.149-ofs),(-.017+ofs,1.980,.163-ofs),
        (-.064+ofs,1.944,.186-ofs),(-.097,1.902+ofs,.190),
        (-.132,1.870+ofs,.181),(-.166,1.855+ofs,.161),
        (-.196,1.860+ofs,.132),(-.202,1.879+ofs,.116)])
    f=[sin(pi*i/(len(path)-1))**.6 for i in range(len(path))]
    lock(path,[.001+.023*v for v in f],[.001+.012*v for v in f],
         'hairSheen' if j==2 else 'hairRidge')
# Cascading ringlets framed away from the face. Curled-under tips leave the hoops visible.
for s in [-1,1]:
    for j in range(8):
        a=.91+j*.20
        path=[]; widths=[]; depths=[]
        for i in range(21):
            t=i/20
            y=1.857+j*.005-(.311+.014*sin(j*1.8))*t
            wave=TAU*(1.43*t+.10*j+.11)
            # Lift and roll the tip back into an open C curl.
            tip=max(0,(t-.78)/.22)
            y+=.034*tip**2
            radius=.229+.016*j/7+.022*sin(pi*t)+.027*cos(wave)-.018*tip
            x=s*radius*sin(a)
            z=.178*cos(a)+.023*sin(wave)+.010
            path.append((x,y,z))
            swell=sin(pi*t)**.48
            widths.append(.0015+(.022+.004*sin(j))*swell)
            depths.append(.001+.015*swell)
        lock(path,widths,depths,'hairSheen' if j%4==0 else 'hairRidge')

palette={
 'skin':('#bd7954',.66,0),'nostril':('#795041',.78,0),'rose':('#a56858',.68,0),
 'ivory':('#fff3e8',.32,0),'pearl':('#ffe8cf',.35,.12),'lash':('#38232a',.64,0),
 'pupil':('#261c25',.22,0),'iris':('#996337',.33,0),'hair':('#37231f',.43,0),
 'hairRidge':('#3e2822',.51,0),'hairSheen':('#4e3228',.50,0),'strand':('#57382b',.54,0),'lip':('#ba6b70',.44,0),
 'lipTop':('#a85b64',.51,0),'crease':('#804754',.70,0),'lavender':('#c48bc4',.77,0),
 'plum':('#9674ad',.83,0),'sash':('#745784',.66,0),'piping':('#e1c6e5',.70,0),
 'gold':('#d9aa68',.35,.45),'shoe':('#735369',.43,0),'sole':('#d4afbc',.72,0),
 'rib':('#b782bf',.8,0),'pants':('#bd8bc4',.86,0),'cord':('#dcbada',.70,0),
 'slipper':('#efdadc',.95,0),'pink':('#ca91bb',.67,0),
}


def linear(s):
    return s/12.92 if s<=.04045 else ((s+.055)/1.055)**2.4


def export():
    # Batch into one mesh per moving pivot. Uniform PBR finishes are carried by vertex
    # colors, keeping most of the character in a single draw per moving part.
    blob=bytearray()
    doc={'asset':{'version':'2.0','generator':'DD original procedural sculpture'},
         'scene':0,'scenes':[{'nodes':[0]}],'nodes':[],'meshes':[], 'materials':[],
         'accessors':[],'bufferViews':[],'buffers':[]}
    def accessor(values,fmt,component,kind,target,bounds=False,normalized=False):
        while len(blob)%4:blob.append(0)
        offset=len(blob)
        row=struct.Struct('<'+fmt)
        for v in values: blob.extend(row.pack(*v))
        view=len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(blob)-offset,'target':target})
        if target is None: del doc['bufferViews'][view]['target']
        item={'bufferView':view,'componentType':component,'count':len(values),'type':kind}
        if bounds:
            item.update(min=list(map(min,zip(*values))),max=list(map(max,zip(*values))))
        if normalized:item['normalized']=True
        doc['accessors'].append(item)
        return len(doc['accessors'])-1
    finishes={'matte':(.76,0),'satin':(.45,.01),'metal':(.36,.45)}
    for name,(rough,metal) in finishes.items():
        doc['materials'].append({'name':name,'pbrMetallicRoughness':{'roughnessFactor':rough,'metallicFactor':metal}})
    nodes={name:i for i,name in enumerate(pivots)}
    for name,(parent,center) in pivots.items():
        node={'name':name,'translation':list(minus(center,pivots[parent][1]) if parent else center)}
        children=[nodes[n] for n,(p,_) in pivots.items() if p==name]
        if children:node['children']=children
        batches=defaultdict(lambda:([],[],[],[]))
        for (part,mat),(positions,faces) in mesh_parts.items():
            if part!=name: continue
            code,rough,metal=palette[mat]
            finish='metal' if metal>.3 else ('matte' if rough>.58 else 'satin')
            p,n,c,ind=batches[finish]
            offset=len(p)
            color=tuple(round(255*linear(int(code[i:i+2],16)/255)) for i in (1,3,5))+(255,)
            p.extend(minus(pos,center) for pos in positions)
            normal=[[0,0,0] for pos in positions]
            for a,b,d in faces:
                v=cross(minus(positions[b],positions[a]),minus(positions[d],positions[a]))
                if sum(x*x for x in v)<1e-20: continue
                for k in [a,b,d]:
                    for axis in range(3):normal[k][axis]+=v[axis]
                ind.append((offset+a,));ind.append((offset+b,));ind.append((offset+d,))
            for pos,v in zip(positions,normal):
                if part.startswith(('Arm','Forearm')) and mat=='skin' and abs(pos[1]-1.093)<.00001:
                    side=1 if part.endswith('L') else -1
                    rx=(pos[0]-side*.264)/.045
                    rz=(pos[2]-.003)/.047
                    v=(rx,.25*rx*side+.4*rz,rz)
                n.append(unit(v) if any(v) else (0,1,0))
            c.extend(face_colors(part,mat,positions,color))
        primitives=[]
        for finish,(p,n,c,ind) in batches.items():
            primitives.append({'attributes':{'POSITION':accessor(p,'3f',5126,'VEC3',34962,True),
                'NORMAL':accessor(n,'3f',5126,'VEC3',34962),
                'COLOR_0':accessor(c,'4B',5121,'VEC4',34962,normalized=True)},
                'indices':accessor(ind,'H',5123,'SCALAR',34963),'material':list(finishes).index(finish)})
        if name=='Mouth':
            for primitive,(positions,_,_,_) in zip(primitives,batches.values()):
                # Broaden and raise the lip corners while retaining the Cupid's bow.
                deltas=[(.15*x,.014*min(1,abs(x)/.061)**1.7,0) for x,y,z in positions]
                primitive['targets']=[{'POSITION':accessor(deltas,'3f',5126,'VEC3',34962,True)}]
        if primitives:
            node['mesh']=len(doc['meshes'])
            mesh={'name':name,'primitives':primitives}
            if name=='Mouth':
                mesh.update(weights=[0],extras={'targetNames':['Smile']})
            doc['meshes'].append(mesh)
        doc['nodes'].append(node)
    # A portable idle clip for glTF viewers. The app uses the same pivots for
    # continuously blended phase-aware breathing, blinking and swaying.
    times=[(i*1.25,) for i in range(5)]
    clock=accessor(times,'f',5126,'SCALAR',None,True)
    anim={'name':'Luteal_Breath','samplers':[],'channels':[]}
    for name,channel in [('Torso','scale'),('Head','rotation')]:
        vals=[]
        for i in range(5):
            breath=sin(i*pi/2)
            if channel=='scale':
                vals.append((1+.008*breath,1+.006*breath,1+.013*breath))
            else:
                angle=breath*.015
                vals.append((0,0,sin(angle/2),cos(angle/2)))
        track=accessor(vals,'3f' if channel=='scale' else '4f',5126,
                       'VEC3' if channel=='scale' else 'VEC4',None)
        index=len(anim['samplers'])
        anim['samplers'].append({'input':clock,'output':track,'interpolation':'LINEAR'})
        anim['channels'].append({'sampler':index,'target':{'node':nodes[name],'path':channel}})
    doc['animations']=[anim]
    doc['buffers']=[{'byteLength':len(blob)}]
    meta=json.dumps(doc,separators=(',',':')).encode()
    meta+=b' '*(-len(meta)%4)
    blob+=b'\0'*(-len(blob)%4)
    TARGET.parent.mkdir(parents=True,exist_ok=True)
    TARGET.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(meta)+len(blob))
        +struct.pack('<I4s',len(meta),b'JSON')+meta+struct.pack('<I4s',len(blob),b'BIN\0')+blob)


if __name__=='__main__':
    export()
