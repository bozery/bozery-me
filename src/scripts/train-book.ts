import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** A hinged cover and one deformable leaf, kept alive with the carriage. */
export function createTrainBook() {
  const group=new THREE.Group();
  group.position.set(1.76,1.08,-1.22);group.rotation.y=-.12;
  const geometries:THREE.BufferGeometry[]=[];
  const materials:THREE.Material[]=[];
  const textures:THREE.Texture[]=[];
  const cover=new THREE.MeshStandardMaterial({color:'#357f7a',roughness:.88});
  const paper=new THREE.MeshStandardMaterial({color:'#f6eed9',roughness:1});
  const gold=new THREE.MeshStandardMaterial({color:'#bdac75',roughness:.55,metalness:.18});
  materials.push(cover,paper,gold);
  const width=.45,depth=.64;
  function block(w:number,h:number,d:number,m:THREE.Material,x:number,y:number,z:number,parent=group) {
    const geometry=new RoundedBoxGeometry(w,h,d,2,Math.min(.012,h/4));geometries.push(geometry);
    const mesh=new THREE.Mesh(geometry,m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  // Back cover, page edges and narrow spine. The front cover has its own hinge.
  block(width+.025,.014,depth+.025,cover,width/2,0,0);
  const spine=block(.032,.08,depth+.014,cover,0,.035,0);
  const rightStack=block(width-.02,.047,depth-.012,paper,width/2,.035,0);
  const leftStack=new THREE.Group();leftStack.name='left-page-stack';
  block(width-.02,.044,depth-.012,paper,-width/2,.033,0,leftStack);
  for(let i=0;i<4;i++) {
    block(width-.025,.0015,depth-.016,gold,width/2,.014+i*.011,0);
    block(width-.025,.0015,depth-.016,gold,-width/2,.013+i*.011,0,leftStack);
  }
  const hinge=new THREE.Group();hinge.name='front-cover-hinge';group.add(hinge);
  const frontCover=block(width+.025,.014,depth+.025,cover,width/2,0,0,hinge);frontCover.name='front-cover';
  // The left pages sit inside the cover and follow its hinge throughout opening.
  // Their final, negative-x layout is rotated onto the right while the book is shut.
  leftStack.rotation.z=Math.PI;leftStack.position.y=.003;hinge.add(leftStack);
  block(.22,.001,.004,gold,.235,.009,-.10,hinge);
  block(.12,.001,.004,gold,.235,.009,-.065,hinge);
  block(.007,.001,depth-.07,gold,.38,.009,0,hinge);
  // A ribbon remains laid across the lower page edge.
  block(.018,.003,.24,cover,.09,.072,.26);

  function pageTexture(index:number) {
    const canvas=document.createElement('canvas');canvas.width=384;canvas.height=544;
    const ctx=canvas.getContext('2d')!;
    ctx.fillStyle='#f6efdE';ctx.fillRect(0,0,384,544);
    const gutter=ctx.createLinearGradient(0,0,384,0);gutter.addColorStop(0,'#9c86592d');gutter.addColorStop(.13,'#ffffff00');gutter.addColorStop(1,'#ffffff00');ctx.fillStyle=gutter;ctx.fillRect(0,0,384,544);
    ctx.fillStyle='#62776c';ctx.font='12px Georgia';ctx.fillText('NOTES ALONG THE WAY',47,59);
    ctx.fillStyle='#47665f';ctx.font='23px serif';ctx.fillText(['沿途','风过窗前','远方来信','此刻','行走之间','慢慢读'][index%6],47,104);
    ctx.strokeStyle='#70857780';ctx.lineWidth=1;
    for(let line=0;line<17;line++){
      const y=140+line*17+(line>7?16:0);if(y>455)break;
      const length=(line===7||line===16)?130:240+((index*29+line*17)%37);
      ctx.beginPath();ctx.moveTo(47,y);ctx.lineTo(47+length,y);ctx.stroke();
    }
    ctx.fillStyle='#839286';ctx.font='12px Georgia';ctx.fillText(String(index+1).padStart(2,'0'),180,505);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;textures.push(texture);return texture;
  }
  const pageTextures=Array.from({length:6},(_,i)=>pageTexture(i));
  const reverseTextures=pageTextures.map(texture=>{const reverse=texture.clone();reverse.wrapS=THREE.RepeatWrapping;reverse.repeat.x=-1;reverse.offset.x=1;reverse.needsUpdate=true;textures.push(reverse);return reverse;});
  const pageMaterial=(texture:THREE.Texture,side:THREE.Side=THREE.DoubleSide)=>{
    const mat=new THREE.MeshStandardMaterial({map:texture,roughness:1,side});materials.push(mat);return mat;
  };
  const leftMaterial=pageMaterial(pageTextures[0]);const rightMaterial=pageMaterial(pageTextures[1]);
  function sheetGeometry(side=1) {
    const geometry=new THREE.PlaneGeometry(width-.017,depth-.022,32,8);
    const a=geometry.getAttribute('position');const uv=geometry.getAttribute('uv');
    for(let i=0;i<a.count;i++) {
      const u=uv.getX(i);const v=uv.getY(i);
      a.setXYZ(i,side*(.008+u*(width-.017)),.062+Math.sin(u*Math.PI)*.015,(.5-v)*(depth-.022));
      if(side<0)uv.setX(i,1-u);
    }
    geometry.computeVertexNormals();geometries.push(geometry);return geometry;
  }
  const rightPage=new THREE.Mesh(sheetGeometry(),rightMaterial);rightPage.name='right-page';rightPage.receiveShadow=true;group.add(rightPage);
  const leftPage=new THREE.Mesh(sheetGeometry(-1),leftMaterial);leftPage.name='left-page';leftPage.receiveShadow=true;leftStack.add(leftPage);
  const turnGeometry=sheetGeometry();turnGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(turnGeometry.getAttribute('position').array),3).setUsage(THREE.DynamicDrawUsage));
  const turnFront=pageMaterial(pageTextures[1],THREE.FrontSide),turnBack=pageMaterial(reverseTextures[2],THREE.BackSide);
  const leaf=new THREE.Group();group.add(leaf);
  for(const mat of [turnFront,turnBack]) {const mesh=new THREE.Mesh(turnGeometry,mat);mesh.castShadow=true;mesh.receiveShadow=true;leaf.add(mesh);}
  // The sheet's bound must include its raised position halfway through a turn.
  turnGeometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,.28,0),.72);
  leaf.visible=false;
  let openness=0,openAt:number|undefined,reading=false,turnAt:number|undefined,nextTurn=Infinity,turnedPages=0,progress=0;
  const ease=(t:number)=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  const textureAt=(n:number)=>pageTextures[n%pageTextures.length];
  function resetVisiblePages() {
    leftMaterial.map=textureAt(turnedPages*2);rightMaterial.map=textureAt(turnedPages*2+1);
    turnFront.map=textureAt(turnedPages*2+1);turnBack.map=reverseTextures[(turnedPages*2+2)%reverseTextures.length];
  }
  function setReading(active:boolean,time:number) {
    if(active&&!reading) {if(openAt===undefined)openAt=time+.65;nextTurn=time+10;}
    reading=active;
  }
  function update(time:number,reduced:boolean) {
    const wasOpen=openness,wasTurning=turnAt!==undefined;
    if(openAt!==undefined)openness=reduced?1:ease((time-openAt)/1.9);
    // Allow thickness for both page stacks when shut. Lower the hinge only after
    // the cover has cleared the right pages, rather than cutting through them.
    hinge.position.y=THREE.MathUtils.lerp(.16,.003,ease((openness-.5)*2));hinge.rotation.z=openness*Math.PI;
    spine.scale.y=THREE.MathUtils.lerp(2,1,openness);spine.position.y=.04*spine.scale.y-.005;
    rightStack.scale.y=1-openness*.12;
    if(reduced){leaf.visible=false;turnAt=undefined;progress=0;nextTurn=time+10;resetVisiblePages();return wasOpen!==openness||wasTurning;}
    if(reading&&openness===1&&turnAt===undefined&&time>=nextTurn) {
      turnAt=time;leaf.visible=true;
      // The next right page is already underneath the lifting sheet.
      rightMaterial.map=textureAt(turnedPages*2+3);
    }
    if(turnAt!==undefined) {
      progress=THREE.MathUtils.clamp((time-turnAt)/2.35,0,1);
      const p=ease(progress),a=turnGeometry.getAttribute('position'),uv=turnGeometry.getAttribute('uv');
      for(let i=0;i<a.count;i++) {
        const u=uv.getX(i),v=uv.getY(i),radius=.008+u*(width-.017);
        const bend=Math.sin(p*Math.PI)*(.46*u+.13*Math.sin(v*Math.PI));
        const angle=p*Math.PI+bend;
        a.setXYZ(i,Math.cos(angle)*radius,.075+Math.sin(angle)*radius+.014*Math.sin(u*Math.PI),(.5-v)*(depth-.022));
      }
      a.needsUpdate=true;turnGeometry.computeVertexNormals();
      if(progress===1){turnedPages++;turnAt=undefined;leaf.visible=false;progress=0;nextTurn=time+8.5;resetVisiblePages();}
    }
    return wasOpen!==openness||wasTurning||turnAt!==undefined;
  }
  update(0,false);
  return {group,setReading,update,snapshot:()=>({openness,reading,turning:turnAt!==undefined,progress,turnedPages}),dispose:()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
