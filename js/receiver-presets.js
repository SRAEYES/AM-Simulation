/**
 * AM Broadcast Studio - Station Presets & Scenarios
 * Defines realistic illustrative broadcast station presets, simulation scenarios,
 * and baseband audio test signals.
 */

(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else {
    root.AMReceiverPresets = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const STATION_PRESETS = [
    {
      id: 'news',
      name: 'MW-810 Talk & News',
      callsign: 'WNYC-810 (Simulated)',
      band: 'Medium Wave (Regional)',
      dialFreq: '810 kHz',
      simFc: 20000,
      fm: 1000,
      Am: 7.0,
      Ac: 10.0,
      noise: 0,
      fading: 0,
      interference: 0,
      toneType: 'sine1k',
      description: 'Standard commercial talk broadcast. Clean 70% modulation depth compliant with ITU/FCC emission masks.'
    },
    {
      id: 'music',
      name: 'MW-1040 High-Fidelity Music',
      callsign: 'KFID-1040 (Simulated)',
      band: 'Medium Wave (High Power)',
      dialFreq: '1040 kHz',
      simFc: 25000,
      fm: 2400,
      Am: 8.5,
      Ac: 10.0,
      noise: 2,
      fading: 0,
      interference: 0,
      toneType: 'harmonic',
      description: 'Dynamic acoustic program with wider audio bandwidth (2.4 kHz tone) and 85% modulation depth for rich fidelity.'
    },
    {
      id: 'critical',
      name: 'MW-1000 Calibration Carrier',
      callsign: 'NIST-1000 (Simulated)',
      band: 'Medium Wave Standard',
      dialFreq: '1000 kHz',
      simFc: 20000,
      fm: 1500,
      Am: 10.0,
      Ac: 10.0,
      noise: 0,
      fading: 0,
      interference: 0,
      toneType: 'sine1k',
      description: 'Critical 100% modulation (μ = 1.00). Maximum carrier power utilization and theoretical 33.3% broadcast efficiency.'
    },
    {
      id: 'overdrive',
      name: 'MW-1200 Overmodulated Pirate',
      callsign: 'PIRATE-1200 (Simulated)',
      band: 'Unlicensed Transmitter',
      dialFreq: '1200 kHz',
      simFc: 22000,
      fm: 1200,
      Am: 14.0,
      Ac: 10.0,
      noise: 4,
      fading: 0,
      interference: 0,
      toneType: 'sine1k',
      description: 'Transmitter overdriven to 140% modulation (μ = 1.40). Severe diode envelope inversion, harmonic distortion, and splatter.'
    },
    {
      id: 'night_dx',
      name: 'MW-640 Nighttime Skywave DX',
      callsign: 'KFI-640 DX (Simulated)',
      band: 'Ionospheric Skywave',
      dialFreq: '640 kHz',
      simFc: 18000,
      fm: 900,
      Am: 6.0,
      Ac: 10.0,
      noise: 18,
      fading: 0.35,
      interference: 0,
      toneType: 'sine1k',
      description: 'Distant nighttime skywave bounce from ionospheric E-layer. Subject to atmospheric noise static and slow multipath fading.'
    },
    {
      id: 'interference',
      name: 'MW-1420 Adjacent Channel Clash',
      callsign: 'WCLASH-1420 (Simulated)',
      band: 'Crowded Metropolitan',
      dialFreq: '1420 kHz',
      simFc: 20000,
      fm: 1000,
      Am: 7.0,
      Ac: 10.0,
      noise: 6,
      fading: 0,
      interference: 0.25,
      toneType: 'dualtone',
      description: 'Adjacent-channel interference (+1.5 kHz offset) introducing an audible heterodyne beat whistle in the receiver audio.'
    }
  ];

  const SCENARIO_PRESETS = [
    {
      id: 'scenario_clear',
      name: 'Clear Daytime Groundwave',
      badge: 'Ideal SNR > 45 dB',
      Am: 7.0,
      Ac: 10.0,
      fm: 1000,
      fc: 20000,
      noise: 0,
      fading: 0,
      interference: 0,
      toneType: 'sine1k',
      summary: 'Ideal studio reception with strong local transmitter groundwave, zero static, and linear envelope recovery.'
    },
    {
      id: 'scenario_weak',
      name: 'Fringe Reception (Weak Carrier)',
      badge: 'Attenuated Carrier',
      Am: 2.5,
      Ac: 4.0,
      fm: 1000,
      fc: 20000,
      noise: 14,
      fading: 0.15,
      interference: 0,
      toneType: 'sine1k',
      summary: 'Distance attenuation has reduced signal strength. Receiver noise floor is noticeable; AGC must boost gain.'
    },
    {
      id: 'scenario_noisy',
      name: 'Heavy Atmospheric Thunderstorm',
      badge: 'High Static SNR ~ 12 dB',
      Am: 7.0,
      Ac: 10.0,
      fm: 1000,
      fc: 20000,
      noise: 28,
      fading: 0,
      interference: 0,
      toneType: 'sine1k',
      summary: 'Simulated thunderstorm static discharge masking the weaker envelope audio and reducing receiver SNR.'
    },
    {
      id: 'scenario_overmod',
      name: 'Transmitter Overmodulation Clamping',
      badge: 'Severe Cusp Distortion',
      Am: 14.0,
      Ac: 10.0,
      fm: 1000,
      fc: 20000,
      noise: 0,
      fading: 0,
      interference: 0,
      toneType: 'sine1k',
      summary: 'Modulation index μ = 1.40. Envelope passes below zero; diode detector clips negative peaks into cusps.'
    },
    {
      id: 'scenario_fading',
      name: 'Multipath Ionospheric Flutter',
      badge: 'Skywave Fading',
      Am: 7.0,
      Ac: 10.0,
      fm: 1000,
      fc: 20000,
      noise: 12,
      fading: 0.55,
      interference: 0,
      toneType: 'sine1k',
      summary: 'Phase cancellation between groundwave and skywave paths creates periodic deep amplitude flutter.'
    },
    {
      id: 'scenario_heterodyne',
      name: 'Co-Channel Carrier Heterodyne',
      badge: '1.5 kHz Beat Tone',
      Am: 7.0,
      Ac: 10.0,
      fm: 1000,
      fc: 20000,
      noise: 4,
      fading: 0,
      interference: 0.30,
      toneType: 'sine1k',
      summary: 'An uncoordinated nearby transmitter produces a loud continuous 1.5 kHz audible heterodyne squeal.'
    }
  ];

  const AUDIO_TEST_TONES = [
    { id: 'sine1k', name: '1.0 kHz Standard Calibration Tone', freq: 1000, desc: 'Pure sine tone standard for telecom benchmarks.' },
    { id: 'sine440', name: '440 Hz Concert Pitch (A4)', freq: 440, desc: 'Acoustic musical pitch for listening comfort.' },
    { id: 'dualtone', name: 'Dual-Tone Intermodulation (1.0 kHz + 1.8 kHz)', freq: 1000, desc: 'Two concurrent tones to expose non-linear intermodulation distortion.' },
    { id: 'harmonic', name: 'Harmonic Voice-like Complex Tone', freq: 1000, desc: 'Simulated voice timbre with fundamental and 2nd/3rd harmonics.' }
  ];

  return {
    STATION_PRESETS,
    SCENARIO_PRESETS,
    AUDIO_TEST_TONES
  };
});
