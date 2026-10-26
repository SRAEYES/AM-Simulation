/**
 * AM Broadcast Studio - Application Controller
 * Coordinates UI tabs, parameter inputs, telemetry updates, oscilloscope animations,
 * audio playback, experiment workflows, and export actions.
 */

(function() {
  'use strict';

  // Active Simulation State
  const state = {
    Am: 7.0,
    Ac: 10.0,
    fm: 1000,
    fc: 20000,
    channelNoise: 0,
    fadingDepth: 0,
    interference: 0,
    toneType: 'sine1k',
    isAnimating: true,
    animShift: 0,
    animReqId: null,
    activeTab: 'receiver',
    activeStationPreset: 'news',
    activeScenario: null
  };

  let vuInterval = null;

  // Initialize Application
  document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupStationPresets();
    setupScenarioPresets();
    setupSlidersAndInputs();
    setupAudioControls();
    setupExperiments();
    setupFlowDiagram();

    // Initial calculation and chart rendering
    runSimulation();
    initPlots();
    startAnimationLoop();

    // Run initial experiment table
    runCurrentExperiment('exp_mod_index');
  });

  /* -------------------------------------------------------------
   * NAVIGATION TAB CONTROLLER
   * ------------------------------------------------------------- */
  function setupNavigation() {
    const tabButtons = document.querySelectorAll('.nav-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    // Quick Action button in Overview
    const openReceiverBtn = document.getElementById('openReceiverBtn');
    if (openReceiverBtn) {
      openReceiverBtn.addEventListener('click', () => switchTab('receiver'));
    }
  }

  function switchTab(tabId) {
    state.activeTab = tabId;

    document.querySelectorAll('.nav-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === `tab-${tabId}`);
    });

    // Resize Plotly plots when tab becomes visible
    if (window.Plotly) {
      setTimeout(() => {
        const plotIds = ['messagePlot', 'carrierPlot', 'modulatedPlot', 'receivedPlot', 'demodOverlayPlot', 'spectrumPlot', 'receiverPreviewPlot'];
        plotIds.forEach(id => {
          const el = document.getElementById(id);
          if (el && el.clientWidth > 0) {
            Plotly.Plots.resize(el);
          }
        });
      }, 50);
    }
  }

  /* -------------------------------------------------------------
   * SIMULATION PIPELINE & TELEMETRY
   * ------------------------------------------------------------- */
  function runSimulation(shift = 0) {
    if (!window.AMSignalEngine) return null;

    const sim = window.AMSignalEngine.computeSimulation({
      Am: state.Am,
      Ac: state.Ac,
      fm: state.fm,
      fc: state.fc,
      channelNoise: state.channelNoise,
      fadingDepth: state.fadingDepth,
      interference: state.interference,
      toneType: state.toneType,
      shift: shift
    });

    updateTelemetry(sim);

    // Audio synthesizer synchronization
    if (window.AMAudioEngine) {
      window.AMAudioEngine.update({
        fm: state.fm,
        mu: sim.derived.mu,
        channelNoise: state.channelNoise,
        interference: state.interference,
        toneType: state.toneType
      });
    }

    return sim;
  }

  function updateTelemetry(sim) {
    const { derived, params } = sim;

    // Modulation Index
    setText('kpiMu', derived.mu.toFixed(2));
    setText('kpiModPercent', derived.modPercent.toFixed(1) + '%');
    setText('kpiBandwidth', (derived.theoreticalBw / 1000).toFixed(2) + ' kHz');
    setText('kpiEfficiency', derived.efficiency.toFixed(1) + '%');
    setText('kpiAntenna', derived.antennaQuarterKm.toFixed(2) + ' km');
    setText('kpiAudioAntenna', `Audio Direct: ${derived.audioAntennaKm.toFixed(0)} km`);
    setText('kpiSnr', derived.snrDb.toFixed(1) + ' dB');
    setText('kpiRsl', derived.rslNorm.toFixed(0) + '%');
    setText('kpiNrmse', derived.nrmse.toFixed(2) + '%');

    // Overview Tab summary card
    setText('overviewActiveCarrier', `${(params.fc / 1000).toFixed(0)} kHz (Simulated MW)`);
    setText('overviewActiveAudio', `${params.fm} Hz Tone (${state.toneType})`);
    setText('overviewActiveMu', `μ = ${derived.mu.toFixed(2)} (${derived.modPercent.toFixed(0)}%)`);
    setText('overviewActiveQuality', derived.qualityClass);

    // Dynamic Quality Badges
    const badgeElements = document.querySelectorAll('.quality-dynamic-badge');
    badgeElements.forEach(badge => {
      badge.innerText = derived.qualityClass;
      badge.className = `metric-badge quality-dynamic-badge ${derived.qualityBadgeClass}`;
    });

    const statusBadge = document.getElementById('kpiMuStatusBadge');
    if (statusBadge) {
      if (derived.mu < 0.98) {
        statusBadge.innerText = 'Under-Modulation (Safe)';
        statusBadge.className = 'metric-badge status-under';
      } else if (derived.mu <= 1.02) {
        statusBadge.innerText = 'Critical 100% (Maximum)';
        statusBadge.className = 'metric-badge status-crit';
      } else {
        statusBadge.innerText = 'Over-Modulation (Splatter!)';
        statusBadge.className = 'metric-badge status-over';
      }
    }

    setText('kpiDemodStatus', derived.demodStatus);
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
  }

  /* -------------------------------------------------------------
   * SLIDERS & CONTROLS BINDINGS
   * ------------------------------------------------------------- */
  function setupSlidersAndInputs() {
    const sliders = [
      { id: 'mAmp', key: 'Am', readout: 'mAmpVal', unit: ' V' },
      { id: 'cAmp', key: 'Ac', readout: 'cAmpVal', unit: ' V' },
      { id: 'mFreq', key: 'fm', readout: 'mFreqVal', unit: ' Hz' },
      { id: 'cFreq', key: 'fc', readout: 'cFreqVal', unit: ' Hz' },
      { id: 'channelNoise', key: 'channelNoise', readout: 'noiseVal', unit: ' %' },
      { id: 'fadingDepth', key: 'fadingDepth', readout: 'fadingVal', unit: ' %', scale: 0.01 },
      { id: 'interferenceLevel', key: 'interference', readout: 'interfVal', unit: ' %', scale: 0.01 }
    ];

    sliders.forEach(s => {
      const el = document.getElementById(s.id);
      if (!el) return;

      el.addEventListener('input', () => {
        const rawVal = parseFloat(el.value);
        state[s.key] = s.scale ? rawVal * s.scale : rawVal;

        const readoutEl = document.getElementById(s.readout);
        if (readoutEl) {
          readoutEl.innerText = rawVal + s.unit;
        }

        const sim = runSimulation(state.animShift);
        if (window.AMChartManager && sim) {
          window.AMChartManager.updateStaticPlots(sim);
        }
      });
    });

    // Audio test tone selector
    const toneSelect = document.getElementById('toneSelect');
    if (toneSelect) {
      toneSelect.addEventListener('change', () => {
        state.toneType = toneSelect.value;
        const sim = runSimulation(state.animShift);
        if (window.AMChartManager && sim) {
          window.AMChartManager.updateStaticPlots(sim);
        }
      });
    }

    // Reset Defaults Button
    const resetBtn = document.getElementById('resetDefaultsBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => applyStationPreset('news'));
    }

    // Pause/Resume Sweep Button
    const sweepBtn = document.getElementById('toggleSweepBtn');
    if (sweepBtn) {
      sweepBtn.addEventListener('click', () => toggleSweepAnimation(sweepBtn));
    }

    // Chart Export Buttons
    document.querySelectorAll('[data-export-plot]').forEach(btn => {
      btn.addEventListener('click', () => {
        const plotId = btn.getAttribute('data-export-plot');
        if (window.AMChartManager) {
          window.AMChartManager.exportChartPNG(plotId);
        }
      });
    });
  }

  /* -------------------------------------------------------------
   * PRESETS (STATIONS & SCENARIOS)
   * ------------------------------------------------------------- */
  function setupStationPresets() {
    if (!window.AMReceiverPresets) return;
    const presetsContainer = document.getElementById('stationPresetsContainer');
    if (!presetsContainer) return;

    presetsContainer.innerHTML = '';
    window.AMReceiverPresets.STATION_PRESETS.forEach(p => {
      const btn = document.createElement('button');
      btn.className = `preset-pill-btn ${p.id === state.activeStationPreset ? 'active' : ''}`;
      btn.id = `preset-btn-${p.id}`;
      btn.innerHTML = `
        <span class="preset-pill-title">${p.name}</span>
        <span class="preset-pill-sub">${p.dialFreq} &bull; ${p.callsign.split(' ')[0]}</span>
      `;
      btn.addEventListener('click', () => applyStationPreset(p.id));
      presetsContainer.appendChild(btn);
    });
  }

  function applyStationPreset(presetId) {
    if (!window.AMReceiverPresets) return;
    const p = window.AMReceiverPresets.STATION_PRESETS.find(x => x.id === presetId);
    if (!p) return;

    state.activeStationPreset = presetId;
    state.Am = p.Am;
    state.Ac = p.Ac;
    state.fm = p.fm;
    state.fc = p.simFc;
    state.channelNoise = p.noise;
    state.fadingDepth = p.fading;
    state.interference = p.interference;
    state.toneType = p.toneType;

    // Update Sliders & Inputs
    updateSliderVal('mAmp', p.Am, 'mAmpVal', ' V');
    updateSliderVal('cAmp', p.Ac, 'cAmpVal', ' V');
    updateSliderVal('mFreq', p.fm, 'mFreqVal', ' Hz');
    updateSliderVal('cFreq', p.simFc, 'cFreqVal', ' Hz');
    updateSliderVal('channelNoise', p.noise, 'noiseVal', ' %');
    updateSliderVal('fadingDepth', Math.round(p.fading * 100), 'fadingVal', ' %');
    updateSliderVal('interferenceLevel', Math.round(p.interference * 100), 'interfVal', ' %');

    const toneSelect = document.getElementById('toneSelect');
    if (toneSelect) toneSelect.value = p.toneType;

    // Update active highlight
    document.querySelectorAll('.preset-pill-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`preset-btn-${p.id}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update preset description readout
    setText('activeStationDesc', p.description);
    setText('activeStationCallsign', p.callsign);

    const sim = runSimulation(state.animShift);
    if (window.AMChartManager && sim) {
      window.AMChartManager.updateStaticPlots(sim);
    }
  }

  function setupScenarioPresets() {
    if (!window.AMReceiverPresets) return;
    const scenarioContainer = document.getElementById('scenarioPresetsContainer');
    if (!scenarioContainer) return;

    scenarioContainer.innerHTML = '';
    window.AMReceiverPresets.SCENARIO_PRESETS.forEach(s => {
      const btn = document.createElement('button');
      btn.className = 'preset-pill-btn';
      btn.innerHTML = `
        <span class="preset-pill-title">${s.name}</span>
        <span class="preset-pill-sub">${s.badge}</span>
      `;
      btn.addEventListener('click', () => applyScenarioPreset(s));
      scenarioContainer.appendChild(btn);
    });
  }

  function applyScenarioPreset(s) {
    state.Am = s.Am;
    state.Ac = s.Ac;
    state.fm = s.fm;
    state.fc = s.fc;
    state.channelNoise = s.noise;
    state.fadingDepth = s.fading;
    state.interference = s.interference;
    state.toneType = s.toneType;

    updateSliderVal('mAmp', s.Am, 'mAmpVal', ' V');
    updateSliderVal('cAmp', s.Ac, 'cAmpVal', ' V');
    updateSliderVal('mFreq', s.fm, 'mFreqVal', ' Hz');
    updateSliderVal('cFreq', s.fc, 'cFreqVal', ' Hz');
    updateSliderVal('channelNoise', s.noise, 'noiseVal', ' %');
    updateSliderVal('fadingDepth', Math.round(s.fading * 100), 'fadingVal', ' %');
    updateSliderVal('interferenceLevel', Math.round(s.interference * 100), 'interfVal', ' %');

    setText('activeStationDesc', s.summary);
    setText('activeStationCallsign', `Scenario: ${s.name}`);

    const sim = runSimulation(state.animShift);
    if (window.AMChartManager && sim) {
      window.AMChartManager.updateStaticPlots(sim);
    }
  }

  function updateSliderVal(id, val, readoutId, unit) {
    const el = document.getElementById(id);
    if (el) el.value = val;
    const readout = document.getElementById(readoutId);
    if (readout) readout.innerText = val + unit;
  }

  /* -------------------------------------------------------------
   * AUDIO CONTROLS & VU METER
   * ------------------------------------------------------------- */
  function setupAudioControls() {
    const playAudioBtn = document.getElementById('playAudioBtn');
    const stopAudioBtn = document.getElementById('stopAudioBtn');
    const volumeSlider = document.getElementById('audioVolume');
    const audioStatusBadge = document.getElementById('audioStatusBadge');
    const vuFill = document.getElementById('vuMeterFill');

    if (playAudioBtn) {
      playAudioBtn.addEventListener('click', () => {
        if (!window.AMAudioEngine) return;
        const status = window.AMAudioEngine.getStatus();
        if (!status.isPlaying) {
          window.AMAudioEngine.play();
          playAudioBtn.innerHTML = '⏸ Pause Audio';
          playAudioBtn.className = 'btn btn-secondary';
          if (audioStatusBadge) {
            audioStatusBadge.innerText = 'Audio Active';
            audioStatusBadge.className = 'metric-badge status-good';
          }
          startVuMeter(vuFill);
        } else {
          window.AMAudioEngine.pause();
          playAudioBtn.innerHTML = '▶ Play Demodulated Audio';
          playAudioBtn.className = 'btn btn-teal';
          if (audioStatusBadge) {
            audioStatusBadge.innerText = 'Muted';
            audioStatusBadge.className = 'metric-badge';
          }
          stopVuMeter(vuFill);
        }
      });
    }

    if (stopAudioBtn) {
      stopAudioBtn.addEventListener('click', () => {
        if (window.AMAudioEngine) window.AMAudioEngine.stop();
        if (playAudioBtn) {
          playAudioBtn.innerHTML = '▶ Play Demodulated Audio';
          playAudioBtn.className = 'btn btn-teal';
        }
        if (audioStatusBadge) {
          audioStatusBadge.innerText = 'Stopped';
          audioStatusBadge.className = 'metric-badge';
        }
        stopVuMeter(vuFill);
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', () => {
        const val = parseFloat(volumeSlider.value);
        if (window.AMAudioEngine) window.AMAudioEngine.setVolume(val);
        setText('volumeVal', `${Math.round(val * 100)}%`);
      });
    }
  }

  function startVuMeter(vuFill) {
    if (!vuFill) return;
    clearInterval(vuInterval);
    vuInterval = setInterval(() => {
      const mu = state.Am / state.Ac;
      const pct = Math.min(100, Math.max(15, mu * 60 + Math.random() * 20));
      vuFill.style.width = pct + '%';
    }, 120);
  }

  function stopVuMeter(vuFill) {
    clearInterval(vuInterval);
    if (vuFill) vuFill.style.width = '0%';
  }

  /* -------------------------------------------------------------
   * ANIMATION SWEEP LOOP
   * ------------------------------------------------------------- */
  function startAnimationLoop() {
    function loop() {
      if (state.isAnimating) {
        state.animShift += 0.000015;
        const sim = runSimulation(state.animShift);
        if (window.AMChartManager && sim) {
          window.AMChartManager.fastSweepRestyle(sim);
        }
      }
      state.animReqId = requestAnimationFrame(loop);
    }
    state.animReqId = requestAnimationFrame(loop);
  }

  function toggleSweepAnimation(btn) {
    state.isAnimating = !state.isAnimating;
    if (state.isAnimating) {
      btn.innerText = '⏸ Pause Sweep';
      btn.className = 'btn btn-secondary';
    } else {
      btn.innerText = '▶ Resume Sweep';
      btn.className = 'btn btn-primary';
    }
  }

  function initPlots() {
    const sim = runSimulation();
    if (window.AMChartManager && sim) {
      window.AMChartManager.initAllPlots(sim);
    }
  }

  /* -------------------------------------------------------------
   * EXPERIMENTS MANAGEMENT
   * ------------------------------------------------------------- */
  function setupExperiments() {
    const expSelect = document.getElementById('experimentSelect');
    if (expSelect && window.AMExperimentsManager) {
      expSelect.innerHTML = '';
      window.AMExperimentsManager.EXPERIMENT_DEFINITIONS.forEach(exp => {
        const opt = document.createElement('option');
        opt.value = exp.id;
        opt.innerText = exp.name;
        expSelect.appendChild(opt);
      });

      expSelect.addEventListener('change', () => {
        runCurrentExperiment(expSelect.value);
      });
    }

    const exportCsvBtn = document.getElementById('exportCsvBtn');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        if (window.AMExperimentsManager) window.AMExperimentsManager.exportCSV();
      });
    }

    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', () => {
        if (window.AMExperimentsManager) window.AMExperimentsManager.exportJSON();
      });
    }

    const resetExpBtn = document.getElementById('resetExpBtn');
    if (resetExpBtn && expSelect) {
      resetExpBtn.addEventListener('click', () => {
        expSelect.value = 'exp_mod_index';
        runCurrentExperiment('exp_mod_index');
      });
    }
  }

  function runCurrentExperiment(expId) {
    if (!window.AMExperimentsManager) return;
    const results = window.AMExperimentsManager.runExperiment(expId);
    const exp = window.AMExperimentsManager.getCurrentExperiment();

    setText('expTitleDisplay', exp.name);
    setText('expDescDisplay', exp.description);

    const tbody = document.getElementById('expTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      results.forEach(r => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${r.conditionName}</strong></td>
          <td>${r.mu.toFixed(2)}</td>
          <td>${r.modPercent}</td>
          <td>${r.bandwidthHz} Hz</td>
          <td>${(r.carrierFreqHz / 1000).toFixed(0)} kHz</td>
          <td>${(r.lsbFreqHz / 1000).toFixed(1)} / ${(r.usbFreqHz / 1000).toFixed(1)} kHz</td>
          <td>${r.efficiencyPercent}</td>
          <td><strong>${r.snrDb} dB</strong></td>
          <td>${r.nrmsePercent}</td>
          <td><span class="metric-badge ${r.mu > 1.05 ? 'status-over' : 'status-good'}">${r.qualityClass}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="window.AMApp.loadConditionIntoActive(${JSON.stringify(r.params).replace(/"/g, '&quot;')})">
              Tune Live ➔
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  }

  // Load an experiment condition directly into live simulator
  function loadConditionIntoActive(p) {
    state.Am = p.Am;
    state.Ac = p.Ac;
    state.fm = p.fm;
    state.fc = p.fc;
    state.channelNoise = p.noise;
    state.fadingDepth = p.fading;
    state.interference = p.interf;

    updateSliderVal('mAmp', p.Am, 'mAmpVal', ' V');
    updateSliderVal('cAmp', p.Ac, 'cAmpVal', ' V');
    updateSliderVal('mFreq', p.fm, 'mFreqVal', ' Hz');
    updateSliderVal('cFreq', p.fc, 'cFreqVal', ' Hz');
    updateSliderVal('channelNoise', p.noise, 'noiseVal', ' %');
    updateSliderVal('fadingDepth', Math.round(p.fading * 100), 'fadingVal', ' %');
    updateSliderVal('interferenceLevel', Math.round(p.interf * 100), 'interfVal', ' %');

    switchTab('receiver');
    const sim = runSimulation(state.animShift);
    if (window.AMChartManager && sim) {
      window.AMChartManager.updateStaticPlots(sim);
    }
  }

  /* -------------------------------------------------------------
   * FLOW DIAGRAM STAGE HIGHLIGHTER
   * ------------------------------------------------------------- */
  function setupFlowDiagram() {
    const stages = {
      studio: {
        title: 'Stage 1: Audio Studio Source m(t)',
        text: 'Generates baseband acoustic information (voice or music) bounded typically between 300 Hz and 5 kHz. Represented as m(t) = Am * cos(2*pi*fm*t). Direct transmission is physically impossible because efficient radiation requires an antenna height L = lambda/4 (over 75 km for 1 kHz!).'
      },
      carrier: {
        title: 'Stage 2: RF Carrier Oscillator c(t)',
        text: 'Generates a high-frequency sinusoidal continuous wave c(t) = Ac * cos(2*pi*fc*t). In physical medium wave broadcasting, fc spans 535 kHz to 1605 kHz, enabling constructible mast antennas (~ 50 to 150 meters).'
      },
      modulator: {
        title: 'Stage 3: AM Modulator (DSB-FC)',
        text: 'Multiplies and offsets the carrier to create s(t) = [Ac + m(t)] * cos(2*pi*fc*t). Produces three spectral frequencies: the unmodulated carrier fc, lower sideband (fc - fm), and upper sideband (fc + fm). Modulation index mu = Am / Ac determines envelope depth.'
      },
      channel: {
        title: 'Stage 4: Wireless Channel Impairments',
        text: 'The transmitted signal propagates via groundwaves and ionospheric skywaves. It suffers path attenuation, additive Gaussian noise (AWGN), atmospheric static discharges, ionospheric fading flutter, and co-channel interference.'
      },
      detector: {
        title: 'Stage 5: Receiver Diode Envelope Detector',
        text: 'A simple half-wave rectifier followed by an RC low-pass filter tracks the positive envelope boundary. When mu <= 1, the original audio tone is recovered with high fidelity. When mu > 1, negative peak clipping / cusp distortion occurs.'
      },
      speaker: {
        title: 'Stage 6: DC-Blocking & Loudspeaker Audio',
        text: 'A series coupling capacitor strips the DC carrier bias, feeding only the recovered baseband audio current into the audio amplifier and loudspeaker.'
      }
    };

    document.querySelectorAll('[data-flow-stage]').forEach(node => {
      node.addEventListener('click', () => {
        const stageKey = node.getAttribute('data-flow-stage');
        const info = stages[stageKey];
        if (!info) return;

        document.querySelectorAll('[data-flow-stage]').forEach(n => n.classList.remove('active-stage'));
        node.classList.add('active-stage');

        setText('flowDetailTitle', info.title);
        setText('flowDetailText', info.text);
      });
    });
  }

  // Export App interface to global for onclick handlers
  window.AMApp = {
    switchTab,
    loadConditionIntoActive,
    applyStationPreset,
    applyScenarioPreset
  };

})();
