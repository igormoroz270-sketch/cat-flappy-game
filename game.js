
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

/* ================= PLAYER IMAGE ================= */
const playerImg = new Image();
playerImg.src = "/mnt/data/80e98e5e-cc2d-4184-abbf-15f38a32672cba.png";
let playerImgLoaded = false;
playerImg.onload = () => { playerImgLoaded = true };

/* ================= GAME STATE ================= */
let gameState = "menu";
let gameOver = false;
let shopOpen = false;

/* ================= PLAYER ================= */
const player = {
  x: WIDTH / 2 - 25,
  y: HEIGHT - 90,
  w: 50,
  h: 50,
  hp: 3,
  maxHp: 3,
  targetX: WIDTH / 2 - 25,
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
let upgrades = {
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
      updateGame();
      drawGame();
    } else drawGameOver();
  }

  requestAnimationFrame(loop);
}

/* ================= HELPERS ================= */
function hitBtn(x, y, b) {
  return x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h;
}

/* ================= MENU ================= */
function drawMenu(){
  ctx.fillStyle = "black"; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "white"; ctx.font = "28px Arial"; ctx.textAlign = "center";
  ctx.fillText("🚀 Space Shooter", WIDTH / 2, 200);
  drawButton(buttons.play, "▶ ИГРАТЬ");
  drawButton(buttons.shop, "🛒 МАГАЗИН");
  if(shopOpen) drawShop();
}

function drawButton(b, text){
  ctx.fillStyle = "#222"; ctx.fillRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = "white"; ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = "white"; ctx.font = "20px Arial"; ctx.textAlign = "left";
  ctx.fillText(text, b.x + 20, b.y + 32);
}

/* ================= SHOP ================= */
function drawShop(){
  ctx.fillStyle="rgba(0,0,0,0.95)";
  ctx.fillRect(20, 100, 320, 440);
  ctx.fillStyle="white"; ctx.font="28px Arial"; ctx.textAlign="center";
  ctx.fillText("МАГАЗИН", WIDTH/2, 140);

  let startY = 180;
  ctx.font = "20px Arial"; ctx.textAlign="left";
  let index = 0;
  for(let key in upgrades){
    const upg = upgrades[key];
    const active = savedCoins >= upg.price && upg.level < upg.max;
    ctx.fillStyle = active ? "white" : "gray";
    ctx.fillText(`${key.toUpperCase()} LVL ${upg.level} - ${upg.price}💰`, 50, startY + index*60);
    drawShopButton(200, startY + index*60 - 25, 90, 30, "Купить", active);
    index++;
  }

  drawButton(buttons.back, "⬅ НАЗАД");
}

function drawShopButton(x, y, w, h, text, active){
  ctx.fillStyle = active ? "#222" : "#555";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "white"; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = active ? "white" : "gray";
  ctx.font = "16px Arial"; ctx.textAlign = "center";
  ctx.fillText(text, x + w/2, y + 20);
}

function handleShopClick(x, y){
  let startY = 180;
  let index = 0;
  for(let key in upgrades){
    const upg = upgrades[key];
    const btnX = 200; const btnY = startY + index*60 - 25;
    const btnW = 90; const btnH = 30;
    if(hitBtn(x, y, {x:btnX, y:btnY, w:btnW, h:btnH}) && savedCoins >= upg.price && upg.level < upg.max){
      savedCoins -= upg.price;
      localStorage.setItem("coins", savedCoins);
      upg.level++;
      if(key === "fireRate") player.fireRate = Math.max(2, player.fireRate - 1);
      if(key === "hp") player.maxHp++;
    }
    index++;
  }

  if(hitBtn(x, y, buttons.back)) shopOpen=false;
}

/* ================= GAME OVER ================= */
function drawGameOver(){
  ctx.fillStyle="rgba(0,0,0,0.7)";ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle="white"; ctx.font="28px Arial"; ctx.fillText("GAME OVER",90,300);
  ctx.font="16px Arial"; ctx.fillText("Tap to restart",120,340);
}

/* ================= START LOOP ================= */
loop();

