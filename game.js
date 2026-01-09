/* ================= TELEGRAM ================= */
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

/* ================= CANVAS ================= */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const DPR = window.devicePixelRatio || 1;
const WIDTH = 360;
const HEIGHT = 640;

canvas.style.width = WIDTH + "px";
canvas.style.height = HEIGHT + "px";
canvas.width = WIDTH * DPR;
canvas.height = HEIGHT * DPR;
ctx.scale(DPR, DPR);

/* ================= GAME STATE ================= */
let gameState = "menu";
let gameOver = false;
let shopOpen = false;

/* ================= PLAYER ================= */
const player = {
  x: WIDTH / 2 - 20,
  y: HEIGHT - 90,
  w: 40,
  h: 40,
  hp: 3,
  maxHp: 3,
  targetX: WIDTH / 2 - 20,
  speed: 0.15,
  fireRate: 8,
  fireCooldown: 0,
  tookDamage: false
};

/* ================= ARRAYS ================= */
let bullets = [];
let enemies = [];
let coins = [];
let powerUps = [];
let explosions = [];
let score = 0;
let boss = null;

/* ================= CURRENCY ================= */
let savedCoins = parseInt(localStorage.getItem("coins")) || 0;
let stars = 0; // демо
const upgrades = {
  fireRate: { level: 0, max: 5, price: 50 },
  hp: { level: 0, max: 3, price: 100 }
};

/* ================= BUTTONS ================= */
const buttons = {
  play: { x: 80, y: 280, w: 200, h: 50 },
  shop: { x: 80, y: 350, w: 200, h: 50 },
  back: { x: 80, y: 550, w: 200, h: 50 }
};

/* ================= STARS BACKGROUND ================= */
const starsBackground = [];
for (let i = 0; i < 100; i++) {
  starsBackground.push({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    size: Math.random() * 2 + 1,
    speed: Math.random() * 0.5 + 0.2
  });
}

function updateStars() {
  starsBackground.forEach(star => {
    star.y += star.speed;
    if (star.y > HEIGHT) {
      star.y = 0;
      star.x = Math.random() * WIDTH;
    }
  });
}

function drawStars() {
  ctx.fillStyle = "white";
  starsBackground.forEach(star => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

/* ================= BONUSES ================= */
const activeBonuses = {
  invincible: { active: false, timer: 0 },
  superShot: { active: false, timer: 0 },
  doubleCoins: { active: false, timer: 0 }
};

function updateBonuses() {
  for (let key in activeBonuses) {
    if (activeBonuses[key].active) {
      activeBonuses[key].timer--;
      if (activeBonuses[key].timer <= 0) activeBonuses[key].active = false;
    }
  }
}

/* ================= INPUT ================= */
canvas.addEventListener("click", e => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;

  if (gameState === "menu" && !shopOpen) {
    if (hitBtn(x, y, buttons.play)) startGame();
    if (hitBtn(x, y, buttons.shop)) shopOpen = true;
  } else if (shopOpen) handleShopClick(x, y);

  if (gameState === "game" && gameOver) location.reload();
});

canvas.addEventListener("touchmove", e => {
  if (gameState !== "game") return;
  const r = canvas.getBoundingClientRect();
  player.targetX = e.touches[0].clientX - r.left - player.w / 2;
});

/* ================= START GAME ================= */
function startGame() {
  gameState = "game";
  gameOver = false;
  player.hp = player.maxHp;
  bullets = [];
  enemies = [];
  coins = [];
  powerUps = [];
  explosions = [];
  boss = null;
  score = 0;
}

/* ================= MAIN LOOP ================= */
function loop() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (gameState === "menu") drawMenu();
  if (gameState === "game") {
    if (!gameOver) {
      update();
      draw();
    } else drawGameOver();
  }

  requestAnimationFrame(loop);
}

/* ================= UPDATE ================= */
let enemyLevel = 1;

function update() {
  player.x += (player.targetX - player.x) * player.speed;
  player.x = Math.max(0, Math.min(WIDTH - player.w, player.x));

  updateStars();
  updateBonuses();
  autoShoot();
  updateBullets();
  updateEnemies();
  spawnEnemies();
  spawnPowerUp();
  updatePowerUps();
  updateCoins();
  updateExplosions();
  spawnBoss();
  updateBoss();
  updateDifficulty();
}

/* ================= DIFFICULTY ================= */
function updateDifficulty() {
  enemyLevel = 1 + Math.floor(score / 20);
}

