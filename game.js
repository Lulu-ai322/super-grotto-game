/* Super Grotto Escape — a playable platformer demo built with the
   "Super Grotto Escape" asset pack by Luis Zuno (@ansimuz). */

const TILE = 16;
const GAME_W = 800;
const GAME_H = 480;

const GROUND_TILE = 302; // verified opaque dark stone tile in tileset.png

// Level definitions (difficulty scales enemy speed / count). New creatures appear from L4+.
const LEVELS = [
  { name: "1", speed: 1.0, count: 12, theme: 0x9dffc2 },
  { name: "2", speed: 1.2, count: 16, theme: 0x8fe8e8 },
  { name: "3", speed: 1.4, count: 20, bat: 9, theme: 0xb39dff },
  { name: "4", speed: 1.4, count: 18, demon: 4, theme: 0xffb37a },
  { name: "5", speed: 1.6, count: 22, demon: 5, blood: 3, theme: 0xff8a8a },
  { name: "6", speed: 1.7, count: 24, demon: 6, theme: 0xcf9dff },
  { name: "7", speed: 1.9, count: 26, demon: 5, blood: 5, theme: 0x9fd8ff },
  { name: "8", speed: 2.1, count: 30, demon: 7, blood: 6, theme: 0xffe08a },
];

// Four distinct floating-platform layouts (32px units: [startCol,endCol,row]).
// row is kept within double-jump reach of the ground so every level is completable.
const PLAT_LAYOUTS = [
  [
    [10,14,13],[18,22,11],[26,30,14],[34,38,12],[42,46,13],[50,54,11],[58,62,14],[66,70,12],
    [74,78,13],[82,86,11],[90,94,14],[98,102,12],[106,110,13],[114,118,11],
  ],
  [
    [8,12,13],[16,20,11],[24,27,14],[31,35,12],[39,43,13],[47,51,11],[55,59,14],[63,67,12],
    [71,75,13],[79,83,11],[87,91,14],[95,99,12],[103,107,13],[111,115,11],
  ],
  [
    [12,15,14],[20,23,12],[28,31,11],[36,39,13],[44,47,14],[52,55,12],[60,63,11],[68,71,13],
    [76,79,14],[84,87,12],[92,95,11],[100,103,13],[108,111,14],[114,117,12],
  ],
  [
    [9,13,12],[17,19,14],[23,28,11],[33,36,13],[41,44,14],[49,52,12],[57,61,11],[66,68,13],
    [73,77,14],[82,85,12],[90,93,11],[98,101,13],[106,109,14],[112,116,12],
  ],
];

// Unlocked-level progress (persists across sessions via localStorage)
const SAVE_KEY = "sge_unlocked";
function loadUnlocked() {
  try { const v = parseInt(localStorage.getItem(SAVE_KEY), 10); return (v >= 0 && v < LEVELS.length) ? v : 0; }
  catch (e) { return 0; }
}
function saveUnlocked(n) { try { localStorage.setItem(SAVE_KEY, String(n)); } catch (e) {} }
let UNLOCKED = loadUnlocked();

// Try to lock the device to landscape (Android Chrome; iOS ignores it — the
// rotate overlay in index.html prompts the user instead). Must run from a gesture.
function tryLockLandscape() {
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {}); } catch (e) {}
}

// Try to enter real fullscreen (hides browser chrome on mobile). Must run from a gesture.
function tryFullscreen() {
  try {
    const el = document.documentElement;
    const r = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (r) { const p = r.call(el); if (p && p.catch) p.catch(() => {}); }
  } catch (e) {}
}

// Both together — only meaningful on touch devices.
function enterGameMode() { tryLockLandscape(); tryFullscreen(); }

