// A tiny stack VM for make.fun's tiny stack ISA, version 1: a faithful interpreter that follows
// the reference VM's rules exactly, hard ones included.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Opcode byte -> [immediate bytes, pops, pushes]; no entry is an unknown opcode (trap 5).
const OPS = {
  0x00:[0,0,0], 0x01:[1,0,1], 0x02:[4,0,1], 0x03:[0,1,0], 0x04:[0,1,2], 0x05:[0,2,2], 0x06:[0,2,3], 0x07:[0,3,3],
  0x10:[0,2,1], 0x11:[0,2,1], 0x12:[0,2,1], 0x13:[0,2,1], 0x14:[0,2,1], 0x15:[0,2,1], 0x16:[0,2,1], 0x17:[0,1,1],
  0x18:[0,2,1], 0x19:[0,2,1], 0x1a:[0,2,1], 0x1b:[0,1,1], 0x1c:[0,2,1], 0x1d:[0,2,1], 0x1e:[0,2,1],
  0x20:[0,2,1], 0x21:[0,2,1], 0x22:[0,2,1],
  0x30:[2,0,0], 0x31:[2,1,0], 0x32:[2,1,0], 0x33:[2,0,0], 0x34:[0,0,0],
  0x40:[0,1,1], 0x41:[0,2,0], 0x50:[0,1,0], 0x51:[0,1,0], 0x52:[0,0,1], 0x53:[0,1,0],
};

// The binary operators, by opcode byte: (a, b) -> r, each the reference's own expression.
const BIN = {
  0x10:(a,b)=>(a+b)|0, 0x11:(a,b)=>(a-b)|0, 0x12:(a,b)=>Math.imul(a,b),
  0x13:(a,b)=>a===-2147483648&&b===-1?a:(a/b)|0, 0x14:(a,b)=>b===-1?0:a%b|0,
  0x15:(a,b)=>Math.floor((a>>>0)/(b>>>0))|0, 0x16:(a,b)=>(a>>>0)%(b>>>0)|0,
  0x18:(a,b)=>a&b, 0x19:(a,b)=>a|b, 0x1a:(a,b)=>a^b, 0x1c:(a,b)=>a<<(b&31),
  0x1d:(a,b)=>a>>(b&31), 0x1e:(a,b)=>(a>>>(b&31))|0, 0x20:(a,b)=>a===b?1:0,
  0x21:(a,b)=>a<b?1:0, 0x22:(a,b)=>(a>>>0)<(b>>>0)?1:0,
};

function run(p, inp) {
  const n = p.length;
  const D = new Int32Array(256), C = new Int32Array(64), MEM = new Int32Array(256);
  const out = new Uint8Array(65536); // filled by index; the answer is its filled prefix
  let sp = 0, csp = 0, olen = 0, ip = 0, pc = 0, steps = 0;
  const done = (code) => ({ out: out.slice(0, olen), code });
  for (;;) {
    if (steps === 1000000) return done(10);
    if (pc < 0 || pc >= n) return done(9);
    const op = p[pc];
    const meta = OPS[op];
    if (meta === undefined) return done(5);
    const imm = meta[0];
    if (pc + imm >= n) return done(9);
    steps++;
    const next = pc + 1 + imm;
    if (sp < meta[1]) return done(2);
    if (sp - meta[1] + meta[2] > 256) return done(3);
    pc = next;
    switch (op) {
      case 0x00: return done(0);
      case 0x01: D[sp++] = (p[next - 1] << 24) >> 24; break;
      case 0x02: D[sp++] = p[next - 4] | (p[next - 3] << 8) | (p[next - 2] << 16) | (p[next - 1] << 24); break;
      case 0x03: sp--; break;
      case 0x04: D[sp] = D[sp - 1]; sp++; break;
      case 0x05: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; }
      case 0x06: D[sp] = D[sp - 2]; sp++; break;
      case 0x07: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; }
      case 0x17: D[sp - 1] = -D[sp - 1] | 0; break;
      case 0x1b: D[sp - 1] = ~D[sp - 1]; break;
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: case 0x15: case 0x16:
      case 0x18: case 0x19: case 0x1a: case 0x1c: case 0x1d: case 0x1e:
      case 0x20: case 0x21: case 0x22: {
        const b = D[sp - 1], a = D[sp - 2];
        if (!b && op >= 0x13 && op <= 0x16) return done(4); // DIV, MOD, DIVU, MODU by zero
        D[sp - 2] = BIN[op](a, b);
        sp--;
        break;
      }
      case 0x30: case 0x31: case 0x32: {
        const rel = ((p[next - 2] | (p[next - 1] << 8)) << 16) >> 16;
        // JZ on 0, JNZ on non-0; JMP always (no pop).
        if (op === 0x30 || (D[--sp] === 0) === (op === 0x31)) pc = next + rel;
        break;
      }
      case 0x33: if (csp === 64) return done(7); C[csp++] = next; pc = p[next - 2] | (p[next - 1] << 8); break;
      case 0x34: if (csp === 0) return done(8); pc = C[--csp]; break;
      case 0x40: { const addr = D[sp - 1]; if (addr < 0 || addr > 255) return done(6); D[sp - 1] = MEM[addr]; break; }
      case 0x41: { const addr = D[sp - 1]; if (addr < 0 || addr > 255) return done(6); MEM[addr] = D[sp - 2]; sp -= 2; break; }
      case 0x50: {
        const s = String(D[sp - 1]); // PRINT: decimal ASCII — char codes are the bytes
        if (olen + s.length > 65536) return done(11);
        sp--;
        for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i);
        break;
      }
      case 0x51:
        if (olen + 1 > 65536) return done(11);
        out[olen++] = D[--sp] & 255;
        break;
      case 0x52: D[sp++] = ip < inp.length ? inp[ip++] : -1; break;
      case 0x53: return done(D[--sp] & 255);
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(I).sort()) {
  const r = run(new Uint8Array(readFileSync(join(I, id, 'program.bin'))), new Uint8Array(readFileSync(join(I, id, 'input.bin'))));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), `${r.code}\n`);
}