/* ================= SHOOT ================= */
function autoShoot() {
  if (player.fireCooldown-- > 0) return;
  bullets.push({
    x: player.x + player.w / 2 - 2,
    y: player.y,
    speed: 10,
    super: activeBonuses.superShot.active
  });
  player.fireCooldown = player.fireRate;
}

/* ================= BULLETS ================= */
function updateBullets() {
  bullets.forEach((b, i) => {
    b.y -= b.speed;
    if (b.y < 0) bullets.splice(i, 1);
  });
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, 4, 10);
    ctx.strokeStyle = "rgba(255,255,0,0.5)";
    ctx.beginPath();
    ctx.moveTo(b.x + 2, b.y + 10);
    ctx.lineTo(b.x + 2, b.y + 20);
    ctx.stroke();
  });
}

/* ================= ENEMIES ================= */
function spawnEnemies() {
  if (!boss && Math.random() < 0.03) {
    const hp = Math.floor(Math.random() * 2 + 2) * enemyLevel;
    enemies.push({ x: Math.random() * (WIDTH - 40), y: -50, w: 40, h: 40, hp, maxHp: hp, speed: 2 + enemyLevel * 0.2 });
  }
}

function updateEnemies() {
  enemies.forEach((e, ei) => {
    e.y += e.speed;

    bullets.forEach((b, bi) => {
      if (hit(b, e)) {
        if (b.super) e.hp = 0; else e.hp--;
        bullets.splice(bi, 1);
        if (e.hp <= 0) {
          createExplosion(e.x + e.w/2, e.y + e.h/2);
          let coinReward = Math.floor(Math.random() * 3 + 3);
          if (activeBonuses.doubleCoins.active) coinReward *= 2;
          score += coinReward;
          enemies.splice(ei, 1);
        }
      }
    });

    if (!activeBonuses.invincible.active && rectHit(player, e)) {
      enemies.splice(ei, 1);
      player.hp--;
      player.tookDamage = true;
      if (player.hp <= 0) {
        gameOver = true;
        savedCoins += score;
        localStorage.setItem("coins", savedCoins);
      }
    }
  });
}

/* ================= BOSS ================= */
function spawnBoss() {
  if (!boss && score > 0 && score % 50 === 0) {
    boss = { x: WIDTH/2-50, y: -100, w: 100, h: 100, hp: 50 + enemyLevel*10, maxHp: 50 + enemyLevel*10, speed: 1 };
  }
}

function updateBoss() {
  if (!boss) return;
  boss.y += boss.speed;

  bullets.forEach((b, bi) => {
    if (hit(b, boss)) {
      if (b.super) boss.hp = 0; else boss.hp--;
      bullets.splice(bi, 1);
      if (boss.hp <= 0) {
        createExplosion(boss.x + boss.w/2, boss.y + boss.h/2);
        score += 10 + enemyLevel * 2;
        boss = null;
      }
    }
  });
}

/* ================= POWERUPS ================= */
function spawnPowerUp() {
  if (Math.random() < 0.005) {
    const types = ["invincible","superShot","doubleCoins"];
    powerUps.push({ x: Math.random()*(WIDTH-20), y:-20, type: types[Math.floor(Math.random()*types.length)], speed: 2 });
  }
}

function updatePowerUps() {
  powerUps.forEach((p, i) => {
    p.y += p.speed;
    if (rectHit(player, p)) {
      if (p.type==="invincible") { activeBonuses.invincible.active=true; activeBonuses.invincible.timer=240; }
      if (p.type==="superShot") { activeBonuses.superShot.active=true; activeBonuses.superShot.timer=60; }
      if (p.type==="doubleCoins") { activeBonuses.doubleCoins.active=true; activeBonuses.doubleCoins.timer=360; }
      powerUps.splice(i,1);
    }
    if (p.y>HEIGHT) powerUps.splice(i,1);
  });
}

/* ================= COINS ================= */
function updateCoins() {
  coins.forEach((c,i)=>{
    c.y+=c.speed;
    c.x+=Math.sin(Date.now()/200+c.y/5)*1.5;
    if(rectHit(player,c)){coins.splice(i,1);score+=1;}
    if(c.y>HEIGHT) coins.splice(i,1);
  });
}

/* ================= EXPLOSIONS ================= */
function createExplosion(x,y){explosions.push({x,y,radius:5,maxRadius:20});}
function updateExplosions(){explosions.forEach((ex,i)=>{ex.radius+=2;if(ex.radius>ex.maxRadius)explosions.splice(i,1);});}

