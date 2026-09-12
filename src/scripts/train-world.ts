import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createTrainBook } from './train-book';

export type TrainView = 'home' | 'notes' | 'article' | 'gallery' | 'about';

const noiseGLSL = `
float hash(vec3 p) { p = fract(p * .3183099 + vec3(.1,.2,.3)); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x) {
  vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) { return noise(p)*.57+noise(p*2.03+7.1)*.28+noise(p*4.07+13.2)*.15; }
`;

function roundedPath<T extends THREE.Path>(path: T, x: number, y: number, w: number, h: number, r: number): T {
  path.moveTo(x+r,y); path.lineTo(x+w-r,y); path.quadraticCurveTo(x+w,y,x+w,y+r);
  path.lineTo(x+w,y+h-r); path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  path.lineTo(x+r,y+h); path.quadraticCurveTo(x,y+h,x,y+h-r);
  path.lineTo(x,y+r); path.quadraticCurveTo(x,y,x+r,y); return path;
}

// One renderer and one clock live on the persisted backdrop, across every route.
export function createTrainWorld(host: HTMLElement) {
  const canvas = host.querySelector<HTMLCanvasElement>('canvas')!;
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); }
  catch { host.dataset.render = 'fallback'; return null; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // The sun and carriage are fixed. Rebuild their shadow only when the book moves.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#c4e3eb');
  scene.fog = new THREE.Fog('#d0e8eb', 95, 370);
  const camera = new THREE.PerspectiveCamera(51, 1, .06, 2000);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .06);
  scene.environment = environment.texture;
  scene.environmentIntensity = .36;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight('#e6f5ff', '#b5afa1', 1.6));
  const sun = new THREE.DirectionalLight('#fff4de', 2.6);
  sun.position.set(14, 16, -9); sun.target.position.set(0,0,-2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 48 });
  sun.shadow.bias = -.0003; sun.shadow.normalBias = .025;
  scene.add(sun, sun.target);

  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const textures: THREE.Texture[] = [];
  const material = (color: string, roughness=.65, metalness=0) => {
    // Matte walls, cloth and wood need diffuse light, not per-pixel PBR reflections.
    // Keep the physical material on metal and glazed accents where it is visible.
    const m = metalness>.2||roughness<.4
      ? new THREE.MeshStandardMaterial({color,roughness,metalness})
      : new THREE.MeshLambertMaterial({color});
    materials.push(m);return m;
  };
  const ivory = material('#e7e8db'), trim = material('#f3f2e6',.34), gasket = material('#506768',.65);
  const floorMat = material('#b9b7a6', .84), metal = material('#baccc8', .3,.65);
  const fabric = material('#438f90', .95), fabricLight = material('#74b1ac', .98);
  const seam = material('#337b7d'), wood = material('#e0d0ad', .6), dark = material('#526866');
  const weaveData=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++) {
    const n=(y*64+x)*4,v=228+((x%3===0||y%3===0)?-18:9)+((x*17+y*31)%11);
    weaveData[n]=weaveData[n+1]=weaveData[n+2]=v;weaveData[n+3]=255;
  }
  const weave=new THREE.DataTexture(weaveData,64,64);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(8,8);
  // Filter the fine weave across distance and render scales to avoid shimmer.
  weave.generateMipmaps=true;weave.minFilter=THREE.LinearMipmapLinearFilter;weave.magFilter=THREE.LinearFilter;weave.anisotropy=2;weave.needsUpdate=true;textures.push(weave);
  fabric.map=weave;fabricLight.map=weave;
  const lamp = material('#fff7d6',.25); lamp.emissive.set('#fff0c0'); lamp.emissiveIntensity=.7;
  const carriage = new THREE.Group(); scene.add(carriage);
  function box(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,r=.04,parent:THREE.Object3D=carriage) {
    const g = r ? new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/3,h/3,d/3)) : new THREE.BoxGeometry(w,h,d);
    geometries.push(g); const mesh = new THREE.Mesh(g,m); mesh.position.set(x,y,z);
    mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  function cylinder(radius:number,height:number,m:THREE.Material,x:number,y:number,z:number,parent:THREE.Object3D=carriage) {
    const g = new THREE.CylinderGeometry(radius,radius,height,16); geometries.push(g);
    const mesh=new THREE.Mesh(g,m); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
  }
  function wallShape(shape: THREE.Shape, x: number, m: THREE.Material, depth=.12) {
    const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:16}); geometries.push(g);
    const mesh=new THREE.Mesh(g,m); mesh.rotation.y=Math.PI/2; mesh.position.x=x;
    mesh.castShadow=true; mesh.receiveShadow=true; carriage.add(mesh); return mesh;
  }

  const front=-15.5,rear=11.5,length=rear-front,center=(front+rear)/2;
  box(6.25,.18,length,floorMat,0,-.11,center,0);
  // Long seams and a narrow teal aisle inlay give the floor scale without clutter.
  for(let x=-2.7;x<3;x+=.54) box(.012,.005,length,ivory,x,-.012,center,0);
  box(.025,.005,length,seam,-.75,-.008,center,0);
  box(6.3,.18,length,ivory,0,3.65,center,.08);
  for(const x of [-2.62,2.62]) {
    box(.34,.28,length,trim,x,3.48,center,.12);
    box(.065,.022,length,lamp,x-Math.sign(x)*.22,3.36,center,.01);
  }
  const windowCenters = [-10,-5.6,-1.2,3.2,7.6];
  for (const side of [-1,1]) {
    // wallShape turns local x into world -z; every shell edge uses the same bounds.
    const wall = roundedPath(new THREE.Shape(),-rear,0,length,3.65,.15);
    for (const z of windowCenters) wall.holes.push(roundedPath(new THREE.Path(),-z-1.98,1.05,3.96,2.13,.29));
    wallShape(wall,side===1?3.02:-3.15,ivory);
    for(const z of windowCenters) {
      const ring=roundedPath(new THREE.Shape(),-z-2.04,.99,4.08,2.25,.34);
      ring.holes.push(roundedPath(new THREE.Path(),-z-1.92,1.11,3.84,2.01,.25));
      wallShape(ring,side===1?2.91:-3.04,trim,.11);
      const seal=roundedPath(new THREE.Shape(),-z-1.93,1.10,3.86,2.03,.26);
      seal.holes.push(roundedPath(new THREE.Path(),-z-1.89,1.14,3.78,1.95,.235));
      wallShape(seal,side===1?3.035:-3.07,gasket,.025);
      // Tint is very faint so clouds remain bright through the glass.
      const glassMat=new THREE.MeshBasicMaterial({color:'#cae5e1',transparent:true,opacity:.075,depthWrite:false,side:THREE.DoubleSide,forceSinglePass:true});
      materials.push(glassMat);
      const glassShape=roundedPath(new THREE.Shape(),-z-1.89,1.14,3.78,1.95,.235);
      const glassGeo=new THREE.ShapeGeometry(glassShape); geometries.push(glassGeo);
      const glass=new THREE.Mesh(glassGeo,glassMat); glass.rotation.y=Math.PI/2; glass.position.x=side*3.075; carriage.add(glass);
      box(.25,.075,4.0,trim,side*2.91,1.065,z,.03);
    }
    box(.06,.028,length,fabricLight,side*2.95,.79,center,.01);
    box(.045,.12,length,metal,side*2.96,.17,center,.01);
  }

  function bench(x:number,z:number,facing:number) {
    const seat=new THREE.Group(); seat.position.set(x,0,z); seat.rotation.y=facing; carriage.add(seat);
    box(1.65,.23,.96,trim,0,.46,0,.09,seat);
    box(1.57,.22,.9,fabric,0,.62,-.01,.1,seat);
    const back=box(1.68,1.15,.20,trim,0,1.12,.45,.10,seat); back.rotation.x=-.1;
    const cushion=box(1.55,1.02,.19,fabricLight,0,1.18,.32,.09,seat); cushion.rotation.x=-.1;
    box(.013,.77,.011,seam,0,1.15,.217,.003,seat);
    box(1.23,.24,.09,fabricLight,0,1.57,.205,.035,seat);
    for (const side of [-1,1]) {
      box(.10,.09,.78,wood,side*.86,.89,.04,.045,seat);
      box(.035,.34,.05,metal,side*.86,.69,.32,.01,seat);
      box(.065,.44,.65,metal,side*.55,.23,.04,.015,seat);
    }
  }
  for (const z of [-7.3,1.0,8.4]) { bench(2.02,z,0); bench(-2.02,z,0); }
  for (const z of [-3.45,4.95]) {
    bench(2.02,z,Math.PI);
    // The exhibition partition takes up part of this bay. Leave clearance for
    // the entire seat, including the far armrest, in front of the framed artwork.
    bench(z===-3.45?-1.48:-2.02,z,Math.PI);
  }
  // Window tables anchor the different views inside the same carriage.
  for (const z of [-5.4,-1.2,3.0,7.4]) {
    box(1.82,.085,1.17,wood,2.03,1.025,z,.15);
    box(1.83,.028,1.18,trim,2.03,.983,z,.12);
    cylinder(.075,.93,metal,1.85,.49,z);
    box(.68,.06,.54,metal,1.85,.04,z,.08);
  }
  // Dynamic book parts stay out of the static carriage geometry batch.
  const book=createTrainBook();scene.add(book.group);
  box(.28,.012,.015,dark,1.7,1.078,-1.68,.005).rotation.y=.14;
  cylinder(.105,.018,trim,2.50,1.079,-1.04);
  // A complete rim and inner wall remain visible from the overhead book view.
  const cupGeo=new THREE.LatheGeometry([
    [0,0],[.054,0],[.061,.009],[.078,.13],[.077,.137],
    [.07,.137],[.068,.125],[.055,.022],[0,.022],
  ].map(([r,y])=>new THREE.Vector2(r,y)),32);geometries.push(cupGeo);
  const cup=new THREE.Mesh(cupGeo,trim);cup.position.set(2.50,1.083,-1.04);carriage.add(cup);
  cylinder(.066,.004,material('#715a39',.3),2.50,1.2,-1.04);
  const handleGeo=new THREE.TorusGeometry(.042,.014,8,20); geometries.push(handleGeo);
  const handle=new THREE.Mesh(handleGeo,trim); handle.position.set(2.595,1.156,-1.04); carriage.add(handle);

  // A small exhibition partition occupies the opposite side of this carriage.
  box(.13,2.65,4.65,trim,-2.73,1.72,-3.55,.055);
  box(.035,.055,4.64,wood,-2.64,3.02,-3.55,.012);
  box(.035,.055,4.64,wood,-2.64,.42,-3.55,.012);
  const wallArt=JSON.parse(host.dataset.wallArt||'[]') as {src:string;ratio:number}[];
  const wallMaterials:ReturnType<typeof material>[]=[];
  wallArt.forEach((art,i)=>{
    const z=-2.05-i*1.43;
    box(.07,1.59,1.18,wood,-2.62,1.99,z,.018);
    box(.022,1.46,1.05,trim,-2.575,1.99,z,.002);
    const w=Math.min(.88,1.26*art.ratio),h=w/art.ratio;
    const g=new THREE.PlaneGeometry(w,h);geometries.push(g);
    const m=material('#ffffff',.95);wallMaterials.push(m);
    const artwork=new THREE.Mesh(g,m);artwork.rotation.y=Math.PI/2;artwork.position.set(-2.558,1.99,z);carriage.add(artwork);
    box(.012,.016,.18,metal,-2.55,1.08,z,.001);
    box(.10,.026,.38,lamp,-2.49,2.99,z,.012);
  });
  let artRequested=false,artLoaded=0;
  function loadWallArt(){
    if(artRequested)return;artRequested=true;
    const loader=new THREE.TextureLoader();
    wallArt.forEach((art,i)=>loader.load(art.src,texture=>{
      if(disposed){texture.dispose();return;}
      texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.push(texture);wallMaterials[i].map=texture;wallMaterials[i].needsUpdate=true;artLoaded++;
      if(reduced.matches&&!lost)render(0);
    },undefined,()=>{/* Framed paper remains in place if an image cannot load. */}));
  }

  // A quieter seat at the rear window: a bag, a reading lamp and a small plant.
  const bag=box(.55,.43,.30,wood,1.97,.96,8.44,.09);bag.rotation.y=-.2;
  const bagHandleGeo=new THREE.TorusGeometry(.12,.018,8,20,Math.PI);geometries.push(bagHandleGeo);
  const bagHandle=new THREE.Mesh(bagHandleGeo,dark);bagHandle.position.set(1.97,1.17,8.44);carriage.add(bagHandle);
  cylinder(.045,.42,metal,2.68,1.29,7.72);
  cylinder(.13,.035,wood,2.68,1.085,7.72);
  const shadeGeo=new THREE.CylinderGeometry(.12,.22,.22,28,1,true);geometries.push(shadeGeo);
  const shade=new THREE.Mesh(shadeGeo,trim);shade.position.set(2.68,1.55,7.72);carriage.add(shade);
  cylinder(.18,.012,lamp,2.68,1.444,7.72);
  const plantPot=material('#b4c6b1'),leafMat=material('#628e79',.9);
  cylinder(.1,.16,plantPot,2.49,1.14,7.12);
  const leafGeo=new THREE.SphereGeometry(1,12,8);geometries.push(leafGeo);
  for(let i=0;i<7;i++){
    const leaf=new THREE.Mesh(leafGeo,leafMat),angle=i*2.4;
    leaf.scale.set(.045,.11,.012);leaf.position.set(2.49+Math.cos(angle)*.075,1.29+(i%3)*.04,7.12+Math.sin(angle)*.075);leaf.rotation.set(.5*Math.cos(angle),angle,.6*Math.sin(angle));leaf.castShadow=true;carriage.add(leaf);
  }
  // Both ends are closed, including the rear visible from the about camera.
  for(const [z,facing] of [[front,0],[rear,Math.PI]]){
    const end=new THREE.Group();end.position.z=z;end.rotation.y=facing;carriage.add(end);
    box(6.3,3.74,.18,ivory,0,1.82,0,.035,end);
    box(1.3,2.7,.06,metal,0,1.43,.12,.12,end);
    box(1.1,2.5,.065,trim,0,1.44,.17,.10,end);
    box(.8,1.32,.02,gasket,0,1.9,.213,.10,end);
    box(.48,.045,.045,metal,.13,1.0,.27,.01,end);
    box(6.1,.12,.12,trim,0,3.4,.12,.025,end);
    box(6.1,.09,.07,metal,0,.18,.13,.01,end);
  }

  const skyMaterial = new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{ top:{value:new THREE.Color('#59a9cd')}, horizon:{value:new THREE.Color('#c7e8ef')} },
    vertexShader:'varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',
    fragmentShader:`varying vec3 vWorld; uniform vec3 top; uniform vec3 horizon;
      void main(){vec3 ray=normalize(vWorld-cameraPosition);float h=pow(smoothstep(-.025,.48,ray.y),.38);
      vec3 col=mix(horizon,top,h);float glow=pow(max(dot(ray,normalize(vec3(1.,.55,-1.))),0.),18.);
      col+=vec3(.16,.11,.035)*glow;gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`
  }); materials.push(skyMaterial);
  const skyGeo=new THREE.SphereGeometry(900,24,12); geometries.push(skyGeo);
  const sky=new THREE.Mesh(skyGeo,skyMaterial); sky.renderOrder=-10; scene.add(sky);

  const cloudUniforms={time:{value:0},steps:{value:innerWidth<701?12:18}};
  const cloudMaterial=new THREE.ShaderMaterial({
    depthWrite:false,uniforms:cloudUniforms,
    vertexShader:'varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',
    fragmentShader:`varying vec3 vWorld; uniform float time; uniform int steps; ${noiseGLSL}
      float density(vec3 p){
        vec3 q=p*vec3(.035,.063,.035);q.z+=time*.046;
        float n=fbm(q);
        float envelope=(1.-smoothstep(-12.,-1.,p.y))*smoothstep(-40.,-26.,p.y);
        return smoothstep(.38,.72,n)*envelope;
      }
      void main(){
        vec3 ray=normalize(vWorld-cameraPosition);if(ray.y>-.001)discard;
        float nearD=max(0.,(-.1-cameraPosition.y)/ray.y);float farD=min(700.,(-39.-cameraPosition.y)/ray.y);
        float stride=(farD-nearD)/float(steps);vec4 acc=vec4(0.);
        float jitter=hash(vec3(gl_FragCoord.xy,1.));
        for(int i=0;i<18;i++){if(i>=steps||acc.a>.985)break;
          vec3 p=cameraPosition+ray*(nearD+(float(i)+jitter*.4)*stride);
          float d=density(p);float a=(1.-exp(-d*stride*.15));
          float shade=1.-density(p+vec3(4.,3.,-2.))*1.25;
          float light=(.45+.45*smoothstep(-24.,-2.,p.y))*shade;
          vec3 col=mix(vec3(.33,.57,.68),vec3(1.1,1.2,1.19),clamp(light,0.,1.));
          acc.rgb+=(1.-acc.a)*a*col;acc.a+=(1.-acc.a)*a;
        }
        gl_FragColor=vec4(acc.rgb+(1.-acc.a)*vec3(.6,.8,.85),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }); materials.push(cloudMaterial);
  // Draw the distant layer after the carriage, behind the visible cloud banks.
  // The depth buffer rejects the covered pixels in the overhead reading view.
  const cloudGeo=new THREE.PlaneGeometry(20000,20000); geometries.push(cloudGeo);
  const clouds=new THREE.Mesh(cloudGeo,cloudMaterial); clouds.rotation.x=-Math.PI/2;clouds.position.y=-44; clouds.renderOrder=1; scene.add(clouds);

  // Rounded cloud banks give the foreground a readable silhouette and parallax.
  // They share geometry and a single draw call; the distant layer stays procedural.
  const puffGeo=new THREE.SphereGeometry(1,16,10);geometries.push(puffGeo);
  const puffMaterial=material('#d7e8eb',1);
  const puffCount=150;
  const puffs=new THREE.InstancedMesh(puffGeo,puffMaterial,puffCount);scene.add(puffs);
  puffs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  puffs.boundingSphere=new THREE.Sphere(new THREE.Vector3(145,-20,-80),410);
  const puffData:{x:number;y:number;z:number;sx:number;sy:number;sz:number}[]=[];
  const dummy=new THREE.Object3D();
  let seed=52;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  for(let i=0;i<puffCount;i++) {
    const p={x:12+random()*260,y:-12-random()*7,z:-290+random()*420,sx:7+random()*19,sy:3+random()*6,sz:6+random()*16};puffData.push(p);
    dummy.position.set(p.x,p.y,p.z);dummy.scale.set(p.sx,p.sy,p.sz);dummy.updateMatrix();puffs.setMatrixAt(i,dummy.matrix);
  }

  // A distant viaduct bends into the cloud layer. Its repetition establishes scale.
  const viaduct=new THREE.Group(); scene.add(viaduct);
  const curve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,-2,-16),new THREE.Vector3(10,-2,-36),new THREE.Vector3(38,-2,-55),
    new THREE.Vector3(72,-2,-63),new THREE.Vector3(106,-2,-82),new THREE.Vector3(130,-2,-140),new THREE.Vector3(135,-2,-230)
  ]);
  const bridgeMat=material('#e0e6db'), railMat=material('#697e7b',.3,.5);
  const bridgePoints=curve.getPoints(100);
  for(let i=0;i<100;i++){
    const a=bridgePoints[i],b=bridgePoints[i+1],mid=a.clone().add(b).multiplyScalar(.5);
    const angle=Math.atan2(b.x-a.x,b.z-a.z);
    box(3.5,.58,a.distanceTo(b)+.10,bridgeMat,mid.x,mid.y,mid.z,0,viaduct).rotation.y=angle;
    for(const s of [-1,1]) {
      const offset=new THREE.Vector3(Math.cos(angle)*s*.85,.36,-Math.sin(angle)*s*.85);
      box(.06,.1,a.distanceTo(b)+.12,railMat,mid.x+offset.x,mid.y+offset.y,mid.z+offset.z,0,viaduct).rotation.y=angle;
    }
    if(i%7===0) { cylinder(.58,24,bridgeMat,mid.x,mid.y-12.3,mid.z,viaduct); box(3.0,.6,1.0,bridgeMat,mid.x,mid.y-.7,mid.z,.05,viaduct).rotation.y=angle; }
  }
  const mountainMat=material('#98c4cd',.95);
  const mountainGeo=new THREE.ConeGeometry(28,34,5); geometries.push(mountainGeo);
  for(const [x,z,scale] of [[108,-155,1],[160,-240,1.3],[60,-285,.8]]) {
    const peak=new THREE.Mesh(mountainGeo,mountainMat); peak.position.set(x,-10,z); peak.scale.set(scale,scale*.8,scale); peak.rotation.y=x; scene.add(peak);
  }
  const passing=new THREE.Group(); scene.add(passing);
  const masts:THREE.Group[]=[];
  for(let i=0;i<7;i++) {
    const mast=new THREE.Group(); mast.position.set(4.8,0,-110+i*22); passing.add(mast); masts.push(mast);
    cylinder(.045,7.0,metal,0,.2,0,mast);
    box(.13,.6,.13,fabric,0,1.0,0,.01,mast);
    box(2.6,.04,.05,metal,-1.25,3.64,0,.01,mast);
  }
  // Passing poles are distant; exclude them from the fixed interior shadow map.
  passing.traverse(object=>{if(object instanceof THREE.Mesh)object.castShadow=false;});

  // Batch static surfaces by material. Windows remain separate for transparency.
  function batchStatic(group:THREE.Group) {
    group.updateMatrixWorld(true);
    const batches=new Map<THREE.Material,{parts:THREE.BufferGeometry[];meshes:THREE.Mesh[]}>();
    group.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||Array.isArray(object.material)||object.material.transparent)return;
      const m=object.material;
      const batch=batches.get(m)??{parts:[],meshes:[]};
      const g=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();g.applyMatrix4(object.matrixWorld);
      batch.parts.push(g);batch.meshes.push(object);batches.set(m,batch);
    });
    for(const [m,batch] of batches) {
      const merged=mergeGeometries(batch.parts);batch.parts.forEach(g=>g.dispose());
      if(!merged)continue;
      geometries.push(merged);const mesh=new THREE.Mesh(merged,m);mesh.castShadow=true;mesh.receiveShadow=true;mesh.matrixAutoUpdate=false;scene.add(mesh);
      batch.meshes.forEach(object=>object.removeFromParent());
    }
  }
  batchStatic(carriage);batchStatic(viaduct);

  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let view:TrainView=(host.dataset.view as TrainView)||'home';
  let elapsed=0,previous=0,frame=0,disposed=false,hidden=document.hidden,lost=false;
  let qualityScale=1,sampleDuration=0,sampleFrames=0,shadowUpdates=0;
  const position=new THREE.Vector3(),look=new THREE.Vector3();
  const startPosition=new THREE.Vector3(),startLook=new THREE.Vector3();
  const orientation=new THREE.Quaternion(),startOrientation=new THREE.Quaternion(),targetOrientation=new THREE.Quaternion();
  const orientationFor=(p:THREE.Vector3,l:THREE.Vector3)=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(p,l,new THREE.Vector3(0,1,0)));
  let transitionStart=0,transitionDuration=0;
  let targetPosition=new THREE.Vector3(),targetLook=new THREE.Vector3();
  function framing(which:TrainView) {
    const mobile=innerWidth<701;
    switch(which){
      case 'home':return {position:new THREE.Vector3(mobile?-1.1:-1.9,mobile?1.95:1.9,mobile?4.4:5.25),look:new THREE.Vector3(2.6,mobile?1.75:1.65,-1.8)};
      case 'notes':case 'article':return {position:new THREE.Vector3(1.15,3.3,-.15),look:new THREE.Vector3(mobile?1.65:1.05,1.03,-1.4)};
      case 'gallery':return {position:new THREE.Vector3(.9,2.0,.8),look:new THREE.Vector3(-2.3,1.92,mobile?-3.3:-1.1)};
      case 'about':return {position:new THREE.Vector3(-.9,1.86,4.65),look:new THREE.Vector3(2.45,1.53,mobile?7.6:6.6)};
    }
  }
  const initial=framing(view); position.copy(initial.position);look.copy(initial.look);
  targetPosition.copy(position);targetLook.copy(look);
  orientation.copy(orientationFor(position,look));targetOrientation.copy(orientation);
  function moveTo(next:TrainView,instant=false) {
    if(next===view && !instant)return;
    view=next;host.dataset.view=next;
    sampleDuration=0;sampleFrames=0;
    const dest=framing(next); targetPosition=dest.position;targetLook=dest.look;
    startOrientation.copy(orientation);targetOrientation.copy(orientationFor(targetPosition,targetLook));
    startPosition.copy(position);startLook.copy(look);transitionStart=elapsed;
    transitionDuration=instant||reduced.matches?0:2.1;
    if(!transitionDuration){position.copy(targetPosition);look.copy(targetLook);orientation.copy(targetOrientation);}
    book.setReading(next==='notes'||next==='article',elapsed);
    if(next==='gallery')loadWallArt();
    if(reduced.matches)render(0);
  }
  function sizeCanvas() {
    const w=innerWidth,h=innerHeight;
    // Bound the 3D pixel cost on high-DPI and large screens. DOM text stays native.
    renderer.setPixelRatio(qualityScale*Math.min(devicePixelRatio,1.25,Math.sqrt(1_800_000/(w*h))));
    renderer.setSize(w,h,false);
  }
  function resize() {
    const w=innerWidth,h=innerHeight;
    sizeCanvas();camera.aspect=w/h;camera.fov=w<701?66:51;camera.updateProjectionMatrix();
    cloudUniforms.steps.value=w<701?12:18;
    moveTo(view,true);render(0);
  }
  function render(dt:number) {
    elapsed+=dt;
    if(transitionDuration) {
      const t=Math.min((elapsed-transitionStart)/transitionDuration,1);
      const ease=t*t*t*(t*(t*6-15)+10);
      position.lerpVectors(startPosition,targetPosition,ease);look.lerpVectors(startLook,targetLook,ease);
      orientation.slerpQuaternions(startOrientation,targetOrientation,ease);
      if(t===1)transitionDuration=0;
    }
    camera.position.copy(position);camera.quaternion.copy(orientation);
    if(book.update(elapsed,reduced.matches))renderer.shadowMap.needsUpdate=true;
    cloudUniforms.time.value=elapsed;
    for(let i=0;i<masts.length;i++)masts[i].position.z=((i*22+elapsed*2.3)%154)-120;
    for(let i=0;i<puffCount;i++) {
      puffs.instanceMatrix.array[i*16+14]=((puffData[i].z+290+elapsed*.85)%420)-290;
    }
    puffs.instanceMatrix.needsUpdate=true;
    sun.intensity=2.6+(reduced.matches?0:Math.sin(elapsed*.17)*.08);
    if(renderer.shadowMap.needsUpdate)shadowUpdates++;
    renderer.render(scene,camera);
    if(host.dataset.render!=='ready')host.dataset.render='ready';
  }
  function tick(now:number) {
    if(disposed||hidden||lost||reduced.matches){frame=0;return;}
    frame=requestAnimationFrame(tick);
    // Follow the display refresh. Skipping callbacks at 25 ms halved a 60 Hz
    // display to 30 fps and made the camera visibly stutter.
    const interval=previous?now-previous:0;
    // Learn a conservative resolution while stationary. Ignore startup, navigation
    // and long browser stalls; never oscillate sharpness between adjacent pages.
    if(elapsed>2&&!transitionDuration&&interval>0&&interval<100){
      sampleDuration+=interval;sampleFrames++;
      if(sampleDuration>=1500){
        if(sampleDuration/sampleFrames>19&&qualityScale>.7){qualityScale=Math.max(.7,qualityScale-.1);sizeCanvas();}
        sampleDuration=0;sampleFrames=0;
      }
    }
    const dt=Math.min(interval/1000,.075);previous=now;
    render(dt);
  }
  function resume() { if(!frame&&!disposed&&!hidden&&!lost&&!reduced.matches){previous=0;frame=requestAnimationFrame(tick);} }
  function visibility(){hidden=document.hidden;if(hidden){cancelAnimationFrame(frame);frame=0;}else resume();}
  function motion(){if(reduced.matches){cancelAnimationFrame(frame);frame=0;moveTo(view,true);}else resume();}
  function contextLost(event:Event){event.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;host.dataset.render='fallback';}
  function contextRestored(){lost=false;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;render(0);resume();}
  addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',motion);
  canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
  resize();resume();
  return {
    moveTo,
    // Read-only snapshots also make continuity and camera motion inspectable.
    snapshot:()=>({view,elapsed,position:position.toArray(),look:look.toArray(),orientation:orientation.toArray(),moving:transitionDuration>0,book:book.snapshot(),artLoaded,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,qualityScale,pixelRatio:renderer.getPixelRatio(),shadowUpdates}),
    dispose(){
      disposed=true;cancelAnimationFrame(frame);removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',motion);
      canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);
      geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();
      puffs.dispose();
      book.dispose();
    }
  };
}
