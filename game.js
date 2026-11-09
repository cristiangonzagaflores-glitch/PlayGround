(() => {
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const homeEl = $('homeScore'), awayEl = $('awayScore'), clockEl = $('clock');
  const overlay = $('overlay'), startCard = $('startCard'), endCard = $('endCard');
  const goalFlash = $('goalFlash'), pauseEl = $('pauseIndicator'), statusEl = $('statusText');
  const keys = new Set(), touch = new Set();
  const W = 1000, H = 600;
  let running = false, paused = false, soundOn = true, lastTime = 0, timeLeft = 90;
  let homeScore = 0, awayScore = 0, goalPause = 0, kickCooldown = 0, particles = [], audioCtx = null;
  let shake = 0, ambienceTime = 0;
  const home = {x:270,y:300,vx:0,vy:0,dir:0,color:'#91c941',dark:'#477c31',light:'#d7f38c',type:'trike',anim:0};
  const away = {x:730,y:300,vx:0,vy:0,dir:Math.PI,color:'#ff7651',dark:'#a93f3a',light:'#ffb07a',type:'raptor',anim:0};
  const ball = {x:500,y:300,vx:0,vy:0,r:14,spin:0};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rand=(a,b)=>a+Math.random()*(b-a);
  function resetBall(kickoff=false){ball.x=500;ball.y=300;ball.vx=kickoff?(Math.random()<.5?85:-85):0;ball.vy=kickoff?rand(-38,38):0;home.x=kickoff?305:270;home.y=kickoff?rand(235,365):300;away.x=kickoff?695:730;away.y=kickoff?rand(235,365):300;home.vx=home.vy=away.vx=away.vy=0;goalPause=0;kickCooldown=0}
  function updateScore(){homeEl.textContent=homeScore;awayEl.textContent=awayScore}
  function setClock(){const s=Math.ceil(timeLeft);clockEl.textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
  function startMatch(){homeScore=awayScore=0;timeLeft=90;paused=false;running=true;particles=[];resetBall(true);updateScore();setClock();overlay.classList.add('hidden');pauseEl.classList.remove('show');statusEl.textContent='¡A por todas!';lastTime=performance.now()}
  function finish(){running=false;paused=false;pauseEl.classList.remove('show');overlay.classList.remove('hidden');startCard.classList.add('hidden');endCard.classList.remove('hidden');$('finalScore').textContent=`${homeScore} : ${awayScore}`;let won=homeScore>awayScore,tied=homeScore===awayScore;$('endEmoji').textContent=tied?'🤝':won?'🏆':'🦖';$('endTitle').textContent=tied?'¡Empate jurásico!':won?'¡Victoria jurásica!':'¡Los Raptors se llevan la copa!';$('endCopy').textContent=tied?'¡Qué partidazo, rugido compartido!':won?'El estadio retumba con tu rugido.':'¡A entrenar y pedir la revancha!';statusEl.textContent='¡Final del partido!'}
  function playTone(freq,duration=.12,type='sine',volume=.035){if(!soundOn)return;try{audioCtx??=new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch{}}
  function puff(x,y,color,count=14){for(let i=0;i<count;i++){const a=rand(0,Math.PI*2),s=rand(65,280);particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:rand(.35,.8),max:.8,size:rand(3,8),color,rot:rand(0,6)})}}
  function kick(){if(!running||paused||goalPause>0||kickCooldown>0)return;const dx=ball.x-home.x,dy=ball.y-home.y,d=Math.hypot(dx,dy);if(d>112)return;kickCooldown=.38;const aimX=960-ball.x,aimY=300-ball.y;const targetA=Math.atan2(aimY,aimX);let angle=d<42?targetA:Math.atan2(dy,dx)*.45+targetA*.55;angle+=rand(-.08,.08);const power=d<39?590:430;ball.vx+=Math.cos(angle)*power;ball.vy+=Math.sin(angle)*power;puff(ball.x,ball.y,'#f9e89b',7);playTone(185,.09,'triangle',.05);statusEl.textContent='¡Tremendo disparo!'}
  function goal(scoringHome){if(scoringHome)homeScore++;else awayScore++;updateScore();goalPause=1.65;running=true;ball.vx=ball.vy=0;shake=12;puff(scoringHome?900:100,300,scoringHome?'#d8f36a':'#ff8b67',35);goalFlash.classList.add('show');$('goalDetail').textContent=scoringHome?'¡Qué disparo!':'Los Raptors rugen...';statusEl.textContent=scoringHome?'¡GOOOL! ¡La grada se viene abajo!':'¡Gol de los Raptors! ¡Vamos, dino!';playTone(480,.5,'sawtooth',.045);setTimeout(()=>playTone(620,.5,'sine',.04),130);setTimeout(()=>{goalFlash.classList.remove('show');if(running)resetBall(true)},900);if(homeScore>=5||awayScore>=5)setTimeout(()=>{if(running)finish()},1050)}
  function togglePause(){if(!running||goalPause>0)return;paused=!paused;pauseEl.classList.toggle('show',paused);statusEl.textContent=paused?'Partido en pausa. Pulsa P para seguir.':'¡A por todas!';lastTime=performance.now()}
  function movePlayer(p,dx,dy,dt,speed){if(dx||dy){const m=Math.hypot(dx,dy);dx/=m;dy/=m;p.vx=dx*speed;p.vy=dy*speed;p.dir=Math.atan2(dy,dx)}else{p.vx*=Math.pow(.001,dt);p.vy*=Math.pow(.001,dt)}p.x+=p.vx*dt;p.y+=p.vy*dt;p.x=clamp(p.x,70,930);p.y=clamp(p.y,85,515);p.anim+=dt*(dx||dy?10:3)}
  function physics(dt){const left=keys.has('a')||keys.has('arrowleft')||touch.has('left'),right=keys.has('d')||keys.has('arrowright')||touch.has('right'),up=keys.has('w')||keys.has('arrowup')||touch.has('up'),down=keys.has('s')||keys.has('arrowdown')||touch.has('down');movePlayer(home,(right?1:0)-(left?1:0),(down?1:0)-(up?1:0),dt,285);
    // The rival hunts the ball, then shoots toward your goal.
    const dist=Math.hypot(ball.x-away.x,ball.y-away.y),defendX=clamp(ball.x+105,580,875);let tx=dist<205?ball.x+18:defendX,ty=dist<205?ball.y:ball.y+(ball.y<300?38:-38);if(dist<95){tx=ball.x;ty=ball.y}const aim=Math.atan2(ty-away.y,tx-away.x);movePlayer(away,Math.cos(aim),Math.sin(aim),dt,dist<100?235:205);
    for(const p of [home,away]){const dx=ball.x-p.x,dy=ball.y-p.y,d=Math.hypot(dx,dy),min=31+ball.r;if(d<min&&d>0){const nx=dx/d,ny=dy/d,over=min-d;ball.x+=nx*over;ball.y+=ny*over;const rel=(ball.vx-p.vx)*nx+(ball.vy-p.vy)*ny;if(rel<115){const impulse=110-rel;ball.vx+=nx*impulse;ball.vy+=ny*impulse}if(p===away&&d<44&&Math.random()<dt*1.7){const a=Math.atan2(300-ball.y,-ball.x);ball.vx+=Math.cos(a)*310;ball.vy+=Math.sin(a)*310;playTone(145,.06,'triangle',.025)}}}
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.spin+=Math.hypot(ball.vx,ball.vy)*dt*.025;const friction=Math.pow(.985,dt*60);ball.vx*=friction;ball.vy*=friction;
    if(ball.y<70+ball.r){ball.y=70+ball.r;ball.vy=Math.abs(ball.vy)*.73;playTone(115,.04,'sine',.012)}if(ball.y>530-ball.r){ball.y=530-ball.r;ball.vy=-Math.abs(ball.vy)*.73;playTone(115,.04,'sine',.012)}
    const inMouth=ball.y>225&&ball.y<375;if(ball.x<48+ball.r&&!inMouth){ball.x=48+ball.r;ball.vx=Math.abs(ball.vx)*.74}if(ball.x>952-ball.r&&!inMouth){ball.x=952-ball.r;ball.vx=-Math.abs(ball.vx)*.74}
    if(ball.x<28&&inMouth)goal(false);if(ball.x>972&&inMouth)goal(true);
    // Rival's occasional clean strike keeps the match lively.
    if(dist<45&&Math.random()<dt*.55){const a=Math.atan2(300-ball.y,-ball.x);ball.vx+=Math.cos(a)*rand(140,260);ball.vy+=Math.sin(a)*rand(140,260)}
  }
  function roundedRect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
  function drawStadium(){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1b2b3a');g.addColorStop(1,'#243342');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    // Crowd tiers and tiny paper confetti.
    for(let row=0;row<3;row++){const y=20+row*18;for(let i=0;i<62;i++){const x=i*17-4+(row%2)*7;ctx.fillStyle=['#506171','#d0a45f','#899b69','#b56750','#708998'][((i*7+row*13)%5)];ctx.globalAlpha=.38+((i*11+row)%5)*.09;ctx.beginPath();ctx.arc(x,y+Math.sin(i*2+row)*2,randDet(i,row)*2.1+1.4,0,Math.PI*2);ctx.fill()}}ctx.globalAlpha=1;
    // Stadium lights.
    for(const x of [80,920]){ctx.fillStyle='#d9e8ba';ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(x,69,37,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;for(let i=0;i<5;i++){ctx.fillStyle='#f8f6cd';ctx.fillRect(x-22+i*11,44,5,5)}}
    // Pitch outer dark lip, alternating grass cuts.
    roundedRect(35,57,930,490,18,'#173725','#94bd7377');roundedRect(43,65,914,474,13,'#316d42','#a2c587');ctx.save();ctx.beginPath();ctx.roundRect(48,70,904,464,10);ctx.clip();ctx.fillStyle='#3c804b';ctx.fillRect(48,70,904,464);for(let i=0;i<10;i++){ctx.fillStyle=i%2?'#347444':'#43834d';ctx.fillRect(48+i*90.4,70,90.4,464)}
    // Subtle turf strokes.
    ctx.globalAlpha=.12;ctx.strokeStyle='#d4ecaf';ctx.lineWidth=1;for(let y=83;y<530;y+=18){ctx.beginPath();ctx.moveTo(55,y);ctx.lineTo(945,y);ctx.stroke()}ctx.globalAlpha=1;ctx.restore();
    // Pitch markings.
    ctx.strokeStyle='#e2f0cf';ctx.globalAlpha=.75;ctx.lineWidth=2;ctx.strokeRect(70,88,860,424);ctx.beginPath();ctx.moveTo(500,88);ctx.lineTo(500,512);ctx.stroke();ctx.beginPath();ctx.arc(500,300,72,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e2f0cf';ctx.beginPath();ctx.arc(500,300,3,0,Math.PI*2);ctx.fill();
    for(const side of ['left','right']){const x=side==='left'?70:790;ctx.strokeRect(x,205,140,190);ctx.strokeRect(side==='left'?70:860,247,70,106);ctx.beginPath();ctx.arc(side==='left'?210:790,300,44,side==='left'?-Math.PI/2:Math.PI/2,side==='left'?Math.PI/2:Math.PI*1.5);ctx.stroke()}
    ctx.globalAlpha=1;
    // Nets behind endlines.
    drawGoal(25,232,40,136,false);drawGoal(935,232,40,136,true);
    // Side-line pennants.
    for(let i=0;i<12;i++){const x=92+i*74;ctx.fillStyle=i%2?'#ffcd70':'#f18459';ctx.beginPath();ctx.moveTo(x,75);ctx.lineTo(x+8,78);ctx.lineTo(x,82);ctx.fill();ctx.beginPath();ctx.moveTo(x,525);ctx.lineTo(x+8,522);ctx.lineTo(x,518);ctx.fill()}
  }
  function randDet(i,j){return ((i*37+j*17)%19)/19}
  function drawGoal(x,y,w,h,right){ctx.save();ctx.fillStyle='#d6e4cc22';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#eef4df';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.stroke();ctx.strokeStyle='#d8e6d188';ctx.lineWidth=1;for(let i=1;i<5;i++){ctx.beginPath();ctx.moveTo(x+i*w/5,y);ctx.lineTo(x+i*w/5,y+h);ctx.stroke()}for(let j=1;j<7;j++){ctx.beginPath();ctx.moveTo(x,y+j*h/7);ctx.lineTo(x+w,y+j*h/7);ctx.stroke()}ctx.restore()}
  function drawDino(p){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.dir);const s=p.anim,step=Math.sin(s)*4, tail=Math.sin(s*.6)*.08;ctx.rotate(tail);ctx.globalAlpha=.24;ctx.fillStyle='#07170c';ctx.beginPath();ctx.ellipse(0,23,34,11,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    // Tail and body silhouette.
    ctx.fillStyle=p.dark;ctx.beginPath();ctx.moveTo(-20,5);ctx.quadraticCurveTo(-42,2,-58,-13);ctx.quadraticCurveTo(-49,8,-53,18);ctx.quadraticCurveTo(-38,20,-21,18);ctx.closePath();ctx.fill();ctx.fillStyle=p.color;ctx.beginPath();ctx.ellipse(-5,5,28,21,-.12,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.dark;ctx.lineWidth=2;ctx.stroke();
    // Far legs.
    ctx.fillStyle=p.dark;ctx.beginPath();ctx.ellipse(-14,20+step,8,13,.1,0,Math.PI*2);ctx.ellipse(9,20-step,8,13,-.1,0,Math.PI*2);ctx.fill();
    // Spiny back.
    for(let i=0;i<4;i++){const x=-22+i*11;ctx.fillStyle=i%2?p.dark:p.light;ctx.beginPath();ctx.moveTo(x-5,-10);ctx.lineTo(x,-22-(i%2)*4);ctx.lineTo(x+7,-9);ctx.closePath();ctx.fill()}
    // Neck and big friendly head.
    ctx.fillStyle=p.color;ctx.beginPath();ctx.ellipse(20,-2,19,17,-.18,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(32,-9,19,16,-.1,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.dark;ctx.lineWidth=2;ctx.stroke();
    // Player team gets little triceratops horns, rival gets a crest.
    if(p.type==='trike'){ctx.fillStyle='#f2e3b2';for(const h of [[22,-23],[35,-24],[46,-17]]){ctx.beginPath();ctx.moveTo(h[0]-3,h[1]+6);ctx.lineTo(h[0]+1,h[1]-7);ctx.lineTo(h[0]+5,h[1]+6);ctx.closePath();ctx.fill()}}else{ctx.fillStyle=p.light;ctx.beginPath();ctx.moveTo(17,-20);ctx.lineTo(20,-32);ctx.lineTo(28,-21);ctx.lineTo(35,-31);ctx.lineTo(38,-17);ctx.closePath();ctx.fill()}
    // Eye, nostril, smile.
    ctx.fillStyle='#fff9de';ctx.beginPath();ctx.ellipse(37,-10,5.3,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#172333';ctx.beginPath();ctx.arc(39,-10,2.4,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.dark;ctx.beginPath();ctx.arc(49,-4,1.7,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.dark;ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(34,2);ctx.quadraticCurveTo(41,7,48,1);ctx.stroke();
    // Feet.
    ctx.fillStyle=p.light;ctx.beginPath();ctx.ellipse(-14,29+step,10,5,0,0,Math.PI*2);ctx.ellipse(9,29-step,10,5,0,0,Math.PI*2);ctx.fill();ctx.restore()}
  function drawBall(){ctx.save();ctx.translate(ball.x,ball.y);ctx.rotate(ball.spin);ctx.globalAlpha=.28;ctx.fillStyle='#10171c';ctx.beginPath();ctx.ellipse(1,13,15,5,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;const grad=ctx.createRadialGradient(-5,-7,2,0,0,17);grad.addColorStop(0,'#fffef2');grad.addColorStop(1,'#d7dfd1');ctx.fillStyle=grad;ctx.strokeStyle='#62746e';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,ball.r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#40534d';for(let i=0;i<5;i++){const a=i*1.256+Math.PI/2;const x=Math.cos(a)*7,y=Math.sin(a)*7;ctx.beginPath();for(let j=0;j<5;j++){const aa=j*Math.PI*2/5;const xx=x+Math.cos(aa)*3.3,yy=y+Math.sin(aa)*3.3;j?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)}ctx.closePath();ctx.fill()}ctx.restore()}
  function drawParticles(dt){for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;if(p.life<=0){particles.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy=p.vy*.97+170*dt;ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot+=dt*4);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.65);ctx.restore()}ctx.globalAlpha=1}
  function render(dt=0){const cw=canvas.clientWidth,ch=canvas.clientHeight;if(!cw||!ch)return;const sx=cw/W,sy=ch/H;ctx.setTransform(sx,0,0,sy,0,0);ctx.clearRect(0,0,W,H);ctx.save();if(shake>0){ctx.translate(rand(-shake,shake),rand(-shake,shake));shake=Math.max(0,shake-dt*28)}drawStadium();drawDino(home);drawDino(away);drawBall();drawParticles(dt);ctx.restore();ctx.setTransform(1,0,0,1,0,0)}
  function loop(now){const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;if(running&&!paused){if(goalPause>0){goalPause-=dt;if(goalPause<=0&&homeScore<5&&awayScore<5){/* kickoff handled by goal timer */}}else{timeLeft=Math.max(0,timeLeft-dt);setClock();kickCooldown=Math.max(0,kickCooldown-dt);physics(dt);if(timeLeft<=0)finish()}}render(dt);requestAnimationFrame(loop)}
  $('startButton').addEventListener('click',startMatch);$('rematchButton').addEventListener('click',startMatch);
  $('soundButton').addEventListener('click',()=>{soundOn=!soundOn;$('soundButton').classList.toggle('off',!soundOn);$('soundButton').innerHTML=soundOn?'♫ <span>SONIDO</span>':'♫̸ <span>MUTE</span>'});
  window.addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();keys.add(k);if(k===' '&&!e.repeat)kick();if(k==='p'&&!e.repeat)togglePause();if((k==='enter'||k===' ')&&!running)startMatch()});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('.dpad button').forEach(btn=>{const dir=btn.dataset.dir;btn.addEventListener('pointerdown',e=>{e.preventDefault();touch.add(dir);btn.setPointerCapture(e.pointerId)});['pointerup','pointercancel','lostpointercapture'].forEach(ev=>btn.addEventListener(ev,()=>touch.delete(dir)))});
  $('kickButton').addEventListener('pointerdown',e=>{e.preventDefault();kick()});$('kickButton').addEventListener('click',kick);
  canvas.addEventListener('pointerdown',()=>{if(!running)startMatch()});
  setClock();render();requestAnimationFrame(loop);
})();
