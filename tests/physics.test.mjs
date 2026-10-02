import assert from 'node:assert/strict';
import {calculatePhysics as calc,samplePhysics as sample} from '../js/physics.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`),base={mode:'car',m:1200,F:5000,d:15,v0:0,mu:.2,angle:0};
let p=calc(base);near(p.N,11772);near(p.fr,2354.4);near(p.Wn,39684);near(p.Kf,39684);near(sample(p,p.t).s,15);
p=calc({...base,F:0,v0:10,d:30});near(p.actualDistance,100/(2*.2*9.81));near(p.Wn,-p.Ki);near(p.Kf,0);near(sample(p,p.t).v,0);assert.ok(p.stopped);
p=calc({...base,F:100});assert.ok(p.blocked);near(p.Wa,0);near(p.netForce,0);assert.equal(p.t,null);
p=calc({...base,F:2354.4,v0:5});near(p.a,0);near(p.t,3);near(p.Wn,0);
p=calc({...base,m:200,F:12000,angle:45});assert.ok(!p.valid);
p=calc({...base,mode:'lift',m:180,F:3000,d:.9});near(p.U,1589.22);near(p.Wr,-1589.22);near(p.Ki+p.Wn,p.Kf);
p=calc({...base,mode:'lift',m:180,F:1000,d:.9});assert.ok(p.blocked);near(p.U,0);
p=calc({...base,mode:'incline',m:400,F:4000,d:12,angle:18,mu:.15});near(p.height,12*Math.sin(18*Math.PI/180));near(p.Wa+p.Wr,p.Kf);near(p.Wr,-p.U-p.fr*p.actualDistance);
for(const mode of ['car','lift','incline'])for(const F of [0,1000,5000,12000])for(const v0 of [0,2,10]){p=calc({...base,mode,F,v0,angle:mode==='incline'?25:0,d:mode==='lift'?1.8:30});for(const t of [0,(p.t??0)/2,p.t??0]){let s=sample(p,t);assert.ok(s.s<=p.actualDistance+1e-8);assert.ok(s.K>=0);near(p.Ki+s.W,s.K);}near(p.Ki+p.Wn,p.Kf);}
console.log('Physics checks passed: work–energy, stopping, static balance, slope, lift, constant velocity and loss of contact.');
