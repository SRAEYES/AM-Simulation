/**
 * AM Broadcast Studio - Signal Processing Engine
 * Core mathematical engine for Amplitude Modulation, Channel Impairments,
 * Diode Envelope Detection, FFT Spectrum Analysis, and Signal Metrics.
 * 
 * Works in both browser (window.AMSignalEngine) and Node.js (CommonJS).
 */

(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else {
    root.AMSignalEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  // Sampling configuration
  const DEFAULT_N = 1024;
  const DEFAULT_DURATION = 0.001; // 1 millisecond window -> Fs = 1.024 MHz

  /**
   * Mulberry32 deterministic pseudo-random number generator
   * Allows perfectly reproducible experiment comparisons
   */
  function createPRNG(seed) {
    let s = Math.floor(seed) >>> 0;
    return function() {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Gaussian Random Number Generator using Box-Muller transform
   */
  function createGaussianRNG(prng) {
    let hasSpare = false;
    let spare = 0;
    return function(mean = 0, stdDev = 1) {
      if (hasSpare) {
        hasSpare = false;
        return mean + stdDev * spare;
      }
      let u = 0, v = 0, s = 0;
      do {
        u = prng() * 2 - 1;
        v = prng() * 2 - 1;
        s = u * u + v * v;
      } while (s >= 1 || s === 0);
      const mul = Math.sqrt(-2.0 * Math.log(s) / s);
      spare = v * mul;
      hasSpare = true;
      return mean + stdDev * (u * mul);
    };
  }

  /**
   * Compute Baseband Audio Message m(t)
   */
  function generateMessageSample(t, Am, fm, toneType = 'sine1k') {
    const twoPiFm = 2 * Math.PI * fm;
    switch (toneType) {
      case 'sine440':
        // Musical concert pitch 440 Hz
        return Am * Math.cos(2 * Math.PI * 440 * t);
      case 'dualtone':
        // Two-tone test signal (e.g. 1 kHz + 1.8 kHz)
        return Am * (0.6 * Math.cos(twoPiFm * t) + 0.4 * Math.cos(2 * Math.PI * (1.8 * fm) * t));
      case 'harmonic':
        // Voice-like harmonic spectrum: fundamental + 2nd & 3rd harmonics
        return Am * (
          0.65 * Math.cos(twoPiFm * t) +
          0.25 * Math.cos(4 * Math.PI * fm * t) +
          0.10 * Math.cos(6 * Math.PI * fm * t)
        );
      case 'sine1k':
      default:
        // Pure single tone m(t) = Am * cos(2 * pi * fm * t)
        return Am * Math.cos(twoPiFm * t);
    }
  }

  /**
   * Main Signal Processing Pipeline
   * Generates time vectors, message, carrier, modulated wave, channel wave,
   * demodulated output, envelopes, and analytical metrics.
   */
  function computeSimulation(params = {}) {
    const N = params.N || DEFAULT_N;
    const duration = params.duration || DEFAULT_DURATION;
    const shift = params.shift || 0;

    const Am = Number(params.Am !== undefined ? params.Am : 7.0);
    const Ac = Number(params.Ac !== undefined ? params.Ac : 10.0);
    const fm = Number(params.fm !== undefined ? params.fm : 1000);
    const fc = Number(params.fc !== undefined ? params.fc : 20000);

    const channelNoise = Number(params.channelNoise !== undefined ? params.channelNoise : 0); // 0 to 50 %
    const fadingDepth = Number(params.fadingDepth !== undefined ? params.fadingDepth : 0);   // 0 to 0.8
    const interference = Number(params.interference !== undefined ? params.interference : 0); // 0 to 0.5
    const toneType = params.toneType || 'sine1k';
    const seed = params.seed !== undefined && params.seed !== null ? params.seed : null;

    // PRNG setup for deterministic experiments or live sweep
    const prng = seed !== null ? createPRNG(seed) : Math.random;
    const gaussianRNG = createGaussianRNG(prng);

    const dt = duration / N;
    const Fs = N / duration;

    // Allocate arrays
    const t = new Float64Array(N);
    const message = new Float64Array(N);
    const carrier = new Float64Array(N);
    const modulated = new Float64Array(N);
    const received = new Float64Array(N);
    const upperEnv = new Float64Array(N);
    const lowerEnv = new Float64Array(N);
    const demodulated = new Float64Array(N);
    const recoveredNormalized = new Float64Array(N);

    // Fundamental AM metrics
    const mu = Ac > 0 ? Am / Ac : 0;
    const modPercent = mu * 100;
    const theoreticalBw = 2 * fm;
    const efficiency = (mu * mu) / (2 + mu * mu) * 100;

    // Antenna quarter-wave size in km (speed of light c = 300,000 km/s)
    const antennaQuarterKm = (300000 / (4 * fc));
    const audioAntennaKm = (300000 / (4 * fm));

    // Channel noise standard deviation
    const noiseStdDev = (channelNoise / 100) * (Ac * 0.707);

    // Fading frequency across the window (simulates slow channel fade)
    const fadeFreq = 200; // Hz
    // Interference carrier offset (e.g. adjacent channel 1.5 kHz away)
    const fInterf = fc + 1500;

    const twoPiFc = 2 * Math.PI * fc;
    const twoPiFInterf = 2 * Math.PI * fInterf;

    let receivedPowerSum = 0;
    let originalSignalPowerSum = 0;

    for (let i = 0; i < N; i++) {
      const time = (i * dt) + shift;
      t[i] = i * dt; // Plot time axis relative to window start

      const m = generateMessageSample(time, Am, fm, toneType);
      const c = Ac * Math.cos(twoPiFc * time);
      const s = (Ac + m) * Math.cos(twoPiFc * time);

      // Channel Impairments
      let fadeMultiplier = 1.0;
      if (fadingDepth > 0) {
        fadeMultiplier = 1.0 - (fadingDepth * 0.5 * (1.0 - Math.cos(2 * Math.PI * fadeFreq * time)));
      }

      let interf = 0;
      if (interference > 0) {
        interf = (Ac * interference) * Math.cos(twoPiFInterf * time);
      }

      let noise = 0;
      if (noiseStdDev > 0) {
        noise = gaussianRNG(0, noiseStdDev);
      }

      const r = (s * fadeMultiplier) + interf + noise;

      message[i] = m;
      carrier[i] = c;
      modulated[i] = s;
      received[i] = r;
      upperEnv[i] = Ac + m;
      lowerEnv[i] = -(Ac + m);

      originalSignalPowerSum += s * s;
      receivedPowerSum += r * r;
    }

    // Demodulation: Diode Envelope Detector (Diode Conduction + RC Discharge + DC Blocking)
    // Physical Diode Detector:
    // - Forward conduction when r(t) > v_cap (fast charge with diode forward resistance)
    // - Reverse bias when r(t) < v_cap (slow discharge through RC load resistor)
    // - Time constant RC is selected such that 1/fc << RC << 1/fm (typically ~ 4 to 6 carrier cycles)
    const rcFactor = 4.5;
    const rcTime = rcFactor / Math.max(1000, fc);
    const decayFactor = Math.exp(-dt / rcTime);
    const chargeAlpha = 0.85; // fast forward diode conduction

    // Pre-condition / warm up the capacitor over 2 cycles to reach steady-state
    let capVoltage = Math.max(0, Ac);
    for (let w = 0; w < N * 2; w++) {
      const time = ((w % N) * dt) + shift;
      const m = generateMessageSample(time, Am, fm, toneType);
      const s = (Ac + m) * Math.cos(twoPiFc * time);
      if (s > capVoltage) {
        capVoltage += chargeAlpha * (s - capVoltage);
      } else {
        capVoltage *= decayFactor;
      }
    }

    let dcSum = 0;
    for (let i = 0; i < N; i++) {
      const r = received[i];
      if (r > capVoltage) {
        capVoltage += chargeAlpha * (r - capVoltage);
      } else {
        capVoltage *= decayFactor;
      }
      demodulated[i] = capVoltage;
      dcSum += capVoltage;
    }

    // DC-blocking capacitor to isolate recovered AC message audio
    const dcMean = dcSum / N;
    for (let i = 0; i < N; i++) {
      recoveredNormalized[i] = demodulated[i] - dcMean;
    }

    // Delay compensation & Reconstruction Distortion (NRMSE)
    // Search best alignment within 1 carrier period (~ 20 to 50 samples)
    const maxSearchDelay = Math.min(60, Math.round((1.0 / fc) / dt * 1.5));
    let bestErrorSum = Infinity;
    let bestDelay = 0;

    for (let d = 0; d <= maxSearchDelay; d++) {
      let errSum = 0;
      let cnt = 0;
      for (let i = d; i < N; i++) {
        const orig = message[i - d];
        const rec = recoveredNormalized[i];
        const diff = rec - orig;
        errSum += diff * diff;
        cnt++;
      }
      if (cnt > 0 && errSum / cnt < bestErrorSum) {
        bestErrorSum = errSum / cnt;
        bestDelay = d;
      }
    }

    const rmse = Math.sqrt(bestErrorSum);
    const signalRange = Math.max(0.001, 2 * Am);
    const nrmse = Math.min(100, (rmse / signalRange) * 100);

    // Model-derived SNR in dB
    const avgSignalPower = originalSignalPowerSum / N;
    const actualNoisePower = (noiseStdDev * noiseStdDev) + (interference * Ac * interference * Ac * 0.5);
    let snrDb = 55.0; // Clean baseline
    if (actualNoisePower > 1e-9) {
      snrDb = 10 * Math.log10(avgSignalPower / actualNoisePower);
      snrDb = Math.max(-10, Math.min(60, snrDb));
    }

    // Normalized Received Signal Level (RSSI-like index 0 to 100%, dimensionless)
    const receivedRms = Math.sqrt(receivedPowerSum / N);
    const nominalRms = Ac * 0.7071;
    const rslNorm = Math.min(100, Math.max(0, (receivedRms / (nominalRms || 1)) * 100));

    // Reception Quality Classification
    let qualityClass = 'Excellent';
    let qualityBadgeClass = 'status-excellent';
    let demodStatus = 'Linear Envelope Recovery';

    if (mu > 1.05) {
      demodStatus = 'Severe Cusp / Negative Peak Clipping';
      qualityClass = 'Overmodulated (Distortion)';
      qualityBadgeClass = 'status-over';
    } else if (snrDb < 6.0) {
      demodStatus = 'Heavy Noise Masking';
      qualityClass = 'Unusable (High Noise)';
      qualityBadgeClass = 'status-poor';
    } else if (snrDb < 14.0) {
      demodStatus = 'Noisy Envelope Detection';
      qualityClass = 'Poor Reception';
      qualityBadgeClass = 'status-poor';
    } else if (snrDb < 22.0 || fadingDepth > 0.4 || interference > 0.2) {
      demodStatus = 'Moderate Degradation / Heterodyne Interference';
      qualityClass = 'Fair Reception';
      qualityBadgeClass = 'status-fair';
    } else if (mu >= 0.95 && mu <= 1.05) {
      demodStatus = 'Critical 100% Modulation';
      qualityClass = 'Good (High Efficiency)';
      qualityBadgeClass = 'status-good';
    } else {
      demodStatus = 'Undistorted Baseband Audio';
      qualityClass = 'Excellent (Clean Signal)';
      qualityBadgeClass = 'status-excellent';
    }

    return {
      params: { Am, Ac, fm, fc, channelNoise, fadingDepth, interference, toneType, seed },
      derived: {
        mu,
        modPercent,
        theoreticalBw,
        efficiency,
        antennaQuarterKm,
        audioAntennaKm,
        snrDb,
        rslNorm,
        nrmse,
        qualityClass,
        qualityBadgeClass,
        demodStatus
      },
      signals: {
        t,
        message,
        carrier,
        modulated,
        received,
        upperEnv,
        lowerEnv,
        demodulated,
        recoveredNormalized
      }
    };
  }

  /**
   * Fast Radix-2 Cooley-Tukey FFT
   * Computes calibrated single-sided spectrum with exact frequency axis in Hz
   */
  function computeFFT(signal, duration = DEFAULT_DURATION, maxFreqLimit = 50000) {
    const n = signal.length;
    // Check power of 2
    if ((n & (n - 1)) !== 0) {
      throw new Error(`FFT length must be a power of 2, received: ${n}`);
    }

    const re = new Float64Array(signal);
    const im = new Float64Array(n);

    // Bit reversal permutation
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        const tr = re[i]; re[i] = re[j]; re[j] = tr;
        const ti = im[i]; im[i] = im[j]; im[j] = ti;
      }
    }

    // Cooley-Tukey butterflies
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const ang = -2.0 * Math.PI / len;
      const wstepR = Math.cos(ang);
      const wstepI = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let wr = 1.0, wi = 0.0;
        for (let j = 0; j < half; j++) {
          const uR = re[i + j], uI = im[i + j];
          const vR = re[i + j + half] * wr - im[i + j + half] * wi;
          const vI = re[i + j + half] * wi + im[i + j + half] * wr;
          re[i + j] = uR + vR;
          im[i + j] = uI + vI;
          re[i + j + half] = uR - vR;
          im[i + j + half] = uI - vI;
          const nextWr = wr * wstepR - wi * wstepI;
          wi = wr * wstepI + wi * wstepR;
          wr = nextWr;
        }
      }
    }

    // Extract calibrated single-sided amplitude spectrum
    const freqStep = 1.0 / duration; // Hz per bin = 1000 Hz for 1 ms window
    const halfN = n / 2;
    const freq = [];
    const mag = [];

    // DC component
    freq.push(0);
    mag.push(Math.abs(re[0]) / n);

    for (let k = 1; k < halfN; k++) {
      const f = k * freqStep;
      if (f > maxFreqLimit) break;
      freq.push(f);
      // Normalized single-sided amplitude: 2 * |X_k| / N
      const magnitude = (2.0 * Math.sqrt(re[k] * re[k] + im[k] * im[k])) / n;
      mag.push(magnitude);
    }

    return { freq, mag, freqStep };
  }

  /**
   * Peak Detector for FFT Spectrum
   * Identifies Carrier and Sidebands
   */
  function identifySpectrumPeaks(fft, fc, fm) {
    const { freq, mag } = fft;
    let carrierPeak = { freq: fc, mag: 0, index: -1 };
    let lsbPeak = { freq: fc - fm, mag: 0, index: -1 };
    let usbPeak = { freq: fc + fm, mag: 0, index: -1 };

    const tol = 1200; // Search tolerance in Hz (1 bin)

    for (let i = 0; i < freq.length; i++) {
      const f = freq[i];
      const m = mag[i];
      if (Math.abs(f - fc) <= tol && m > carrierPeak.mag) {
        carrierPeak = { freq: f, mag: m, index: i };
      }
      if (Math.abs(f - (fc - fm)) <= tol && m > lsbPeak.mag) {
        lsbPeak = { freq: f, mag: m, index: i };
      }
      if (Math.abs(f - (fc + fm)) <= tol && m > usbPeak.mag) {
        usbPeak = { freq: f, mag: m, index: i };
      }
    }

    return { carrier: carrierPeak, lsb: lsbPeak, usb: usbPeak };
  }

  return {
    DEFAULT_N,
    DEFAULT_DURATION,
    createPRNG,
    computeSimulation,
    computeFFT,
    identifySpectrumPeaks
  };
});
