(function(root){
'use strict';
const G=()=>root.LastSignalGame;
const palettes={player:{core:'#54f5eb',light:'#b5fff7',deep:'#176d78',steel:'#294652',shadow:'#0b1720'},ai:{core:'#ff9d58',light:'#ffe0b0',deep:'#9e4329',steel:'#554034',shadow:'#1b1210'}};
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function rounded(ctx,x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function poly(ctx,pts){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();}
function glow(ctx,x,y,r,color,alpha){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.globalAlpha=1;}
function steel(ctx,x,y,w,h,r,accent,light){const g=ctx.createLinearGradient(x,y,x+w*.2,y+h);g.addColorStop(0,'#9aabb0');g.addColorStop(.13,'#536976');g.addColorStop(.36,'#2b3c47');g.addColorStop(.72,'#182630');g.addColorStop(1,'#0e1820');rounded(ctx,x,y,w,h,r);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=accent||'#84979c';ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=.58;ctx.strokeStyle=light||'#c3d4d5';ctx.beginPath();ctx.moveTo(x+r,y+1);ctx.lineTo(x+w-r,y+1);ctx.stroke();ctx.globalAlpha=1;}
function rivet(ctx,x,y,color){ctx.fillStyle='#111c24';ctx.beginPath();ctx.arc(x,y,1.4,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.globalAlpha=.8;ctx.fillRect(x-.5,y-.5,1,1);ctx.globalAlpha=1;}
function city(ctx,w,h,time){const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,'#0a151f');grad.addColorStop(.5,'#101b24');grad.addColorStop(1,'#1b2429');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
 const buildings=[];for(let i=0;i<25;i++)buildings.push({x:i*w/22+(i%3)*8,width:13+(i*17%33),height:h*(.11+(i*29%27)/100),seed:i});
 for(const b of buildings){const y=h*.16;ctx.fillStyle=b.seed%2?'#17262f':'#1b2830';ctx.fillRect(b.x,y+h*.44-b.height,b.width,b.height);ctx.fillStyle='#35444a';ctx.fillRect(b.x-2,y+h*.44-b.height,b.width+4,3);for(let r=0;r<4;r++)for(let c=0;c<2;c++){const pulse=Math.sin(time*1.2+b.seed+r+c);ctx.globalAlpha=.12+Math.max(0,pulse)*.23;ctx.fillStyle=b.seed%2?'#54e5df':'#ffad63';ctx.fillRect(b.x+3+c*7,y+h*.44-b.height+8+r*9,2,3);}ctx.globalAlpha=1;}
 const atmos=ctx.createRadialGradient(w*.5,h*.43,0,w*.5,h*.43,w*.6);atmos.addColorStop(0,'#43606a19');atmos.addColorStop(1,'transparent');ctx.fillStyle=atmos;ctx.fillRect(0,0,w,h);
}
function platform(ctx,w,h,lane,time,index){
 const y=lane*h,th=Math.max(65,h*.145),top=y-th*.5,bottom=y+th*.5;
 // load-bearing platform with deep bevel and metallic deck
 poly(ctx,[[0,top+5],[w*.035,top],[w*.965,top],[w,bottom-5],[w,bottom+11],[w*.02,bottom+11],[0,bottom]]);const side=ctx.createLinearGradient(0,top,0,bottom+12);side.addColorStop(0,'#607078');side.addColorStop(.08,'#263740');side.addColorStop(.78,'#121e26');side.addColorStop(1,'#34434a');ctx.fillStyle=side;ctx.fill();ctx.strokeStyle='#778a8f';ctx.globalAlpha=.48;ctx.stroke();ctx.globalAlpha=1;
 const deck=ctx.createLinearGradient(0,top,0,bottom);deck.addColorStop(0,'#34464e');deck.addColorStop(.15,'#24343d');deck.addColorStop(.5,'#19262e');deck.addColorStop(.84,'#25343b');deck.addColorStop(1,'#3b4b50');ctx.fillStyle=deck;ctx.fillRect(0,top+3,w,bottom-top-7);
 // panel seams, bolts, directional hazard plates
 for(let x=20;x<w;x+=82){ctx.strokeStyle='#aab7b622';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,top+6);ctx.lineTo(x,bottom-7);ctx.stroke();poly(ctx,[[x+5,top+8],[x+23,top+8],[x+27,top+13],[x+5,top+13]]);ctx.fillStyle='#718187';ctx.globalAlpha=.5;ctx.fill();ctx.globalAlpha=1;rivet(ctx,x+6,top+19,'#bac9c6');rivet(ctx,x+6,bottom-17,'#bac9c6');
  if((x/82|0)%3===index%3){ctx.fillStyle='#d4a268';ctx.globalAlpha=.65;for(let z=0;z<3;z++)poly(ctx,[[x+39+z*8,top+9],[x+44+z*8,top+9],[x+39+z*8,bottom-10],[x+34+z*8,bottom-10]]),ctx.fill();ctx.globalAlpha=1;}
 }
 // glowing energy rails, animated chase lights
 for(const edge of [top+2,bottom-4]){const grad=ctx.createLinearGradient(0,0,w,0);grad.addColorStop(0,'#52eeeb');grad.addColorStop(.38,'#315b62');grad.addColorStop(.5,'#607178');grad.addColorStop(.62,'#65452f');grad.addColorStop(1,'#ff9d58');ctx.strokeStyle=grad;ctx.lineWidth=2.4;ctx.globalAlpha=.88;ctx.beginPath();ctx.moveTo(3,edge);ctx.lineTo(w-3,edge);ctx.stroke();ctx.globalAlpha=1;
  for(let i=0;i<8;i++){const t=((i/8+(time*(index%2?-.11:.11)))%1+1)%1,x=t*w;const c=t<.5?'#72fff2':'#ffc07b';glow(ctx,x,edge,7,c,.55);ctx.fillStyle=c;ctx.fillRect(x-2,edge-2,4,4);}
 }
 // raised central lane plates and arrows
 ctx.fillStyle='#d6e5df';ctx.globalAlpha=.2;ctx.font='700 12px monospace';ctx.textAlign='center';for(let x=60;x<w;x+=150)ctx.fillText('›››',x, y+4);ctx.globalAlpha=1;
 // flux nodes
 for(let i=0;i<4;i++){const x=w*(.18+i*.21),pulse=.5+.5*Math.sin(time*3+i+index);glow(ctx,x,y,16,'#66e9df',.06+.08*pulse);ctx.strokeStyle='#91d4d1';ctx.globalAlpha=.34;ctx.strokeRect(x-7,y-7,14,14);ctx.globalAlpha=1;ctx.fillStyle='#b4fff6';ctx.globalAlpha=.4+.4*pulse;ctx.fillRect(x-2,y-2,4,4);ctx.globalAlpha=1;}
}
function drawEnvironment(ctx,w,h,time){
 // Three battle corridors with independent accenting.
 const lanes=G().laneY;
 lanes.forEach((lane,i)=>platform(ctx,w,h,lane,time,i));
 // deployment bays and faction-painted zone markings
 ctx.globalAlpha=.13;ctx.fillStyle='#52f4ed';ctx.fillRect(0,h*.16,w*.19,h*.68);ctx.fillStyle='#ff9d58';ctx.fillRect(w*.81,h*.16,w*.19,h*.68);ctx.globalAlpha=1;
 for(const lane of lanes){const y=lane*h;ctx.strokeStyle='#57e5e3';ctx.globalAlpha=.36;ctx.setLineDash([4,7]);ctx.beginPath();ctx.moveTo(w*.2,y-h*.043);ctx.lineTo(w*.2,y+h*.043);ctx.stroke();ctx.strokeStyle='#ff9f5b';ctx.beginPath();ctx.moveTo(w*.8,y-h*.043);ctx.lineTo(w*.8,y+h*.043);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
 // modular bunkers between lanes with ribbed armor and optic lights
 for(let i=0;i<6;i++){const x=w*(.22+i*.112),y=h*(i%2?.395:.605),flip=i%2?1:-1;ctx.save();ctx.translate(x,y);ctx.fillStyle='#0b1218';ctx.beginPath();ctx.ellipse(0,13,29,8,0,0,Math.PI*2);ctx.fill();poly(ctx,[[-29,8],[-22,-5],[-14,-16],[14,-16],[24,-4],[29,8],[20,13],[-20,13]]);const g=ctx.createLinearGradient(0,-16,0,14);g.addColorStop(0,'#778990');g.addColorStop(.3,'#354851');g.addColorStop(1,'#111b21');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#87969a';ctx.globalAlpha=.63;ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle='#17262d';ctx.fillRect(-12,-9,25,13);ctx.fillStyle=i%2?'#ffad61':'#56eeee';ctx.globalAlpha=.55+.35*Math.sin(time*4+i);ctx.fillRect(-3,-6,7,4);ctx.globalAlpha=1;ctx.strokeStyle='#aebfc1';ctx.lineWidth=1;for(let k=-1;k<=1;k++)ctx.strokeRect(-19+k*12,2,7,4);ctx.restore();}
 // exhaust vents release animated vapor wisps
 for(let i=0;i<5;i++){const x=w*(.14+i*.17),y=h*(i%2?.42:.58),phase=(time*.24+i*.21)%1;ctx.fillStyle='#0c141b';ctx.fillRect(x-9,y-3,18,6);for(let p=0;p<4;p++){const q=(phase+p*.23)%1,yy=y-q*37;ctx.globalAlpha=(1-q)*.18;ctx.fillStyle='#bdd1d0';ctx.beginPath();ctx.ellipse(x+Math.sin(time*2+i+p)*5*q,yy,3+q*8,2+q*5,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;const beat=.5+.5*Math.sin(time*2+i);glow(ctx,x,y,15,'#67e8dd',.05+.08*beat);}
 // central command boundary, volumetric beacon
 const mx=w*.5;glow(ctx,mx,h*.5,65,'#dce5dd',.12);ctx.strokeStyle='#b8cac6';ctx.globalAlpha=.26;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(mx,h*.18);ctx.lineTo(mx,h*.82);ctx.stroke();ctx.globalAlpha=1;
 for(let i=0;i<3;i++){const y=lanes[i]*h;ctx.fillStyle='#19272c';ctx.strokeStyle='#819391';ctx.beginPath();ctx.moveTo(mx-10,y);ctx.lineTo(mx,y-9);ctx.lineTo(mx+10,y);ctx.lineTo(mx,y+9);ctx.closePath();ctx.fill();ctx.globalAlpha=.48+.35*Math.sin(time*4+i);ctx.stroke();ctx.fillStyle='#fff2cb';ctx.beginPath();ctx.arc(mx,y,2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
}
function drawShield(ctx,x,y,dir,color,integrity,time){
 const alpha=.12+.12*integrity+.07*Math.sin(time*3);
 ctx.save();ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+dir*16,y-110);ctx.quadraticCurveTo(x+dir*105,y-74,x+dir*94,y);ctx.quadraticCurveTo(x+dir*105,y+74,x+dir*16,y+110);ctx.stroke();
 ctx.globalAlpha=alpha*.5;ctx.lineWidth=1;for(let j=0;j<5;j++){const yy=y-82+j*40;ctx.beginPath();ctx.moveTo(x+dir*20,yy);ctx.lineTo(x+dir*(36+Math.sin(time*2+j)*5),yy+16);ctx.stroke();}
 ctx.globalAlpha=1;
 // shield hit fissures flash on actual core impacts
 const hits=G().player;ctx.restore();
}
function drawBase(ctx,x,y,owner,state,w,h,time){
 const own=owner==='player',palette=palettes[owner],integrity=state.players[owner].coreHP/state.players[owner].maxCoreHP,dir=own?1:-1,baseW=Math.min(w*.14,138),baseH=Math.min(h*.64,300);
 glow(ctx,x,y,baseW*1.25,palette.core,.18+.08*Math.sin(time*2));
 ctx.save();ctx.translate(x,y);
 // foundation with layered armor and floor clamps
 ctx.fillStyle='#080d12';ctx.beginPath();ctx.ellipse(0,baseH*.39,baseW*.62,baseH*.11,0,0,Math.PI*2);ctx.fill();
 poly(ctx,[[-baseW*.6,baseH*.34],[-baseW*.52,baseH*.24],[baseW*.52,baseH*.24],[baseW*.6,baseH*.34],[baseW*.48,baseH*.43],[-baseW*.48,baseH*.43]]);const foot=ctx.createLinearGradient(0,baseH*.24,0,baseH*.43);foot.addColorStop(0,'#87969a');foot.addColorStop(.2,'#344650');foot.addColorStop(1,'#10191f');ctx.fillStyle=foot;ctx.fill();ctx.strokeStyle='#9aa9a6';ctx.globalAlpha=.65;ctx.stroke();ctx.globalAlpha=1;
 // two armored reactor towers flanking a central heart
 for(const side of [-1,1]){const tx=side*baseW*.36,tw=baseW*.23;poly(ctx,[[tx-tw*.55,-baseH*.34],[tx+tw*.45,-baseH*.37],[tx+tw*.6,-baseH*.08],[tx+tw*.46,baseH*.2],[tx-tw*.55,baseH*.18],[tx-tw*.69,-baseH*.04]]);const g=ctx.createLinearGradient(tx-tw,-baseH*.35,tx+tw,baseH*.2);g.addColorStop(0,'#87999d');g.addColorStop(.18,palette.steel);g.addColorStop(.56,'#1b2932');g.addColorStop(1,palette.shadow);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=palette.core;ctx.globalAlpha=.8;ctx.lineWidth=1.25;ctx.stroke();ctx.globalAlpha=1;
  ctx.fillStyle='#111d26';ctx.fillRect(tx-tw*.34,-baseH*.15,tw*.7,baseH*.31);for(let k=0;k<5;k++){ctx.strokeStyle=k%2?palette.core:'#71838a';ctx.globalAlpha=k%2?.7:.55;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(tx-tw*.28+k*4,-baseH*.11);ctx.lineTo(tx-tw*.28+k*4,-baseH*.11+baseH*.22);ctx.stroke();}ctx.globalAlpha=1;
  ctx.fillStyle=palette.light;ctx.globalAlpha=.55+.4*Math.sin(time*5+side);ctx.fillRect(tx-tw*.35,-baseH*.29,tw*.7,3);ctx.globalAlpha=1;
  // exhaust stacks
  ctx.fillStyle='#0c141a';ctx.fillRect(tx-tw*.26,-baseH*.45,tw*.52,baseH*.1);ctx.strokeStyle='#5d6b6f';ctx.strokeRect(tx-tw*.26,-baseH*.45,tw*.52,baseH*.1);const puff=(time*.42+side*.2+owner.length*.1)%1;ctx.globalAlpha=(1-puff)*.2;ctx.fillStyle='#bac7c2';ctx.beginPath();ctx.ellipse(tx,puff*-18-baseH*.45,4+puff*7,5+puff*8,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 }
 // center heart support, layered reactor petals
 const heartY=-baseH*.04,r=baseW*.31;ctx.save();ctx.translate(0,heartY);for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/4+time*.12*dir);poly(ctx,[[-r*.22,-r*.48],[r*.22,-r*.48],[r*.35,-r*.1],[r*.2,r*.2],[-r*.2,r*.2],[-r*.35,-r*.1]]);const pg=ctx.createLinearGradient(0,-r*.5,0,r*.3);pg.addColorStop(0,'#a9b8b8');pg.addColorStop(.25,'#394d55');pg.addColorStop(1,'#111b22');ctx.fillStyle=pg;ctx.fill();ctx.strokeStyle='#819397';ctx.globalAlpha=.75;ctx.stroke();ctx.restore();}ctx.restore();
 glow(ctx,0,heartY,r*1.7,palette.core,.36+.2*Math.sin(time*4));
 const orb=ctx.createRadialGradient(-r*.3,heartY-r*.28,1,0,heartY,r*.75);orb.addColorStop(0,palette.light);orb.addColorStop(.18,palette.core);orb.addColorStop(.57,palette.deep);orb.addColorStop(1,'#071017');ctx.fillStyle=orb;ctx.strokeStyle=palette.light;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,heartY,r*.58,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.8;ctx.stroke();ctx.globalAlpha=1;
 for(let i=0;i<3;i++){ctx.strokeStyle=palette.light;ctx.globalAlpha=.35;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,heartY,r*(.7+i*.16),r*(.26+i*.12),time*(i%2?.25:-.25),0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
 // protective crystal ribs around the core
 for(let side of [-1,1]){ctx.strokeStyle=palette.light;ctx.globalAlpha=.72;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(side*r*.74,heartY-r*.65);ctx.lineTo(side*r*1.03,heartY);ctx.lineTo(side*r*.74,heartY+r*.65);ctx.stroke();}ctx.globalAlpha=1;
 // armor damage accumulates visibly with integrity loss
 if(integrity<.76){ctx.strokeStyle='#ff7b62';ctx.globalAlpha=(.76-integrity)*1.8;ctx.lineWidth=1.6;poly(ctx,[[-baseW*.4,-baseH*.19],[-baseW*.25,-baseH*.11],[-baseW*.3,-baseH*.02],[-baseW*.15,baseH*.08]]);ctx.stroke();poly(ctx,[[baseW*.38,-baseH*.24],[baseW*.27,-baseH*.14],[baseW*.31,-baseH*.05],[baseW*.17,baseH*.05]]);ctx.stroke();ctx.globalAlpha=1;}
 if(integrity<.45){for(let i=0;i<3;i++){const yy=-baseH*.22+i*baseH*.18;ctx.globalAlpha=.17*(.5+.5*Math.sin(time*5+i));ctx.fillStyle='#ff795f';ctx.beginPath();ctx.ellipse(-dir*baseW*.3,yy,9,5,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
 ctx.fillStyle=palette.light;ctx.font='800 8px monospace';ctx.textAlign='center';ctx.fillText(own?'NOVA / CORE':'EMBER / CORE',0,baseH*.31);
 ctx.restore();
 // Shield geometry joins the reactor to all three lanes; visibly weakens with core health
 drawShield(ctx,x,y,dir,palette.core,integrity,time);
 // side-facing reactor coolant conduits to each deployment corridor
 for(const lane of G().laneY){const yy=lane*h;ctx.strokeStyle=palette.core;ctx.globalAlpha=.3+.28*integrity;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+dir*baseW*.23,y);ctx.lineTo(x+dir*baseW*.23,yy);ctx.lineTo(x+dir*baseW*.5,yy);ctx.stroke();ctx.globalAlpha=1;glow(ctx,x+dir*baseW*.5,yy,13,palette.core,.18);}
}
function drawScout(ctx,accent,time){
 // articulated agile assault frame: backpack jets, helmet, plated torso, limbs and carbine
 const walk=Math.sin(time*9)*3;ctx.save();ctx.translate(0,0);
 // rear jump pack and twin exhausts
 steel(ctx,-25,-49,15,25,4,'#91a5a8');steel(ctx,-27,-21,6,17,2,accent);steel(ctx,-18,-20,6,16,2,accent);glow(ctx,-23,-17,10,accent,.22);
 // legs with visible hip, knee and armored shin
 for(const side of [-1,1]){ctx.save();ctx.translate(side*8,-22);ctx.rotate(side*walk*.012);steel(ctx,-5,-1,10,15,3,'#8fa0a2');ctx.translate(0,11);ctx.rotate(side*walk*.018);steel(ctx,-5,0,10,14,2,'#93a3a5');steel(ctx,-7,10,15,5,2,accent);ctx.fillStyle='#0b151d';ctx.fillRect(-4,2,8,2);ctx.restore();}
 // shoulders and arms
 for(const side of [-1,1]){steel(ctx,side*17-5,-50,12,12,4,'#a2b0b0',accent);ctx.save();ctx.translate(side*19,-43);ctx.rotate(side*(.12+walk*.005));steel(ctx,-4,0,8,14,3,'#74868b');steel(ctx,-4,12,8,9,3,'#93a3a4');ctx.fillStyle=accent;ctx.fillRect(-3,4,6,2);ctx.restore();}
 // torso silhouette and breastplate
 poly(ctx,[[-15,-50],[-10,-59],[9,-59],[17,-50],[14,-30],[8,-23],[-10,-24],[-17,-34]]);const chest=ctx.createLinearGradient(-15,-60,13,-25);chest.addColorStop(0,'#bdc9c5');chest.addColorStop(.18,'#586d74');chest.addColorStop(.55,'#243741');chest.addColorStop(1,'#101b24');ctx.fillStyle=chest;ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=1.2;ctx.stroke();
 poly(ctx,[[-10,-49],[0,-55],[11,-48],[8,-37],[0,-33],[-9,-38]]);ctx.fillStyle='#273d46';ctx.fill();ctx.strokeStyle='#b6c8c5';ctx.globalAlpha=.62;ctx.stroke();ctx.globalAlpha=1;ctx.fillStyle=accent;ctx.globalAlpha=.9;ctx.fillRect(-2,-49,5,11);ctx.globalAlpha=1;
 // head armor and illuminated visor
 ctx.fillStyle='#15232c';ctx.strokeStyle='#cad4ce';ctx.lineWidth=1;poly(ctx,[[-10,-61],[-7,-69],[5,-71],[12,-65],[10,-57],[-7,-56]]);ctx.fill();ctx.stroke();ctx.fillStyle=accent;ctx.globalAlpha=.86;poly(ctx,[[-6,-65],[4,-67],[9,-63],[6,-60],[-6,-61]]);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#effffb';ctx.fillRect(2,-65,3,2);
 // rifle projected forward
 steel(ctx,8,-43,23,6,2,'#c1cdca');ctx.fillStyle='#101820';ctx.fillRect(22,-45,8,3);ctx.fillStyle=accent;ctx.fillRect(12,-45,4,2);
 ctx.strokeStyle='#d5e2dc';ctx.globalAlpha=.65;ctx.beginPath();ctx.moveTo(-14,-45);ctx.lineTo(-19,-34);ctx.stroke();ctx.globalAlpha=1;ctx.restore();
}
function drawHeavy(ctx,accent,time){
 // tracked siege vehicle with segmented treads, sloped glacis, turret and long cannon
 ctx.save();ctx.translate(0,0);
 for(const side of [-1,1]){rounded(ctx,-36,-17,72,17,7);ctx.fillStyle='#111b21';ctx.fill();ctx.strokeStyle='#849398';ctx.lineWidth=1.2;ctx.stroke();for(let i=0;i<7;i++){ctx.strokeStyle=i%2?'#3c5057':'#73838a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-30+i*9,-14);ctx.lineTo(-30+i*9, -3);ctx.stroke();}ctx.fillStyle=accent;ctx.globalAlpha=.72;ctx.fillRect(-24,-17,49,2);ctx.globalAlpha=1;}
 poly(ctx,[[-32,-20],[-26,-33],[-18,-40],[17,-40],[30,-31],[35,-20],[25,-14],[-27,-14]]);const hull=ctx.createLinearGradient(0,-40,0,-14);hull.addColorStop(0,'#aab8b5');hull.addColorStop(.19,'#61757b');hull.addColorStop(.5,'#293a43');hull.addColorStop(1,'#111b21');ctx.fillStyle=hull;ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=1.2;ctx.stroke();
 for(let i=0;i<4;i++){ctx.strokeStyle='#a8b9b7';ctx.globalAlpha=.36;ctx.beginPath();ctx.moveTo(-20+i*11,-33);ctx.lineTo(-16+i*11,-22);ctx.stroke();}ctx.globalAlpha=1;
 // turret ring and traversing cannon
 ctx.fillStyle='#111a20';ctx.beginPath();ctx.ellipse(-2,-39,16,5,0,0,Math.PI*2);ctx.fill();steel(ctx,-15,-50,31,15,5,'#acb9b4',accent);
 ctx.fillStyle='#202f37';ctx.strokeStyle='#829395';ctx.beginPath();ctx.moveTo(0,-49);ctx.lineTo(14,-47);ctx.lineTo(18,-40);ctx.lineTo(4,-36);ctx.lineTo(-8,-40);ctx.closePath();ctx.fill();ctx.stroke();
 steel(ctx,8,-47,34,5,2,'#b8c4bd');ctx.fillStyle='#0c161d';ctx.fillRect(39,-48,6,7);ctx.fillStyle=accent;ctx.fillRect(32,-48,5,2);
 // optics, armor plates and warning lights
 ctx.fillStyle=accent;ctx.globalAlpha=.9;ctx.beginPath();ctx.ellipse(-7,-44,3,2,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 for(const side of [-1,1]){poly(ctx,[[side*21,-34],[side*30,-29],[side*28,-22],[side*17,-24]]);ctx.fillStyle='#9bacae';ctx.fill();ctx.strokeStyle='#d1ddda';ctx.stroke();ctx.fillStyle=accent;ctx.fillRect(side*23-2,-30,4,2);}
 ctx.restore();
}
function drawMedic(ctx,accent,time){
 drawScout(ctx,accent,time);
 // medical bay backpack, rotor pods and unmistakable field-cross insignia
 ctx.save();steel(ctx,-37,-55,17,28,4,'#bbcac0',accent);steel(ctx,-35,-25,14,5,2,accent);ctx.fillStyle='#f3f6df';ctx.fillRect(-34,-49,12,13);ctx.fillStyle='#d84b54';ctx.fillRect(-29,-47,3,9);ctx.fillRect(-32,-44,9,3);
 for(const side of [-1,1]){ctx.strokeStyle=accent;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-25,-48);ctx.lineTo(side*42,-62);ctx.stroke();ctx.fillStyle='#15252b';ctx.strokeStyle=accent;ctx.beginPath();ctx.arc(side*42,-62,5,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#d6fff0';ctx.beginPath();ctx.arc(side*42,-62,1.8,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
function drawDrone(ctx,accent,time){
 // autonomous airborne gunship: armored fuselage, four gyro rotors, wing armor and twin cannons
 ctx.save();ctx.translate(0,Math.sin(time*4)*3);
 for(const side of [-1,1]){for(const fore of [-1,1]){const ax=side*23,ay=fore*-11;ctx.strokeStyle='#9dabad';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(side*7,fore*-3);ctx.lineTo(ax,ay);ctx.stroke();steel(ctx,ax-9,ay-3,18,6,3,'#b2c0bb',accent);ctx.save();ctx.translate(ax,ay);ctx.rotate(time*14*side);ctx.strokeStyle=accent;ctx.lineWidth=1.2;ctx.beginPath();ctx.ellipse(0,0,12,2,0,0,Math.PI*2);ctx.stroke();ctx.restore();}}
 poly(ctx,[[-28,0],[-14,-10],[11,-13],[26,-5],[33,0],[25,6],[10,13],[-14,9]]);const body=ctx.createLinearGradient(0,-13,0,13);body.addColorStop(0,'#d0d5c7');body.addColorStop(.2,'#586d76');body.addColorStop(.65,'#233740');body.addColorStop(1,'#111c25');ctx.fillStyle=body;ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=1.4;ctx.stroke();
 poly(ctx,[[17,-7],[37,-11],[32,-2],[20,0]]);ctx.fillStyle='#354952';ctx.fill();ctx.strokeStyle='#9eafb0';ctx.stroke();poly(ctx,[[17,7],[37,11],[32,2],[20,0]]);ctx.fillStyle='#273b45';ctx.fill();ctx.stroke();
 ctx.fillStyle=accent;ctx.globalAlpha=.9;ctx.beginPath();ctx.ellipse(1,0,7,4,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#edfff9';ctx.fillRect(23,-2,5,2);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(17,-10);ctx.lineTo(24,-15);ctx.moveTo(17,10);ctx.lineTo(24,15);ctx.stroke();ctx.restore();
}
function drawUnitArt(ctx,type,x,baseline,dir,accent,time,scale){
 ctx.save();ctx.translate(x,baseline);ctx.scale(dir*scale,scale);
 if(type==='scout')drawScout(ctx,accent,time);else if(type==='heavy')drawHeavy(ctx,accent,time);else if(type==='medic')drawMedic(ctx,accent,time);else drawDrone(ctx,accent,time);
 ctx.restore();
}
function drawUnit(ctx,u,w,h,time){
 const p=palettes[u.owner],x=u.x*w,y=G().laneY[u.lane]*h,scale=clamp(h*.14/70,.62,1.05),dir=u.owner==='player'?1:-1,baseY=y+13*scale;
 // grounded shadow and lane-contact light
 ctx.save();ctx.globalAlpha=.52;ctx.fillStyle='#03080c';ctx.beginPath();ctx.ellipse(x,baseY+4*scale,(u.type==='heavy'?39:27)*scale,6*scale,0,0,Math.PI*2);ctx.fill();ctx.restore();glow(ctx,x,baseY,35*scale,p.core,.15);
 drawUnitArt(ctx,u.type,x,baseY,dir,p.core,time+u.id*.13,scale);
 // leg/engine thruster pulse, visibly stronger while advancing
 ctx.globalAlpha=.55+.35*Math.sin(time*12+u.id);glow(ctx,x-dir*14*scale,baseY-12*scale,14*scale,p.core,.32);ctx.globalAlpha=1;
 const bw=(u.type==='heavy'?66:u.type==='drone'?54:44)*scale,bh=4*scale,barY=baseY-76*scale;
 ctx.fillStyle='#060c11';ctx.fillRect(x-bw/2,barY,bw,bh);ctx.fillStyle=u.hp/u.maxHp>.45?p.core:'#ff5964';ctx.fillRect(x-bw/2,barY,bw*clamp(u.hp/u.maxHp,0,1),bh);ctx.strokeStyle='#a4b3b355';ctx.lineWidth=.7;ctx.strokeRect(x-bw/2,barY,bw,bh);
 ctx.fillStyle=u.owner==='player'?'#c4f9f3':'#ffd9bc';ctx.font='700 8px monospace';ctx.textAlign='center';ctx.shadowColor='#061018';ctx.shadowBlur=4;ctx.fillText(G().SPECS[u.type].name.toUpperCase(),x,baseY+13*scale);ctx.shadowBlur=0;
}
function drawBase(ctx,x,y,owner,s,w,h,time){
 const own=owner==='player',p=palettes[owner],integrity=s.players[owner].coreHP/s.players[owner].maxCoreHP,dir=own?1:-1,bw=Math.min(w*.15,148),bh=Math.min(h*.67,330);
 glow(ctx,x,y,bw*1.7,p.core,.16+.17*(1-integrity)+.06*Math.sin(time*2));
 // base occupies the height of all three lane approaches
 ctx.save();ctx.translate(x,y);
 ctx.fillStyle='#050a0e';ctx.beginPath();ctx.ellipse(0,bh*.4,bw*.67,bh*.105,0,0,Math.PI*2);ctx.fill();
 poly(ctx,[[-bw*.67,bh*.31],[-bw*.57,bh*.22],[bw*.57,bh*.22],[bw*.67,bh*.31],[bw*.55,bh*.43],[-bw*.55,bh*.43]]);const foot=ctx.createLinearGradient(0,bh*.22,0,bh*.43);foot.addColorStop(0,'#a7b2b0');foot.addColorStop(.13,'#4e6269');foot.addColorStop(.65,'#202e36');foot.addColorStop(1,'#0a1117');ctx.fillStyle=foot;ctx.fill();ctx.strokeStyle='#b5c4c0';ctx.lineWidth=1;ctx.stroke();
 // armored vertical pylons with exposed reactor coolant channels
 for(const side of [-1,1]){const tx=side*bw*.38,tw=bw*.24;poly(ctx,[[tx-tw*.58,-bh*.38],[tx+tw*.4,-bh*.4],[tx+tw*.62,-bh*.07],[tx+tw*.5,bh*.21],[tx-tw*.51,bh*.19],[tx-tw*.71,-bh*.03]]);const g=ctx.createLinearGradient(tx-tw,-bh*.4,tx+tw,bh*.2);g.addColorStop(0,'#bdc6bf');g.addColorStop(.12,'#5f7479');g.addColorStop(.35,p.steel);g.addColorStop(.78,'#1c2a32');g.addColorStop(1,p.shadow);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=p.core;ctx.globalAlpha=.75;ctx.stroke();ctx.globalAlpha=1;
  // layered radiator fins
  ctx.fillStyle='#0a141a';ctx.fillRect(tx-tw*.34,-bh*.15,tw*.7,bh*.31);for(let k=0;k<6;k++){ctx.strokeStyle=k%2?p.core:'#a3b2ae';ctx.globalAlpha=k%2?.6:.44;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(tx-tw*.27+k*tw*.105,-bh*.12);ctx.lineTo(tx-tw*.27+k*tw*.105,bh*.11);ctx.stroke();}ctx.globalAlpha=1;
  ctx.fillStyle=p.light;ctx.globalAlpha=.62+.35*Math.sin(time*5+side);ctx.fillRect(tx-tw*.32,-bh*.31,tw*.63,3);ctx.globalAlpha=1;
  steel(ctx,tx-tw*.22,-bh*.46,tw*.44,bh*.09,2,'#76898d');const puff=(time*.4+side*.2+(own?.3:.8))%1;ctx.globalAlpha=(1-puff)*.2;ctx.fillStyle='#d1d8ce';ctx.beginPath();ctx.ellipse(tx+Math.sin(time*3+side)*puff*5,-bh*.47-puff*18,4+puff*6,5+puff*7,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  // side-mounted automated defense barrel
  ctx.save();ctx.translate(tx-dir*tw*.56,-bh*.04);ctx.scale(dir,1);steel(ctx,-2,-4,18,8,2,'#9dacaa',p.core);ctx.fillStyle=p.core;ctx.fillRect(12,-3,3,3);ctx.restore();
 }
 // inner reactor cage and illuminated turbine vanes
 const heartY=-bh*.055,r=bw*.34;
 for(let i=0;i<10;i++){ctx.save();ctx.translate(0,heartY);ctx.rotate(i*Math.PI/5+time*.13*dir);poly(ctx,[[-r*.19,-r*.53],[r*.19,-r*.53],[r*.31,-r*.17],[r*.21,r*.25],[-r*.21,r*.25],[-r*.31,-r*.17]]);const pg=ctx.createLinearGradient(0,-r*.55,0,r*.3);pg.addColorStop(0,'#d3d9ce');pg.addColorStop(.18,'#64787c');pg.addColorStop(.55,'#293b43');pg.addColorStop(1,'#101a20');ctx.fillStyle=pg;ctx.fill();ctx.strokeStyle='#9baaa6';ctx.lineWidth=.8;ctx.stroke();ctx.restore();}
 glow(ctx,0,heartY,r*1.75,p.core,.42+.22*Math.sin(time*4));
 const orb=ctx.createRadialGradient(-r*.34,heartY-r*.32,1,0,heartY,r*.8);orb.addColorStop(0,p.light);orb.addColorStop(.2,p.core);orb.addColorStop(.56,p.deep);orb.addColorStop(1,'#071017');ctx.fillStyle=orb;ctx.strokeStyle=p.light;ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,heartY,r*.59,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.9;ctx.stroke();ctx.globalAlpha=1;
 // animated orbit rings and scan spokes
 for(let i=0;i<4;i++){ctx.strokeStyle=p.light;ctx.globalAlpha=.44-i*.07;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(0,heartY,r*(.68+i*.15),r*(.27+i*.08),time*(i%2?.27:-.22),0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
 for(const side of [-1,1]){ctx.strokeStyle=p.light;ctx.globalAlpha=.9;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(side*r*.72,heartY-r*.64);ctx.lineTo(side*r*1.03,heartY);ctx.lineTo(side*r*.72,heartY+r*.64);ctx.stroke();}ctx.globalAlpha=1;
 // core damage carves cracks and disrupts the reactor; visual state follows integrity
 if(integrity<.78){const severity=(.78-integrity)/.78;ctx.strokeStyle='#ff795f';ctx.globalAlpha=severity;ctx.lineWidth=2;poly(ctx,[[-bw*.48,-bh*.24],[-bw*.32,-bh*.17],[-bw*.39,-bh*.06],[-bw*.22,bh*.03],[-bw*.28,bh*.11]]);ctx.stroke();poly(ctx,[[bw*.46,-bh*.31],[bw*.31,-bh*.22],[bw*.36,-bh*.13],[bw*.2,-bh*.02]]);ctx.stroke();ctx.globalAlpha=1;}
 if(integrity<.52){for(let i=0;i<5;i++){const yy=-bh*.24+i*bh*.13;ctx.globalAlpha=(.52-integrity)*.4*(.5+.5*Math.sin(time*7+i));ctx.fillStyle='#ff764e';ctx.beginPath();ctx.ellipse(-dir*bw*.3,yy,12,6,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
 ctx.fillStyle=p.light;ctx.font='800 9px monospace';ctx.textAlign='center';ctx.fillText(own?'N O V A   /   CORE':'E M B E R   /   CORE',0,bh*.31);
 ctx.restore();
 // three independent force shields feed each lane; integrity changes their strength
 for(const lane of G().laneY){const ly=lane*h;ctx.save();ctx.strokeStyle=p.core;ctx.globalAlpha=(.12+.17*integrity)+.04*Math.sin(time*4+lane*8);ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x+dir*bw*.52,ly);ctx.quadraticCurveTo(x+dir*bw*.92,y,x+dir*bw*.52,ly);ctx.stroke();ctx.globalAlpha*=.55;ctx.lineWidth=3;ctx.stroke();ctx.restore();glow(ctx,x+dir*bw*.54,ly,18,p.core,.19*integrity);}
}
function drawProjectile(ctx,b,w,h,time){
 const t=clamp(b.progress,0,1),x=b.x+(b.toX-b.x)*t,y=b.y+(b.toY-b.y)*t;
 const px=x*w,py=y*h,tail=clamp(Math.abs(b.toX-b.x)*w*.14,15,60),direction=b.toX>=b.x?-1:1;
 const g=ctx.createLinearGradient(px+direction*tail,py,px,py);g.addColorStop(0,'transparent');g.addColorStop(.55,b.color+'55');g.addColorStop(1,'#ffffff');
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=g;ctx.lineWidth=b.healing?4:5;ctx.shadowColor=b.color;ctx.shadowBlur=14;ctx.beginPath();ctx.moveTo(px+direction*tail,py);ctx.lineTo(px,py);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(px,py,b.healing?3:4,2,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=.55;for(let i=1;i<=3;i++){const lag=Math.max(0,t-i*.04),tx=(b.x+(b.toX-b.x)*lag)*w,ty=(b.y+(b.toY-b.y)*lag)*h;ctx.fillStyle=b.color;ctx.globalAlpha=.42/i;ctx.beginPath();ctx.arc(tx,ty,2.4/i,0,Math.PI*2);ctx.fill();}ctx.restore();
}
function drawEffects(ctx,e,w,h){
 const k=e.age/e.life,x=e.x*w,y=e.y*h;ctx.save();
 if(e.type==='number'){ctx.globalAlpha=Math.pow(1-k,.7);ctx.font='900 16px "Arial Narrow",sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#081018';ctx.strokeText(e.text,x,y-20-k*32);ctx.fillStyle=e.text.charAt(0)==='+'?'#a7ffc4':e.color;ctx.shadowColor=e.color;ctx.shadowBlur=10;ctx.fillText(e.text,x,y-20-k*32);}
 else if(e.type==='muzzle'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-k;glow(ctx,x,y,18*(1+k),e.color,.8);for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI;ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*3,y+Math.sin(a)*3);ctx.lineTo(x+Math.cos(a)*(10+k*11),y+Math.sin(a)*(6+k*7));ctx.stroke();}}
 else if(e.type==='burst'||e.type==='core'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-k;const radius=e.type==='core'?9+k*45:7+k*36;const g=ctx.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,'#fff4cc');g.addColorStop(.18,e.color);g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle=e.color;ctx.lineWidth=2+k*3;ctx.beginPath();ctx.arc(x,y,8+k*radius,0,Math.PI*2);ctx.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6+k*(i%2?2:-1.5),r=(e.type==='core'?radius:radius*.8)*(1-k*.35);ctx.fillStyle=i%3?'#ffe5b2':e.color;ctx.fillRect(x+Math.cos(a)*r,y+Math.sin(a)*r,2.5+(1-k)*2,2.5+(1-k)*2);}}
 else if(e.type==='hit'){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-k;for(let i=0;i<8;i++){const a=i*Math.PI/4+e.age*4,r=k*22;ctx.fillStyle=i%2?'#fff0c0':e.color;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,2*(1-k),0,Math.PI*2);ctx.fill();}}
 else if(e.type==='heal'){ctx.globalAlpha=1-k;ctx.strokeStyle=e.color;ctx.lineWidth=2;for(let i=0;i<2;i++){ctx.beginPath();ctx.arc(x,y,7+k*25+i*6,0,Math.PI*2);ctx.stroke();}ctx.fillStyle=e.color;ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText('+',x,y-10-k*17);}
 else if(e.type==='deploy'){ctx.globalAlpha=1-k;ctx.strokeStyle=e.color;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,10+k*37,6+k*17,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=(1-k)*.7;for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ctx.fillStyle=e.color;ctx.fillRect(x+Math.cos(a)*k*30-1,y+Math.sin(a)*k*14-1,3,3);}}
 ctx.restore();
}
function draw(ctx,w,h,s,selection,pointer,time){
 drawEnvironment(ctx,w,h,time);
 // Base shields sit behind the units and link reactor integrity to the combat lanes.
 drawBase(ctx,w*.055,h*.5,'player',s,w,h,time);drawBase(ctx,w*.945,h*.5,'ai',s,w,h,time);
 if(selection){ctx.fillStyle='rgba(66,239,229,.075)';ctx.fillRect(0,0,w*.405,h);ctx.strokeStyle='rgba(103,255,244,.72)';ctx.lineWidth=1.5;ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(w*.405,0);ctx.lineTo(w*.405,h);ctx.stroke();ctx.setLineDash([]);if(pointer&&pointer.x<w*.405){const lane=G().laneY[pointer.lane];ctx.fillStyle='rgba(73,247,236,.2)';ctx.fillRect(0,lane*h-h*.055,w*.405,h*.11);ctx.strokeStyle='rgba(178,255,245,.7)';ctx.beginPath();ctx.moveTo(0,lane*h);ctx.lineTo(w*.405,lane*h);ctx.stroke();}}
 for(const u of s.units)drawUnit(ctx,u,w,h,time);
 for(const b of s.projectiles)drawProjectile(ctx,b,w,h,time);
 for(const e of s.effects)drawEffects(ctx,e,w,h);
 // Focus falloff frames the industrial arena while keeping the center lane legible.
 const fade=ctx.createLinearGradient(0,0,0,h);fade.addColorStop(0,'rgba(3,7,11,.38)');fade.addColorStop(.1,'transparent');fade.addColorStop(.9,'transparent');fade.addColorStop(1,'rgba(3,7,11,.48)');ctx.fillStyle=fade;ctx.fillRect(0,0,w,h);
}
function drawCardArt(canvas,type){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height,accent=type==='heavy'?'#ffb060':type==='medic'?'#9af4b7':type==='drone'?'#c6a1ff':'#60eeeb';
 const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#1b2b34');bg.addColorStop(1,'#101920');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);glow(ctx,w*.5,h*.63,h*.65,accent,.2);ctx.strokeStyle=accent+'44';ctx.beginPath();ctx.moveTo(0,h*.86);ctx.lineTo(w,h*.86);ctx.stroke();
 const scale=Math.min(h/75,.78),baseline=h*.82,x=w*.5;drawUnitArt(ctx,type,x,baseline,1,accent,1.3,scale);
 ctx.fillStyle='#d6e7e7';ctx.font='7px monospace';ctx.textAlign='right';ctx.fillText(type==='heavy'?'SIEGE':type==='medic'?'SUPPORT':type==='drone'?'AERIAL':'RECON',w-4,9);
}
root.LastSignalRender={draw,drawCardArt};
})(typeof window!=='undefined'?window:globalThis);