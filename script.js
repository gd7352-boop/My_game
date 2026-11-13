
// THE UNKNOWN PLANET
// Juego 2D sencillo: movimiento, documentos, refugios, criatura y escape.

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const clueCountEl = document.getElementById("clue-count");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const screenEl = document.getElementById("screen");
const screenTitle = document.getElementById("screen-title");
const screenMessage = document.getElementById("screen-message");
const startButton = document.getElementById("start-button");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const TOTAL_CLUES = 5;

const keys = {};
let running = false;
let gameOver = false;
let won = false;
let score = 0;
let lives = 3;
let collected = 0;
let lastTime = 0;
let hitCooldown = 0;
let messageTimer = 0;

const player = { x: 90, y: 90, radius: 13, speed: 205, hidden: false };
const monster = { x: 790, y: 500, radius: 17, speed: 72 };

const walls = [
  { x: 190, y: 0, w: 24, h: 170 },
  { x: 190, y: 245, w: 24, h: 170 },
  { x: 350, y: 100, w: 150, h: 22 },
  { x: 350, y: 100, w: 22, h: 145 },
  { x: 570, y: 0, w: 22, h: 180 },
  { x: 570, y: 250, w: 22, h: 160 },
  { x: 120, y: 450, w: 190, h: 22 },
  { x: 420, y: 390, w: 160, h: 22 },
  { x: 700, y: 300, w: 22, h: 170 },
  { x: 720, y: 470, w: 120, h: 22 }
];

const hideouts = [
  { x: 275, y: 190, r: 27 },
  { x: 650, y: 220, r: 27 },
  { x: 390, y: 510, r: 27 }
];

const clues = [
  { x: 115, y: 300, found: false, text: "Registro de exploración" },
  { x: 300, y: 65, found: false, text: "Nota de emergencia" },
  { x: 465, y: 300, found: false, text: "Informe del laboratorio" },
  { x: 650, y: 535, found: false, text: "Diario de un astronauta" },
  { x: 810, y: 150, found: false, text: "Última transmisión" }
];

const ship = { x: 830, y: 535, radius: 25 };

function updateHud() {
  clueCountEl.textContent = `${collected} / ${TOTAL_CLUES}`;
  scoreEl.textContent = score;
  livesEl.textContent = "♥ ".repeat(lives).trim() || "—";
}

function showScreen(title, message, buttonText) {
  screenTitle.textContent = title;
  screenMessage.textContent = message;
  startButton.textContent = buttonText;
  screenEl.classList.remove("hidden");
}

function hideScreen() {
  screenEl.classList.add("hidden");
}

function resetGame() {
  score = 0;
  lives = 3;
  collected = 0;
  hitCooldown = 0;
  player.x = 90;
  player.y = 90;
  player.hidden = false;
  monster.x = 790;
  monster.y = 500;
  clues.forEach(clue => clue.found = false);
  gameOver = false;
  won = false;
  updateHud();
}

function startGame() {
  resetGame();
  running = true;
  lastTime = performance.now();
  hideScreen();
  requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", startGame);

window.addEventListener("keydown", event => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
  keys[event.key] = true;
});

window.addEventListener("keyup", event => {
  keys[event.key] = false;
});

