'use strict';
const assert = require('node:assert/strict');
const { createGameServer } = require('./server');

function connect(url) {
  const socket = new TestWebSocket(url.replace(/^http/, 'ws') + '/ws');
  return socket.ready.then(() => socket);
}
class TestWebSocket {
  constructor(url){this.handlers=new Map();this.pending=new Map();this.serial=0;this.ws=new WebSocket(url);this.ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('WebSocket connect timed out')),5000);this.ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});this.ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('WebSocket connect failed'));},{once:true});});this.ws.addEventListener('message',event=>{let value;try{value=JSON.parse(event.data);}catch{return;}if(value.type==='ack'){const fn=this.pending.get(value.id);if(fn){this.pending.delete(value.id);fn(value.payload);}}else if(value.type==='event')for(const fn of this.handlers.get(value.event)||[])fn(value.payload);});}
  on(event,fn){if(!this.handlers.has(event))this.handlers.set(event,new Set());this.handlers.get(event).add(fn);return this;}
  off(event,fn){this.handlers.get(event)?.delete(fn);return this;}
  emit(event,payload={},callback){const id=callback?++this.serial:undefined;if(id)this.pending.set(id,callback);this.ws.send(JSON.stringify({type:'event',event,payload,id}));}
  disconnect(){this.ws.close();}
}
function request(socket, event, payload = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} acknowledgement timed out`)), 3000);
    socket.emit(event, payload, result => { clearTimeout(timer); resolve(result); });
  });
}
function waitFor(socket, event, predicate = () => true, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off(event, listener); reject(new Error(`${event} event timed out`)); }, timeout);
    const listener = value => { if (predicate(value)) { clearTimeout(timer); socket.off(event, listener); resolve(value); } };
    socket.on(event, listener);
  });
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const server = createGameServer({ host: '127.0.0.1', port: 0 });
  const clients = [];
  try {
    const address = await server.listen(0, '127.0.0.1');
    const url = `http://127.0.0.1:${address.port}`;
    const host = await connect(url); clients.push(host);
    const invalid = await request(host, 'room:join', { code: 'XXXXX', name: 'Invalid' });
    assert.equal(invalid.code, 'not-found');
    const created = await request(host, 'room:create', { name: 'Host' });
    assert.equal(created.ok, true);
    assert.match(created.code, /^[A-HJ-NP-Z2-9]{5}$/);
    assert.equal(created.room.players[0].team, 'cyan');

    const participants = [{ socket: host, response: created }];
    for (let i = 1; i < 8; i++) {
      const socket = await connect(url); clients.push(socket);
      const response = await request(socket, 'room:join', { code: created.code, name: `Pilot ${i + 1}` });
      assert.equal(response.ok, true);
      participants.push({ socket, response });
    }
    assert.equal(new Set(participants.map(p => p.response.playerId)).size, 8);
    const teams = participants.map(p => p.response.room.players.find(x => x.id === p.response.playerId).team);
    assert.equal(teams.filter(x => x === 'cyan').length, 4);
    assert.equal(teams.filter(x => x === 'orange').length, 4);
    const extra = await connect(url); clients.push(extra);
    assert.equal((await request(extra, 'room:join', { code: created.code, name: 'Overflow' })).code, 'full');

    for (let i = 1; i < 8; i++) assert.equal((await request(participants[i].socket, 'lobby:ready', { ready: true })).ok, true);
    const startedPacket = waitFor(participants[1].socket, 'game:start');
    assert.equal((await request(host, 'lobby:start')).ok, true);
    const started = await startedPacket;
    assert.equal(started.room.phase, 'playing');
    assert.equal(started.room.players.length, 8);

    const orangePlayer = participants.find(p => p.response.room.players.find(x => x.id === p.response.playerId).team === 'orange');
    const before = started.state.players.ai.energy;
    const stateFromHost = waitFor(host, 'game:state', value => value.state.units.some(unit => unit.owner === 'ai' && unit.type === 'heavy'));
    assert.equal((await request(orangePlayer.socket, 'game:deploy', { type: 'heavy', lane: 1 })).ok, true);
    const deployedState = await stateFromHost;
    const spent = before - deployedState.state.players.ai.energy;
    assert.ok(spent > 3.7 && spent < 4.05, `deployment should spend four energy (observed ${spent.toFixed(2)} after live regeneration)`);
    assert.equal(deployedState.state.units.filter(unit => unit.owner === 'ai' && unit.type === 'heavy').length, 1);
    assert.equal((await request(orangePlayer.socket, 'game:deploy', { type: 'heavy', lane: 8 })).code, 'illegal-deploy');
    assert.equal((await request(host, 'game:deploy', { type: 'unknown', lane: 0 })).code, 'illegal-deploy');

    // Seed a close encounter on the server to exercise authoritative combat quickly.
    const liveRoom = server.rooms.get(created.code);
    const initialHp = liveRoom.game.units.find(unit => unit.owner === 'ai' && unit.type === 'heavy').hp;
    const observedA = waitFor(host, 'game:state', packet => packet.state.units.some(unit => unit.owner === 'ai' && unit.type === 'heavy' && unit.hp < initialHp));
    const observedB = waitFor(participants[1].socket, 'game:state', packet => packet.state.units.some(unit => unit.owner === 'ai' && unit.type === 'heavy' && unit.hp < initialHp));
    const friendly = await request(host, 'game:deploy', { type: 'scout', lane: 1 });
    assert.equal(friendly.ok, true);
    const cyanUnit = liveRoom.game.units.find(unit => unit.id === friendly.unitId);
    const orangeUnit = liveRoom.game.units.find(unit => unit.owner === 'ai' && unit.type === 'heavy');
    cyanUnit.x = 0.48; cyanUnit.cooldown = 0;
    orangeUnit.x = 0.54; orangeUnit.cooldown = 0;
    await delay(850);
    assert.ok(liveRoom.game.units.find(unit => unit.id === orangeUnit.id).hp < initialHp, 'server simulation should apply damage');
    const [packetA, packetB] = await Promise.all([observedA, observedB]);
    assert.equal(packetA.state.units.find(unit => unit.id === orangeUnit.id).hp, packetB.state.units.find(unit => unit.id === orangeUnit.id).hp);

    const hostToken = participants[0].response.token;
    const hostId = participants[0].response.playerId;
    host.disconnect();
    await delay(100);
    const migrated = server.rooms.get(created.code);
    assert.equal(migrated.hostId, participants[1].response.playerId, 'host should migrate to a connected commander');
    const reconnect = await connect(url); clients.push(reconnect);
    const resumed = await request(reconnect, 'room:resume', { code: created.code, playerId: hostId, token: hostToken });
    assert.equal(resumed.ok, true);
    assert.equal(resumed.state.phase, 'battle');
    assert.equal(resumed.room.players.find(p => p.id === hostId).connected, true);

    console.log('PASS: eight independent WebSocket clients, room validation/capacity, balanced teams, ready/start, server-authoritative deployment and combat, synchronized state, host migration, and reconnect.');
  } finally {
    for (const socket of clients) socket.disconnect();
    await server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
