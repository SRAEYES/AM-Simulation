/**
 * AM Broadcast Studio - Experiments & Performance Comparison Manager
 * Runs reproducible multi-condition laboratory experiments, generates comparison tables,
 * computes comparative metrics (SNR, NRMSE, Bandwidth, Efficiency), and exports CSV/JSON data.
 */

(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else {
    root.AMExperimentsManager = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  const EXPERIMENT_DEFINITIONS = [
    {
      id: 'exp_mod_index',
      name: 'Experiment 1: Modulation Index & Envelope Distortion',
      description: 'Examines receiver performance across under-modulation (μ = 0.50), critical modulation (μ = 1.00), and transmitter overdrive (μ = 1.35). Demonstrates the onset of envelope inversion and diode cusp clipping distortion.',
      conditions: [
        { name: 'Under-Modulation (μ = 0.50)', Am: 5.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 0, fading: 0, interf: 0, seed: 101 },
        { name: 'Critical 100% (μ = 1.00)', Am: 10.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 0, fading: 0, interf: 0, seed: 101 },
        { name: 'Overmodulated (μ = 1.35)', Am: 13.5, Ac: 10.0, fm: 1000, fc: 20000, noise: 0, fading: 0, interf: 0, seed: 101 }
      ]
    },
    {
      id: 'exp_noise_impact',
      name: 'Experiment 2: Channel Noise & Demodulator SNR Threshold',
      description: 'Investigates how atmospheric and thermal noise impacts receiver audio quality and increases root-mean-square reconstruction error.',
      conditions: [
        { name: 'Clean Channel (0% Noise)', Am: 7.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 0, fading: 0, interf: 0, seed: 202 },
        { name: 'Moderate Static (12% Noise)', Am: 7.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 12, fading: 0, interf: 0, seed: 202 },
        { name: 'Heavy Thunderstorm (28% Noise)', Am: 7.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 28, fading: 0, interf: 0, seed: 202 }
      ]
    },
    {
      id: 'exp_signal_strength',
      name: 'Experiment 3: Carrier Amplitude & Weak-Signal Reception',
      description: 'Analyzes receiver response to distant transmitter signals with declining carrier amplitude under constant ambient channel noise.',
      conditions: [
        { name: 'Strong Local Mast (Ac = 16 V)', Am: 11.2, Ac: 16.0, fm: 1000, fc: 20000, noise: 8, fading: 0, interf: 0, seed: 303 },
        { name: 'Medium Suburban (Ac = 8 V)', Am: 5.6, Ac: 8.0, fm: 1000, fc: 20000, noise: 8, fading: 0, interf: 0, seed: 303 },
        { name: 'Fringe Reception (Ac = 3 V)', Am: 2.1, Ac: 3.0, fm: 1000, fc: 20000, noise: 8, fading: 0, interf: 0, seed: 303 }
      ]
    },
    {
      id: 'exp_fading_interf',
      name: 'Experiment 4: Multipath Fading vs Co-Channel Interference',
      description: 'Compares the physical degradation patterns of ionospheric skywave multipath flutter against co-channel adjacent station heterodyne tones.',
      conditions: [
        { name: 'Flat AWGN Baseline', Am: 7.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 5, fading: 0, interf: 0, seed: 404 },
        { name: 'Deep Multipath Fading (50%)', Am: 7.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 5, fading: 0.50, interf: 0, seed: 404 },
        { name: 'Co-Channel Carrier Heterodyne', Am: 7.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 5, fading: 0, interf: 0.25, seed: 404 }
      ]
    },
    {
      id: 'exp_audio_freq',
      name: 'Experiment 5: Audio Modulation Frequency & RF Bandwidth',
      description: 'Demonstrates the standard Carson/AM bandwidth law BW = 2 * fm and the corresponding frequency spacing of upper and lower sidebands.',
      conditions: [
        { name: 'Low Pitch Voice (fm = 500 Hz)', Am: 7.0, Ac: 10.0, fm: 500, fc: 20000, noise: 0, fading: 0, interf: 0, seed: 505 },
        { name: 'Standard Telecom (fm = 1000 Hz)', Am: 7.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 0, fading: 0, interf: 0, seed: 505 },
        { name: 'High-Fidelity Audio (fm = 3000 Hz)', Am: 7.0, Ac: 10.0, fm: 3000, fc: 20000, noise: 0, fading: 0, interf: 0, seed: 505 }
      ]
    },
    {
      id: 'exp_power_eff',
      name: 'Experiment 6: Transmitter Power Allocation & Sideband Efficiency',
      description: 'Calculates the ratio of intelligence-bearing sideband power to total transmitted power across low, moderate, and critical modulation indices.',
      conditions: [
        { name: 'Low Modulation (μ = 0.30)', Am: 3.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 0, fading: 0, interf: 0, seed: 606 },
        { name: 'Nominal Commercial (μ = 0.70)', Am: 7.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 0, fading: 0, interf: 0, seed: 606 },
        { name: 'Theoretical Max (μ = 1.00)', Am: 10.0, Ac: 10.0, fm: 1000, fc: 20000, noise: 0, fading: 0, interf: 0, seed: 606 }
      ]
    }
  ];

  let currentResults = [];
  let currentExperiment = EXPERIMENT_DEFINITIONS[0];

  function runExperiment(expId) {
    const exp = EXPERIMENT_DEFINITIONS.find(e => e.id === expId) || EXPERIMENT_DEFINITIONS[0];
    currentExperiment = exp;
    currentResults = [];

    if (!window.AMSignalEngine) return [];

    for (const cond of exp.conditions) {
      const sim = window.AMSignalEngine.computeSimulation({
        Am: cond.Am,
        Ac: cond.Ac,
        fm: cond.fm,
        fc: cond.fc,
        channelNoise: cond.noise,
        fadingDepth: cond.fading,
        interference: cond.interf,
        seed: cond.seed
      });

      const fLSB = cond.fc - cond.fm;
      const fUSB = cond.fc + cond.fm;

      currentResults.push({
        conditionName: cond.name,
        params: cond,
        mu: sim.derived.mu,
        modPercent: sim.derived.modPercent.toFixed(1) + '%',
        bandwidthHz: sim.derived.theoreticalBw,
        carrierFreqHz: cond.fc,
        lsbFreqHz: fLSB,
        usbFreqHz: fUSB,
        efficiencyPercent: sim.derived.efficiency.toFixed(1) + '%',
        snrDb: sim.derived.snrDb.toFixed(1),
        nrmsePercent: sim.derived.nrmse.toFixed(2) + '%',
        rslNorm: sim.derived.rslNorm.toFixed(1) + '%',
        qualityClass: sim.derived.qualityClass,
        demodStatus: sim.derived.demodStatus
      });
    }

    return currentResults;
  }

  function exportCSV() {
    if (!currentResults || currentResults.length === 0) return;

    const headers = [
      'Experiment',
      'Condition',
      'Modulation_Index_mu',
      'Carrier_Freq_Hz',
      'Message_Freq_Hz',
      'LSB_Freq_Hz',
      'USB_Freq_Hz',
      'Bandwidth_Hz',
      'Power_Efficiency_pct',
      'Model_SNR_dB',
      'NRMSE_Distortion_pct',
      'Received_Level_pct',
      'Quality_Class'
    ];

    const rows = currentResults.map(r => [
      `"${currentExperiment.name}"`,
      `"${r.conditionName}"`,
      r.mu.toFixed(2),
      r.carrierFreqHz,
      r.params.fm,
      r.lsbFreqHz,
      r.usbFreqHz,
      r.bandwidthHz,
      `"${r.efficiencyPercent}"`,
      r.snrDb,
      `"${r.nrmsePercent}"`,
      `"${r.rslNorm}"`,
      `"${r.qualityClass}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentExperiment.id}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportJSON() {
    if (!currentResults || currentResults.length === 0) return;

    const exportData = {
      experimentId: currentExperiment.id,
      experimentTitle: currentExperiment.name,
      description: currentExperiment.description,
      exportTimestamp: new Date().toISOString(),
      methodology: 'Conventional Amplitude Modulation (DSB-FC) with Diode Envelope Detection & AWGN Channel Model',
      results: currentResults
    };

    const jsonContent = 'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(exportData, null, 2));

    const link = document.createElement('a');
    link.setAttribute('href', jsonContent);
    link.setAttribute('download', `${currentExperiment.id}_results.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return {
    EXPERIMENT_DEFINITIONS,
    runExperiment,
    exportCSV,
    exportJSON,
    getCurrentResults: () => currentResults,
    getCurrentExperiment: () => currentExperiment
  };
});