function circleTouchesRect(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function canMoveTo(x, y) {
  if (x - player.radius < 0 || x + player.radius > WIDTH ||
      y - player.radius < 0 || y + player.radius > HEIGHT) return false;
  return !walls.some(wall => circleTouchesRect(x, y, player.radius, wall));
}

function updatePlayer(dt) {
  let dx = 0;
  let dy = 0;

  if (keys.ArrowLeft) dx -= 1;
  if (keys.ArrowRight) dx += 1;
  if (keys.ArrowUp) dy -= 1;
  if (keys.ArrowDown) dy += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  const nextX = player.x + dx * player.speed * dt;
  if (canMoveTo(nextX, player.y)) player.x = nextX;

  const nextY = player.y + dy * player.speed * dt;
  if (canMoveTo(player.x, nextY)) player.y = nextY;

  player.hidden = hideouts.some(hideout =>
    Math.hypot(player.x - hideout.x, player.y - hideout.y) < hideout.r
  );
}

function updateClues() {
  for (const clue of clues) {
    if (!clue.found && Math.hypot(player.x - clue.x, player.y - clue.y) < 22) {
      clue.found = true;
      collected++;
      score += 20;
      updateHud();
      messageTimer = 1.8;
    }
  }
}

function updateMonster(dt) {
  if (player.hidden) return;

  const dx = player.x - monster.x;
  const dy = player.y - monster.y;
  const distance = Math.hypot(dx, dy);

  if (distance > 1) {
    monster.x += (dx / distance) * monster.speed * dt;
    monster.y += (dy / distance) * monster.speed * dt;
  }

  if (hitCooldown <= 0 && distance < player.radius + monster.radius + 3) {
    lives--;
    hitCooldown = 1.5;
    player.x = 90;
    player.y = 90;
    updateHud();

    if (lives <= 0) {
      endGame(false);
    }
  }
}

function checkEscape() {
  if (collected === TOTAL_CLUES &&
      Math.hypot(player.x - ship.x, player.y - ship.y) < ship.radius + player.radius) {
    endGame(true);
  }
}

function update(dt) {
  if (hitCooldown > 0) hitCooldown -= dt;
  if (messageTimer > 0) messageTimer -= dt;

  updatePlayer(dt);
  updateClues();
  updateMonster(dt);
  checkEscape();
}

function endGame(victory) {
  running = false;
  gameOver = !victory;
  won = victory;

  if (victory) {
    showScreen("¡ESCAPASTE!", `Lograste salir del planeta. Puntuación final: ${score} puntos.`, "JUGAR OTRA VEZ");
  } else {
    showScreen("GAME OVER", `La criatura te encontró. Puntuación final: ${score} puntos.`, "INTENTAR DE NUEVO");
  }
}

function drawBackground() {
  ctx.fillStyle = "#0b1319";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Suelo irregular y pequeñas marcas del terreno.
  for (let i = 0; i < 85; i++) {
    const x = (i * 137) % WIDTH;
    const y = (i * 83) % HEIGHT;
    ctx.fillStyle = i % 3 === 0 ? "rgba(100,130,135,.08)" : "rgba(0,0,0,.13)";
    ctx.beginPath();
    ctx.arc(x, y, (i % 4) + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cuadrícula tenue del mapa.
  ctx.strokeStyle = "rgba(115,208,201,.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
  }
}

function drawWalls() {
  for (const wall of walls) {
    ctx.fillStyle = "#27333a";
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.strokeStyle = "#53636a";
    ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.fillRect(wall.x + 4, wall.y + 4, Math.max(0, wall.w - 8), Math.max(0, wall.h - 8));
  }
}

function drawHideouts() {
  for (const hideout of hideouts) {
    ctx.beginPath();
    ctx.arc(hideout.x, hideout.y, hideout.r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(105,111,158,.17)";
    ctx.fill();
    ctx.strokeStyle = "#777da8";
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#a6acd5";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("REFUGIO", hideout.x, hideout.y + 4);
  }
}

function drawClues() {
  for (const clue of clues) {
    if (clue.found) continue;
    ctx.save();
    ctx.translate(clue.x, clue.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#e4c27b";
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = "#fff0bd";
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
    ctx.fillStyle = "#e4c27b";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("PISTA", clue.x, clue.y - 15);
  }
}

function drawShip() {
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.fillStyle = collected === TOTAL_CLUES ? "#9be7e2" : "#596b75";
  ctx.strokeStyle = collected === TOTAL_CLUES ? "#d5fffb" : "#87949a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(17, 15);
  ctx.lineTo(0, 9);
  ctx.lineTo(-17, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0b151b";
  ctx.beginPath(); ctx.arc(0, -3, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle = collected === TOTAL_CLUES ? "#9be7e2" : "#9aa8ae";
  ctx.font = "12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(collected === TOTAL_CLUES ? "¡ESCAPA!" : "NAVE BLOQUEADA", ship.x, ship.y + 38);
}

function drawMonster() {
  ctx.save();
  ctx.translate(monster.x, monster.y);
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#c85b64";
  ctx.fillStyle = "#9e3f4b";
  ctx.beginPath();
  ctx.arc(0, 0, monster.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#f1d7d7";
  ctx.beginPath();
  ctx.arc(-6, -3, 3, 0, Math.PI * 2);
  ctx.arc(6, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (hitCooldown > 0 && Math.floor(hitCooldown * 10) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }
  ctx.shadowBlur = 14;
  ctx.shadowColor = "#73d0c9";
  ctx.fillStyle = player.hidden ? "#a6acd5" : "#73d0c9";
  ctx.beginPath();
  ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#102126";
  ctx.beginPath();
  ctx.arc(4, -3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLighting() {
  // Oscuridad alrededor del personaje, con un pequeño campo de visión.
  const gradient = ctx.createRadialGradient(player.x, player.y, 55, player.x, player.y, 245);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,.78)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Viñeta en los bordes.
  const vignette = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 180, WIDTH/2, HEIGHT/2, 560);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function drawMessages() {
  if (player.hidden) {
    ctx.fillStyle = "#b9b9e6";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ESTÁS ESCONDIDO", WIDTH / 2, 28);
  } else if (messageTimer > 0) {
    ctx.fillStyle = "#e4c27b";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("DOCUMENTO RECUPERADO", WIDTH / 2, 28);
  }

  if (collected < TOTAL_CLUES) {
    ctx.fillStyle = "#c2cbd0";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Busca los documentos marcados en el mapa.", 18, HEIGHT - 18);
  }
}

function render() {
  drawBackground();
  drawHideouts();
  drawWalls();
  drawClues();
  drawShip();
  drawMonster();
  drawPlayer();
  drawLighting();
  drawMessages();
}

function gameLoop(timestamp) {
  if (!running) return;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.04);
  lastTime = timestamp;
  update(dt);
  render();
  if (running) requestAnimationFrame(gameLoop);
}

// Dibuja el mapa detrás de la pantalla inicial.
render();
updateHud();

