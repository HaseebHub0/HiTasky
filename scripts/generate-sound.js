const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 0.15; // 150 ms
const numSamples = Math.floor(sampleRate * duration);

const buffer = Buffer.alloc(44 + numSamples * 2);

// RIFF header
buffer.write('RIFF', 0);
buffer.writeUInt32LE(36 + numSamples * 2, 4);
buffer.write('WAVE', 8);

// fmt subchunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM format
buffer.writeUInt16LE(1, 22); // 1 channel (mono)
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate (SampleRate * 1 channel * 2 bytes/sample)
buffer.writeUInt16LE(2, 32); // Block align (1 channel * 2 bytes)
buffer.writeUInt16LE(16, 34); // Bits per sample (16)

// data subchunk
buffer.write('data', 36);
buffer.writeUInt32LE(numSamples * 2, 40);

// Generate bubble pop sound (frequency slide from 600Hz down to 150Hz with exponential volume decay)
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  
  // Slide frequency down dynamically
  const freq = 600 * Math.exp(-15 * t) + 150;
  const phase = 2 * Math.PI * (600 * (1 - Math.exp(-15 * t)) / 15 + 150 * t);
  
  // Exponential decay envelope
  const envelope = Math.exp(-22 * t);
  const sample = Math.sin(phase) * envelope;
  
  // Quantize to 16-bit signed integer
  const intVal = Math.floor(sample * 32767);
  buffer.writeInt16LE(intVal, 44 + i * 2);
}

const outputPath = path.join(__dirname, '..', 'assets', 'complete.wav');
fs.writeFileSync(outputPath, buffer);
console.log(`Generated custom satisfaction sound at: ${outputPath}`);
