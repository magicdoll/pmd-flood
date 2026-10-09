// Web Audio API & Speech Synthesis & Haptic Feedback for Mobile PMD Tag Scanner

let audioCtx = null;

export function unlockAudioOnUserGesture() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function getAudioContext() {
  unlockAudioOnUserGesture();
  return audioCtx;
}

export function triggerHaptic(type = 'success') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'success') {
        navigator.vibrate([60, 40, 60]); // double tap vibration
      } else if (type === 'warning') {
        navigator.vibrate([150, 80, 150]);
      } else {
        navigator.vibrate(50);
      }
    } catch (e) {
      // ignore
    }
  }
}

export function playSuccessBeep() {
  try {
    triggerHaptic('success');
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Futuristic chime
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

    gainNode.gain.setValueAtTime(0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.15);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.35);
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

export function playNotFoundBeep() {
  try {
    triggerHaptic('warning');
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(220, now + 0.15);

    gainNode.gain.setValueAtTime(0.18, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

export function speakResult(text, lang = 'th-TH') {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(v => v.lang.startsWith('th'));
    if (thaiVoice && lang.startsWith('th')) {
      utterance.voice = thaiVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech error:', err);
  }
}
