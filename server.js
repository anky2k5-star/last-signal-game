'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const Game = require('./game-engine');

const MAX_PLAYERS = 8;
const MIN_PLAYERS = 2;
const LOBBY_DISCONNECT_GRACE_MS = 45_000;
const FINISHED_ROOM_TTL_MS = 120_000;
const ABANDONED_ROOM_TTL_MS = 300_000;
const SIMULATION_TICK_MS = 50;
const BROADCAST_INTERVAL_MS = 100;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8' };

// Small RFC 6455 text-frame transport for this same-origin game. Browser WebSocket
// handles client framing; this adapter owns masking, handshake, room fan-out and acks.
function createWebSocketHub(server) {
  const events = new EventEmitter(), peers = new Map();
  function frame(opcode, payload = Buffer.alloc(0)) {
    const data=Buffer.isBuffer(payload)?payload:Buffer.from(payload);let header;
    if(data.length<126){header=Buffer.from([0x80|opcode,data.length]);}
    else if(data.length<=65535){header=Buffer.alloc(4);header[0]=0x80|opcode;header[1]=126;header.writeUInt16BE(data.length,2);}
    else{header=Buffer.alloc(10);header[0]=0x80|opcode;header[1]=127;header.writeBigUInt64BE(BigInt(data.length),2);}
    return Buffer.concat([header,data]);
  }
  function makePeer(rawSocket) {
    const peer={id:crypto.randomUUID(),data:{},connected:true,handlers:new Map(),buffer:Buffer.alloc(0),
      on(event,handler){if(!this.handlers.has(event))this.handlers.set(event,[]);this.handlers.get(event).push(handler);return this;},
      emit(event,payload){if(this.connected)this._send({type:'event',event,payload});return this;},
      join(code){this.data.roomCode=code;},leave(code){if(this.data.roomCode===code)this.data.roomCode=null;},
      close(){if(this.connected)rawSocket.end(frame(8));},destroy(){this._disconnect();rawSocket.destroy();},
      _send(value){if(this.connected&&!rawSocket.destroyed)rawSocket.write(frame(1,JSON.stringify(value)));},
      _disconnect(){if(!this.connected)return;this.connected=false;peers.delete(this.id);for(const fn of this.handlers.get('disconnect')||[])try{fn('transport close');}catch(error){console.error(error);}},
      _message(message){if(message.type!=='event'||typeof message.event!=='string')return;const callbacks=this.handlers.get(message.event)||[];let answered=false;const respond=value=>{if(answered||!message.id)return;answered=true;this._send({type:'ack',id:message.id,payload:value});};for(const fn of callbacks)try{fn(message.payload||{},respond);}catch(error){console.error(error);respond({ok:false,code:'server-error',message:'The server could not process that command.'});}}
    };
    rawSocket.on('data',chunk=>{
      peer.buffer=Buffer.concat([peer.buffer,chunk]);
      while(peer.buffer.length>=2){const first=peer.buffer[0],second=peer.buffer[1],opcode=first&15,masked=!!(second&128);let size=second&127,offset=2;
        if(size===126){if(peer.buffer.length<4)return;size=peer.buffer.readUInt16BE(2);offset=4;}
        else if(size===127){if(peer.buffer.length<10)return;const large=peer.buffer.readBigUInt64BE(2);if(large>1_000_000n){rawSocket.destroy();return;}size=Number(large);offset=10;}
        if(!masked){rawSocket.destroy();return;}if(peer.buffer.length<offset+4+size)return;
        const mask=peer.buffer.subarray(offset,offset+4);offset+=4;const body=Buffer.from(peer.buffer.subarray(offset,offset+size));peer.buffer=peer.buffer.subarray(offset+size);for(let i=0;i<body.length;i++)body[i]^=mask[i&3];
        if(opcode===8){rawSocket.end(frame(8,body));return;}if(opcode===9){rawSocket.write(frame(10,body));continue;}if(opcode!==1)continue;
        try{peer._message(JSON.parse(body.toString('utf8')));}catch(error){console.error('Dropped malformed websocket message:',error.message);}
      }
    });
    rawSocket.on('close',()=>peer._disconnect());rawSocket.on('error',()=>peer._disconnect());
    return peer;
  }
  server.on('upgrade',(req,socket)=>{
    const key=req.headers['sec-websocket-key'];
    let crossOrigin=false;try{crossOrigin=!!req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host;}catch{crossOrigin=true;}
    if(req.url!=='/ws'||req.headers.upgrade?.toLowerCase()!=='websocket'||!key||crossOrigin){socket.destroy();return;}
    const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');
    const peer=makePeer(socket);peers.set(peer.id,peer);events.emit('connection',peer);
  });
  const hub={
    on:(event,handler)=>events.on(event,handler),
    to:code=>({emit:(event,payload)=>{for(const peer of peers.values())if(peer.data.roomCode===code)peer.emit(event,payload);}}),
    sockets:{sockets:peers},
    close(callback){for(const peer of [...peers.values()])peer.close();setTimeout(()=>{for(const peer of [...peers.values()])peer._disconnect();callback?.();},25);}
  };
  return hub;
}

