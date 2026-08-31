/* ------------------------------------------------------------------ */
/* Gollux — Fort of Illusion final boss (level 16).                    */
/* Uses 128x128 spritesheets loaded directly. Attacks are ranged       */
/* (energy projectiles) plus a close slam, with an occasional heal.     */
/* ------------------------------------------------------------------ */

(function () {
  const GOLLUX = {
    scale: 0.5,
    hp: 40,
    speed: 62,            // glide (chase) speed
    meleeRange: 120,      // close enough to slam
    midRange: 420,        // within this horizontal band it uses ranged shots
    slamRange: 150,       // damage radius when slamming
    atkCooldown: 880,     // ms between attacks
    shotSpeed: 320,
    healAmount: 3,
    healBonus: 150,
    hitBonus: 100,
    killBonus: 1500,
  };

  PreloadScene.prototype.preloadGollux = function () {
    const A = "assets/boss/";
    this.load.spritesheet("gollux-idle",    A + "gollux_idle.png",    { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("gollux-move",    A + "gollux_move.png",    { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("gollux-atkA",    A + "gollux_attack_A.png",{ frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("gollux-atkB",    A + "gollux_attack_B.png",{ frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("gollux-heal",    A + "gollux_healing.png",{ frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet("gollux-hit",     A + "gollux_hit.png",     { frameWidth: 128, frameHeight: 128 });
  };

  // Subsample to a slim set of key frames for snappy attacks
  const pick = (n, total) => Array.from({ length: n }, (_, i) => Math.floor(i * (total - 1) / Math.max(1, n - 1)));

  GameScene.prototype.createGolluxAnims = function () {
    this.anims.create({ key: "gollux-idle", frames: this.anims.generateFrameNumbers("gollux-idle", { frames: [0,1,2,3,4] }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: "gollux-move", frames: this.anims.generateFrameNumbers("gollux-move", { frames: pick(16, 24) }), frameRate: 9, repeat: -1 });
    this.anims.create({ key: "gollux-atkA", frames: this.anims.generateFrameNumbers("gollux-atkA", { frames: pick(18, 51) }), frameRate: 14, repeat: 0 });
    this.anims.create({ key: "gollux-atkB", frames: this.anims.generateFrameNumbers("gollux-atkB", { frames: pick(18, 57) }), frameRate: 14, repeat: 0 });
    this.anims.create({ key: "gollux-heal", frames: this.anims.generateFrameNumbers("gollux-heal", { frames: pick(20, 75) }), frameRate: 8, repeat: 0 });
    this.anims.create({ key: "gollux-hit",  frames: this.anims.generateFrameNumbers("gollux-hit",  { frames: [0,1,2,3,4] }), frameRate: 14, repeat: 0 });
  };

  GameScene.prototype.spawnGollux = function () {
    // Projectile group for the boss (created once per gollux fight)
    if (!this.enemyShots) {
      this.enemyShots = this.physics.add.group({ allowGravity: false });
      this.physics.add.overlap(this.player, this.enemyShots, () => this.hurtPlayer(false), null, this);
    }

    const boss = this.enemies.create(this.levelW - 9 * TILE, this.groundTop - 90, "gollux-idle");
    boss.setScale(GOLLUX.scale);
    boss.body.setSize(64, 90).setOffset(32, 30);
    boss.setCollideWorldBounds(true);
    boss.etype = "boss";
    boss.bossKind = "gollux";
    boss.dir = -1;
    boss.speed = GOLLUX.speed;
    boss.bossMax = GOLLUX.hp;
    boss.bossHp = GOLLUX.hp;
    boss.atkT = 0;
    boss.lastHeal = 0;
    boss.setDepth(12);
    this.boss = boss;
    this.createGolluxAnims();
    boss.play("gollux-move");

    this.maxScore = GOLLUX.hp * GOLLUX.hitBonus + GOLLUX.killBonus;
    this.defeatedBoss = false;
    this.buildBossHud();
  };

  GameScene.prototype.updateGollux = function (e, delta) {
    const p = this.player;
    if (this.defeatedBoss || this.gameOver || this.won || !p) { e.setVelocityX(0); return; }

    const t = this.time.now;
    const distX = p.x - e.x;
    const dx = Math.abs(distX);

    // Facing
    const face = distX < 0 ? -1 : 1;
    if (e.atkT <= 0) { e.dir = face; e.setFlipX(e.dir < 0); }

    // Currently animating an attack / heal — hold still
    if (e.atkT > 0) {
      e.atkT -= delta;
      e.setVelocityX(0);
      if (e.atkT <= 0) {
        const cur = e.anims.currentAnim && e.anims.currentAnim.key;
        if (cur === "gollux-atkA" || cur === "gollux-atkB") e.play("gollux-move", true);
      }
      return;
    }

    // Occasional heal when far away and enough time passed
    if (e.bossHp < e.bossMax && dx > 420 && t - e.lastHeal > 6000) {
      e.lastHeal = t;
      e.play("gollux-heal", true);
      e.atkT = 1400;
      const healed = Math.min(GOLLUX.healAmount, e.bossMax - e.bossHp);
      e.bossHp += healed;
      this.updateBossHud();
      this.floatScore(e.x, e.y - 70, GOLLUX.healBonus);
      this.time.delayedCall(600, () => { if (e.active) e.play("gollux-move", true); });
      return;
    }

    if (dx < GOLLUX.meleeRange && Math.abs(p.y - e.y) < 150) {
      // Close -> slam (melee)
      e.setVelocityX(0);
      e.play("gollux-atkB", true);
      e.atkT = GOLLUX.atkCooldown * 0.9 + Math.random() * 200;
      this.time.delayedCall(380, () => {
        if (e.active && !this.defeatedBoss && Math.abs(this.player.x - e.x) < GOLLUX.slamRange && Math.abs(this.player.y - e.y) < 150) {
          this.hurtPlayer(false, e);
        }
      });
      return;
    }

    if (dx < GOLLUX.midRange && Math.abs(p.y - e.y) < 260) {
      // Mid range -> ranged salvo (attack A)
      e.setVelocityX(0);
      e.play("gollux-atkA", true);
      e.atkT = GOLLUX.atkCooldown + Math.random() * 260;
      const n = 3;
      for (let i = 0; i < n; i++) {
        this.time.delayedCall(i * 260, () => { if (e.active && !this.defeatedBoss) this.fireGolluxShot(e); });
      }
      return;
    }

    // Far -> glide toward the player
    e.setVelocityX(e.dir * e.speed);
    if (e.body.blocked.left || e.body.blocked.right) e.setVelocityX(0);
    const cur = e.anims.currentAnim && e.anims.currentAnim.key;
    if (Math.abs(e.body.velocity.x) > 1) {
      if (cur !== "gollux-move") e.play("gollux-move", true);
    } else if (cur !== "gollux-idle") {
      e.play("gollux-idle");
    }
  };

  GameScene.prototype.fireGolluxShot = function (e) {
    const p = this.player;
    if (!p || this.defeatedBoss || this.gameOver || this.won) return;
    const sp = this.enemyShots.create(e.x, e.y - 40, "bullet-fx");
    sp.body.setAllowGravity(false);
    sp.setScale(2.2).setTintFill(0xb98bff);
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    sp.setVelocity(Math.cos(ang) * GOLLUX.shotSpeed, Math.sin(ang) * GOLLUX.shotSpeed);
    sp.play("bullet-fx");
    sp.setDepth(9);
    this.time.delayedCall(2200, () => { if (sp.active) sp.destroy(); });
  };

  // Damage (dispatched from boss.js#bossHit)
  GameScene.prototype.golluxHit = function (enemy, ex, ey) {
    enemy.bossHp -= 1;
    this.updateBossHud();
    this.floatScore(ex, ey - 20, GOLLUX.hitBonus);
    enemy.play("gollux-hit", true);
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(160, () => { if (enemy.active) { enemy.clearTint(); if (enemy.atkT <= 0) enemy.play("gollux-move", true); } });
    if (enemy.bossHp <= 0) this.defeatGollux(enemy);
  };

  GameScene.prototype.defeatGollux = function (boss) {
    if (this.defeatedBoss) return;
    this.defeatedBoss = true;
    this.enemyShots && this.enemyShots.clear(true, true);
    boss.destroy();
    this.score += GOLLUX.killBonus;
    this.updateHud();
    this.cameras.main.shake(300, 0.02);
    for (let i = 0; i < 7; i++) {
      const d = this.add.sprite(boss.x, boss.y - 40 + i * 24, "explosion")
        .setDepth(20).setScale(1.5 + i * 0.35).play("explosion");
      this.time.delayedCall(360, () => d.destroy());
    }
    this.floatScore(boss.x, boss.y - 80, GOLLUX.killBonus);
    this.time.delayedCall(750, () => this.win());
  };
})();
