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

let bullets = [];
let enemies = [];
let coins = [];
let powerUps = [];
let explosions = [];
let score = 0;

/* ================= CURRENCY ================= */
let savedCoins = parseInt(localStorage.getItem("coins")) || 0;
let stars = 0; // Telegram Stars (демо)
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

/* ================= INPUT ================= */
canvas.addEventListener("click", e => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;

  if (gameState === "menu" && !shopOpen) {
    if (hitBtn(x, y, buttons.play)) startGame();
    if (hitBtn(x, y, buttons.shop)) shopOpen = true;
  } else if (shopOpen) {
    handleShopClick(x, y);
  }

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
function update() {
  player.x += (player.targetX - player.x) * player.speed;
  player.x = Math.max(0, Math.min(WIDTH - player.w, player.x));

  autoShoot();
  updateBullets();
  spawnEnemies();
  updateEnemies();
  spawnPowerUp();
  updatePowerUps();
  updateCoins();
  updateExplosions();
}

/* ================= SHOOT ================= */
function autoShoot() {
  if (player.fireCooldown-- > 0) return;
  bullets.push({
    x: player.x + player.w / 2 - 2,
    y: player.y,
    speed: 10
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

/* ================= ENEMIES ================= */
function spawnEnemies() {
  if (Math.random() < 0.03) {
    const hp = Math.random() < 0.3 ? 5 : 3;
    enemies.push({
      x: Math.random() * (WIDTH - 40),
      y: -50,
      w: 40,
      h: 40,
      hp,
      maxHp: hp,
      speed: 2
    });
  }
}

function updateEnemies() {
  enemies.forEach((e, ei) => {
    e.y += e.speed;

    bullets.forEach((b, bi) => {
      if (hit(b, e)) {
        bullets.splice(bi, 1);
        e.hp--;
        if (e.hp <= 0) {
          createExplosion(e.x + e.w / 2, e.y + e.h / 2);
          if (Math.random() < 0.7) {
            coins.push({ x: e.x + e.w / 2 - 8, y: e.y + e.h / 2 - 8, w: 16, h: 16, speed: 3 });
          }
          enemies.splice(ei, 1);
        }
      }
    });

    if (rectHit(player, e)) {
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

/* ================= POWERUPS ================= */
function spawnPowerUp() {
  if (Math.random() < 0.005) {
    powerUps.push({ x: Math.random() * (WIDTH - 20), y: -20, type: "hp", speed: 2 });
  }
}

function updatePowerUps() {
  powerUps.forEach((p, i) => {
    p.y += p.speed;
    if (rectHit(player, p)) {
      if (p.type === "hp") player.hp = Math.min(player.maxHp, player.hp + 1);
      powerUps.splice(i, 1);
    }
    if (p.y > HEIGHT) powerUps.splice(i, 1);
  });
}

/* ================= COINS ================= */
function updateCoins() {
  coins.forEach((c, i) => {
    c.y += c.speed;
    c.x += Math.sin(Date.now() / 200 + c.y / 5) * 1.5;
    if (rectHit(player, c)) {
      coins.splice(i, 1);
      score += 1;
    }
    if (c.y > HEIGHT) coins.splice(i, 1);
  });
}

/* ================= EXPLOSIONS ================= */
function createExplosion(x, y) {
  explosions.push({ x, y, radius: 5, maxRadius: 20 });
}

function updateExplosions() {
  explosions.forEach((ex, i) => {
    ex.radius += 2;
    if (ex.radius > ex.maxRadius) explosions.splice(i, 1);
  });
}

/* ================= DRAW ================= */
function draw() {
  // Игрок
  ctx.fillStyle = "#00ffff";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // Пули
  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));

  // Враги с пульсацией
  enemies.forEach(e => {
    const pulse = Math.sin(Date.now() / 100) * 2;
    ctx.fillStyle = "red";
    ctx.fillRect(e.x - pulse/2, e.y - pulse/2, e.w + pulse, e.h + pulse);

    ctx.fillStyle = "black";
    ctx.fillRect(e.x, e.y - 6, e.w, 4);
    ctx.fillStyle = "lime";
    ctx.fillRect(e.x, e.y - 6, (e.hp / e.maxHp) * e.w, 4);
  });

  // Монеты
  ctx.fillStyle = "gold";
  coins.forEach(c => ctx.fillRect(c.x, c.y, c.w, c.h));

  // Бонусы
  powerUps.forEach(p => {
    ctx.fillStyle = p.type === "hp" ? "pink" : "cyan";
    ctx.fillRect(p.x, p.y, 20, 20);
  });

  // Взрывы
  explosions.forEach(ex => {
    ctx.beginPath();
    ctx.arc(ex.x, ex.y, ex.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,165,0,${1 - ex.radius / ex.maxRadius})`;
    ctx.fill();
  });

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  const shake = player.tookDamage ? 2 : 0;
  ctx.fillText("❤️ ".repeat(player.hp), 10 + Math.random()*shake, 20);
  ctx.fillText("💰 " + (savedCoins + score), WIDTH - 120, 20);
}

/* ================= MENU ================= */
function drawMenu() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "white";
  ctx.font = "28px Arial";
  ctx.fillText("🚀 Space Shooter", 70, 200);

  drawButton(buttons.play, "▶ ИГРАТЬ");
  drawButton(buttons.shop, "🛒 МАГАЗИН");

  if (shopOpen) drawShop();
}

function drawButton(b, text) {
  ctx.fillStyle = "#222";
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = "white";
  ctx.strokeRect(b.x, b.y, b.w, b.h);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(text, b.x + 20, b.y + 32);
}

/* ================= SHOP ================= */
function drawShop() {
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillRect(20, 100, 320, 440);

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText("МАГАЗИН", 120, 140);

  let y = 180;
  for (let key in upgrades) {
    const upg = upgrades[key];
    ctx.fillText(`${key.toUpperCase()} LVL ${upg.level} - ${upg.price}💰`, 50, y);
    drawButton({x:50,y:y-20,w:200,h:30}, "Купить");
    y += 40;
  }

  ctx.fillText("⭐ DONATE UPGRADES", 50, y + 20);
  ctx.fillText("HP+1 за 5⭐", 50, y + 60);

  drawButton(buttons.back, "⬅ НАЗАД");
}

function handleShopClick(x, y) {
  let yPos = 180;
  for (let key in upgrades) {
    const upg = upgrades[key];
    if (hitBtn(x, y, { x: 50, y: yPos - 20, w: 200, h: 30 }) &&
        savedCoins >= upg.price &&
        upg.level < upg.max) {
      savedCoins -= upg.price;
      localStorage.setItem("coins", savedCoins);
      upg.level++;
      if (key === "fireRate") player.fireRate = Math.max(2, player.fireRate - 1);
      if (key === "hp") player.maxHp++;
    }
    yPos += 40;
  }
  if (hitBtn(x, y, buttons.back)) shopOpen = false;
}

/* ================= GAME OVER ================= */
function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "white";
  ctx.font = "28px Arial";
  ctx.fillText("GAME OVER", 90, 300);
  ctx.font = "16px Arial";
  ctx.fillText("Tap to restart", 120, 340);
}

/* ================= HELPERS ================= */
function hit(b, e) {
  return b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h;
}
function rectHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function hitBtn(x, y, b) {
  return x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;
}

/* ================= START ================= */
loop();