function createCode(rooms) {
  let code;
  do {
    code = '';
    for (let i = 0; i < 5; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  } while (rooms.has(code));
  return code;
}
function makeToken() { return crypto.randomBytes(32).toString('base64url'); }
function safeName(value) {
  const name = String(value || '').replace(/[<>\u0000-\u001f\u007f]/g, '').trim().slice(0, 20);
  return name || 'Commander';
}
function ack(callback, payload) { if (typeof callback === 'function') callback(payload); }
function publicPlayer(p, hostId) {
  return { id:p.id, name:p.name, team:p.team, host:p.id===hostId, ready:!!p.ready, connected:!!p.connected };
}
function copy(value) { return JSON.parse(JSON.stringify(value)); }

function createGameServer(options = {}) {
  const staticRoot = path.resolve(options.staticRoot || __dirname);
  const rooms = new Map();
  const timers = new Set();
  let listening = false;
  const httpServer = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/healthz') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ok:true,rooms:rooms.size})); return; }
    const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = path.resolve(staticRoot, requested);
    if (!file.startsWith(staticRoot + path.sep) && file !== path.join(staticRoot, 'index.html')) { res.writeHead(403); res.end('Forbidden'); return; }
    fs.readFile(file, (err, body) => {
      if (err) { res.writeHead(err.code === 'ENOENT' ? 404 : 500); res.end('Not found'); return; }
      res.writeHead(200, {'content-type':MIME[path.extname(file)] || 'application/octet-stream','cache-control':'no-cache'});
      res.end(body);
    });
  });
  const io = createWebSocketHub(httpServer);
  let shuttingDown=false;

  function roomSnapshot(room) {
    return { code:room.code, phase:room.phase, hostId:room.hostId, maxPlayers:MAX_PLAYERS,
      players:room.players.map(p=>publicPlayer(p,room.hostId)),
      teamCounts:{cyan:room.players.filter(p=>p.team==='cyan').length,orange:room.players.filter(p=>p.team==='orange').length} };
  }
  function broadcastRoom(room) {
    io.to(room.code).emit('room:update', roomSnapshot(room));
    if (room.game) io.to(room.code).emit('game:state', {room:roomSnapshot(room),state:copy(room.game)});
  }
  function assignTeam(room) {
    const cyan=room.players.filter(p=>p.team==='cyan').length, orange=room.players.filter(p=>p.team==='orange').length;
    return cyan<=orange?'cyan':'orange';
  }
  function attach(room, seat, socket) {
    if (seat.socketId && seat.socketId !== socket.id) {
      const old = io.sockets.sockets.get(seat.socketId);
      if (old) { old.emit('session:replaced'); old.close(); }
    }
    seat.socketId=socket.id;seat.connected=true;seat.disconnectedAt=null;
    if (seat.disconnectTimer) { clearTimeout(seat.disconnectTimer); timers.delete(seat.disconnectTimer); seat.disconnectTimer=null; }
    socket.data.roomCode=room.code;socket.data.playerId=seat.id;socket.join(room.code);
  }
  function transferHost(room) {
    if (room.players.some(p=>p.id===room.hostId&&p.connected)) return;
    const next=room.players.find(p=>p.connected);
    if (next) room.hostId=next.id;
  }
  function removeSeat(room, seat) {
    const index=room.players.indexOf(seat);
    if (index<0) return;
    room.players.splice(index,1);
    if (room.players.length===0) { rooms.delete(room.code); return; }
    transferHost(room);
    broadcastRoom(room);
  }
  function scheduleRoomCleanup(room, delay) {
    const timer=setTimeout(()=>{timers.delete(timer);if(rooms.get(room.code)===room)rooms.delete(room.code);},delay);
    timers.add(timer);
  }
  function connectedSeat(socket) {
    const room=rooms.get(socket.data.roomCode);
    if (!room) return {error:'Room is no longer available.'};
    const seat=room.players.find(p=>p.id===socket.data.playerId);
    if (!seat||seat.socketId!==socket.id||!seat.connected) return {error:'Reconnect to your room before sending orders.'};
    return {room,seat};
  }
  function errorAck(callback, message, code='invalid') { ack(callback,{ok:false,code,message}); }

  io.on('connection', socket => {
    socket.on('room:create',(payload={},callback)=>{
      const code=createCode(rooms);
      const room={code,phase:'lobby',hostId:null,players:[],game:null,lastBroadcast:0,cleanupTimer:null};
      const seat={id:crypto.randomUUID(),token:makeToken(),name:safeName(payload.name),team:'cyan',ready:true,connected:false,socketId:null,joinedAt:Date.now(),disconnectTimer:null,actionWindow:0,actions:0};
      room.hostId=seat.id;room.players.push(seat);rooms.set(code,room);attach(room,seat,socket);
      ack(callback,{ok:true,code,playerId:seat.id,token:seat.token,room:roomSnapshot(room)});
      broadcastRoom(room);
    });
    socket.on('room:join',(payload={},callback)=>{
      const code=String(payload.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
      const room=rooms.get(code);
      if (!room) return errorAck(callback,'Room code not found. Check the code and try again.','not-found');
      if (room.phase!=='lobby') return errorAck(callback,'This match has already started.','started');
      if (room.players.length>=MAX_PLAYERS) return errorAck(callback,'This room is full (8/8).','full');
      const seat={id:crypto.randomUUID(),token:makeToken(),name:safeName(payload.name),team:assignTeam(room),ready:false,connected:false,socketId:null,joinedAt:Date.now(),disconnectTimer:null,actionWindow:0,actions:0};
      room.players.push(seat);attach(room,seat,socket);
      ack(callback,{ok:true,code,playerId:seat.id,token:seat.token,room:roomSnapshot(room)});
      broadcastRoom(room);
    });
    socket.on('room:resume',(payload={},callback)=>{
      const code=String(payload.code||'').toUpperCase(),room=rooms.get(code);
      const seat=room&&room.players.find(p=>p.id===payload.playerId);
      const token=String(payload.token||'');
      if (!room||!seat||token.length!==seat.token.length||!crypto.timingSafeEqual(Buffer.from(token),Buffer.from(seat.token)))
        return errorAck(callback,'Reconnect details were not recognized. Create or join a room again.','resume-failed');
      attach(room,seat,socket);
      ack(callback,{ok:true,code,playerId:seat.id,token:seat.token,room:roomSnapshot(room),state:room.game?copy(room.game):null});
      broadcastRoom(room);
    });
    socket.on('lobby:ready',(payload={},callback)=>{
      const result=connectedSeat(socket);if(result.error)return errorAck(callback,result.error);
      const {room,seat}=result;if(room.phase!=='lobby')return errorAck(callback,'The match has already started.','started');
      seat.ready=!!payload.ready;ack(callback,{ok:true});broadcastRoom(room);
    });
    socket.on('lobby:start',(_payload={},callback)=>{
      const result=connectedSeat(socket);if(result.error)return errorAck(callback,result.error);
      const {room,seat}=result;
      if (seat.id!==room.hostId)return errorAck(callback,'Only the host can start the match.','not-host');
      if (room.phase!=='lobby')return errorAck(callback,'The match has already started.','started');
      if(room.players.filter(p=>p.connected).length<MIN_PLAYERS)return errorAck(callback,'At least two connected players are required.','too-few');
      if(room.players.some(p=>!p.connected||!p.ready))return errorAck(callback,'Every player must be connected and ready.','not-ready');
      room.game=Game.newGame();room.phase='playing';ack(callback,{ok:true});io.to(room.code).emit('game:start',{room:roomSnapshot(room),state:copy(room.game)});
      broadcastRoom(room);
    });
    socket.on('game:deploy',(payload={},callback)=>{
      const result=connectedSeat(socket);if(result.error)return errorAck(callback,result.error);
      const {room,seat}=result;
      if(room.phase!=='playing'||!room.game)return errorAck(callback,'The match is not accepting deployments.','not-playing');
      const now=Date.now();if(now-seat.actionWindow>=1000){seat.actionWindow=now;seat.actions=0;}if(++seat.actions>6)return errorAck(callback,'Too many commands. Slow down.','rate-limit');
      const side=seat.team==='cyan'?'player':'ai';
      const deployed=Game.deploy(room.game,side,payload.type,payload.lane);
      if(!deployed.ok)return errorAck(callback,deployed.reason,'illegal-deploy');
      ack(callback,{ok:true,unitId:deployed.unit.id});broadcastRoom(room);
    });
    socket.on('room:leave',(_payload={},callback)=>{
      const result=connectedSeat(socket);if(result.error){ack(callback,{ok:true});return;}
      const {room,seat}=result;socket.leave(room.code);seat.connected=false;seat.socketId=null;removeSeat(room,seat);ack(callback,{ok:true});
      if(rooms.get(room.code)===room)broadcastRoom(room);
    });
    socket.on('disconnect',()=>{
      if(shuttingDown)return;
      const result=connectedSeat(socket);if(result.error)return;
      const {room,seat}=result;seat.connected=false;seat.socketId=null;seat.disconnectedAt=Date.now();transferHost(room);broadcastRoom(room);
      if(room.phase==='lobby'){
        const timer=setTimeout(()=>{timers.delete(timer);if(rooms.get(room.code)===room&&!seat.connected&&room.phase==='lobby')removeSeat(room,seat);},LOBBY_DISCONNECT_GRACE_MS);
        timers.add(timer);seat.disconnectTimer=timer;
      }else if(room.players.every(p=>!p.connected)){
        scheduleRoomCleanup(room,ABANDONED_ROOM_TTL_MS);
      }
    });
  });

  let prior=process.hrtime.bigint();
  const ticker=setInterval(()=>{
    const now=process.hrtime.bigint(),delta=Math.min(.1,Number(now-prior)/1e9);prior=now;
    for(const room of rooms.values()){
      if(room.phase!=='playing'||!room.game)continue;
      Game.step(room.game,delta,{ai:false});
      if(room.game.phase==='complete'){
        room.phase='finished';broadcastRoom(room);scheduleRoomCleanup(room,FINISHED_ROOM_TTL_MS);continue;
      }
      room.lastBroadcast+=SIMULATION_TICK_MS;
      if(room.lastBroadcast>=BROADCAST_INTERVAL_MS){room.lastBroadcast=0;broadcastRoom(room);}
    }
  },SIMULATION_TICK_MS);
  ticker.unref();

  return {
    httpServer,io,rooms,
    listen(port=options.port||0,host=options.host||'127.0.0.1'){return new Promise((resolve,reject)=>{httpServer.once('error',reject);httpServer.listen(port,host,()=>{listening=true;resolve(httpServer.address());});});},
  async close(){shuttingDown=true;clearInterval(ticker);for(const t of timers)clearTimeout(t);timers.clear();for(const peer of [...io.sockets.sockets.values()])peer.destroy();if(listening&&httpServer.listening)await new Promise(resolve=>httpServer.close(()=>resolve()));}
  };
}

if(require.main===module){
  const port=Number(process.env.PORT)||3000;
  const host=process.env.HOST||'0.0.0.0';
  const gameServer=createGameServer({port,host});
  gameServer.listen(port,host).then(address=>console.log('Last Signal server listening on '+address.address+':'+address.port)).catch(err=>{console.error(err);process.exitCode=1;});
  const shutdown=()=>gameServer.close().then(()=>process.exit(0));
  process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}
module.exports={createGameServer,MAX_PLAYERS,MIN_PLAYERS};
