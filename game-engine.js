(function(root){
'use strict';
const DURATION=180,ENERGY_MAX=10,ENERGY_REGEN=.32,LANES=3;
const SPECS={
 scout:{name:'Scout',icon:'S',cost:2,hp:52,speed:.04,range:.075,damage:8,cooldown:.82,color:'#56e6e6',role:'FAST STRIKER',description:'Quick skirmisher · rushes the line'},
 heavy:{name:'Heavy',icon:'H',cost:4,hp:145,speed:.016,range:.092,damage:21,cooldown:1.45,color:'#ffad56',role:'ARMORED BREAKER',description:'Heavy armor · punishing cannon'},
 medic:{name:'Medic',icon:'M',cost:3,hp:82,speed:.023,range:.095,damage:4,cooldown:1.0,heal:17,healRange:.13,color:'#91f5b2',role:'FIELD SUPPORT',description:'Repairs nearby allies · light pulse'},
 drone:{name:'Drone',icon:'D',cost:3,hp:57,speed:.03,range:.155,damage:8,cooldown:.88,color:'#c49aff',role:'AERIAL ARTILLERY',description:'Long range · glides over the frontline'}
};
const laneY=[.29,.5,.71];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const opposite=id=>id==='player'?'ai':'player';
const player=(s,id)=>s.players[id];
function newGame(options){
 options=options||{};
 return {duration:options.duration||DURATION,elapsed:0,remaining:options.duration||DURATION,phase:'battle',winner:null,endReason:null,nextId:1,aiClock:1.4,
 players:{player:{id:'player',name:'NOVA COMMAND',color:'cyan',coreHP:120,maxCoreHP:120,energy:6,maxEnergy:ENERGY_MAX},ai:{id:'ai',name:'EMBER DIRECTIVE',color:'orange',coreHP:120,maxCoreHP:120,energy:5,maxEnergy:ENERGY_MAX}},
 units:[],projectiles:[],effects:[],events:[],message:'Select a unit card, then deploy it in your territory.',messageTone:'info',stats:{playerDeploys:0,aiDeploys:0,coreHits:{player:0,ai:0}}};
}
function event(s,text,tone){s.events.push({text,tone,at:s.elapsed});s.events=s.events.slice(-12);s.message=text;s.messageTone=tone||'info';}
function fx(s,type,x,y,color,text){s.effects.push({type,x,y,color,text:text||'',age:0,life:type==='burst'?.78:type==='number'?1.05:type==='muzzle'?.18:type==='core'?.8:.48});}
function deploy(s,owner,type,lane){
 if(s.phase!=='battle')return{ok:false,reason:'The match has ended.'};
 const p=player(s,owner),spec=SPECS[type];
 if(!p||!spec)return{ok:false,reason:'Choose a valid unit.'};
 if(!Number.isInteger(lane)||lane<0||lane>=LANES)return{ok:false,reason:'Choose one of the three lanes.'};
 if(p.energy+1e-8<spec.cost)return{ok:false,reason:'Not enough energy for that unit.'};
 p.energy=+(p.energy-spec.cost).toFixed(2);
 const unit={id:s.nextId++,owner,type,lane,x:owner==='player'?.17:.83,hp:spec.hp,maxHp:spec.hp,cooldown:.25,healCooldown:.2,alive:true};
 s.units.push(unit);s.stats[owner==='player'?'playerDeploys':'aiDeploys']++;fx(s,'deploy',unit.x,laneY[lane],spec.color);
 event(s,(owner==='player'?'You deployed ':'Opponent deployed ')+spec.name+'.',owner==='player'?'friendly':'enemy');
 return{ok:true,unit};
}
function coreX(owner){return owner==='player'?.055:.945;}
function attackCoreX(attacker){return attacker==='player'?.91:.09;}
function damageCore(s,owner,amount){
 const p=player(s,owner);if(!p||p.coreHP<=0)return;
 p.coreHP=Math.max(0,p.coreHP-amount);s.stats.coreHits[owner]++;const color=owner==='player'?'#50e9e8':'#ff995b';fx(s,'core',coreX(owner),.5,color);fx(s,'number',coreX(owner),.5,color,'-'+amount);
 event(s,(owner==='player'?'Your':'Enemy')+' command core took '+amount+' damage.',owner==='player'?'danger':'friendly');
 if(p.coreHP<=0)finish(s,opposite(owner),'core');
}
function finish(s,winner,reason){
 if(s.phase!=='battle')return;
 s.phase='complete';s.winner=winner;s.endReason=reason;
 if(winner==='draw')event(s,reason==='time'?'The battle ended in a draw.':'Both command cores fell. Draw.','neutral');
 else event(s,(winner==='player'?'Victory':'Defeat')+(reason==='core'?' — command core destroyed.':' — time expired.'),winner==='player'?'friendly':'enemy');
}
function strength(s,owner){return s.units.filter(u=>u.alive&&u.owner===owner).reduce((sum,u)=>sum+u.hp,0);}
function finishOnTime(s){
 const p=player(s,'player'),a=player(s,'ai');
 if(p.coreHP!==a.coreHP){finish(s,p.coreHP>a.coreHP?'player':'ai','time');return;}
 const ps=strength(s,'player'),as=strength(s,'ai');
 if(ps!==as){finish(s,ps>as?'player':'ai','time');return;}
 finish(s,'draw','time');
}
function shoot(s,u,targetType,targetId,targetX,targetY,damage,healing){
 const sp=SPECS[u.type],sx=u.x,sy=laneY[u.lane];
 const distance=Math.hypot(targetX-sx,(targetY-sy)*.8);
 fx(s,'muzzle',sx,sy,healing?'#99ffc4':sp.color);
 s.projectiles.push({owner:u.owner,sourceId:u.id,targetType,targetId,x:sx,y:sy,toX:targetX,toY:targetY,damage,color:healing?'#99ffc4':sp.color,progress:0,duration:clamp(distance/1.25,.12,.55),healing:!!healing});
}
function nearestEnemy(s,u){
 const dir=u.owner==='player'?1:-1;
 return s.units.filter(e=>e.alive&&e.owner!==u.owner&&e.lane===u.lane&&(e.x-u.x)*dir>=-.018).sort((a,b)=>Math.abs(a.x-u.x)-Math.abs(b.x-u.x))[0]||null;
}
function medicTarget(s,u){
 return s.units.filter(a=>a.alive&&a.owner===u.owner&&a.id!==u.id&&a.hp<a.maxHp&&Math.abs(a.x-u.x)+Math.abs(a.lane-u.lane)*.1<=SPECS.medic.healRange).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0]||null;
}
function actUnit(s,u,dt){
 const sp=SPECS[u.type],dir=u.owner==='player'?1:-1,enemy=nearestEnemy(s,u);
 u.cooldown=Math.max(0,u.cooldown-dt);u.healCooldown=Math.max(0,u.healCooldown-dt);
 if(u.type==='medic'&&u.healCooldown<=0){const ally=medicTarget(s,u);if(ally){const amount=Math.min(sp.heal,ally.maxHp-ally.hp);u.healCooldown=sp.cooldown;shoot(s,u,'unit',ally.id,ally.x,laneY[ally.lane],amount,true);fx(s,'heal',ally.x,laneY[ally.lane],sp.color);return;}}
 if(enemy){
  const gap=Math.abs(enemy.x-u.x);
  if(gap<=sp.range+(u.type==='drone'?.025:.014)){
   if(u.cooldown<=0){u.cooldown=sp.cooldown;shoot(s,u,'unit',enemy.id,enemy.x,laneY[enemy.lane],sp.damage,false);}
   return;
  }
  u.x+=dir*sp.speed*dt;
  if((enemy.x-u.x)*dir<0)u.x=enemy.x-dir*sp.range*.72;
  return;
 }
 const target=attackCoreX(u.owner),gap=Math.abs(target-u.x);
 if(gap<=sp.range+.012){
  if(u.cooldown<=0){u.cooldown=sp.cooldown;shoot(s,u,'core',opposite(u.owner),coreX(opposite(u.owner)),.5,sp.damage,false);}
  return;
 }
 u.x=clamp(u.x+dir*sp.speed*dt,u.owner==='player'?.12:.09,u.owner==='player'?.91:.88);
}
function updateProjectiles(s,dt){
 const next=[];
 for(const b of s.projectiles){
  b.progress+=dt/b.duration;
  if(b.progress>=1){
   if(b.targetType==='core')damageCore(s,b.targetId,Math.max(2,Math.round(b.damage*.4)));
   else{const target=s.units.find(u=>u.id===b.targetId&&u.alive);if(target){if(b.healing){target.hp=Math.min(target.maxHp,target.hp+b.damage);fx(s,'number',target.x,laneY[target.lane],b.color,'+'+b.damage);}else{target.hp-=b.damage;fx(s,'number',target.x,laneY[target.lane],b.color,'-'+b.damage);fx(s,'hit',target.x,laneY[target.lane],b.color);if(target.hp<=0){target.alive=false;fx(s,'burst',target.x,laneY[target.lane],b.color);event(s,SPECS[target.type].name+' unit destroyed.',target.owner==='player'?'danger':'friendly');}}}}
   }else next.push(b);
  if(s.phase!=='battle')break;
 }
 s.projectiles=s.phase==='battle'?next:[];
}
function aiDeploy(s){
 const ai=player(s,'ai');if(ai.energy<2)return;
 const lanes=[0,1,2].map(l=>({lane:l,pressure:s.units.filter(u=>u.alive&&u.owner==='player'&&u.lane===l).length-s.units.filter(u=>u.alive&&u.owner==='ai'&&u.lane===l).length}));
 lanes.sort((a,b)=>b.pressure-a.pressure);
 const pressure=lanes[0].pressure;let type;
 if(pressure>0&&ai.energy>=4)type='heavy';
 else if(s.units.some(u=>u.alive&&u.owner==='player'&&u.type==='heavy')&&ai.energy>=3)type='drone';
 else if(ai.energy>=3&&Math.random()<.34)type='medic';
 else type='scout';
 if(ai.energy<SPECS[type].cost)type=ai.energy>=3?'drone':'scout';
 deploy(s,'ai',type,lanes[0].lane);
}
function step(s,delta,options){
 options=options||{};
 if(s.phase!=='battle')return s;
 const dt=clamp(delta,0,.1);if(dt===0)return s;
 s.elapsed+=dt;s.remaining=Math.max(0,s.duration-s.elapsed);
 for(const p of Object.values(s.players))p.energy=Math.min(p.maxEnergy,p.energy+ENERGY_REGEN*dt);
 if(options.ai!==false){s.aiClock-=dt;if(s.aiClock<=0){aiDeploy(s);s.aiClock=1.9+Math.random()*.8;}}
 for(const u of s.units)if(u.alive)actUnit(s,u,dt);
 updateProjectiles(s,dt);
 s.effects=s.effects.filter(e=>{e.age+=dt;return e.age<e.life;});
 s.units=s.units.filter(u=>u.alive);
 if(s.phase==='battle'&&s.remaining<=0)finishOnTime(s);
 return s;
}
root.LastSignalGame={DURATION,ENERGY_MAX,ENERGY_REGEN,LANES,laneY,SPECS,newGame,deploy,step,finishOnTime,strength,player,attackCoreX,coreX};
if(typeof module!=='undefined'&&module.exports)module.exports=root.LastSignalGame;
})(typeof window!=='undefined'?window:globalThis);