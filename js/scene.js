import * as THREE from './vendor/three.module.js';
import {FBXLoader} from './vendor/FBXLoader.js';
import {loadCar} from './car.js?v=3.1';
import {RigMotion} from './animations.js?v=3.2';
import {OrbitControls} from './vendor/OrbitControls.js';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=THREE.MathUtils.clamp;
export class LabScene{
 constructor(container,{onProgress,onReady,onError}){
  this.container=container;this.onProgress=onProgress;this.onReady=onReady;this.onError=onError;this.mode='car';this.presentation=true;this.mobile=matchMedia('(max-width:820px)').matches;this.reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;this.view='cinematic';this.ready=false;this.forceVisible=false;this.follow=true;this.frameCount=0;this.fpsTime=0;this.textureCache=new Map();this.bones=new Map();this.footCandidates=[];this.ray=new THREE.Raycaster();this.tmp=new THREE.Vector3();this.inv=new THREE.Matrix4();this.lastPath=0;
  this.initRenderer();this.initScene();this.initCamera();this.initLights();this.loadAssets();
 }
 initRenderer(){
  this.renderer=new THREE.WebGLRenderer({antialias:!this.mobile,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,this.mobile?1.25:1.75));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.container.appendChild(this.renderer.domElement);this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(this.container);this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.onError(new Error('Se perdió el contexto gráfico. Recarga la página para restaurar la escena.'));});
 }
 initScene(){
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#101a15');this.scene.fog=new THREE.FogExp2('#101a15',.013);
  this.simulationGroup=new THREE.Group();this.simulationGroup.name='simulationGroup';this.scene.add(this.simulationGroup);this.hulkRoot=new THREE.Group();this.hulkRoot.name='HulkGroundPivot';this.simulationGroup.add(this.hulkRoot);this.terrain=new THREE.Group();this.scene.add(this.terrain);this.supports=new THREE.Group();this.scene.add(this.supports);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:'#14201a',roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.22;ground.receiveShadow=true;this.scene.add(ground);const grid=new THREE.GridHelper(160,80,0x294a35,0x1c3023);grid.position.y=-.21;this.scene.add(grid);
  this.buildEnvironment();this.buildObjects();this.buildTerrain(0);this.forceGroup=new THREE.Group();this.simulationGroup.add(this.forceGroup);this.arrows=[];this.labels=[];
 }
 mesh(geo,color,pos,group,roughness=.7){const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness,metalness:.06}));m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
 box(w,h,d,color,pos,group){return this.mesh(new THREE.BoxGeometry(w,h,d),color,pos,group);}
 buildEnvironment(){
  const city=new THREE.Group();this.scene.add(city);let seed=712;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};const windowMat=new THREE.MeshBasicMaterial({color:'#8eb29a'});for(let i=0;i<16;i++){const x=-45+i*6.5,h=3+rnd()*16,z=-32-rnd()*18;const building=this.box(2+rnd()*2,h,3,'#1b2a20',V(x,h/2-.22,z),city);building.castShadow=false;if(i%2===0){for(let j=1;j<Math.min(h,13);j+=2.1){const light=new THREE.Mesh(new THREE.BoxGeometry(.22,.18,.015),windowMat);light.position.set(x,j,z+1.515);city.add(light);}}}
  const stars=new Float32Array(120*3);for(let i=0;i<120;i++){stars[i*3]=(rnd()-.5)*150;stars[i*3+1]=18+rnd()*50;stars[i*3+2]=-20-rnd()*75;}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(stars,3));this.particles=new THREE.Points(geo,new THREE.PointsMaterial({color:'#a9c3ae',size:.1,sizeAttenuation:true}));this.scene.add(this.particles);
  const moon=new THREE.Mesh(new THREE.SphereGeometry(1.7,24,16),new THREE.MeshBasicMaterial({color:'#c1ced9'}));moon.position.set(-22,26,-55);this.scene.add(moon);
  const platform=this.box(11,.25,7,'#203227',V(-7,-.18,0),this.scene);platform.receiveShadow=true;const ring=new THREE.Mesh(new THREE.TorusGeometry(3.8,.022,6,60),new THREE.MeshBasicMaterial({color:'#5bca94'}));ring.rotation.x=Math.PI/2;ring.position.set(-7,-.042,0);this.scene.add(ring);
 }
 buildObjects(){
  this.car=new THREE.Group();this.car.name='Automóvil';this.simulationGroup.add(this.car);
  this.wheels=[];
  const rockGeo=new THREE.IcosahedronGeometry(.62,2),p=rockGeo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.09*Math.sin(x*17+y*11+z*23)+.05*Math.cos(z*27-x*19);p.setXYZ(i,x*r,y*r,z*r);}rockGeo.computeVertexNormals();rockGeo.computeBoundingBox();this.rockHalf=-rockGeo.boundingBox.min.y;this.rock=new THREE.Group();this.mesh(rockGeo,'#8b9190',V(),this.rock,.97);this.simulationGroup.add(this.rock);
  this.crate=new THREE.Group();this.box(1.6,1.75,1.45,'#746a4a',V(0,.875,0),this.crate);for(const z of [-.74,.74]){this.box(1.65,.09,.05,'#c0a975',V(0,.18,z),this.crate);this.box(1.65,.09,.05,'#c0a975',V(0,1.55,z),this.crate);for(const x of [-.67,.67])this.box(.09,1.65,.05,'#b4a073',V(x,.875,z),this.crate);}for(const y of [.4,1.3])this.box(.05,.14,1.48,'#3c484f',V(-.825,y,0),this.crate);this.simulationGroup.add(this.crate);
 }
 buildTerrain(th){
  if(this.terrainAngle===th)return;this.terrainAngle=th;while(this.supports.children.length){const n=this.supports.children[0];this.supports.remove(n);n.geometry.dispose();n.material.dispose();}while(this.terrain.children.length){const n=this.terrain.children[0];this.terrain.remove(n);n.traverse(c=>{if(c.isMesh){c.geometry.dispose();c.material.dispose();}});}this.terrain.rotation.z=th;this.terrain.position.set(-12*Math.cos(th),0,0);
  this.groundSurface=this.box(52,.15,5,'#283c30',V(26,-.075,0),this.terrain);this.groundSurface.material.roughness=.97;
  for(const z of [-2.35,2.35]){const edge=this.box(52,.022,.06,'#5ca69c',V(26,.012,z),this.terrain);edge.material.emissive=new THREE.Color('#315d56');edge.material.emissiveIntensity=.4;}
  for(let i=0;i<17;i++)this.box(1.4,.018,.075,'#b6b89b',V(i*3+.8,.01,1.35),this.terrain);
  if(th>0){for(let s=4;s<48;s+=6){const x=(-12+s)*Math.cos(th),y=s*Math.sin(th);this.box(.28,y+.2,4.7,'#26374a',V(x,y/2-.1,0),this.supports);}}
 }
 initCamera(){this.camera=new THREE.PerspectiveCamera(42,1,.1,220);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.07;this.controls.enablePan=false;this.controls.minDistance=6;this.controls.maxDistance=26;this.controls.minPolarAngle=.0001;this.controls.maxPolarAngle=Math.PI*.48;this.controls.minAzimuthAngle=-Math.PI*.9;this.controls.maxAzimuthAngle=Math.PI*.9;this.controls.addEventListener('start',()=>{this.userOrbit=true;});this.setCamera('cinematic',true);this.resize();}
 initLights(){this.scene.add(new THREE.AmbientLight('#d8e9ff',.7));this.scene.add(new THREE.HemisphereLight('#c7deff','#63715d',1.8));this.sun=new THREE.DirectionalLight('#ffefda',3.5);this.sun.position.set(-10,14,12);this.sun.castShadow=true;this.sun.shadow.mapSize.set(this.mobile?1024:2048,this.mobile?1024:2048);Object.assign(this.sun.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:.5,far:45});this.sun.shadow.bias=-.00025;this.sun.shadow.normalBias=.025;this.scene.add(this.sun);this.scene.add(this.sun.target);const rim=new THREE.DirectionalLight('#8ecaa0',1.5);rim.position.set(5,8,-12);this.scene.add(rim);this.fill=new THREE.PointLight('#8ee4af',13,15,2);this.fill.position.set(-7,3,3);this.scene.add(this.fill);}
 resize(){if(!this.camera)return;const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.mobile=matchMedia('(max-width:820px)').matches;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 async loadAssets(){
  const manager=new THREE.LoadingManager();this.assetManager={manager,textures:this.textureCache,hulk:null};manager.onProgress=(url,loaded,total)=>this.onProgress({stage:'textures',percent:Math.min(80,45+loaded/total*35)});manager.onError=url=>console.warn('Texture missing: '+url.split('/').pop());manager.setURLModifier(url=>{if(url.startsWith('blob:')||url.startsWith('data:'))return url;const basename=url.split(/[\\/]/).pop();if(/\.png$/i.test(basename))return 'assets/hulk/textures/'+basename;return url;});
  const loader=new FBXLoader(manager);loader.setResourcePath('assets/hulk/textures/');
  try{
   const fbx=await loader.loadAsync('assets/hulk/Hulk%20(Brand%20New%20Day).fbx',ev=>{if(ev.lengthComputable)this.onProgress({stage:'model',percent:Math.min(50,ev.loaded/ev.total*50)});});
   const texLoader=new THREE.TextureLoader(manager);const materials=new Map();const texture=(name)=>{if(!this.textureCache.has(name))this.textureCache.set(name,texLoader.loadAsync('assets/hulk/textures/'+name).catch(()=>{console.warn('Texture missing: '+name);return null;}));return this.textureCache.get(name);};
   const materialTasks=[];fbx.traverse(node=>{if(node.isMesh){const olds=Array.isArray(node.material)?node.material:[node.material];for(const old of olds){if(!materials.has(old.name)){materials.set(old.name,null);materialTasks.push((async()=>{const map=await texture(old.name+'.png');let spec=null;if(old.name.startsWith('hero_')){const sp=await texture(old.name+'_sp.png');if(sp){const c=document.createElement('canvas');c.width=sp.image.width;c.height=sp.image.height;const x=c.getContext('2d');x.drawImage(sp.image,0,0);const data=x.getImageData(0,0,c.width,c.height);for(let i=0;i<data.data.length;i+=4){const gray=Math.round(.2126*data.data[i]+.7152*data.data[i+1]+.0722*data.data[i+2]);data.data[i]=data.data[i+1]=data.data[i+2]=gray;}x.putImageData(data,0,0);spec=new THREE.CanvasTexture(c);spec.colorSpace=THREE.NoColorSpace;}}
    if(map){map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());}const mat=new THREE.MeshPhysicalMaterial({name:old.name,map,color:map?'#ffffff':'#74835e',roughness:old.name.endsWith('_03')?.96:.83,metalness:0,specularIntensity:.35,specularColor:'#888888',specularColorMap:spec,transparent:false,side:THREE.FrontSide});materials.set(old.name,mat);old.dispose();})());}}}});await Promise.all(materialTasks);
   fbx.traverse(node=>{if(node.isMesh){node.material=Array.isArray(node.material)?node.material.map(m=>materials.get(m.name)):materials.get(node.material.name);node.castShadow=true;node.receiveShadow=true;node.frustumCulled=false;if(!node.geometry.attributes.normal)node.geometry.computeVertexNormals();}if(node.isBone&&!this.bones.has(node.name))this.bones.set(node.name,node);});
   this.assetManager.hulk=fbx;this.prepareHulkModel(fbx);this.detectAnimations(fbx);this.onProgress({stage:'car',percent:85});const carAsset=await loadCar(this.renderer,{mobile:this.mobile,onProgress:ratio=>this.onProgress({stage:'car',percent:85+ratio*13})});this.car.add(carAsset.scene);this.wheels=carAsset.wheels;this.carBounds=carAsset.bounds;this.motion=new RigMotion(this);this.ready=true;this.setMode(this.data??{mode:'car',th:0});this.onProgress({stage:'ready',percent:100});this.onReady(this.inspection);
  }catch(e){this.onError(e);}
 }
 prepareHulkModel(fbx){
  fbx.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(fbx),size=box.getSize(V()),center=box.getCenter(V());this.originalSize=size.clone();const height=2.65,scale=height/size.y;fbx.scale.multiplyScalar(scale);fbx.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);this.hulkRoot.add(fbx);this.fbx=fbx;this.hulkRoot.rotation.y=Math.PI/2;
  this.inspection={heightOriginal:size.y,heightScene:height,meshCount:0,triangles:0,bones:this.bones.size,clips:fbx.animations.map(a=>a.name),materials:[]};fbx.traverse(n=>{if(n.isMesh){this.inspection.meshCount++;this.inspection.triangles+=(n.geometry.index?.count??n.geometry.attributes.position.count)/3;this.inspection.materials.push({mesh:n.name,material:n.material.name,texture:n.material.map?.image?.src?.split('/').pop()});}});console.info('Hulk model inspection',this.inspection);
 }
 detectAnimations(fbx){
  this.mixer=new THREE.AnimationMixer(fbx);this.actions={};for(const key of ['idle','walk','wait']){const clip=fbx.animations.find(c=>new RegExp('@'+key+'$','i').test(c.name));if(clip)this.actions[key]=this.mixer.clipAction(new THREE.AnimationClip(clip.name,clip.duration,clip.tracks.filter(t=>!t.name.endsWith('.scale'))));}
  console.info('FBX animation clips:',fbx.animations.map(c=>c.name));this.playAction('idle');this.mixer.update(0);fbx.updateMatrixWorld(true);this.refreshSkeletons();this.cacheFootVertices();
 }
 playAction(key){const next=this.actions[key]??this.actions.idle;if(!next||next===this.activeAction)return;next.reset().setEffectiveWeight(1).play();if(this.activeAction)next.crossFadeFrom(this.activeAction,.25,true);this.activeAction=next;}
 refreshSkeletons(){this.fbx?.traverse(n=>{if(n.isSkinnedMesh)n.skeleton.update();});}
 cacheFootVertices(){this.hulkRoot.updateMatrixWorld(true);const inverse=this.hulkRoot.matrixWorld.clone().invert();this.fbx.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const indices=[];for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,this.tmp).applyMatrix4(mesh.matrixWorld).applyMatrix4(inverse);if(this.tmp.y<.35)indices.push(i);}if(indices.length)this.footCandidates.push({mesh,indices});});}
 setMode(data){this.data=data;this.mode=data.mode;const th=this.mode==='incline'?data.th:0;this.buildTerrain(th);this.simulationGroup.rotation.z=th;this.car.visible=this.mode==='car';this.crate.visible=this.mode==='incline';this.rock.visible=this.mode==='lift';this.hulkRoot.position.set(this.mode==='car'?-2.65:this.mode==='incline'?-1.65:-1.00,0,0);this.hulkRoot.rotation.set(0,Math.PI/2,0);this.lastPath=0;this.motion?.reset();this.userOrbit=false;this.drawTrajectory(data);this.setCamera(this.view,true);if(this.ready){this.pose({s:0,v:data.v0??0,progress:0},false,0,false);this.createForceVectors(data);}}
 groundHulk(){
  this.hulkRoot.position.y=0;this.simulationGroup.updateMatrixWorld(true);this.refreshSkeletons();this.inv.copy(this.simulationGroup.matrixWorld).invert();let minY=Infinity;
  for(const {mesh,indices} of this.footCandidates){for(const i of indices){mesh.getVertexPosition(i,this.tmp).applyMatrix4(mesh.matrixWorld).applyMatrix4(this.inv);minY=Math.min(minY,this.tmp.y);}}
  if(Number.isFinite(minY))this.hulkRoot.position.y=-minY+.006;
  // Equivalent plane contact plus a real raycast validates the terrain below the character.
  this.simulationGroup.updateMatrixWorld(true);const world=this.hulkRoot.getWorldPosition(V());this.ray.set(V(world.x,world.y+15,world.z),V(0,-1,0));this.lastGroundHit=this.ray.intersectObject(this.groundSurface,false)[0]??null;
 }
 pose(sample,moving,dt,effort=false){
  if(!this.ready)return;const d=this.data,th=this.mode==='incline'?d.th:0;this.simulationGroup.rotation.z=th;const path=this.mode==='lift'?0:sample.s;this.simulationGroup.position.set((-6+path)*Math.cos(th),(6+path)*Math.sin(th),0);
  this.car.position.set(0,0,0);this.crate.position.set(0,0,0);this.rock.position.set(0,this.rockHalf+(this.mode==='lift'?sample.s:0),0);
  this.motion.update(sample,moving,dt,effort);
  this.hulkRoot.updateMatrixWorld(true);this.refreshSkeletons();for(const wheel of this.wheels)wheel.rotation.z=-sample.s/wheel.userData.wheelRadius;
  this.forceGroup.position.set(0,this.mode==='lift'?Math.max(1.7,this.rock.position.y+.6):1.7,1.25);this.updateForceLabels();
  const target=V((-6+path-1)*Math.cos(th),this.mode==='lift'?1.35+sample.s*.25:(6+path)*Math.sin(th)+1.15,0);this.targetPoint=target;
  this.sun.target.position.copy(target);this.sun.position.copy(target).add(V(-6,12,9));this.fill.position.copy(target).add(V(-3,3,3));
  if(moving&&this.follow&&this.view!=='top'){const shift=target.clone().sub(this.controls.target);this.controls.target.lerp(target,1-Math.exp(-dt*5));this.camera.position.addScaledVector(shift,1-Math.exp(-dt*5));}
 }
 drawTrajectory(data){
  if(this.trajectory){this.scene.remove(this.trajectory);this.trajectory.traverse(n=>{n.geometry?.dispose();n.material?.map?.dispose();n.material?.dispose();});}
  this.trajectory=new THREE.Group();this.scene.add(this.trajectory);const th=data.mode==='incline'?data.th:0;this.trajectory.rotation.z=th;this.trajectory.position.set(-6*Math.cos(th),6*Math.sin(th),0);
  const length=data.d??15,direction=data.mode==='lift'?V(0,1,0):V(1,0,0),origin=data.mode==='lift'?V(.2,this.rockHalf,-1.25):V(0,.05,-1.5);const arr=new THREE.ArrowHelper(direction,origin,length,0x64a6bd,.3,.14);this.trajectory.add(arr);
  for(let i=0;i<=4;i++){const s=length*i/4,where=origin.clone().addScaledVector(direction,s);if(data.mode!=='lift')this.box(.025,.012,.4,'#9cc2cf',where.clone(),this.trajectory);const c=document.createElement('canvas');c.width=160;c.height=48;const ctx=c.getContext('2d');ctx.fillStyle='#081320dd';ctx.fillRect(0,0,160,48);ctx.fillStyle='#bed9e7';ctx.font='24px monospace';ctx.textAlign='center';ctx.fillText(s.toFixed(1)+' m',80,33);const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:true}));sprite.position.copy(where).add(V(0,.22,-.28));sprite.scale.set(1.05,.32,1);this.trajectory.add(sprite);}
 }
 setCamera(view,instant=false){
  this.view=view;this.userOrbit=false;this.mobile=matchMedia('(max-width:820px)').matches;const th=this.mode==='incline'?this.data?.th??0:0,s=this.lastPath??0;let center=V((-7+s)*Math.cos(th),(6+s)*Math.sin(th)+1.15,0),offset;
  if(view==='top'){const d=this.mode==='lift'?4:this.data?.d??15;center=V((-6+d/2-1)*Math.cos(th),(6+d/2)*Math.sin(th)+1,0);const distance=clamp((d+7)/(2*Math.tan(this.camera.fov*Math.PI/360)*Math.max(.3,this.camera.aspect)),11,80);offset=V(0,distance,.001);this.controls.maxDistance=90;}
  else{offset=view==='side'?V(0,2.8,this.mobile?12:9):this.mobile?V(4,4.5,10.5):V(4,3.2,7.4);this.controls.maxDistance=26;}
  this.controls.target.copy(center);this.camera.position.copy(center).add(offset);this.camera.lookAt(center);this.controls.update();
 }
 createForceVectors(p){
  while(this.forceGroup.children.length){const n=this.forceGroup.children[0];this.forceGroup.remove(n);n.traverse(c=>{c.geometry?.dispose();c.material?.dispose();});}this.labels.forEach(l=>l.el.remove());this.labels=[];this.arrows=[];const scale=Math.max(p.F,p.weight,p.N,p.fr,1),len=n=>Math.max(.3,1.5*n/scale);
  const add=(name,dir,force,color,offset)=>{if(force<1e-8)return;const origin=offset??V();const arrow=new THREE.ArrowHelper(dir.normalize(),origin,len(force),color,.22,.12);this.forceGroup.add(arrow);const el=document.createElement('span');el.className='vector-label';el.style.setProperty('--c','#'+new THREE.Color(color).getHexString());el.textContent=name;this.container.appendChild(el);this.labels.push({el,name,dir:dir.clone(),pos:origin.clone().addScaledVector(dir,len(force)+.16)});this.arrows.push({name,force,dir:dir.toArray()});};
  const th=this.mode==='incline'?p.th:0;const weightDirection=V(-Math.sin(th),-Math.cos(th),0);const applied=this.mode==='car'?V(Math.cos(p.th),Math.sin(p.th),0):this.mode==='lift'?V(0,1,0):V(1,0,0);
  add('F',applied,p.F,0x73ff9d,V(0,0,.38));add('mg',weightDirection,p.weight,0xff6c7a,V(.1,0,-.16));
  if(this.mode!=='lift'){add('N',V(0,1,0),p.N,0x6ce8ff,V(-.2,0,0));add('f',V(-1,0,0),p.blocked?Math.min(p.fr,p.applied):p.fr,0xffd970,V(0,.2,.4));}
  if(this.mode==='incline'){add('mg sinθ',V(-1,0,0),p.parallel,0xad92ff,V(0,-.3,-.45));add('mg cosθ',V(0,-1,0),p.N,0xad92ff,V(.3,0,-.6));}
  if(this.mode==='lift'&&p.blocked)add('N suelo',V(0,1,0),p.weight-p.F,0x6ce8ff,V(-.25,0,0));this.forceGroup.visible=this.forceVisible;this.updateForceLabels();
 }
 showForces(value){this.forceVisible=value;this.forceGroup.visible=value;this.updateForceLabels();}
 updateForceLabels(){
  this.camera.updateMatrixWorld();this.forceGroup.updateMatrixWorld(true);const w=this.container.clientWidth,h=this.container.clientHeight,placed=[];const viewDir=this.camera.getWorldDirection(V()).negate();
  for(const {el,pos,name,dir} of this.labels){const p=this.forceGroup.localToWorld(pos.clone()).project(this.camera);el.hidden=!this.forceVisible||Math.abs(p.x)>1||Math.abs(p.y)>1||p.z>1;if(el.hidden)continue;
   const globalDir=dir.clone().transformDirection(this.forceGroup.matrixWorld),dot=globalDir.dot(viewDir);el.textContent=name+(this.view==='top'?(dot>.9?' ⊙':dot<-.9?' ⊗':''):'');const width=el.textContent.length*6+12;let x=clamp((p.x*.5+.5)*w,width/2+8,w-width/2-8),y=clamp((-p.y*.5+.5)*h,53,h-(this.mobile?144:103));
   for(let k=0;k<9&&placed.some(b=>Math.abs(x-b.x)<(width+b.width)/2+5&&Math.abs(y-b.y)<21);k++)y=Math.max(53,y-22);placed.push({x,y,width});el.style.left=x+'px';el.style.top=y+'px';
  }
 }
 render(dt){this.controls.update();this.updateForceLabels();this.renderer.render(this.scene,this.camera);this.frameCount++;this.fpsTime+=dt;if(this.fpsTime>5){const fps=this.frameCount/this.fpsTime;if(fps<24&&this.renderer.getPixelRatio()>.8){this.renderer.setPixelRatio(Math.max(.8,this.renderer.getPixelRatio()*.8));this.sun.shadow.mapSize.set(512,512);this.sun.shadow.map?.dispose();this.sun.shadow.map=null;document.getElementById('sceneScale').textContent='Modo de rendimiento · 1 unidad = 1 m';this.resize();}this.frameCount=0;this.fpsTime=0;}}
}
