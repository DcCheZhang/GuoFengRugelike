import { PlayerUnit, EnemyUnit, BattleFX, BattlePlayerUnit, BattleEnemyUnit, UnitTier, EnemyClass } from '@/types';
import { GC } from '@/data/constants';
import { GS } from '@/state/GameState';
import { EventBus, GameEvent } from '@/engine/EventBus';
import { calcDmg, findWeakestEnemy, findNearestEnemies, countFamily } from '@/engine/combat';
import { R } from '@/utils/random';
import { createUnit } from '@/engine/synthesis';

export const BE = {
  pu: [] as BattlePlayerUnit[],
  eu: [] as BattleEnemyUnit[],
  running: false,
  af: 0,
  fx: [] as BattleFX[],
  atkLines: [] as BattleFX[],
  bt: 0,
  over: false,
  res: null as string | null,
  lt: 0,
  accumulator: 0,
  timeoutWarned: false,
  _28stacks: 0,
  _28timer: 0,

  init(pu: PlayerUnit[], eu: EnemyUnit[]) {
    this.pu = [];
    this.eu = [];
    this.timeoutWarned = false;
    this.fx = [];
    this.atkLines = [];
    this.bt = 0;
    this.over = false;
    this.res = null;
    this._28stacks = 0;
    this._28timer = 0;

    const ch = GC.CH;
    const typeOrder: Record<string, number> = {
      tank: 0, warrior: 1, assassin: 2, mage: 3,
      summoner: 4, control: 5, support: 6,
    };
    const sortedPu = [...pu].sort(
      (a, b) => (typeOrder[a.tp] ?? 3) - (typeOrder[b.tp] ?? 3)
    );

    for (let i = 0; i < sortedPu.length; i++) {
      const src = sortedPu[i];
      const u: BattlePlayerUnit = {
        ...src,
        hp: src.hp,
        maxHp: src.maxHp,
        bx: 60 + R.i(0, 30),
        by: Math.max(20, Math.min(ch - 20, 40 + (i / (sortedPu.length || 1)) * (ch - 80) + R.i(-15, 15))),
        acd: 0, tgt: null, dd: 0, dt: 0, hd: 0, kills: 0, alive: true,
        vx: 0, vy: 0, walkAngle: Math.random() * Math.PI * 2,
        idleTimer: 0, idleDx: 0, idleDy: 0, isPlayer: true, _deathT: 0,
      };
      this.pu.push(u);
    }

    for (let i = 0; i < eu.length; i++) {
      const src = eu[i];
      const u: BattleEnemyUnit = {
        ...src,
        bx: GC.CW - 60 - R.i(0, 30),
        by: Math.max(20, Math.min(ch - 20, 40 + (i / (eu.length || 1)) * (ch - 80) + R.i(-15, 15))),
        acd: 0, tgt: null, dd: 0, dt: 0, hd: 0, kills: 0, alive: true,
        vx: 0, vy: 0, walkAngle: Math.random() * Math.PI * 2,
        idleTimer: 0, idleDx: 0, idleDy: 0, isPlayer: false, _deathT: 0,
      };
      if (src.ct === EnemyClass.BOSS) {
        u.bossSize = 60;
        u.bossHpW = 60;
      }
      this.eu.push(u);
    }
  },

  start() {
    this.running = true;
    this.lt = performance.now();
    this.af = requestAnimationFrame(() => this.loop());
  },

  stop() {
    this.running = false;
    if (this.af) cancelAnimationFrame(this.af);
  },

  loop() {
    if (!this.running) return;
    const now = performance.now();
    let frameDt = (now - this.lt) / 1000;
    this.lt = now;
    if (frameDt > 0.1) frameDt = 0.1;

    this.accumulator += frameDt * GS.bspeed;
    const tick = 1 / GC.FIXED_TICK;
    while (this.accumulator >= tick) {
      if (!GS.bpaused && !this.over) this.update(tick);
      this.accumulator -= tick;
    }

    this.render();
    this.af = requestAnimationFrame(() => this.loop());
  },

  update(dt: number) {
    this.bt += dt;

    if (this.bt > 600 && !this.timeoutWarned && !this.over) {
      this.timeoutWarned = true;
      EventBus.emit(GameEvent.TOAST, { msg: '战斗已超过10分钟，请考虑调整策略！', dur: 5000 });
    }

    for (const su of this.pu) {
      if (su.slowUntil && this.bt >= su.slowUntil) {
        su.slowUntil = 0;
        if (su.origMs) { su.moveSpeed = su.origMs; su.origMs = 0; }
      }
    }

    this.checkArtPerFrame(dt);

    for (const u of [...this.pu, ...this.eu]) {
      if (!u.alive) continue;
      u.acd -= dt;
      if (u.acd <= 0) {
        const isP = this.pu.indexOf(u as BattlePlayerUnit) >= 0;
        const enemies: BattleEnemyUnit[] | BattlePlayerUnit[] = isP ? this.eu : this.pu;
        const allies: BattlePlayerUnit[] | BattleEnemyUnit[] = isP ? this.pu : this.eu;
        const alive = enemies.filter((e) => e.alive);
        if (alive.length === 0) continue;

        let tgt: BattlePlayerUnit | BattleEnemyUnit | null = null;
        if (u.range > 0) {
          let best: { u: BattlePlayerUnit | BattleEnemyUnit; d: number } | null = null;
          for (const e of alive) {
            const d = Math.hypot(e.bx - u.bx, e.by - u.by);
            if (!best || d < best.d) best = { u: e, d };
          }
          if (best) tgt = best.u;
        } else {
          if (!u.tgt || !u.tgt.alive) u.tgt = R.pick(alive);
          tgt = u.tgt;
          if (tgt) {
            const dx = tgt.bx - u.bx;
            const dy = tgt.by - u.by;
            const dist = Math.hypot(dx, dy);
            if (dist > 40) {
              const moveAngle = Math.atan2(dy, dx);
              let angleDiff = moveAngle - u.walkAngle;
              while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
              while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
              u.walkAngle += angleDiff * Math.min(1, 5 * dt);
              const mx = Math.cos(u.walkAngle) * u.moveSpeed * dt;
              const my = Math.sin(u.walkAngle) * u.moveSpeed * dt;
              let nx = u.bx + mx;
              let ny = u.by + my;
              let blocked = false;
              for (const ally of allies) {
                if (ally === u || !ally.alive) continue;
                const adx = nx - ally.bx;
                const ady = ny - ally.by;
                if (Math.hypot(adx, ady) < 32) {
                  blocked = true;
                  const perpAngle = u.walkAngle +
                    ((Math.hypot(adx, ady) > 0 && (adx * Math.sin(u.walkAngle) - ady * Math.cos(u.walkAngle)) > 0) ? 1 : -1) * Math.PI / 3;
                  u.walkAngle += (perpAngle - u.walkAngle) * Math.min(1, 8 * dt);
                  break;
                }
              }
              if (!blocked) { u.bx = nx; u.by = ny; }
              else {
                u.bx += Math.cos(u.walkAngle) * u.moveSpeed * dt * 0.7;
                u.by += Math.sin(u.walkAngle) * u.moveSpeed * dt * 0.7;
              }
              u.bx = Math.max(20, Math.min(GC.CW - 20, u.bx));
              u.by = Math.max(20, Math.min(GC.CH - 20, u.by));
              continue;
            }
          }
        }

        if (tgt) {
          const dist = Math.hypot(tgt.bx - u.bx, tgt.by - u.by);
          if (u.range > 0) {
            if (dist > u.range + 30) {
              const dx = tgt.bx - u.bx;
              const dy = tgt.by - u.by;
              u.bx += (dx / dist) * u.moveSpeed * dt;
              u.by += (dy / dist) * u.moveSpeed * dt;
            } else {
              this.performAttack(u, tgt, isP, allies, enemies, dt);
            }
          } else {
            this.performAttack(u, tgt, isP, allies, enemies, dt);
          }
        }
      }
    }

    for (let i = this.fx.length - 1; i >= 0; i--) {
      this.fx[i].life -= dt;
      if (this.fx[i].life <= 0) this.fx.splice(i, 1);
    }

    const pa = this.pu.filter((u) => u.alive).length;
    const ea = this.eu.filter((u) => u.alive).length;
    if (ea === 0 && !this.over) {
      this.over = true;
      this.res = 'win';
      EventBus.emit(GameEvent.BATTLE_END, { result: 'win' });
    } else if (pa === 0 && !this.over) {
      this.over = true;
      this.res = 'lose';
      EventBus.emit(GameEvent.BATTLE_END, { result: 'lose' });
    }
  },

  performAttack(u: BattlePlayerUnit | BattleEnemyUnit, tgt: BattlePlayerUnit | BattleEnemyUnit, isP: boolean, allies: BattlePlayerUnit[] | BattleEnemyUnit[], enemies: BattlePlayerUnit[] | BattleEnemyUnit[], dt: number) {
    const r = calcDmg(u, tgt);
    u.acd = u.attackSpeed;

    const critColor = r.crit ? '#f97316' : 'rgba(255,255,255,0.6)';
    this.fx.push({
      tp: 'line', x: u.bx, y: u.by,
      x1: u.bx, y1: u.by, x2: tgt.bx, y2: tgt.by,
      life: 0.15, ml: 0.15, color: critColor,
    });

    if (r.dodge) {
      this.fx.push({ tp: 'miss', x: tgt.bx, y: tgt.by - 20, life: 0.8, ml: 0.8 });
    } else {
      if (r.dmg > 0) {
        u.dd += r.dmg;
        tgt.dt += r.dmg;
        this.fx.push({
          tp: 'dmg', x: tgt.bx + R.i(-10, 10), y: tgt.by - 20,
          v: r.dmg, c: r.crit, life: 0.8, ml: 0.8,
        });
      }
      if (r.kill) {
        this.fx.push({ tp: 'kill', x: tgt.bx, y: tgt.by, life: 1, ml: 1 });
        this.fx.push({
          tp: 'death', x: tgt.bx, y: tgt.by, life: 0.6, ml: 0.6,
          v: 16, c: false,
        });
        this.checkArtOnKill(u, tgt, isP, allies, enemies);
      }
    }

    if (isP) {
      this.checkArtOnAttack(u as BattlePlayerUnit, tgt, r, allies, enemies);
    }

    if (u.range === 0 && tgt.alive) {
      const dx = tgt.bx - u.bx;
      const dy = tgt.by - u.by;
      const d = Math.hypot(dx, dy);
      if (d > 40) {
        u.bx += (dx / d) * u.moveSpeed * dt * 0.5;
        u.by += (dy / d) * u.moveSpeed * dt * 0.5;
      }
    }
  },

  checkArtOnAttack(u: BattlePlayerUnit, tgt: BattlePlayerUnit | BattleEnemyUnit, r: { dmg: number; crit: boolean; dodge: boolean; kill: boolean }, allies: BattlePlayerUnit[] | BattleEnemyUnit[], enemies: BattlePlayerUnit[] | BattleEnemyUnit[]) {
    if (!u.arts || u.arts.length === 0) return;
    if (this.hasTeamArt(allies, 18) && u.tp === 'support' && r && !r.dodge) {
      const we = findWeakestEnemy(enemies);
      if (we && we.alive) {
        const am = this.getMaxArtQuality(allies, 18);
        const dmg = Math.round(u.attack * 0.5 * am);
        we.hp -= dmg;
        if (we.hp <= 0) { we.alive = false; u.kills = (u.kills || 0) + 1; }
        this.fx.push({ tp: 'dmg', x: we.bx + R.i(-10, 10), y: we.by - 20, v: dmg, c: false, life: 0.8, ml: 0.8 });
      }
    }
    if (this.hasTeamArt(allies, 85) && u.tp === 'mage' && u.nm.indexOf('鬼修') >= 0) {
      const am = this.getMaxArtQuality(allies, 85);
      if (Math.random() < 0.2 * am) {
        const nearE = findNearestEnemies(u, enemies, 60);
        if (nearE.length > 0) {
          const te = R.pick(nearE);
          const dmg = Math.round(u.attack * 0.6 * am);
          te.hp -= dmg;
          if (te.hp <= 0) { te.alive = false; u.kills = (u.kills || 0) + 1; }
          this.fx.push({ tp: 'dmg', x: te.bx, y: te.by - 20, v: dmg, c: true, life: 0.8, ml: 0.8 });
        }
      }
    }
  },

  checkArtOnKill(u: BattlePlayerUnit | BattleEnemyUnit, killed: BattlePlayerUnit | BattleEnemyUnit, isP: boolean, allies: BattlePlayerUnit[] | BattleEnemyUnit[], enemies: BattlePlayerUnit[] | BattleEnemyUnit[]) {
    if (!isP) return;
    const pAllies = allies as BattlePlayerUnit[];
    if (this.hasTeamArt(pAllies, 7)) {
      const am = this.getMaxArtQuality(pAllies, 7);
      for (const ally of pAllies) {
        if (ally.alive) {
          ally.toughness += Math.round(2 * am);
          this.fx.push({ tp: 'dmg', x: ally.bx, y: ally.by - 25, v: '+韧性', heal: true, life: 0.8, ml: 0.8 });
        }
      }
    }
    if (this.hasTeamArt(pAllies, 121)) {
      const am = this.getMaxArtQuality(pAllies, 121);
      if (Math.random() < 0.3 * am) {
        const su = createUnit(21, 'normal' as UnitTier, 1);
        if (su) {
          su.bx = killed.bx + R.i(-20, 20);
          su.by = killed.by + R.i(-20, 20);
          su.acd = 0; su.tgt = null; su.dd = 0; su.dt = 0; su.hd = 0; su.kills = 0;
          su.alive = true; su.vx = 0; su.vy = 0; su.walkAngle = Math.random() * Math.PI * 2;
          su.idleTimer = 0; su.idleDx = 0; su.idleDy = 0; su._deathT = 0;
          su._isSummon = true; su.isPlayer = true;
          this.pu.push(su as BattlePlayerUnit);
          this.fx.push({ tp: 'dmg', x: killed.bx, y: killed.by - 30, v: '化魂!', heal: true, life: 1, ml: 1 });
        }
      }
    }
  },

  checkArtPerFrame(dt: number) {
    if (!this.pu || this.pu.length === 0) return;
    const allies = this.pu;

    if (this.hasTeamArt(allies, 28)) {
      const am = this.getMaxArtQuality(allies, 28);
      const anyDead = allies.some((a) => !a.alive);
      if (!anyDead) {
        this._28timer += dt;
        const newStacks = Math.floor(this._28timer / 3);
        if (newStacks > this._28stacks) {
          const added = newStacks - this._28stacks;
          this._28stacks = newStacks;
          for (const ally of allies) {
            if (ally.alive) {
              ally.attack += Math.round(added * am * 0.5);
            }
          }
        }
      } else {
        for (const ally of allies) {
          if (ally.alive && this._28stacks > 0) {
            ally.attack -= Math.round(this._28stacks * am * 0.5);
          }
        }
        this._28stacks = 0;
        this._28timer = 0;
      }
    }

    if (this.hasTeamArt(allies, 83)) {
      const am = this.getMaxArtQuality(allies, 83);
      for (const ally of allies) {
        if (ally.alive && ally.tp === 'mage' && ally.nm.indexOf('鬼修') >= 0) {
          if (ally._83last === undefined) ally._83last = 0;
          if (this.bt - ally._83last >= 5) {
            ally._83last = this.bt;
            ally.attack += Math.round(2 * am);
            this.fx.push({ tp: 'dmg', x: ally.bx, y: ally.by - 25, v: '+伤害', heal: true, life: 0.8, ml: 0.8 });
          }
        }
      }
    }

    if (this.hasTeamArt(allies, 157)) {
      const am = this.getMaxArtQuality(allies, 157);
      for (const ally of allies) {
        if (ally.alive) {
          const fc = countFamily(allies, ally);
          if (fc > 1) {
            const bonus = Math.round((fc - 1) * 3 * am);
            if (ally._157bonus === undefined || ally._157bonus !== bonus) {
              if (ally._157bonus) ally.maxHp -= ally._157bonus;
              ally.maxHp += bonus;
              ally.hp = Math.min(ally.hp + bonus, ally.maxHp);
              ally._157bonus = bonus;
            }
          }
        }
      }
    }
  },

  hasTeamArt(units: BattlePlayerUnit[] | BattleEnemyUnit[], artId: number): boolean {
    for (const u of units) {
      if ('arts' in u && u.arts && u.arts.some((a) => a.id === artId)) return true;
    }
    return false;
  },

  getMaxArtQuality(units: BattlePlayerUnit[] | BattleEnemyUnit[], artId: number): number {
    let maxQ = 0;
    for (const u of units) {
      if ('arts' in u && u.arts) {
        for (const a of u.arts) {
          if (a.id === artId) {
            const q = { normal: 1, scarce: 2, legendary: 4, mythical: 8 }[a.q as string] || 1;
            maxQ = Math.max(maxQ, q);
          }
        }
      }
    }
    return maxQ || 1;
  },

  render() {
    const canvas = document.getElementById('battle-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const W = GC.CW, H = GC.CH;
    if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
    }
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const chapter = Math.floor((GS.round - 1) / 20);
    const chapterColors: [string, string][] = [
      ['#0a0a1a','#1a1a3a'], ['#1a0a1a','#2a1a2a'], ['#1a1a0a','#2a2a1a'],
      ['#0a1a1a','#1a2a2a'], ['#1a0a0a','#2a1a1a'], ['#1a1a0a','#3a2a1a'],
      ['#0f0f1a','#2a1a3a'], ['#1a0f0f','#3a1a1a'], ['#0f0a0a','#2a0f0f'],
    ];
    const idx = Math.min(chapter, chapterColors.length - 1);
    const [c0, c1] = chapterColors[idx];
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, c0);
    grad.addColorStop(1, c1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(212,165,116,0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(196,30,58,0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.setLineDash([]);

    const drawUnit = (u: BattlePlayerUnit | BattleEnemyUnit, isP: boolean) => {
      if (!u.alive) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#444';
        ctx.fillRect(u.bx - 10, u.by - 10, 20, 20);
        ctx.globalAlpha = 1;
        return;
      }

      const isBoss = 'ct' in u && u.ct === EnemyClass.BOSS;
      const radius = isBoss ? ((u as BattleEnemyUnit).bossSize ?? 60) / 2 : 16;
      const bc = isP ? '#4ade80' : '#c41e3a';
      const tc = u.tier
        ? ({ normal: '#ccc', scarce: '#4ade80', legendary: '#a855f7', mythical: '#f97316' }[u.tier as string] || bc)
        : bc;

      if (isBoss) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(u.bx, u.by, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(251,191,36,0.3)';
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();
      }

      ctx.strokeStyle = isBoss ? '#fbbf24' : tc;
      ctx.lineWidth = isBoss ? 3 : 2;
      ctx.fillStyle = isBoss
        ? 'rgba(196,30,58,0.25)'
        : (isP ? 'rgba(74,222,128,0.2)' : 'rgba(196,30,58,0.2)');
      ctx.beginPath();
      ctx.arc(u.bx, u.by, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (u.range > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(u.bx, u.by, u.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = tc;
      ctx.font = '10px "Noto Serif SC"';
      ctx.textAlign = 'center';
      const dn = u.nm.length > 2 ? u.nm.slice(0, 2) : u.nm;
      ctx.fillText(dn, u.bx, u.by + 3);

      const hpRatio = Math.max(0, u.hp) / u.maxHp;
      const bw = isBoss ? ((u as BattleEnemyUnit).bossHpW ?? 60) : 24;
      const bh = isBoss ? 6 : 3;
      ctx.fillStyle = '#333';
      ctx.fillRect(u.bx - bw / 2, u.by - radius - bh - 4, bw, bh);
      ctx.fillStyle = hpRatio > 0.5 ? '#4ade80' : hpRatio > 0.25 ? '#fbbf24' : '#c41e3a';
      ctx.fillRect(u.bx - bw / 2, u.by - radius - bh - 4, bw * hpRatio, bh);

      if (u.lv && u.lv > 1) {
        ctx.fillStyle = '#f97316';
        ctx.font = '8px serif';
        ctx.fillText('Lv' + u.lv, u.bx, u.by - radius - bh - 8);
      }
    };

    for (const u of this.eu) drawUnit(u, false);
    for (const u of this.pu) drawUnit(u, true);

    for (const fx of this.fx) {
      const al = fx.life / fx.ml;
      ctx.globalAlpha = al;
      if (fx.tp === 'line' && fx.x1 !== undefined && fx.y1 !== undefined && fx.x2 !== undefined && fx.y2 !== undefined) {
        ctx.strokeStyle = fx.color || 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(fx.x1, fx.y1);
        ctx.lineTo(fx.x2, fx.y2);
        ctx.stroke();
      } else if (fx.tp === 'dmg') {
        ctx.fillStyle = fx.c ? '#f97316' : '#fff';
        ctx.font = fx.c ? 'bold 16px "Ma Shan Zheng"' : '12px "Noto Serif SC"';
        ctx.textAlign = 'center';
        ctx.fillText((fx.c ? '暴击 ' : '') + fx.v, fx.x, fx.y - (1 - al) * 30);
      } else if (fx.tp === 'miss') {
        ctx.fillStyle = '#aaa';
        ctx.font = '14px "Ma Shan Zheng"';
        ctx.textAlign = 'center';
        ctx.fillText('MISS', fx.x, fx.y - (1 - al) * 20);
      } else if (fx.tp === 'kill') {
        ctx.fillStyle = '#c41e3a';
        ctx.font = 'bold 18px "Ma Shan Zheng"';
        ctx.textAlign = 'center';
        ctx.fillText('击败', fx.x, fx.y - (1 - al) * 40);
      } else if (fx.tp === 'death') {
        const r = (fx.v as number) || 16;
        const s = r * (1 - al);
        ctx.fillStyle = 'rgba(100,100,100,0.4)';
        ctx.fillRect(fx.x - s, fx.y - s, s * 2, s * 2);
      }
    }
    ctx.globalAlpha = 1;
  },
};
