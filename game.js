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

/* ================= PLAYER ================= */
const player = {
  x: WIDTH / 2 - 20,
  y: HEIGHT - 90,
  w: 40,
  h: 40,
  hp: 3,
  targetX: WIDTH / 2 - 20,
  speed: 0.15,
  fireRate: 8,
  fireCooldown: 0
};

let bullets = [];
let enemies = [];

/* ================= BUTTONS ================= */
const buttons = {
  play: { x: 80, y: 280, w: 200, h: 50 },
  shop: { x: 80, y: 350, w: 200, h: 50 }
};

/* ================= INPUT ================= */
canvas.addEventListener("click", e => {
  const r = canvas.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;

  if (gameState === "menu") {
    if (hitBtn(x, y, buttons.play)) startGame();
    if (hitBtn(x, y, buttons.shop)) alert("Магазин будет позже");
  }

  if (gameState === "game" && gameOver) location.reload();
});

canvas.addEventListener("touchmove", e => {
  if (gameState !== "game") return;
  const r = canvas.getBoundingClientRect();
  player.targetX =
    e.touches[0].clientX - r.left - player.w / 2;
});

/* ================= START GAME ================= */
function startGame() {
  gameState = "game";
  gameOver = false;
  player.hp = 3;
  bullets = [];
  enemies = [];
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
        if (e.hp <= 0) enemies.splice(ei, 1);
      }
    });

    if (rectHit(player, e)) {
      enemies.splice(ei, 1);
      player.hp--;
      if (player.hp <= 0) gameOver = true;
    }
  });
}

/* ================= DRAW ================= */
function draw() {
  ctx.fillStyle = "#00ffff";
  ctx.fillRect(player.x, player.y, player.w, player.h);

  ctx.fillStyle = "yellow";
  bullets.forEach(b => ctx.fillRect(b.x, b.y, 4, 10));

  enemies.forEach(e => {
    ctx.fillStyle = "red";
    ctx.fillRect(e.x, e.y, e.w, e.h);

    ctx.fillStyle = "black";
    ctx.fillRect(e.x, e.y - 6, e.w, 4);
    ctx.fillStyle = "lime";
    ctx.fillRect(
      e.x,
      e.y - 6,
      (e.hp / e.maxHp) * e.w,
      4
    );
  });

  ctx.fillStyle = "white";
  ctx.fillText("❤️ ".repeat(player.hp), 10, 20);
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
}

function drawButton(b, text) {
  ctx.fillStyle = "#222";
  ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = "white";
  ctx.strokeRect(b.x, b.y, b.w, b.h);

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(text, b.x + 40, b.y + 32);
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
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}
function hitBtn(x, y, b) {
  return x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;
}

/* ================= START ================= */
loop();
