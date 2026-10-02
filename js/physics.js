/** SI throughout. One common static/kinetic coefficient; unilateral antirollback stop on ramp. */
export const G=9.81;
const EPS=1e-9;
export function calculatePhysics(input){
 const {mode,m,F,d,v0,mu,angle}=input;
 if(![m,F,d,v0,mu,angle].every(Number.isFinite)||m<=0||d<=0||F<0||v0<0||mu<0)throw new RangeError('Variables físicas fuera de rango.');
 const th=angle*Math.PI/180,weight=m*G,Ki=.5*m*v0*v0;
 let N=0,fr=0,res=0,applied=F,parallel=0,valid=true;
 if(mode==='car'){N=weight-F*Math.sin(th);valid=N>=-EPS;N=Math.max(0,N);fr=mu*N;res=fr;applied=F*Math.cos(th);}
 else if(mode==='lift'){res=weight;}
 else if(mode==='incline'){N=weight*Math.cos(th);parallel=weight*Math.sin(th);fr=mu*N;res=parallel+fr;}
 else throw new RangeError('Experimento desconocido.');
 const drivingForce=applied-res,blocked=!valid||(v0===0&&drivingForce<=EPS);
 const netForce=blocked?0:drivingForce,a=netForce/m;
 let actualDistance=d,stopped=false;
 if(blocked)actualDistance=0;
 else if(a<0){const stoppingDistance=v0*v0/(-2*a);if(stoppingDistance<=d+EPS){actualDistance=Math.min(d,stoppingDistance);stopped=true;}}
 let Kf=Math.max(0,Ki+netForce*actualDistance),vf=Math.sqrt(2*Kf/m);
 if(stopped){Kf=0;vf=0;}
 const Wa=applied*actualDistance,Wr=-res*actualDistance,Wn=Wa+Wr;
 const height=mode==='lift'?actualDistance:mode==='incline'?actualDistance*Math.sin(th):0,U=weight*height;
 const t=blocked?null:(Math.abs(a)<EPS?actualDistance/v0:2*actualDistance/(v0+vf));
 return {...input,th,weight,N,fr,res,applied,parallel,valid,drivingForce,blocked,netForce,a,actualDistance,stopped,Ki,Kf,vf,Wa,Wr,Wn,height,U,t,power:t>0?Wa/t:null};
}
export function samplePhysics(data,time){
 const t=Math.max(0,Math.min(time,data.t??0));
 const atEnd=!data.blocked&&time>=data.t;
 const s=data.blocked?0:atEnd?data.actualDistance:Math.min(data.actualDistance,Math.max(0,data.v0*t+.5*data.a*t*t));
 const v=data.blocked?0:atEnd?data.vf:Math.max(0,data.v0+data.a*t);
 const W=atEnd?data.Wn:data.netForce*s,K=atEnd?data.Kf:Math.max(0,data.Ki+W),h=data.mode==='lift'?s:data.mode==='incline'?s*Math.sin(data.th):0;
 return {t,s,v,W,K,U:data.weight*h,Wa:data.applied*s,Wr:-data.res*s,progress:s/data.d};
}
export function interpretation(p){
 if(!p.valid)return 'La componente vertical de la fuerza supera el peso. El automóvil perdería contacto con el suelo; este modelo de movimiento horizontal deja de ser válido. Reduce la fuerza o su ángulo.';
 if(p.blocked)return p.mode==='lift'?'La fuerza aplicada no supera el peso de la roca. El suelo aporta la reacción que falta: no hay elevación, recorrido ni trabajo mecánico.':p.mode==='incline'?'La fuerza no vence la resistencia de la pendiente. El seguro antirretroceso mantiene la carga en reposo; no hay recorrido ni trabajo.':'La fuerza horizontal no supera el umbral de fricción. La fricción estática equilibra la fuerza: el automóvil permanece inmóvil y el trabajo es cero.';
 const behavior=p.a>EPS?'La fuerza aplicada supera la resistencia. La fuerza neta es positiva y el objeto acelera: el trabajo neto aumenta su energía cinética.':p.a<-EPS?'La resistencia supera la fuerza aplicada. El objeto avanza por su velocidad inicial, pero pierde energía cinética y desacelera.':'La fuerza aplicada equilibra la resistencia. La velocidad inicial se mantiene constante y el trabajo neto es cero.';
 const stop=p.stopped?` Se detiene a ${p.actualDistance.toFixed(2)} m${p.actualDistance<p.d-1e-7?', antes del recorrido elegido':''}; los trabajos corresponden únicamente a esa distancia.`:'';
 const extra=p.mode==='incline'?' La altura es d·sin(θ). El trabajo resistente ya incluye la gravedad; Ug no se vuelve a restar de K.':p.mode==='lift'?' Al alcanzar la altura aumenta Ug. La velocidad final indicada corresponde al instante de llegada; mantener la roca inmóvil después exige un frenado adicional de trabajo −Kf.':'';
 return behavior+stop+extra;
}
