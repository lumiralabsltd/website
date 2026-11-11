/* Lanyard badge physics. No rendering in here, so it can be tested on its own.
   Units are CSS pixels, y up. One Badge = an elastic strap (a chain of particles that only resists
   stretch) clipped to a rigid card (four corners, two apex particles for stiffness, one clip point).
   Solver: XPBD with small substeps, one pass per substep, so momentum is kept through a drag and release. */

const SUB = 6;            // substeps per fixed step
const FIXED = 1 / 120;    // fixed step, seconds

export class Badge {
  constructor(o) {
    this.w = o.w; this.h = o.h; this.s = o.w / 190;       // scale against the desktop card
    this.zL = o.z || 0;                                    // resting depth layer
    this.links = o.links || 12;
    this.clipUp = 34 * this.s;                             // clip point above the card's top edge
    this.apex = 0.45 * this.w;
    this.G = 7600 * this.s;                                // gravity, scaled so every size swings alike
    this.n = this.links + 1 + 6;                           // chain (0..links) + TL TR BR BL AF AB
    const n = this.n;
    this.x = new Float64Array(n); this.y = new Float64Array(n); this.z = new Float64Array(n);
    this.px = new Float64Array(n); this.py = new Float64Array(n); this.pz = new Float64Array(n);
    this.vx = new Float64Array(n); this.vy = new Float64Array(n); this.vz = new Float64Array(n);
    this.iw = new Float64Array(n);
    this.C = this.links;                                   // clip point index
    this.TL = this.C + 1; this.TR = this.C + 2; this.BR = this.C + 3; this.BL = this.C + 4; this.AF = this.C + 5; this.AB = this.C + 6;
    this.local = [];                                       // rest positions in card space, for the rigid constraints
    this.rigid = [];
    this.give = o.give || 1.10;                            // how far the strap sits stretched under the card's weight
    this.zeta = o.zeta === undefined ? 0.34 : o.zeta;      // strap damping ratio: under 1 bounces, 1 would not
    this.air = o.air === undefined ? 1.1 : o.air;          // card air drag, 1/s
    this.acc = 0; this.state = 'gone'; this.free = false; this.age = 0;
    this.grabW = null; this.tx = 0; this.ty = 0; this.ptx = 0; this.pty = 0;
    this.setAnchor(o.ax, o.ay, o.len);
    this._rigid();
  }

  setAnchor(ax, ay, len) {
    this.ax = ax; this.ay = ay; this.len = len;
    this.rest = (len / this.give) / this.links;
    const M = 1.25;                                        // card mass
    const kTotal = M * this.G / (len - len / this.give);
    this.L0 = len / this.give;
    this.compMain = 1 / kTotal;                            // the elastic that carries the load, anchor to clip
    this.compliance = 1 / (0.18 * kTotal * this.links);    // the visible strap rides along and adds a little
    this.dash = 2 * this.zeta * Math.sqrt(kTotal * M);
  }

