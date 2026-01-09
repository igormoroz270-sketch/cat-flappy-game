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
  fireCooldown: 0
};

let bullets = [];
let enemies = [];
let coins = [];
let score = 0;

/* ================= CURRENCY ================= */
let savedCoins = parseInt(localStorage.getItem("coins")) || 0;
let stars = 0; // Telegram Stars (пока демо, реально через API)

// Улучшения игрока
const upgrades = {
  fireRate: { level: 0, max: 5, price: 50 },
  hp: { level: 0, max: 3, price: 100 }
};

// Кнопки магазина
let shopButtons = [];

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
    if (hitBtn(x, y, buttons.shop)) {
      shopOpen = true;
      setupShopButtons();
    }
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
  updateEnemies();
  spawnEnemies();
  updateCoins();
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
    enemies.push({ x: Math.random() * (WIDTH - 40), y: -50, w: 40, h: 40, hp, maxHp: hp, speed: 2 });
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
          if (Math.random() < 0.7) coins.push({ x: e.x + e.w / 2 - 8, y: e.y + e.h / 2 - 8, w: 16, h: 16, speed: 3 });
          enemies.splice(ei, 1);
        }
      }
    });

    if (rectHit(player, e)) {
      enemies.splice(ei, 1);
      player.hp--;
      if (player.hp <= 0) {
        gameOver = true;
        savedCoins += score;
        localStorage.setItem("coins", savedCoins);
      }
    }
  });
}

/* ================= COINS ================= */
function updateCoins() {
  coins.forEach((c, i) => {
    c.y += c.speed;
    if (rectHit(player, c)) {
      coins.splice(i, 1);
      score += 1;
    }
    if (c.y > HEIGHT) coins.splice(i, 1);
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

  // Враги
  enemies.forEach(e => {
    ctx.fillStyle = "red";
    ctx.fillRect(e.x, e.y, e.w, e.h);
    ctx.fillStyle = "black";
    ctx.fillRect(e.x, e.y - 6, e.w, 4);
    ctx.fillStyle = "lime";
    ctx.fillRect(e.x, e.y - 6, (e.hp / e.maxHp) * e.w, 4);
  });

  // Монеты
  ctx.fillStyle = "gold";
  coins.forEach(c => ctx.fillRect(c.x, c.y, c.w, c.h));

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("❤️ ".repeat(player.hp), 10, 20);
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
function setupShopButtons() {
  shopButtons = [];
  let y = 180;
  for (let key in upgrades) {
    shopButtons.push({ type: "coin", key, x: 50, y: y - 20, w: 200, h: 30 });
    y += 40;
  }
  // Донатная кнопка HP+1 за 5⭐
  shopButtons.push({ type: "star", key: "hp", stars: 5, x: 50, y: y + 40, w: 200, h: 30 });
  // Назад
  shopButtons.push({ type: "back", x: buttons.back.x, y: buttons.back.y, w: buttons.back.w, h: buttons.back.h });
}

function drawShop() {
  ctx.fillStyle = "rgba(0,0,0,0.9)";
  ctx.fillRect(20, 100, 320, 440);

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText("МАГАЗИН", 120, 140);

  ctx.font = "20px Arial";
  shopButtons.forEach(b => {
    let text = "";
    if (b.type === "coin") {
      const upg = upgrades[b.key];
      text = `${b.key.toUpperCase()} LVL ${upg.level} - ${upg.price}💰`;
    } else if (b.type === "star") text = `HP+1 за ${b.stars}⭐`;
    else if (b.type === "back") text = "⬅ НАЗАД";

    ctx.fillStyle = "#222";
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = "white";
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = "white";
    ctx.fillText(text, b.x + 10, b.y + 22);
  });
}

function handleShopClick(x, y) {
  for (let b of shopButtons) {
    if (hitBtn(x, y, b)) {
      if (b.type === "coin") {
        const upg = upgrades[b.key];
        if (savedCoins >= upg.price && upg.level < upg.max) {
          savedCoins -= upg.price;
          localStorage.setItem("coins", savedCoins);
          upg.level++;
          if (b.key === "fireRate") player.fireRate = Math.max(2, player.fireRate - 1);
          if (b.key === "hp") player.maxHp++;
        }
      } else if (b.type === "star") {
        tg.sendData(JSON.stringify({ type: "buy_hp", stars: b.stars }));
        alert(`Запрос на покупку HP+1 за ${b.stars}⭐ отправлен!`);
      } else if (b.type === "back") shopOpen = false;
    }
  }
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