// Kenney fantasy-UI helpers (only the pieces we actually use: panels)
function makeButton(scene, x, y, w, h, label, cb) {
  const fill = scene.add.image(x, y, "ui-panel").setDisplaySize(w, h);
  const t = scene.add.text(x, y, label, { fontFamily: "monospace", fontSize: "20px", color: "#eafff2" }).setOrigin(0.5);
  const hit = scene.add.rectangle(x, y, w, h, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
  hit.on("pointerover", () => fill.setTint(0xbfe9cf));
  hit.on("pointerout",  () => fill.clearTint());
  hit.on("pointerdown", cb);
  return { fill, t, hit };
}

/* ------------------------------------------------------------------ */
/* Boot: load every asset (frame sizes auto-computed by Phaser).       */
/* ------------------------------------------------------------------ */
class PreloadScene extends Phaser.Scene {
  constructor() { super("preload"); }

  preload() {
    const A = "assets/";

    this.load.spritesheet("p-idle",  A + "player/player-idle.png",  { frameWidth: 32, frameHeight: 38 });
    this.load.spritesheet("p-run",   A + "player/player-run.png",   { frameWidth: 32, frameHeight: 38 });
    this.load.spritesheet("p-jump",  A + "player/player-jump.png",  { frameWidth: 32, frameHeight: 38 });
    this.load.spritesheet("p-duck",  A + "player/player-duck.png",  { frameWidth: 32, frameHeight: 38 });
    this.load.spritesheet("p-shoot", A + "player/player-shoot.png", { frameWidth: 32, frameHeight: 38 });
    this.load.spritesheet("p-hurt",  A + "player/player-hurt.png",  { frameWidth: 32, frameHeight: 38 });
    this.load.spritesheet("p-slide", A + "player/player-slide.png", { frameWidth: 32, frameHeight: 38 });
    this.load.spritesheet("p-ladder",A + "player/player-ladder.png",{ frameWidth: 32, frameHeight: 38 });

    this.load.spritesheet("slime",     A + "enemies/slime.png",         { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("bat",       A + "enemies/bat.png",           { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet("skel-idle", A + "enemies/skeleton-idle.png", { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("skel-walk", A + "enemies/skeleton-walk.png", { frameWidth: 32, frameHeight: 32 });

    // Tileset loaded as a plain image so it can be used by the tilemap.
    this.load.image("tiles", A + "env/tileset.png");
    this.load.image("back",   A + "env/back.png");
    this.load.image("far",    A + "env/far.png");
    this.load.image("middle", A + "env/middle.png");

    this.load.spritesheet("explosion", A + "fx/explosion.png",     { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet("pick",      A + "fx/pick-feedback.png", { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet("bullet-fx", A + "fx/player-shoot.png",  { frameWidth: 16, frameHeight: 16 });

    this.load.image("battery1", A + "props/battery1.png");
    this.load.image("battery2", A + "props/battery2.png");
    this.load.image("gate",     A + "props/gate.png");

    // Kenney fantasy UI (only the pieces we use: solid panels)
    this.load.image("ui-panel",   A + "ui/panel.png");
    this.load.image("ui-panel2",  A + "ui/panel2.png");

    // New creatures (Tiny RPG pack) — 100x100 frames
    this.load.spritesheet("demon-idle",    A + "enemies/demon-idle.png",    { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet("demon-walk",    A + "enemies/demon-walk.png",    { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet("demon-attack",  A + "enemies/demon-attack.png",  { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet("demon-hurt",    A + "enemies/demon-hurt.png",    { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet("demon-death",   A + "enemies/demon-death.png",   { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet("blood-idle",    A + "enemies/blood-idle.png",    { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet("blood-walk",    A + "enemies/blood-walk.png",    { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet("blood-attack",  A + "enemies/blood-attack.png",  { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet("blood-hurt",    A + "enemies/blood-hurt.png",    { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet("blood-death",   A + "enemies/blood-death.png",   { frameWidth: 100, frameHeight: 100 });

    this.load.audio("music", A + "audio/music.ogg");

    // ---- Loading screen UI ----
    // Layered parallax sky
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x070b14).setOrigin(0);
    this.add.tileSprite(0, 0, GAME_W, GAME_H, "back").setOrigin(0).setAlpha(0.5);
    this.add.tileSprite(0, 0, GAME_W, GAME_H, "far").setOrigin(0).setAlpha(0.6);
    this.add.tileSprite(0, GAME_H - 130, GAME_W, 130, "middle").setOrigin(0, 0).setAlpha(0.7);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.16).setOrigin(0); // vignette

    // Glowing halo behind the mascot
    const glow = this.add.image(GAME_W / 2, 250, "battery1").setScale(3).setAlpha(0.12);
    this.tweens.add({ targets: glow, alpha: 0.28, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    // Title with neon glow + subtitle
    this.add.text(GAME_W / 2, 126, "SUPER GROTTO ESCAPE", {
      fontFamily: "monospace", fontSize: "36px", color: "#7CFFB2", stroke: "#0a3a24", strokeThickness: 7,
    }).setOrigin(0.5).setShadow(0, 0, "#1fe07a", 18, true, true);
    this.add.text(GAME_W / 2, 154, "loading the grotto...", { fontFamily: "monospace", fontSize: "12px", color: "#9fb3c8" }).setOrigin(0.5).setAlpha(0.8);

    const mascot = this.add.sprite(GAME_W / 2, 250, "p-idle").setScale(2);
    this.tweens.add({ targets: mascot, y: 236, duration: 600, yoyo: true, repeat: -1, ease: "Sine.inOut" });

    // Progress panel
    this.add.image(GAME_W / 2, 330, "ui-panel").setDisplaySize(392, 54);
    const barBg = this.add.rectangle(GAME_W / 2, 330, 360, 22, 0x101824).setStrokeStyle(2, 0x33415c);
    const barGlow = this.add.rectangle(GAME_W / 2 - 176, 330, 0, 16, 0x7CFFB2, 0.35).setOrigin(0, 0.5);
    const bar = this.add.rectangle(GAME_W / 2 - 176, 330, 0, 12, 0x7CFFB2).setOrigin(0, 0.5);
    const pct = this.add.text(GAME_W / 2, 372, "0%", { fontFamily: "monospace", fontSize: "15px", color: "#cdd9e5" }).setOrigin(0.5);
    const file = this.add.text(GAME_W / 2, 392, "", { fontFamily: "monospace", fontSize: "11px", color: "#6b7a8c" }).setOrigin(0.5).setAlpha(0.8);

    const tips = ["Tip: Double-jump to reach high platforms", "Tip: Shoot enemies before they reach you", "Tip: Collect batteries for extra score", "Tip: Bats fly — aim carefully!"];
    const tip = this.add.text(GAME_W / 2, GAME_H - 32, tips[0], { fontFamily: "monospace", fontSize: "12px", color: "#9fb3c8" }).setOrigin(0.5);

    this.load.on("progress", (p) => {
      bar.width = 352 * p; barGlow.width = 352 * p; pct.setText(Math.floor(p * 100) + "%");
      tip.setText(tips[Math.min(tips.length - 1, Math.floor(p * tips.length))]);
    });
    this.load.on("fileprogress", (f) => file.setText("loading: " + f.key));
    this.load.on("complete", () => {
      bar.width = 352; barGlow.width = 352; pct.setText("100%");
      file.setText("done! entering...");
      this.time.delayedCall(450, () => this.scene.start("menu"));
    });
  }
}

/* ------------------------------------------------------------------ */
/* Main menu.                                                         */
/* ------------------------------------------------------------------ */
class MenuScene extends Phaser.Scene {
  constructor() { super("menu"); }

  create() {
    // Layered parallax background
    const bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, "back").setOrigin(0).setAlpha(0.5);
    const far = this.add.tileSprite(0, 0, GAME_W, GAME_H, "far").setOrigin(0).setAlpha(0.55);
    const mid = this.add.tileSprite(0, GAME_H - 170, GAME_W, 170, "middle").setOrigin(0, 0).setAlpha(0.6);
    this.tweens.addCounter({
      from: 0, to: 1, duration: 26000, repeat: -1,
      onUpdate: (tw) => { const v = tw.getValue() * 240; bg.tilePositionX = v; far.tilePositionX = v * 1.8; mid.tilePositionX = v * 2.6; },
    });
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.14).setOrigin(0); // soft vignette

    // Twinkling dust
    for (let i = 0; i < 14; i++) {
      const d = this.add.circle(20 + Math.random() * (GAME_W - 40), 20 + Math.random() * (GAME_H - 70), 1.5 + Math.random() * 1.5, 0x9fe8c0, 0.4);
      this.tweens.add({ targets: d, alpha: 0.05, y: d.y - 30, duration: 1200 + Math.random() * 1500, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    // Floating decorative batteries
    [120, 700].forEach((x, i) => {
      const b = this.add.image(x, 120 + i * 40, "battery1").setScale(1.4).setAlpha(0.85);
      this.tweens.add({ targets: b, y: b.y - 14, duration: 900 + i * 120, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    });

    // Title with neon glow + subtitle
    const title = this.add.text(GAME_W / 2, 118, "SUPER GROTTO ESCAPE", {
      fontFamily: "monospace", fontSize: "38px", color: "#7CFFB2", stroke: "#0a3a24", strokeThickness: 8,
    }).setOrigin(0.5).setShadow(0, 0, "#1fe07a", 18, true, true).setDepth(2);
    this.tweens.add({ targets: title, scaleX: 1.03, scaleY: 1.03, duration: 950, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.add.text(GAME_W / 2, 160, "an @ansimuz platformer — make it out of the grotto!", { fontFamily: "monospace", fontSize: "12px", color: "#9fb3c8" }).setDepth(2).setOrigin(0.5);

    // Hero character standing on a platform on the left
    if (!this.anims.exists("menu-idle")) this.anims.create({ key: "menu-idle", frames: this.anims.generateFrameNumbers("p-idle", { frames: [0, 1, 2, 3, 4, 5] }), frameRate: 8, repeat: -1 });
    const heroGlow = this.add.image(150, 350, "battery1").setScale(3.2).setAlpha(0.15).setDepth(1);
    this.tweens.add({ targets: heroGlow, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });
    const hero = this.add.sprite(150, 356, "p-idle").setScale(2).play("menu-idle").setDepth(2);
    this.tweens.add({ targets: hero, y: 346, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    this.add.image(150, 394, "ui-panel2").setDisplaySize(130, 14).setAlpha(0.9).setDepth(1); // ground

    // Play button
    makeButton(this, GAME_W / 2, 270, 240, 66, "PLAY", () => { if (this.game.device.input.touch) enterGameMode(); this.scene.start("level"); });

    // Unlock progress
    this.add.text(GAME_W / 2, 325, `Levels unlocked: ${UNLOCKED + 1} / ${LEVELS.length}`, { fontFamily: "monospace", fontSize: "15px", color: "#ffd86b" }).setOrigin(0.5);

    // Controls
    this.add.text(GAME_W / 2, 372, "Move: ← → / A D      Jump: ↑ / W / Space (double jump)", { fontFamily: "monospace", fontSize: "13px", color: "#cdd9e5" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 394, "Shoot: X / J      Duck: ↓      (mobile: on-screen buttons)", { fontFamily: "monospace", fontSize: "13px", color: "#cdd9e5" }).setOrigin(0.5);

    // Blinking prompt
    const prompt = this.add.text(GAME_W / 2, GAME_H - 32, "Press ENTER or SPACE to play", { fontFamily: "monospace", fontSize: "14px", color: "#7CFFB2" }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    this.input.keyboard.once("keydown-ENTER", () => { if (this.game.device.input.touch) enterGameMode(); this.scene.start("level"); });
    this.input.keyboard.once("keydown-SPACE", () => { if (this.game.device.input.touch) enterGameMode(); this.scene.start("level"); });
  }
}

/* ------------------------------------------------------------------ */
/* Level select.                                                      */
/* ------------------------------------------------------------------ */
class LevelScene extends Phaser.Scene {
  constructor() { super("level"); }

  create() {
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0f1a).setOrigin(0);
    this.add.text(GAME_W / 2, 70, "SELECT LEVEL", { fontFamily: "monospace", fontSize: "34px", color: "#7CFFB2" }).setOrigin(0.5);
    this.add.text(GAME_W / 2, 104, "Complete a level to unlock the next", { fontFamily: "monospace", fontSize: "13px", color: "#9fb3c8" }).setOrigin(0.5);

    // 2-column grid so all levels fit on screen
    const colX = [250, 550], startY = 140, rowH = 72, pw = 240, ph = 50;
    LEVELS.forEach((lv, i) => {
      const x = colX[i % 2], y = startY + Math.floor(i / 2) * rowH;
      const locked = i > UNLOCKED;
      const done = i < UNLOCKED;
      this.add.image(x, y, "ui-panel" + (locked ? "2" : "")).setDisplaySize(pw, ph).setTint(locked ? 0x55585f : 0xffffff);
      let label = "LEVEL " + lv.name;
      if (locked) label = "LEVEL " + lv.name + "  [LOCKED]";
      else if (done) label = "LEVEL " + lv.name + "  [CLEARED]";
      this.add.text(x, y, label, {
        fontFamily: "monospace", fontSize: locked ? 14 : 19, color: locked ? "#9aa0aa" : "#e8f0fe",
      }).setOrigin(0.5);

      if (!locked) {
        const hit = this.add.rectangle(x, y, pw, ph, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        hit.on("pointerdown", () => this.scene.start("game", { level: i }));
      }
    });

    const back = this.add.text(40, GAME_H - 36, "← Back", { fontFamily: "monospace", fontSize: "16px", color: "#9fb3c8" }).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("menu"));
  }
}

/* ------------------------------------------------------------------ */
/* Main game scene.                                                   */
/* ------------------------------------------------------------------ */
class GameScene extends Phaser.Scene {
  constructor() { super("game"); }

  init(data) {
    this.levelIndex = (data && data.level) || 0;
    this.cfg = LEVELS[this.levelIndex] || LEVELS[0];
  }

  create() {
    const COLS = 240, ROWS = 32; // 16px tiles -> 3840 x 512 world
    this.levelW = COLS * TILE;
    this.levelH = ROWS * TILE;
    this.groundTop = (ROWS - 2) * TILE;

    this.buildLevel(COLS, ROWS);
    this.buildBackgrounds();
    this.buildPlayer();
    this.createEnemyAnims();
    this.createFxAnims();
    this.buildGroups();
    this.spawnEntities();
    this.buildHud();
    this.bindInput();
    this.touch = { left: false, right: false };
    this.buildTouchControls();
    this.input.addPointer(3); // multitouch: move + jump + shoot at once
    this.input.once("pointerdown", () => { if (this.game.device.input.touch) enterGameMode(); });
    this.startMusic();

    this.physics.world.setBounds(0, 0, this.levelW, this.levelH);

    this.cameras.main.setBounds(0, 0, this.levelW, this.levelH);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(120, 80);

    this.score = 0;
    this.health = 3;
    this.invuln = 0;
    this.gameOver = false;
    this.won = false;
    this.showLevelIntro();
  }

  /* -- Level: a tilemap made of the real tileset (gid 302) -- */
  buildLevel(COLS, ROWS) {
    const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(-1));
    const ground = ROWS - 2;
    for (let x = 0; x < COLS; x++) { grid[ground][x] = GROUND_TILE; grid[ground + 1][x] = GROUND_TILE; }

    // Floating platforms in 32px units -> convert to 16px tile units (varies per level)
    const plats32 = PLAT_LAYOUTS[this.levelIndex % PLAT_LAYOUTS.length];
    this.plats = [];
    for (const [a, b, r] of plats32) {
      const a2 = a * 2, b2 = b * 2, r2 = r * 2;
      for (let x = a2; x <= b2; x++) grid[r2][x] = GROUND_TILE;
      this.plats.push({ x: (a2 + b2) / 2 * TILE, y: (r2 - 1) * TILE });
    }

    const map = this.make.tilemap({ data: grid, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage("tiles", "tiles", TILE, TILE);
    this.solidLayer = map.createLayer(0, tileset, 0, 0);
    this.solidLayer.setCollision(GROUND_TILE);
    this.solidLayer.setDepth(0);

    this.playerStart = { x: 4 * TILE, y: this.groundTop - 48 };
    this.gatePos = { x: this.levelW - 5 * TILE, y: this.groundTop - 32 };
  }

  buildBackgrounds() {
    const theme = this.cfg.theme || 0xffffff;
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x0b0f1a).setOrigin(0).setScrollFactor(0).setDepth(-100).setTint(theme);
    const mk = (key, scroll) => {
      const h = GAME_H;
      const ts = this.add.tileSprite(0, 0, GAME_W, h, key).setOrigin(0, 0).setScrollFactor(0).setDepth(-90).setTint(theme);
      this.cameras.main.on("camerascroll", (cam) => { ts.tilePositionX = cam.scrollX * scroll; });
      return ts;
    };
    mk("back",   0.15).setDepth(-90);
    mk("far",    0.35).setDepth(-85);
    mk("middle", 0.60).setDepth(-80);
  }

  buildPlayer() {
    this.player = this.physics.add.sprite(this.playerStart.x, this.playerStart.y, "p-idle");
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(18, 34).setOffset(7, 4);
    this.player.setDepth(10);
    this.player.facing = 1;
    this.player.jumps = 0;
    this.player.maxJumps = 2;

    this.anims.create({ key: "idle",  frames: this.anims.generateFrameNumbers("p-idle",  { frames: [0,1,2,3,4,5] }), frameRate: 8,  repeat: -1 });
    this.anims.create({ key: "run",   frames: this.anims.generateFrameNumbers("p-run",   { frames: [0,1,2,3,4,5] }), frameRate: 12, repeat: -1 });
    this.anims.create({ key: "jump",  frames: this.anims.generateFrameNumbers("p-jump",  { frames: [0,1] }),         frameRate: 6,  repeat: 0 });
    this.anims.create({ key: "duck",  frames: this.anims.generateFrameNumbers("p-duck",  { frames: [0,1,2] }),       frameRate: 8,  repeat: 0 });
    this.anims.create({ key: "shoot", frames: this.anims.generateFrameNumbers("p-shoot", { frames: [0,1,2] }),       frameRate: 12, repeat: 0 });
    this.anims.create({ key: "hurt",  frames: this.anims.generateFrameNumbers("p-hurt",  { frames: [0,1] }),         frameRate: 6,  repeat: 0 });
    this.anims.create({ key: "slide", frames: this.anims.generateFrameNumbers("p-slide", { frames: [0] }),           frameRate: 1,  repeat: -1 });

    this.physics.add.collider(this.player, this.solidLayer);
  }

  createEnemyAnims() {
    this.anims.create({ key: "slime",     frames: this.anims.generateFrameNumbers("slime",     { frames: [0,1,2,3,4] }), frameRate: 8,  repeat: -1 });
    this.anims.create({ key: "bat",       frames: this.anims.generateFrameNumbers("bat",       { frames: [0,1,2,3,4] }), frameRate: 8,  repeat: -1 });
    this.anims.create({ key: "skel-walk", frames: this.anims.generateFrameNumbers("skel-walk", { frames: [0,1,2,3,4,5,6,7] }), frameRate: 10, repeat: -1 });
    // New creatures (100x100 frames)
    this.anims.create({ key: "demon-idle",   frames: this.anims.generateFrameNumbers("demon-idle",   { frames: [0,1,2,3,4,5] }), frameRate: 8,  repeat: -1 });
    this.anims.create({ key: "demon-walk",   frames: this.anims.generateFrameNumbers("demon-walk",   { frames: [0,1,2,3,4,5,6,7] }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: "demon-attack", frames: this.anims.generateFrameNumbers("demon-attack", { frames: [0,1,2,3,4,5,6] }),   frameRate: 12, repeat: 0 });
    this.anims.create({ key: "demon-death",  frames: this.anims.generateFrameNumbers("demon-death",  { frames: [0,1,2,3] }),         frameRate: 10, repeat: 0 });
    this.anims.create({ key: "blood-idle",   frames: this.anims.generateFrameNumbers("blood-idle",   { frames: [0,1,2,3,4,5] }), frameRate: 8,  repeat: -1 });
    this.anims.create({ key: "blood-walk",   frames: this.anims.generateFrameNumbers("blood-walk",   { frames: [0,1,2,3,4,5,6,7] }), frameRate: 9,  repeat: -1 });
    this.anims.create({ key: "blood-attack", frames: this.anims.generateFrameNumbers("blood-attack", { frames: [0,1,2,3,4,5,6,7] }),   frameRate: 12, repeat: 0 });
    this.anims.create({ key: "blood-death",  frames: this.anims.generateFrameNumbers("blood-death",  { frames: [0,1,2,3] }),         frameRate: 10, repeat: 0 });
  }

  createFxAnims() {
    this.anims.create({ key: "explosion",  frames: this.anims.generateFrameNumbers("explosion",  { frames: [0,1,2,3] }), frameRate: 12, repeat: 0 });
    this.anims.create({ key: "pick",       frames: this.anims.generateFrameNumbers("pick",       { frames: [0,1,2,3,4,5,6] }), frameRate: 14, repeat: 0 });
    this.anims.create({ key: "bullet-fx",  frames: this.anims.generateFrameNumbers("bullet-fx",  { frames: [0,1,2,3] }), frameRate: 16, repeat: -1 });
  }

  buildGroups() {
    this.bullets = this.physics.add.group({ allowGravity: false });
    this.enemies = this.physics.add.group();
    this.batteries = this.physics.add.group({ allowGravity: false });
    // Ground enemies collide with the tilemap; bats fly (Y is force-driven) so skip them.
    this.physics.add.collider(this.enemies, this.solidLayer, null, (e) => e.etype !== "bat", this);
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.touchEnemy, null, this);
    this.physics.add.overlap(this.player, this.batteries, this.collectBattery, null, this);
  }

  spawnEntities() {
    const sp = this.cfg.speed;
    const addSlime = (x, y) => {
      const e = this.enemies.create(x, y, "slime");
      e.body.setSize(26, 26).setOffset(3, 6);
      e.play("slime");
      e.etype = "slime"; e.dir = Math.random() < 0.5 ? -1 : 1; e.speed = 45 * sp;
      e.setCollideWorldBounds(true);
    };
    const addSkel = (x, y) => {
      const e = this.enemies.create(x, y, "skel-walk");
      e.body.setSize(22, 30).setOffset(5, 2);
      e.play("skel-walk");
      e.etype = "skel"; e.dir = Math.random() < 0.5 ? -1 : 1; e.speed = 60 * sp;
      e.setCollideWorldBounds(true);
    };
    const addBat = (x, y) => {
      const e = this.enemies.create(x, y, "bat");
      e.body.setSize(36, 30).setOffset(6, 8);
      e.body.setAllowGravity(false);
      e.play("bat");
      e.etype = "bat"; e.baseY = y; e.t = Math.random() * Math.PI * 2;
      e.dir = Math.random() < 0.5 ? -1 : 1; e.speed = 70 * sp;
    };
    const addDemon = (x, y) => {
      const e = this.enemies.create(x, y, "demon-walk");
      e.setScale(0.9);
      e.body.setSize(50, 72).setOffset(25, 24);
      e.play("demon-walk");
      e.etype = "demon"; e.gfxScale = 0.9; e.attackT = 0; e.dir = Math.random() < 0.5 ? -1 : 1; e.speed = 55 * sp;
      e.setCollideWorldBounds(true);
    };
    const addBlood = (x, y) => {
      const e = this.enemies.create(x, y, "blood-walk");
      e.setScale(1.0);
      e.body.setSize(64, 84).setOffset(18, 14);
      e.play("blood-walk");
      e.etype = "blood"; e.gfxScale = 1.0; e.attackT = 0; e.dir = Math.random() < 0.5 ? -1 : 1; e.speed = 40 * sp;
      e.setCollideWorldBounds(true);
    };

    // Ground enemies spread evenly across the level (within bounds)
    const span = this.levelW - 400;
    for (let i = 0; i < this.cfg.count; i++) {
      const x = 200 + (this.cfg.count > 1 ? i / (this.cfg.count - 1) : 0) * span;
      if (i % 2 === 0) addSlime(x, this.groundTop - 40); else addSkel(x, this.groundTop - 40);
    }
    // Flying bats above platforms
    const batN = this.cfg.bat || 7;
    const batX = [];
    for (let i = 0; i < batN; i++) batX.push(200 + (i / Math.max(1, batN - 1)) * (this.levelW - 400));
    batX.forEach((x) => addBat(x, this.groundTop - 5 * TILE));

    // New creatures (levels 4 & 5)
    if (this.cfg.demon) for (let i = 0; i < this.cfg.demon; i++) addDemon(400 + i * 420, this.groundTop - 60);
    if (this.cfg.blood) for (let i = 0; i < this.cfg.blood; i++) addBlood(620 + i * 380, this.groundTop - 70);

    // Batteries on platforms + a few on the ground
    this.plats.forEach((p) => {
      const b = this.batteries.create(p.x, p.y - 18, "battery1");
      b.body.setSize(14, 18); b.setDepth(5);
      this.tweens.add({ targets: b, y: b.y - 6, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    });
    for (let i = 0; i < 6; i++) {
      const b = this.batteries.create(400 + i * 500, this.groundTop - 40, "battery1");
      b.body.setSize(14, 18); b.setDepth(5);
      this.tweens.add({ targets: b, y: b.y - 6, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
    }

    // Gate (goal)
    this.gate = this.physics.add.staticImage(this.gatePos.x, this.gatePos.y, "gate").setDepth(4);
    this.physics.add.overlap(this.player, this.gate, () => this.win(), null, this);
  }

  buildHud() {
    this.add.image(150, 26, "ui-panel").setDisplaySize(300, 40).setScrollFactor(0).setDepth(99);
    this.hud = this.add.text(16, 12, "", { fontFamily: "monospace", fontSize: "18px", color: "#e8f0fe" })
      .setScrollFactor(0).setDepth(100);
    this.updateHud();
  }

  updateHud() { this.hud.setText(`SCORE ${this.score}   HEALTH ${"♥".repeat(this.health)}`); }

  bindInput() {
    this.keys = this.input.keyboard.addKeys({
      left: "LEFT", right: "RIGHT", up: "UP", down: "DOWN",
      a: "A", d: "D", w: "W", s: "S", space: "SPACE", shoot: "X", shoot2: "J",
    });
  }

  startMusic() {
    this.music = this.sound.add("music", { loop: true, volume: 0.5 });
    this.music.play();
  }

  tryJump() {
    if (this.won || this.gameOver) return;
    const p = this.player;
    if (p.jumps < p.maxJumps) {
      p.setVelocityY(-360); p.jumps++;
      if (p.jumps === 2) this.puff(p.x, p.y + 16); // dust on double-jump
    }
  }

  buildTouchControls() {
    if (!this.game.device.input.touch) return; // on-screen controls only on touch devices
    const mkBtn = (x, y, label, key, onTap) => {
      this.add.image(x, y, "ui-panel").setDisplaySize(76, 76).setScrollFactor(0).setDepth(150);
      this.add.text(x, y, label, { fontFamily: "monospace", fontSize: "26px", color: "#e8f0fe" })
        .setOrigin(0.5).setScrollFactor(0).setDepth(151);
      const hit = this.add.rectangle(x, y, 76, 76, 0xffffff, 0.001).setScrollFactor(0).setDepth(152).setInteractive({ useHandCursor: true });
      if (key) {
        hit.on("pointerdown", () => { this.touch[key] = true; });
        hit.on("pointerup",   () => { this.touch[key] = false; });
        hit.on("pointerout",  () => { this.touch[key] = false; });
      }
      if (onTap) hit.on("pointerdown", onTap);
    };
    // Left side: move
    mkBtn(70,  GAME_H - 70, "◀", "left");
    mkBtn(160, GAME_H - 70, "▶", "right");
    // Right side: jump + shoot
    mkBtn(GAME_W - 160, GAME_H - 70, "⤒", null, () => this.tryJump());
    mkBtn(GAME_W - 70,  GAME_H - 70, "✸", null, () => this.shoot());
  }

  /* ------------------------- update loop ------------------------- */
  update(time, delta) {
    if (this.gameOver || this.won) return;
    const k = this.keys;
    const p = this.player;
    const onGround = p.body.blocked.down || p.body.touching.down;
    if (onGround) p.jumps = 0;

    const left = k.left.isDown || k.a.isDown || this.touch.left;
    const right = k.right.isDown || k.d.isDown || this.touch.right;
    const duck = k.down.isDown || k.s.isDown;

    let vx = 0;
    if (left)  { vx = -170; p.facing = -1; }
    if (right) { vx =  170; p.facing =  1; }
    p.setVelocityX(vx);
    if (vx !== 0) p.setFlipX(p.facing < 0);

    const jumpPressed =
      Phaser.Input.Keyboard.JustDown(k.up) || Phaser.Input.Keyboard.JustDown(k.w) || Phaser.Input.Keyboard.JustDown(k.space);
    if (jumpPressed) this.tryJump();

    if (Phaser.Input.Keyboard.JustDown(k.shoot) || Phaser.Input.Keyboard.JustDown(k.shoot2)) this.shoot();

    // Invulnerability blink
    if (this.invuln > 0) {
      this.invuln -= delta;
      p.setAlpha(Math.floor(time / 80) % 2 ? 0.35 : 1);
      if (this.invuln <= 0) p.setAlpha(1);
    } else if (!p.anims.isPlaying || (p.anims.currentAnim.key !== "shoot" && p.anims.currentAnim.key !== "hurt")) {
      if (duck && onGround)      p.play("duck", true);
      else if (!onGround)        p.play("jump", true);
      else if (vx !== 0)         p.play("run", true);
      else                       p.play("idle", true);
    }

    // Enemy AI
    this.enemies.children.iterate((e) => {
      if (!e || !e.active) return;
      if (e.etype === "slime" || e.etype === "skel") {
        e.setVelocityX(e.dir * e.speed);
        e.setFlipX(e.dir < 0);
        if (e.body.blocked.left)  e.dir = 1;
        if (e.body.blocked.right) e.dir = -1;
      } else if (e.etype === "demon" || e.etype === "blood") {
        const base = e.etype;
        if (e.attackT > 0) {
          e.attackT -= delta;
          e.setVelocityX(0);
          if (e.attackT <= 0) e.play(base + "-walk", true);
        } else {
          const near = this.player && Math.abs(this.player.x - e.x) < 90 && Math.abs(this.player.y - e.y) < 70;
          if (near) {
            e.dir = this.player.x < e.x ? -1 : 1;
            e.setFlipX(e.dir < 0);
            e.setVelocityX(0);
            e.play(base + "-attack", true);
            e.attackT = 600 + Math.random() * 250;
          } else {
            e.setVelocityX(e.dir * e.speed);
            e.setFlipX(e.dir < 0);
            if (e.body.blocked.left)  e.dir = 1;
            if (e.body.blocked.right) e.dir = -1;
          }
        }
      } else if (e.etype === "bat") {
        e.t += delta / 350;
        e.setVelocityX(e.dir * e.speed);
        e.y = e.baseY + Math.sin(e.t) * 40;
        e.setFlipX(e.dir > 0);
        if (e.x < 40 || e.x > this.levelW - 40) e.dir *= -1;
      }
    });

    // Cull stray bullets
    this.bullets.children.iterate((b) => {
      if (b && b.active && (b.x < 0 || b.x > this.levelW)) b.destroy();
    });

    if (this.invuln <= 0 && p.y > this.levelH + 60) this.hurtPlayer(true);
  }

  shoot() {
    if (this.won || this.gameOver) return;
    const p = this.player;
    const b = this.bullets.create(p.x + p.facing * 14, p.y - 2, "bullet-fx");
    b.body.setAllowGravity(false);
    b.setVelocityX(p.facing * 420);
    b.setFlipX(p.facing < 0);
    b.play("bullet-fx");
    b.setDepth(9);
    this.time.delayedCall(1500, () => { if (b.active) b.destroy(); });
    if (p.anims.currentAnim?.key !== "shoot" || !p.anims.isPlaying) p.play("shoot");
  }

  hitEnemy(bullet, enemy) {
    bullet.destroy();
    const ex = enemy.x, ey = enemy.y, type = enemy.etype;
    const flip = enemy.flipX, sc = enemy.gfxScale || 1;
    enemy.destroy();
    this.score += 100;
    this.updateHud();
    if (type === "demon" || type === "blood") {
      enemy.destroy();
      const d = this.add.sprite(ex, ey, type + "-death").setDepth(20).setScale(sc).setFlipX(flip).play(type + "-death");
      this.time.delayedCall(420, () => d.destroy());
    } else {
      enemy.active = false;
      enemy.body.enable = false;
      enemy.setDepth(20);
      this.tweens.add({ targets: enemy, scaleY: 0.2, alpha: 0, duration: 320, ease: "Quad.easeIn", onComplete: () => enemy.destroy() });
    }
    this.floatScore(ex, ey - 20, 100);
  }

  touchEnemy(player, enemy) {
    if (this.invuln > 0 || this.gameOver) return;
    this.hurtPlayer(false, enemy);
  }

  hurtPlayer(fell, enemy) {
    if (this.invuln > 0) return;
    this.health -= 1;
    this.updateHud();
    this.player.play("hurt");
    this.invuln = 1200;
    this.cameras.main.shake(160, 0.012);
    if (this.health <= 0) return this.startDeath();
    const dir = enemy ? (this.player.x < enemy.x ? -1 : 1) : -this.player.facing;
    this.player.setVelocity(dir * 200, -220);
  }

  startDeath() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.music.stop();
    this.cameras.main.shake(240, 0.02);
    const p = this.player;
    p.setVelocity(-p.facing * 120, -320);
    p.play("hurt");
    const pop = this.add.sprite(p.x, p.y, "explosion").setDepth(20).play("explosion");
    this.time.delayedCall(360, () => pop.destroy());
    this.tweens.add({ targets: p, alpha: 0, delay: 650, duration: 450 });
    this.time.delayedCall(1150, () => this.finishLose());
  }

  collectBattery(player, b) {
    b.destroy();
    this.score += 50;
    this.updateHud();
    this.floatScore(b.x, b.y - 16, 50);
    const fx = this.add.sprite(b.x, b.y, "pick").play("pick").setDepth(20);
    this.time.delayedCall(420, () => fx.destroy());
  }

  floatScore(x, y, amount) {
    const t = this.add.text(x, y, "+" + amount, { fontFamily: "monospace", fontSize: "16px", color: "#ffd86b" }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: t, y: y - 28, alpha: 0, duration: 700, ease: "Cubic.out", onComplete: () => t.destroy() });
  }

  puff(x, y) {
    const d = this.add.sprite(x, y, "explosion").setScale(0.6).setDepth(15).play("explosion");
    this.time.delayedCall(300, () => d.destroy());
  }

  showLevelIntro() {
    const t = this.add.text(GAME_W / 2, GAME_H / 2 - 40, "LEVEL " + this.cfg.name, {
      fontFamily: "monospace", fontSize: "48px", color: "#7CFFB2", stroke: "#0a3a24", strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(180);
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 600, onComplete: () => t.destroy() });
  }

  win() {
    if (this.won) return;
    this.won = true;
    this.physics.pause();
    this.music.stop();
    this.cameras.main.flash(280, 90, 255, 170);

    const next = this.levelIndex + 1;
    if (next < LEVELS.length && next > UNLOCKED) { UNLOCKED = next; saveUnlocked(UNLOCKED); }

    let sub = `Score ${this.score}   —   R: Replay   M: Menu`;
    if (next < LEVELS.length) sub = `Score ${this.score}   —   N: Next Level   R: Replay   M: Menu`;
    else sub = `Score ${this.score}   —   ALL LEVELS CLEARED!   R: Replay   M: Menu`;

    this.showBanner("YOU ESCAPED!", "#7CFFB2", sub);
    this.input.keyboard.once("keydown-R", () => this.scene.start("game", { level: this.levelIndex }));
    this.input.keyboard.once("keydown-M", () => this.scene.start("menu"));
    if (next < LEVELS.length) this.input.keyboard.once("keydown-N", () => this.scene.start("game", { level: next }));
  }

  finishLose() {
    this.physics.pause();
    this.showBanner("GAME OVER", "#ff6b6b", "R: Retry   M: Menu");
    this.input.keyboard.once("keydown-R", () => this.scene.start("game", { level: this.levelIndex }));
    this.input.keyboard.once("keydown-M", () => this.scene.start("menu"));
  }

  showBanner(title, color, sub) {
    this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.6).setScrollFactor(0).setDepth(200);
    this.add.image(GAME_W / 2, GAME_H / 2, "ui-panel2").setDisplaySize(580, 200).setScrollFactor(0).setDepth(201);
    this.add.text(GAME_W / 2, GAME_H / 2 - 40, title, { fontFamily: "monospace", fontSize: "40px", color }).setOrigin(0.5).setScrollFactor(0).setDepth(202);
    this.add.text(GAME_W / 2, GAME_H / 2 + 28, sub, { fontFamily: "monospace", fontSize: "16px", color: "#e8f0fe" }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

    // Tappable buttons (so the game isn't a dead-end on touch devices)
    const btns = [];
    const next = this.levelIndex + 1;
    const go = (cb) => () => { if (this.game.device.input.touch) enterGameMode(); cb(); };
    if (next < LEVELS.length) btns.push(["N: Next", go(() => this.scene.start("game", { level: next }))]);
    btns.push(["R: Replay", go(() => this.scene.start("game", { level: this.levelIndex }))]);
    btns.push(["M: Menu", go(() => this.scene.start("menu"))]);
    btns.forEach(([label, cb], idx) => {
      const x = GAME_W / 2 + (idx - (btns.length - 1) / 2) * 165;
      const t = this.add.text(x, GAME_H / 2 + 72, label, {
        fontFamily: "monospace", fontSize: "17px", color: "#7CFFB2", backgroundColor: "#16263a", padding: { x: 12, y: 6 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(203).setInteractive({ useHandCursor: true });
      t.on("pointerdown", cb);
    });
  }
}

const config = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: "game",
  pixelArt: true,
  backgroundColor: "#0b0f1a",
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: "arcade", arcade: { gravity: { y: 900 }, debug: false } },
  scene: [PreloadScene, MenuScene, LevelScene, GameScene],
};

new Phaser.Game(config);
