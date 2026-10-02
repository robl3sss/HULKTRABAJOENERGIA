import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {gunzipSync} from './vendor/fflate.module.js';

// Report transferred bytes, and release the welcome screen if a connection stalls.
async function downloadModel(url,expectedBytes,onProgress){
 const controller=new AbortController();let idleTimer;
 const armTimeout=()=>{clearTimeout(idleTimer);idleTimer=setTimeout(()=>controller.abort(),30000);};
 const totalTimer=setTimeout(()=>controller.abort(),180000);
 try{
  armTimeout();const response=await fetch(url,{signal:controller.signal});
  if(!response.ok)throw new Error('No se pudo descargar el automóvil.');
  const total=Number(response.headers.get('Content-Length'))||expectedBytes;
  let bytes;
  if(response.body){const reader=response.body.getReader(),chunks=[];let received=0;
   while(true){const {done,value}=await reader.read();if(done)break;armTimeout();chunks.push(value);received+=value.byteLength;onProgress(Math.min(.98,received/total));}
   bytes=new Uint8Array(received);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  }else bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes[0]===0x1f&&bytes[1]===0x8b)bytes=gunzipSync(bytes);
  onProgress(1);return bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
 }catch(error){if(error.name==='AbortError')throw new Error('La descarga se interrumpió. Comprueba la conexión y pulsa REINTENTAR.');throw error;}
 finally{clearTimeout(idleTimer);clearTimeout(totalTimer);}
}

/** Original Mazda with its four wheel axles; mobile uses a lighter local mesh. */
export async function loadCar(renderer,{mobile=false,onProgress=()=>{}}={}){
 const file=mobile?'mazda-mx5-mobile.bin':'mazda-mx5.glb';
 const bytes=await downloadModel('assets/car/'+file,mobile?1497504:4621116,onProgress);
 const {scene}=await new GLTFLoader().parseAsync(bytes,'assets/car/');
 const loader=new THREE.TextureLoader(),cache=new Map();
 const tex=(name,color=false)=>{const key=name+color;if(!cache.has(key))cache.set(key,loader.loadAsync('assets/car/textures/VP_Free_MazdaMX5_'+name+'.jpg').then(t=>{t.flipY=false;t.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;t.anisotropy=Math.min(mobile?2:4,renderer.capabilities.getMaxAnisotropy());return t;}));return cache.get(key);};
 const materials=new Set();scene.traverse(n=>{if(n.isMesh){for(const m of Array.isArray(n.material)?n.material:[n.material])materials.add(m);n.castShadow=n.material.name!=='glass';n.receiveShadow=true;}});
 // Details load independently. A missing or slow texture cannot block simulation.
 const apply=(m,property,name,color=false)=>{void tex(name,color).then(t=>{m[property]=t;m.needsUpdate=true;}).catch(()=>{});};
 for(const m of materials){
  if(m.name==='plate')apply(m,'map','plate_diffuse',true);
  if(m.name==='guages')apply(m,'map','guages_diffuse',true);
  if(m.name==='mesh'){m.alphaTest=.45;m.side=THREE.DoubleSide;apply(m,'alphaMap','mesh_alpha');}
  if(mobile)continue;
  const normal={plate:'plate_normal',leather:'leather_normal',plastic_smooth:'plastic_normal',plastic_bump:'plastic_normal',bumps:'bumps_normal',carpet:'carpet_normal','brake light':'brake_lgt_normal',seatbelt:'seatbelt_normal'}[m.name];
  if(normal){m.normalScale.set(.35,.35);apply(m,'normalMap',normal);}
  if(m.name==='tire'){m.bumpScale=.002;apply(m,'bumpMap','tire_sidewall_bump');}
 }
 const wheels=[];scene.traverse(n=>{if(n.userData.wheelRadius)wheels.push(n);});
 scene.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(scene);
 scene.userData.quality=mobile?'mobile':'desktop';
 return {scene,wheels,bounds};
}
