const fs = require('fs');
const path = require('path');

const generateWav = (filename, frequency, durationSec) => {
    const sampleRate = 44100;
    const numChannels = 1;
    const bitsPerSample = 16;
    
    const numSamples = sampleRate * durationSec;
    const dataSize = numSamples * numChannels * (bitsPerSample / 8);
    const buffer = Buffer.alloc(44 + dataSize);
    
    // RIFF chunk
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    
    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // ByteRate
    buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);
    
    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Write audio data
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const amplitude = 32767 * 0.5; // 50% volume
        // Simple envelope to avoid clicking
        const envelope = t < 0.1 ? t / 0.1 : (durationSec - t < 0.1 ? (durationSec - t) / 0.1 : 1);
        const sample = Math.sin(2 * Math.PI * frequency * t) * amplitude * envelope;
        buffer.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), 44 + i * 2);
    }
    
    fs.writeFileSync(filename, buffer);
    console.log(`Generated ${filename}`);
};

const targetDir = path.join(__dirname, 'mobile', 'assets', 'sounds');
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

generateWav(path.join(targetDir, 'sound1.wav'), 440, 0.5); // A4
generateWav(path.join(targetDir, 'sound2.wav'), 523.25, 0.5); // C5
generateWav(path.join(targetDir, 'sound3.wav'), 659.25, 0.5); // E5
generateWav(path.join(targetDir, 'sound4.wav'), 880, 0.5); // A5
generateWav(path.join(targetDir, 'sound5.wav'), 1046.50, 0.5); // C6
