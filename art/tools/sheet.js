// usage: node sheet.js out.png cell in1.png in2.png ...  -> contact sheet on warm grey bg, 4 columns
const sharp = require('sharp');
(async () => {
  const [out, cellS, ...ins] = process.argv.slice(2);
  const cell = +cellS, cols = Math.min(4, ins.length), rows = Math.ceil(ins.length / cols);
  const comps = [];
  for (let i = 0; i < ins.length; i++) {
    const b = await sharp(ins[i]).trim().resize(cell - 16, cell - 16, { fit: 'inside' }).png().toBuffer();
    const m = await sharp(b).metadata();
    comps.push({ input: b, left: (i % cols) * cell + Math.floor((cell - m.width) / 2), top: Math.floor(i / cols) * cell + Math.floor((cell - m.height) / 2) });
  }
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#c9b79c' } }).composite(comps).png().toFile(out);
})();