  _rigid() {
    const w = this.w, h = this.h, d = this.apex, c = this.clipUp;
    const L = this.local = [];
    L[this.C] = [0, h / 2 + c, 0];
    L[this.TL] = [-w / 2, h / 2, 0]; L[this.TR] = [w / 2, h / 2, 0];
    L[this.BR] = [w / 2, -h / 2, 0]; L[this.BL] = [-w / 2, -h / 2, 0];
    L[this.AF] = [0, 0, d]; L[this.AB] = [0, 0, -d];
    const ids = [this.C, this.TL, this.TR, this.BR, this.BL, this.AF, this.AB];
    this.rigid = [];
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) {
      const p = L[ids[a]], q = L[ids[b]];
      this.rigid.push([ids[a], ids[b], Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])]);
    }
    const mChain = 0.012, mCorner = 0.26, mApex = 0.08, mClip = 0.05;
    for (let i = 0; i < this.C; i++) this.iw[i] = 1 / mChain;
    this.iw[this.C] = 1 / mClip;
    this.iw[this.TL] = this.iw[this.TR] = this.iw[this.BR] = this.iw[this.BL] = 1 / mCorner;
    this.iw[this.AF] = this.iw[this.AB] = 1 / mApex;
    this.mChain = mChain;
  }

  /* Place the card with its centre at (cx, cy), rotated by `roll` in the page plane, strap run from the anchor. */
  place(cx, cy, roll = 0, yaw = 0) {
    const cr = Math.cos(roll), sr = Math.sin(roll), cyw = Math.cos(yaw), syw = Math.sin(yaw);
    for (const i of [this.C, this.TL, this.TR, this.BR, this.BL, this.AF, this.AB]) {
      const p = this.local[i];
      const lx = p[0] * cyw + p[2] * syw, lz = -p[0] * syw + p[2] * cyw, ly = p[1];
      this.x[i] = cx + lx * cr - ly * sr; this.y[i] = cy + lx * sr + ly * cr; this.z[i] = this.zL + lz;
    }
    for (let i = 0; i < this.C; i++) {
      const t = i / this.C;
      this.x[i] = this.ax + (this.x[this.C] - this.ax) * t;
      this.y[i] = this.ay + (this.y[this.C] - this.ay) * t;
      this.z[i] = this.zL;
    }
    for (let i = 0; i < this.n; i++) { this.px[i] = this.x[i]; this.py[i] = this.y[i]; this.pz[i] = this.z[i]; this.vx[i] = this.vy[i] = this.vz[i] = 0; }
  }

  /* Hang at rest (used for reduced motion and after a resize). */
  hang() {
    this.free = false; this.state = 'hang'; this.grabW = null; this.iw[0] = 0;
    this.place(this.ax, this.ay - this.len - this.clipUp - this.h / 2, 0, 0);
  }

  /* Start above the anchor and let it fall in. */
  drop(rand = Math.random) {
    this.free = false; this.state = 'hang'; this.grabW = null; this.iw[0] = 0; this.age = 0;
    const roll = (rand() - 0.5) * 0.9, yaw = (rand() - 0.5) * 1.6;
    this.place(this.ax + (rand() - 0.5) * 30 * this.s, this.ay + this.h * 0.62, roll, yaw);
    const sx = (rand() - 0.5) * 180 * this.s;
    for (let i = this.C; i < this.n; i++) { this.vx[i] = sx; this.vy[i] = -500 * this.s; }
  }

  /* Let go of the anchor: strap and card fly on with whatever momentum they have. */
  detach() {
    if (this.free) return;
    this.free = true; this.state = 'free'; this.iw[0] = 1 / this.mChain; this.freeAge = 0;
  }

  /* u, v are the grab point on the card face, 0..1 from bottom-left. */
  grab(u, v, tx, ty) {
    this.grabW = [(1 - u) * v, u * v, u * (1 - v), (1 - u) * (1 - v)];   // TL TR BR BL
    this.tx = this.ptx = tx; this.ty = this.pty = ty;
  }
  drag(tx, ty) { this.tx = tx; this.ty = ty; }
  release() { this.grabW = null; return this.speed(); }

  centre(out = {}) {
    out.x = (this.x[this.TL] + this.x[this.TR] + this.x[this.BR] + this.x[this.BL]) / 4;
    out.y = (this.y[this.TL] + this.y[this.TR] + this.y[this.BR] + this.y[this.BL]) / 4;
    out.z = (this.z[this.TL] + this.z[this.TR] + this.z[this.BR] + this.z[this.BL]) / 4;
    return out;
  }
  velocity(out = {}) {
    out.x = (this.vx[this.TL] + this.vx[this.TR] + this.vx[this.BR] + this.vx[this.BL]) / 4;
    out.y = (this.vy[this.TL] + this.vy[this.TR] + this.vy[this.BR] + this.vy[this.BL]) / 4;
    return out;
  }
  speed() { const v = this.velocity(); return Math.hypot(v.x, v.y); }
  stretch() { return Math.hypot(this.x[this.C] - this.x[0], this.y[this.C] - this.y[0], this.z[this.C] - this.z[0]) / (this.rest * this.links); }

  /* Orthonormal frame of the card: X to the right, Y up the card, Z out of the face. */
  frame(o) {
    const { x, y, z, TL, TR, BR, BL } = this;
    let Xx = (x[TR] - x[TL]) + (x[BR] - x[BL]), Xy = (y[TR] - y[TL]) + (y[BR] - y[BL]), Xz = (z[TR] - z[TL]) + (z[BR] - z[BL]);
    let Yx = (x[TL] - x[BL]) + (x[TR] - x[BR]), Yy = (y[TL] - y[BL]) + (y[TR] - y[BR]), Yz = (z[TL] - z[BL]) + (z[TR] - z[BR]);
    let l = Math.hypot(Xx, Xy, Xz) || 1; Xx /= l; Xy /= l; Xz /= l;
    const dp = Yx * Xx + Yy * Xy + Yz * Xz; Yx -= dp * Xx; Yy -= dp * Xy; Yz -= dp * Xz;
    l = Math.hypot(Yx, Yy, Yz) || 1; Yx /= l; Yy /= l; Yz /= l;
    o.Xx = Xx; o.Xy = Xy; o.Xz = Xz; o.Yx = Yx; o.Yy = Yy; o.Yz = Yz;
    o.Zx = Xy * Yz - Xz * Yy; o.Zy = Xz * Yx - Xx * Yz; o.Zz = Xx * Yy - Xy * Yx;
    this.centre(o);
    return o;
  }

  /* Shove every loose particle (page scroll, a poke). */
  nudge(dx, dy, dz = 0) {
    for (let i = 1; i < this.n; i++) { this.vx[i] += dx; this.vy[i] += dy; }
    if (dz) { this.vz[this.TR] += dz; this.vz[this.BR] += dz; this.vz[this.TL] -= dz; this.vz[this.BL] -= dz; }
  }

  step(dt) {
    if (this.state === 'gone') return;
    this.acc += Math.min(dt, 0.05);
    const n = Math.min(6, Math.floor(this.acc / FIXED));
    // the pointer's move this frame is spread across the fixed steps, so the card feels one smooth pull
    const x0 = this.ptx, y0 = this.pty, dx = this.tx - x0, dy = this.ty - y0;
    for (let k = 0; k < n; k++) this._fixed(x0 + dx * k / n, y0 + dy * k / n, x0 + dx * (k + 1) / n, y0 + dy * (k + 1) / n);
    if (n > 0) { this.ptx = this.tx; this.pty = this.ty; }
    this.acc = n === 6 ? 0 : this.acc - n * FIXED;
    this.age += dt; if (this.free) this.freeAge += dt;
  }

  _fixed(sx0, sy0, sx1, sy1) {
    const h = FIXED / SUB, f = this._f || (this._f = {});
    const { x, y, z, px, py, pz, vx, vy, vz, iw, n, C, TL, TR, BR, BL } = this;
    const corners = [TL, TR, BR, BL];
    const dragLin = Math.exp(-this.air * h), dragChain = Math.exp(-1.8 * h);
    const kz = 46, kT = 64, cN = 5.2, cYaw = 0.55;
    const aT = this.compliance / (h * h), aM = this.compMain / (h * h);

    for (let s = 0; s < SUB; s++) {
      /* forces */
      this.frame(f);
      const vcx = (vx[TL] + vx[TR] + vx[BR] + vx[BL]) / 4;
      // torque that turns the face back towards the viewer: (n × ẑ)
      const tqx = f.Zy * kT, tqy = -f.Zx * kT;
      const zc = f.z - this.zL;
      for (let i = 0; i < n; i++) {
        if (iw[i] === 0) continue;
        let ax = 0, ay = -this.G, az = 0;
        if (i < C) { az -= kz * (z[i] - this.zL); }
        else {
          az -= kz * zc;
          const rx = x[i] - f.x, ry = y[i] - f.y, rz = z[i] - f.z;
          // facing spring: a = τ × r
          ax += tqy * rz; ay += -tqx * rz; az += tqx * ry - tqy * rx;
          if (i !== C) {
            // air pushes on the flat of the card, not along it
            const vn = vx[i] * f.Zx + vy[i] * f.Zy + vz[i] * f.Zz;
            ax -= cN * vn * f.Zx; ay -= cN * vn * f.Zy; az -= cN * vn * f.Zz;
            // and turns its leading edge away as it moves sideways
            az -= cYaw * vcx * (rx * f.Xx + ry * f.Xy + rz * f.Xz) / (this.w * 0.5);
          }
        }
        vx[i] += ax * h; vy[i] += ay * h; vz[i] += az * h;
        const dmp = i < C ? dragChain : dragLin;
        vx[i] *= dmp; vy[i] *= dmp; vz[i] *= dmp;
        px[i] = x[i]; py[i] = y[i]; pz[i] = z[i];
        x[i] += vx[i] * h; y[i] += vy[i] * h; z[i] += vz[i] * h;
      }
      if (!this.free) {
        x[0] = this.ax; y[0] = this.ay; z[0] = this.zL;
        /* the elastic: one spring from the anchor to the clip, pulling only when stretched */
        const dx = x[C] - x[0], dy = y[C] - y[0], dz = z[C] - z[0];
        const d = Math.hypot(dx, dy, dz);
        if (d > this.L0) {
          const l = -(d - this.L0) / (iw[C] + aM) / d * iw[C];
          x[C] += dx * l; y[C] += dy * l; z[C] += dz * l;
          // and it loses energy as it works, which is what stops the bounce going on for ever
          const vr = (vx[C] * dx + vy[C] * dy + vz[C] * dz) / d;
          const k = -Math.min(0.9, this.dash * iw[C] * h) * vr / d;
          this._dvx = dx * k; this._dvy = dy * k; this._dvz = dz * k;
        } else this._dvx = this._dvy = this._dvz = 0;
      }

      /* strap: resists stretch only, with give */
      for (let i = 0; i < C; i++) {
        const j = i + 1;
        const dx = x[i] - x[j], dy = y[i] - y[j], dz = z[i] - z[j];
        const d = Math.hypot(dx, dy, dz);
        if (d <= this.rest || d === 0) continue;
        const ws = iw[i] + iw[j] + aT; if (ws === 0) continue;
        const l = -(d - this.rest) / ws / d;
        x[i] += dx * l * iw[i]; y[i] += dy * l * iw[i]; z[i] += dz * l * iw[i];
        x[j] -= dx * l * iw[j]; y[j] -= dy * l * iw[j]; z[j] -= dz * l * iw[j];
      }

      /* the hand: the grabbed point on the card follows the pointer */
      if (this.grabW) {
        const t = (s + 1) / SUB;
        const gx = sx0 + (sx1 - sx0) * t, gy = sy0 + (sy1 - sy0) * t;
        let cx = 0, cy = 0, cz = 0, den = 0;
        for (let k = 0; k < 4; k++) { const i = corners[k], g = this.grabW[k]; cx += g * x[i]; cy += g * y[i]; cz += g * z[i]; den += g * g * iw[i]; }
        const ex = (gx - cx) / den, ey = (gy - cy) / den, ez = (this.zL - cz) / den * 0.25;
        for (let k = 0; k < 4; k++) { const i = corners[k], g = this.grabW[k] * iw[i]; x[i] += ex * g; y[i] += ey * g; z[i] += ez * g; }
      }

      /* the card and its clip: rigid */
      for (let pass = 0; pass < 2; pass++) for (let k = 0; k < this.rigid.length; k++) {
        const c = this.rigid[k], i = c[0], j = c[1];
        const dx = x[i] - x[j], dy = y[i] - y[j], dz = z[i] - z[j];
        const d = Math.hypot(dx, dy, dz); if (d === 0) continue;
        const l = -(d - c[2]) / (iw[i] + iw[j]) / d;
        x[i] += dx * l * iw[i]; y[i] += dy * l * iw[i]; z[i] += dz * l * iw[i];
        x[j] -= dx * l * iw[j]; y[j] -= dy * l * iw[j]; z[j] -= dz * l * iw[j];
      }

      for (let i = 0; i < n; i++) {
        if (iw[i] === 0) continue;
        vx[i] = (x[i] - px[i]) / h; vy[i] = (y[i] - py[i]) / h; vz[i] = (z[i] - pz[i]) / h;
      }

      if (!this.free && (this._dvx || this._dvy || this._dvz)) { vx[C] += this._dvx; vy[C] += this._dvy; vz[C] += this._dvz; }
    }
  }
}

/* Two cards that swing into each other push apart a little instead of passing clean through. */
export function jostle(a, b) {
  if (a.state === 'gone' || b.state === 'gone') return;
  const ca = a.centre(), cb = b.centre();
  const dx = cb.x - ca.x, dy = cb.y - ca.y, d = Math.hypot(dx, dy), R = (a.w + b.w) * 0.46;
  if (d >= R || d === 0) return;
  const push = (R - d) / d * 0.5 * 0.35, ux = dx * push, uy = dy * push;
  for (const i of [a.TL, a.TR, a.BR, a.BL]) { a.x[i] -= ux; a.y[i] -= uy; }
  for (const i of [b.TL, b.TR, b.BR, b.BL]) { b.x[i] += ux; b.y[i] += uy; }
}
