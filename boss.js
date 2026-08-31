/* ------------------------------------------------------------------ */
/* Minotaur boss — separate module (loaded after game.js).            */
/* The whole boss fight lives here: assets, AI, HP bar, defeat.        */
/* ------------------------------------------------------------------ */

(function () {
  const BOSS = {
    scale: 0.55,
    hp: 30,
    speed: 65,            // walk (chase) speed
    meleeRange: 130,      // horizontal distance at which the boss strikes
    attackCooldown: 520,  // ms between swings
    strikeRange: 160,     // far enough to still land on the player mid-swing
    hitBonus: 100,
    killBonus: 1000,
  };

  // Load every minotaur sprite + HP bar UI (called from PreloadScene)
  PreloadScene.prototype.preloadBoss = function () {
    const A = "assets/";
    for (let i = 1; i <= 16; i++) this.load.image("mino-idle-" + i, A + "enemies/mino-idle-" + i + ".png");
    for (let i = 1; i <= 12; i++) this.load.image("mino-walk-" + i, A + "enemies/mino-walk-" + i + ".png");
    for (let i = 1; i <= 16; i++) this.load.image("mino-atk-" + i,  A + "enemies/mino-atk-" + i + ".png");
    this.load.image("boss-hp-under",    A + "ui/boss-hp-under.png");
    this.load.image("boss-hp-progress", A + "ui/boss-hp-progress.png");
    this.load.image("boss-hp-over",     A + "ui/boss-hp-over.png");
  };

  // Build the three minotaur animations (called from GameScene)
  GameScene.prototype.createBossAnims = function () {
    if (isFortLevel(this.levelIndex)) return this.createGolluxAnims();
    const seq = (n, k) => Array.from({ length: n }, (_, i) => ({ key: k + (i + 1) }));
    this.anims.create({ key: "mino-idle", frames: seq(16, "mino-idle-"), frameRate: 6,  repeat: -1 });
    this.anims.create({ key: "mino-walk", frames: seq(12, "mino-walk-"), frameRate: 7,  repeat: -1 });
    this.anims.create({ key: "mino-atk",  frames: seq(16, "mino-atk-"),  frameRate: 12, repeat: 0 });
  };

  // Spawn the boss in its arena
  GameScene.prototype.spawnBoss = function () {
    if (isFortLevel(this.levelIndex)) return this.spawnGollux();
    const boss = this.enemies.create(this.levelW - 8 * TILE, this.groundTop - 70, "mino-idle-1");
    boss.setScale(BOSS.scale);
    boss.body.setSize(150, 130).setOffset(69, 26);
    boss.setCollideWorldBounds(true);
    boss.etype = "boss";
    boss.dir = -1;
    boss.speed = BOSS.speed;
    boss.bossMax = BOSS.hp;
    boss.bossHp = BOSS.hp;
    boss.attackT = 0;
    boss.setDepth(12);
    this.boss = boss;
    this.createBossAnims();
    boss.play("mino-walk");

    // Boss level has no escape gate — defeat the minotaur to win
    this.maxScore = BOSS.hp * BOSS.hitBonus + BOSS.killBonus;
    this.defeatedBoss = false;
    this.buildBossHud();
  };

  /* Boss AI: always chase the player on foot; only swing when close */
  GameScene.prototype.updateBoss = function (e, delta) {
    if (e.bossKind === "gollux") return this.updateGollux(e, delta);
    const p = this.player;
    if (this.defeatedBoss || this.gameOver || this.won || !p) { e.setVelocityX(0); return; }

    const distX = p.x - e.x;
    const groundedNear = Math.abs(p.y - e.y) < 150;

    if (e.attackT > 0) {
      // mid-swing: stand still, deliver the strike once it connects
      e.attackT -= delta;
      e.setVelocityX(0);
      if (e.attackT <= 0) e.play("mino-walk", true);
      return;
    }

    if (Math.abs(distX) < BOSS.meleeRange && groundedNear) {
      // in range -> turn toward player and swing
      e.dir = distX < 0 ? -1 : 1;
      e.setFlipX(e.dir < 0);
      e.setVelocityX(0);
      e.play("mino-atk", true);
      e.attackT = BOSS.attackCooldown + Math.random() * 220;
      this.bossStrike(e, distX);
      return;
    }

    // out of range -> hunt the player across the whole arena
    e.dir = distX < 0 ? -1 : 1;
    e.setFlipX(e.dir < 0);
    e.setVelocityX(e.dir * e.speed);
    if (e.body.blocked.left || e.body.blocked.right) e.setVelocityX(0);
    if (Math.abs(e.body.velocity.x) > 1) {
      if (e.anims.currentAnim.key !== "mino-walk") e.play("mino-walk", true);
    } else if (e.anims.currentAnim.key !== "mino-idle") {
      e.play("mino-idle");
    }
  };

  // Melee strike that actually hurts the player
  GameScene.prototype.bossStrike = function (e, distX) {
    const p = this.player;
    if (!p || this.invuln > 0 || this.gameOver || this.won) return;
    if (Math.abs(p.x - e.x) < BOSS.strikeRange && Math.abs(p.y - e.y) < 150) {
      this.hurtPlayer(false, e);
    }
  };

  // Boss HP bar HUD (top-center, using the mino HP UI frames)
  GameScene.prototype.buildBossHud = function () {
    const s = 1.8;
    const cx = GAME_W / 2, cy = 38;
    this.add.image(cx, cy, "boss-hp-under").setScrollFactor(0).setDepth(150).setScale(s);
    // Inner fill area (from boss-hp-under.png 160x64: bar spans x8..152, y23..32)
    const uw = 160 * s, uh = 64 * s;
    this.bossFillW = (152 - 8) * s;
    this.bossFillH = (32 - 23) * s;
    const fx = cx - uw / 2 + 8 * s;
    const fy = cy - uh / 2 + (23 + (32 - 23) / 2) * s;
    this.bossFill = this.add.rectangle(fx, fy, this.bossFillW, this.bossFillH, 0x6b3ff0)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(151);
    this.add.image(cx, cy, "boss-hp-progress").setScrollFactor(0).setDepth(151).setScale(s);
    this.add.image(cx, cy, "boss-hp-over").setScrollFactor(0).setDepth(152).setScale(s).setAlpha(0.9);
    this.bossFill.setAlpha(0.35);
    this.updateBossHud();
  };

  GameScene.prototype.updateBossHud = function () {
    const r = this.boss ? Phaser.Math.Clamp(this.boss.bossHp / this.boss.bossMax, 0, 1) : 1;
    if (this.bossFill) this.bossFill.setSize(this.bossFillW * Math.max(0.001, r), this.bossFillH);
  };

  // Called from GameScene#hitEnemy when a bullet lands on the boss
  GameScene.prototype.bossHit = function (enemy, ex, ey) {
    if (enemy.bossKind === "gollux") return this.golluxHit(enemy, ex, ey);
    enemy.bossHp -= 1;
    this.updateBossHud();
    this.floatScore(ex, ey - 20, BOSS.hitBonus);
    enemy.setVelocity(enemy.dir > 0 ? -120 : 120, -50);
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(90, () => { if (enemy.active) enemy.clearTint(); });
    if (enemy.bossHp <= 0) this.defeatBoss(enemy);
  };

  GameScene.prototype.defeatBoss = function (boss) {
    if (this.defeatedBoss) return;
    this.defeatedBoss = true;
    boss.destroy();
    this.score += BOSS.killBonus;
    this.updateHud();
    this.cameras.main.shake(260, 0.015);
    for (let i = 0; i < 5; i++) {
      const d = this.add.sprite(boss.x, boss.y - 30 + i * 22, "explosion")
        .setDepth(20).setScale(1.4 + i * 0.3).play("explosion");
      this.time.delayedCall(360, () => d.destroy());
    }
    this.floatScore(boss.x, boss.y - 70, BOSS.killBonus);
    this.time.delayedCall(650, () => this.win());
  };
})();
