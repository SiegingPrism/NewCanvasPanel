// Web Audio API synthesized paper rustle sound effect (100% offline, zero assets)
let audioCtx: AudioContext | null = null;

export function playPageTurnSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const sampleRate = audioCtx.sampleRate;
    const duration = 0.18; // 180ms paper flip sound
    const buffer = audioCtx.createBuffer(1, Math.floor(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);

    // Generate shaped white/pink noise simulating paper friction
    for (let i = 0; i < data.length; i++) {
      const t = i / data.length;
      // Envelope: gentle attack, fast friction rise, smooth decay
      const envelope = Math.sin(t * Math.PI) * Math.exp(-t * 3);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.25;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Bandpass filter to match paper rustle frequencies (1.2kHz - 4.5kHz)
    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 2800;
    filter.Q.value = 1.2;

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    source.start();
  } catch {
    // Graceful fallback if Web Audio is unsupported or restricted
  }
}

