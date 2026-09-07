import { writeFileSync, mkdirSync } from "node:fs"
import { deflateSync } from "node:zlib"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, "..", "public", "icons")
mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeB = Buffer.from(type)
  const crcB = Buffer.alloc(4)
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])))
  return Buffer.concat([len, typeB, data, crcB])
}

function png(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const i = y * (size * 4 + 1) + 1 + x * 4
      const [r, g, b, a] = draw(x, y, size)
      raw[i] = r
      raw[i + 1] = g
      raw[i + 2] = b
      raw[i + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

const ink = [11, 31, 58, 255]
const paper = [247, 249, 247, 255]
const rx = [46, 139, 87, 255]
const amber = [212, 160, 23, 255]

function drawAny(x, y, s) {
  const m = s / 512
  const cx = s / 2
  const cy = s / 2
  const dist = Math.hypot(x - cx, y - cy)
  if (dist > s * 0.48) return [0, 0, 0, 0]
  if (dist > s * 0.46) return ink

  let c = paper
  const t = 22 * m
  const arm = 140 * m
  if (Math.abs(x - cx) < t && Math.abs(y - cy) < arm) c = rx
  if (Math.abs(y - cy) < t && Math.abs(x - cx) < arm) c = rx

  const px = (x - cx) / m
  const py = (y - cy - 90 * m) / m
  const rot = px * 0.7 + py * 0.7
  const rot2 = -px * 0.7 + py * 0.7
  if (Math.abs(rot2) < 18 && Math.abs(rot) < 55) {
    c = rot < 0 ? amber : ink
  }
  return c
}

function drawMask(x, y, s) {
  const cx = s / 2
  const cy = s / 2
  let c = ink
  const t = s * 0.06
  const arm = s * 0.22
  if (Math.abs(x - cx) < t && Math.abs(y - cy) < arm) c = rx
  if (Math.abs(y - cy) < t && Math.abs(x - cx) < arm) c = rx
  const d = Math.hypot(x - cx, y - cy)
  if (d > s * 0.38 && d < s * 0.42) c = paper
  return c
}

writeFileSync(path.join(outDir, "icon-192.png"), png(192, drawAny))
writeFileSync(path.join(outDir, "icon-512.png"), png(512, drawAny))
writeFileSync(path.join(outDir, "icon-maskable-192.png"), png(192, drawMask))
writeFileSync(path.join(outDir, "icon-maskable-512.png"), png(512, drawMask))
console.log("icons written to", outDir)
