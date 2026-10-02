import * as T from './vendor/three.module.js';
const clamp=T.MathUtils.clamp, radians=T.MathUtils.degToRad;
const X=new T.Vector3(1,0,0),Y=new T.Vector3(0,1,0),Z=new T.Vector3(0,0,1);

// A complete joint frame controls bend AND roll. A shortest-arc direction alone
// leaves a free twist axis, which made elbows/shoulders corkscrew during contact.
function frameQuaternion(direction,normal,out,matrix,a,b,c){
 a.copy(direction).normalize();c.copy(normal).addScaledVector(a,-normal.dot(a)).normalize();
 b.crossVectors(c,a).normalize();matrix.makeBasis(a,b,c);return out.setFromRotationMatrix(matrix).normalize();
}
class Chain {
 constructor(rig,upper,lower,end,{min=8,max=135}={}){
  this.rig=rig;this.upper=rig.bones.get(upper);this.lower=rig.bones.get(lower);this.end=rig.bones.get(end);
  this.v=Array.from({length:15},()=>new T.Vector3());this.q=Array.from({length:6},()=>new T.Quaternion());this.matrix=new T.Matrix4();
  this.min=radians(min);this.max=radians(max);this.lastError=0;this.flexion=0;this.pronation=0;
  const [a,b,c,u,v,n]=this.v;rig.hulkRoot.updateMatrixWorld(true);
  this.upper.getWorldPosition(a);this.lower.getWorldPosition(b);this.end.getWorldPosition(c);
  u.subVectors(b,a);v.subVectors(c,b);n.crossVectors(u,v).normalize();
  this.localFrames=[this.upper,this.lower].map((bone,i)=>{
   const inv=bone.getWorldQuaternion(new T.Quaternion()).invert();
   const dir=(i?v:u).clone().normalize().applyQuaternion(inv),normal=n.clone().applyQuaternion(inv);
   return frameQuaternion(dir,normal,new T.Quaternion(),this.matrix,this.v[10],this.v[11],this.v[12]).invert();
  });
  this.neutralHand=this.end.quaternion.clone();this.axis=this.end.position.clone().normalize();
 }
 orient(bone,direction,normal,localFrame,weight){
  frameQuaternion(direction,normal,this.q[0],this.matrix,this.v[10],this.v[11],this.v[12]).multiply(localFrame);
  bone.parent.getWorldQuaternion(this.q[1]).invert();this.q[0].premultiply(this.q[1]);
  bone.quaternion.slerp(this.q[0],weight).normalize();this.rig.hulkRoot.updateMatrixWorld(true);
 }
 solve(target,poleHint,weight=1,endQ=null){
  if(weight<.0001)return;const {upper,lower,end}=this;
  const [a,b,c,dir,pole,knee,goal,u,v,normal]=this.v;
  this.rig.hulkRoot.updateMatrixWorld(true);upper.getWorldPosition(a);lower.getWorldPosition(b);end.getWorldPosition(c);
  const l1=a.distanceTo(b),l2=b.distanceTo(c);dir.subVectors(target,a);const requested=dir.length();dir.normalize();
  const reach=angle=>Math.sqrt(l1*l1+l2*l2+2*l1*l2*Math.cos(angle));
  const distance=clamp(requested,reach(this.max),reach(this.min));goal.copy(a).addScaledVector(dir,distance);
  pole.copy(poleHint).addScaledVector(dir,-poleHint.dot(dir));
  if(pole.lengthSq()<1e-8)pole.copy(Y).addScaledVector(dir,-dir.y);pole.normalize();
  const along=(l1*l1-l2*l2+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  knee.copy(a).addScaledVector(dir,along).addScaledVector(pole,height);
  u.subVectors(knee,a).normalize();v.subVectors(goal,knee).normalize();normal.crossVectors(u,v).normalize();
  this.orient(upper,u,normal,this.localFrames[0],weight);
  // Recompute the distal direction after the weighted shoulder rotation.
  lower.getWorldPosition(b);v.subVectors(goal,b).normalize();this.orient(lower,v,normal,this.localFrames[1],weight);
  if(endQ){end.parent.getWorldQuaternion(this.q[1]).invert();end.quaternion.slerp(this.q[1].multiply(endQ),weight).normalize();this.rig.hulkRoot.updateMatrixWorld(true);}
  upper.getWorldPosition(a);lower.getWorldPosition(b);end.getWorldPosition(c);
  u.subVectors(b,a).normalize();v.subVectors(c,b).normalize();this.flexion=Math.acos(clamp(u.dot(v),-1,1));this.lastError=c.distanceTo(target);
 }
 orientHand(desired,weight){
  const hand=this.end,lower=this.lower;
  lower.getWorldQuaternion(this.q[1]);
  // The wrist may flex, but cannot fold backwards through the forearm.
  const forward=this.v[13].copy(X).applyQuaternion(desired),forearm=this.v[14].copy(this.axis).applyQuaternion(this.q[1]);
  const angle=forearm.angleTo(forward),limit=radians(68);
  if(angle>limit){this.q[2].setFromUnitVectors(forearm,forward);this.q[3].identity().slerp(this.q[2],limit/angle);forward.copy(forearm).applyQuaternion(this.q[3]);const original=this.v[9].copy(X).applyQuaternion(desired);desired.premultiply(this.q[2].setFromUnitVectors(original,forward));}
  this.q[2].copy(this.q[1]).invert().multiply(desired).multiply(this.q[3].copy(this.neutralHand).invert());
  const projection=this.q[2].x*this.axis.x+this.q[2].y*this.axis.y+this.q[2].z*this.axis.z;
  let roll=2*Math.atan2(projection,this.q[2].w);if(roll>Math.PI)roll-=Math.PI*2;if(roll<-Math.PI)roll+=Math.PI*2;
  const limitedRoll=clamp(roll,-radians(85),radians(85));this.pronation=limitedRoll*weight;
  desired.premultiply(this.q[2].setFromAxisAngle(forearm,limitedRoll-roll)).normalize();
  this.q[1].invert().multiply(desired);hand.quaternion.slerp(this.q[1],weight).normalize();
  this.rig.hulkRoot.updateMatrixWorld(true);
 }
}
export class RigMotion {
 constructor(rig){
  this.rig=rig;this.chains={};this.feet={};this.v=Array.from({length:16},()=>new T.Vector3());this.q=Array.from({length:5},()=>new T.Quaternion());this.matrix=new T.Matrix4();this.euler=new T.Euler();this.originalPose=new Map();
  for(const side of ['L','R']){
   this.chains[side+'arm']=new Chain(rig,`Bip001_${side}_UpperArm`,`Bip001_${side}_Forearm`,`Bip001_${side}_Hand`,{min:12,max:132});
   this.chains[side+'leg']=new Chain(rig,`Bip001_${side}_Thigh`,`Bip001_${side}_Calf`,`Bip001_${side}_Foot`,{min:7,max:125});
   const bone=rig.bones.get(`Bip001_${side}_Foot`);this.feet[side]={target:new T.Vector3(),natural:new T.Vector3(),q:new T.Quaternion(),restQ:bone.getWorldQuaternion(new T.Quaternion()).premultiply(rig.simulationGroup.getWorldQuaternion(new T.Quaternion()).invert())};
  }
  this.helpers=[];this.helperMatrix=new T.Matrix4();this.helperScale=new T.Vector3();this.twistMatrix=new T.Matrix4();
  for(const side of ['L','R'])for(const [name,segment,twist] of [[`bn_upper_${side.toLowerCase()}_twist`,'UpperArm',0],[`Bip001_${side}_ForeTwist4`,'Forearm',.3],[`Bip001_${side}_ForeTwist9`,'Forearm',.65],[`bn_thigh_${side.toLowerCase()}_twist`,'Thigh',0]]){
   const bone=rig.bones.get(name),driver=rig.bones.get(`Bip001_${side}_${segment}`);if(bone&&driver)this.helpers.push({bone,driver,relative:new T.Matrix4(),twist,chain:this.chains[side+'arm']});
  }
  this.fingers=[];
  for(const [name,bone] of rig.bones){this.originalPose.set(name,{position:bone.position.clone(),quaternion:bone.quaternion.clone()});if(/_Finger/.test(name))this.fingers.push({bone,name,rest:bone.quaternion.clone()});}
  this.reset();
 }
 captureHelpers(){for(const h of this.helpers)h.relative.copy(h.driver.matrixWorld).invert().multiply(h.bone.matrixWorld);}
 helperTransform(h,out){out.copy(h.bone.parent.matrixWorld).invert().multiply(h.driver.matrixWorld);if(h.twist)out.multiply(this.twistMatrix.makeRotationAxis(h.chain.axis,h.chain.pronation*h.twist));return out.multiply(h.relative);}
 syncHelpers(){for(const h of this.helpers){this.helperTransform(h,this.helperMatrix).decompose(h.bone.position,h.bone.quaternion,this.helperScale);h.bone.updateMatrixWorld(true);}}
 restorePose(){for(const [name,pose] of this.originalPose){const bone=this.rig.bones.get(name);bone.position.copy(pose.position);bone.quaternion.copy(pose.quaternion);}}
 reset(){this.restorePose();this.contact=0;this.strideWeight=0;this.lastDistance=0;this.gaitDistance=0;this.rig.mixer?.stopAllAction();this.rig.activeAction=null;this.rig.playAction('idle');for(const c of Object.values(this.chains))c.pronation=0;}
 setWorldQuaternion(bone,q,weight){bone.parent.getWorldQuaternion(this.q[4]).invert().multiply(q);bone.quaternion.slerp(this.q[4],weight).normalize();this.rig.hulkRoot.updateMatrixWorld(true);}
 fingersPose(weight){
  for(const {bone,name,rest} of this.fingers){const match=name.match(/_Finger(\d)(\d)?$/);if(!match)continue;const digit=Number(match[1]),tip=!!match[2],lift=this.rig.mode==='lift';
   if(digit===0&&!tip)continue;
   if(digit===0)this.q[0].setFromAxisAngle(Z,lift?.5:.25);
   else if(tip)this.q[0].setFromAxisAngle(Z,lift?.55:.12);
   else {const e=this.euler.setFromQuaternion(rest);this.q[0].setFromEuler(e.set(e.x*.45,e.y*.45,(lift?.24:.055)+digit*.015));}
   bone.quaternion.slerp(this.q[0],weight).normalize();
  }
 }
 update(sample,moving,dt,effort){
  const r=this.rig,active=!r.presentation&&(moving||effort);this.contact=dt?T.MathUtils.damp(this.contact,active?1:0,6,dt):0;const w=T.MathUtils.smoothstep(this.contact,0,1);
  this.restorePose();
  // Idle supplies subtle breathing; locomotion comes from planted, distance-based
  // steps instead of the combat walk's shoulder twist and exaggerated knees.
  r.playAction('idle');r.activeAction?.setEffectiveTimeScale(.65);r.mixer.update(dt);
  for(const [name,pose] of this.originalPose){const b=r.bones.get(name);pose.position.copy(b.position);pose.quaternion.copy(b.quaternion);}
  r.groundHulk();r.hulkRoot.updateMatrixWorld(true);for(const c of Object.values(this.chains))c.pronation=0;
  if(w<.0001){this.lastDistance=sample.s;return;}
  this.captureHelpers();
  for(const side of ['L','R']){const f=this.feet[side],bone=r.bones.get(`Bip001_${side}_Foot`);bone.getWorldPosition(f.natural);r.simulationGroup.worldToLocal(f.natural);bone.getWorldQuaternion(f.q);}
  const lift=r.mode==='lift',rise=T.MathUtils.smoothstep(sample.s,0,.95),depth=lift?.64*(1-rise)+.10:r.mode==='car'?.20:.08;
  const ds=Math.max(0,sample.s-this.lastDistance);if(moving&&!lift)this.gaitDistance+=ds;
  this.strideWeight=T.MathUtils.damp(this.strideWeight,moving&&!lift?1:0,9,dt);
  const phase=(this.gaitDistance/1.0)%1,lean=lift?(.20*(1-rise)+.035):r.mode==='car'?.62:.28;
  const hip=r.bones.get('Bip001');
  // Square the pelvis toward the load, keeping a soft forward lean and no combat yaw.
  this.matrix.makeBasis(X,this.v[0].set(0,0,-1),Y);this.q[0].setFromRotationMatrix(this.matrix);this.q[1].setFromAxisAngle(Z,-lean).multiply(this.q[0]).premultiply(r.simulationGroup.quaternion);this.setWorldQuaternion(hip,this.q[1],w);
  const p=hip.getWorldPosition(this.v[1]),down=this.v[2].set(0,-depth*w,0).applyQuaternion(r.simulationGroup.quaternion);p.add(down);hip.position.copy(hip.parent.worldToLocal(p));r.hulkRoot.updateMatrixWorld(true);
  // Shoulder motion stays small and is shared by the upper back, not one joint.
  for(const name of ['Bip001_Spine1','Bip001_Spine2']){const b=r.bones.get(name);if(b)b.quaternion.multiply(this.q[0].setFromAxisAngle(Z,-.018*w));}
  r.hulkRoot.updateMatrixWorld(true);
  const shoulderLine=this.v[0].subVectors(r.bones.get('Bip001_R_UpperArm').getWorldPosition(this.v[1]),r.bones.get('Bip001_L_UpperArm').getWorldPosition(this.v[2])).normalize();
  const lateral=this.v[3].copy(Z).applyQuaternion(r.simulationGroup.quaternion),chest=r.bones.get('Bip001_Spine2');
  this.q[0].setFromUnitVectors(shoulderLine,lateral).multiply(chest.getWorldQuaternion(this.q[1]));this.setWorldQuaternion(chest,this.q[0],w);
  for(const side of ['L','R']){
   const foot=this.feet[side],sign=side==='L'?-1:1,cycle=(phase+(side==='L'?.1:.6))%1,stance=.62;
   let stride=side==='L'?.10:-.10,height=0,pitch=0;
   if(this.strideWeight>.0001){let step;if(cycle<stance){step=.31-cycle;pitch=-.045*T.MathUtils.smoothstep(cycle,.46,.62);}else{const u=(cycle-stance)/(1-stance);step=-.31-.38*u+3*u*u-2*u*u*u;height=.10*Math.sin(Math.PI*u)**2;pitch=-.045*(1-u)+.11*Math.sin(Math.PI*u);}stride=T.MathUtils.lerp(stride,step,this.strideWeight);height*=this.strideWeight;pitch*=this.strideWeight;}
   foot.target.set(r.hulkRoot.position.x+stride-.08,.275+height,sign*(lift?.43:.38));
   foot.target.lerpVectors(foot.natural,foot.target,w);
   // Both feet face the load with a small outward toe angle and a quiet ankle.
   const forward=this.v[3].set(Math.cos(.12),0,sign*Math.sin(.12));const normal=this.v[4].crossVectors(this.v[5].set(0,-1,0),forward);
   this.matrix.makeBasis(this.v[5],forward,normal);this.q[0].setFromRotationMatrix(this.matrix);this.q[1].setFromAxisAngle(Z,pitch).multiply(this.q[0]).premultiply(r.simulationGroup.quaternion);foot.q.slerp(this.q[1],w);
   const target=r.simulationGroup.localToWorld(this.v[6].copy(foot.target));const pole=this.v[7].set(1,0,sign*.1).applyQuaternion(r.simulationGroup.quaternion);
   this.chains[side+'leg'].solve(target,pole,w,foot.q);
  }
  this.syncHelpers();r.groundHulk();
  for(const side of ['L','R']){
   const sign=side==='L'?-1:1,target=this.v[8],direction=this.v[9],palm=this.v[10];
   if(r.mode==='car'){target.set(-1.93,.93,sign*.49);direction.set(.985,.174,0);palm.set(.174,-.985,0);}
   else if(r.mode==='incline'){target.set(-.945,1.35,sign*.51);direction.set(.64,.768,0);palm.set(.768,-.64,0);}
   else{target.set(-.40,r.rock.position.y-.12,sign*.44);direction.set(.84,.18,-sign*.51).normalize();palm.set(-.12,.98,sign*.12).normalize();}
   r.simulationGroup.localToWorld(target);const pole=this.v[11].set(-.18,-1,sign*(lift?.25:.16)).applyQuaternion(r.simulationGroup.quaternion),chain=this.chains[side+'arm'];
   chain.solve(target,pole,w);
   const normal=this.v[12].crossVectors(direction,palm).normalize();frameQuaternion(direction,normal,this.q[0],this.matrix,this.v[13],this.v[14],this.v[15]).premultiply(r.simulationGroup.quaternion);chain.orientHand(this.q[0],w);
  }
  this.fingersPose(w);this.syncHelpers();this.lastDistance=sample.s;
 }
}