/* ================= DRAW ================= */
function draw(){
  ctx.fillStyle="black";
  ctx.fillRect(0,0,WIDTH,HEIGHT);
  drawStars();
  drawBullets();

  ctx.fillStyle="#00ffff";
  ctx.fillRect(player.x,player.y,player.w,player.h);

  enemies.forEach(e=>{
    const pulse=Math.sin(Date.now()/100)*2;
    ctx.fillStyle="red";
    ctx.fillRect(e.x-pulse/2,e.y-pulse/2,e.w+pulse,e.h+pulse);
    ctx.fillStyle="black"; ctx.fillRect(e.x,e.y-6,e.w,4);
    ctx.fillStyle="lime"; ctx.fillRect(e.x,e.y-6,(e.hp/e.maxHp)*e.w,4);
  });

  if(boss){
    ctx.fillStyle="purple";
    ctx.fillRect(boss.x,boss.y,boss.w,boss.h);
    ctx.fillStyle="black"; ctx.fillRect(boss.x,boss.y-6,boss.w,4);
    ctx.fillStyle="lime"; ctx.fillRect(boss.x,boss.y-6,(boss.hp/boss.maxHp)*boss.w,4);
  }

  ctx.fillStyle="gold"; coins.forEach(c=>ctx.fillRect(c.x,c.y,c.w,c.h));
  powerUps.forEach(p=>{ctx.fillStyle=p.type==="hp"?"pink":p.type==="invincible"?"cyan":"orange";ctx.fillRect(p.x,p.y,20,20);});
  explosions.forEach(ex=>{ctx.beginPath();ctx.arc(ex.x,ex.y,ex.radius,0,Math.PI*2);ctx.fillStyle=`rgba(255,165,0,${1-ex.radius/ex.maxRadius})`;ctx.fill();});

  ctx.fillStyle="white"; ctx.font="16px Arial";
  const shake=player.tookDamage?2:0;
  ctx.fillText("❤️ ".repeat(player.hp),10+Math.random()*shake,20);
  ctx.fillText("💰 "+(savedCoins+score),WIDTH-120,20);
}

/* ================= MENU ================= */
function drawMenu(){
  ctx.fillStyle="black";ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle="white";ctx.font="28px Arial";ctx.fillText("🚀 Space Shooter",70,200);
  drawButton(buttons.play,"▶ ИГРАТЬ"); drawButton(buttons.shop,"🛒 МАГАЗИН");
  if(shopOpen) drawShop();
}
function drawButton(b,text){ctx.fillStyle="#222";ctx.fillRect(b.x,b.y,b.w,b.h);ctx.strokeStyle="white";ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.fillStyle="white";ctx.font="20px Arial";ctx.fillText(text,b.x+20,b.y+32);}

/* ================= SHOP ================= */
function drawShop(){
  ctx.fillStyle="rgba(0,0,0,0.9)"; ctx.fillRect(20,100,320,440);
  ctx.fillStyle="white"; ctx.font="24px Arial"; ctx.fillText("МАГАЗИН",120,140);
  let y=180;
  for(let key in upgrades){const upg=upgrades[key];ctx.fillText(`${key.toUpperCase()} LVL ${upg.level} - ${upg.price}💰`,50,y); drawButton({x:50,y:y-20,w:200,h:30},"Купить"); y+=40;}
  ctx.fillText("⭐ DONATE UPGRADES",50,y+20); ctx.fillText("Супер-Пушка за 5⭐",50,y+60);
  drawButton(buttons.back,"⬅ НАЗАД");
}
function handleShopClick(x,y){
  let yPos=180;
  for(let key in upgrades){
    const upg=upgrades[key];
    if(hitBtn(x,y,{x:50,y:yPos-20,w:200,h:30}) && savedCoins>=upg.price && upg.level<upg.max){
      savedCoins-=upg.price; localStorage.setItem("coins",savedCoins); upg.level++;
      if(key==="fireRate") player.fireRate=Math.max(2,player.fireRate-1);
      if(key==="hp") player.maxHp++;
    }
    yPos+=40;
  }
  if(hitBtn(x,y,buttons.back)) shopOpen=false;
}

/* ================= GAME OVER ================= */
function drawGameOver(){
  ctx.fillStyle="rgba(0,0,0,0.7)";ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle="white"; ctx.font="28px Arial"; ctx.fillText("GAME OVER",90,300);
  ctx.font="16px Arial"; ctx.fillText("Tap to restart",120,340);
}

/* ================= HELPERS ================= */
function hit(b,e){return b.x>e.x&&b.x<e.x+e.w&&b.y>e.y&&b.y<e.y+e.h;}
function rectHit(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
function hitBtn(x,y,b){return x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h;}

/* ================= START ================= */
loop();
