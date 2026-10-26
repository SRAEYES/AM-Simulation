/**
 * AM Broadcast Studio - Web Audio Synthesizer Engine
 * Real-time audio synthesis matching the simulated AM demodulated output,
 * including acoustic clipping distortion (mu > 1), channel static, and heterodyne beat whistles.
 */

(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else {
    root.AMAudioEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  let audioCtx = null;
  let masterGain = null;
  let toneGain = null;
  let noiseGain = null;
  let interfGain = null;

  // Sound sources
  let osc1 = null;
  let osc2 = null;
  let osc3 = null;
  let interfOsc = null;
  let noiseSource = null;
  let distortionShaper = null;

  let isPlaying = false;
  let userVolume = 0.5; // default 50%

  /**
   * Generates a non-linear transfer curve for WaveShaperNode
   * Simulates the exact physical behavior of diode envelope negative-peak clipping
   */
  function makeDiodeDistortionCurve(mu) {
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    for (let i = 0; i < nSamples; i++) {
      const x = (i * 2.0) / nSamples - 1.0; // Normalized input range -1.0 to +1.0
      if (mu <= 1.0) {
        // Linear undistorted reproduction
        curve[i] = x;
      } else {
        // Envelope cusp inversion / negative peak clamping
        // When (1 + mu * x) < 0, the envelope passes below zero and diode rectifies it backwards
        const env = Math.abs(1.0 + mu * x);
        curve[i] = ((env - 1.0) / mu) * 1.15;
      }
    }
    return curve;
  }

  function initContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported in this browser.');
        return false;
      }
      audioCtx = new AudioContextClass();

      // Master output gain
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(userVolume * 0.25, audioCtx.currentTime);
      masterGain.connect(audioCtx.destination);

      // Tone branch with Diode Distortion Shaper
      toneGain = audioCtx.createGain();
      toneGain.gain.setValueAtTime(1.0, audioCtx.currentTime);

      distortionShaper = audioCtx.createWaveShaper();
      distortionShaper.curve = makeDiodeDistortionCurve(0.7);

      toneGain.connect(distortionShaper);
      distortionShaper.connect(masterGain);

      // Channel Static Noise Branch
      const bufferSize = audioCtx.sampleRate * 2;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2.0 - 1.0;
      }

      noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      // Filter noise to sound like realistic medium wave atmospheric rumble/hiss
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1800, audioCtx.currentTime);
      noiseFilter.Q.setValueAtTime(1.2, audioCtx.currentTime);

      noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0, audioCtx.currentTime);

      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);

      // Interference Heterodyne Tone Branch (1.5 kHz whistle)
      interfOsc = audioCtx.createOscillator();
      interfOsc.type = 'sine';
      interfOsc.frequency.setValueAtTime(1500, audioCtx.currentTime);

      interfGain = audioCtx.createGain();
      interfGain.gain.setValueAtTime(0, audioCtx.currentTime);

      interfOsc.connect(interfGain);
      interfGain.connect(masterGain);

      // Primary tone oscillators
      osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1000, audioCtx.currentTime);
      osc1.connect(toneGain);

      osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1800, audioCtx.currentTime);
      const osc2Gain = audioCtx.createGain();
      osc2Gain.gain.setValueAtTime(0, audioCtx.currentTime);
      osc2.connect(osc2Gain);
      osc2Gain.connect(toneGain);
      osc2.gainNode = osc2Gain;

      osc3 = audioCtx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(2000, audioCtx.currentTime);
      const osc3Gain = audioCtx.createGain();
      osc3Gain.gain.setValueAtTime(0, audioCtx.currentTime);
      osc3.connect(osc3Gain);
      osc3Gain.connect(toneGain);
      osc3.gainNode = osc3Gain;

      // Start standing sources
      noiseSource.start();
      interfOsc.start();
      osc1.start();
      osc2.start();
      osc3.start();
    }
    return true;
  }

  function play() {
    if (!initContext()) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isPlaying = true;
    masterGain.gain.setTargetAtTime(userVolume * 0.25, audioCtx.currentTime, 0.05);
  }

  function pause() {
    if (audioCtx && isPlaying) {
      isPlaying = false;
      masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.05);
    }
  }

  function stop() {
    pause();
  }

  function setVolume(val) {
    userVolume = Math.max(0, Math.min(1.0, Number(val)));
    if (audioCtx && isPlaying && masterGain) {
      masterGain.gain.setTargetAtTime(userVolume * 0.25, audioCtx.currentTime, 0.03);
    }
  }

  /**
   * Synchronize audio synthesizer with current simulation state
   */
  function update(params = {}) {
    if (!audioCtx || !isPlaying) return;

    const fm = Number(params.fm || 1000);
    const mu = Number(params.mu !== undefined ? params.mu : 0.7);
    const channelNoise = Number(params.channelNoise || 0);
    const interference = Number(params.interference || 0);
    const toneType = params.toneType || 'sine1k';

    const now = audioCtx.currentTime;

    // Audible pitch scaling for comfortable listening
    let baseAudibleFreq = Math.min(3200, Math.max(180, fm));
    if (toneType === 'sine440') {
      baseAudibleFreq = 440;
    }

    // Configure oscillators based on tone type
    if (toneType === 'dualtone') {
      osc1.frequency.setTargetAtTime(baseAudibleFreq, now, 0.04);
      osc2.frequency.setTargetAtTime(baseAudibleFreq * 1.8, now, 0.04);
      osc2.gainNode.gain.setTargetAtTime(0.4, now, 0.04);
      osc3.gainNode.gain.setTargetAtTime(0, now, 0.04);
    } else if (toneType === 'harmonic') {
      osc1.frequency.setTargetAtTime(baseAudibleFreq, now, 0.04);
      osc2.frequency.setTargetAtTime(baseAudibleFreq * 2.0, now, 0.04);
      osc2.gainNode.gain.setTargetAtTime(0.3, now, 0.04);
      osc3.frequency.setTargetAtTime(baseAudibleFreq * 3.0, now, 0.04);
      osc3.gainNode.gain.setTargetAtTime(0.15, now, 0.04);
    } else {
      osc1.frequency.setTargetAtTime(baseAudibleFreq, now, 0.04);
      osc2.gainNode.gain.setTargetAtTime(0, now, 0.04);
      osc3.gainNode.gain.setTargetAtTime(0, now, 0.04);
    }

    // Dynamic wave shaper for envelope clipping distortion
    distortionShaper.curve = makeDiodeDistortionCurve(mu);

    // Static Noise gain based on channel noise percentage
    const noiseLevel = (channelNoise / 100) * 0.45;
    noiseGain.gain.setTargetAtTime(noiseLevel, now, 0.05);

    // Heterodyne interference gain
    const interfGainLevel = interference * 0.35;
    interfGain.gain.setTargetAtTime(interfGainLevel, now, 0.05);
  }

  function getStatus() {
    return {
      isPlaying,
      volume: userVolume,
      sampleRate: audioCtx ? audioCtx.sampleRate : null,
      state: audioCtx ? audioCtx.state : 'uninitialized'
    };
  }

  return {
    initContext,
    play,
    pause,
    stop,
    setVolume,
    update,
    getStatus
  };
});
