/**
 * AM Broadcast Studio - Chart Visualization Manager
 * High-performance Plotly.js chart rendering with a clean, modern, scientific light theme.
 */

(function(root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else {
    root.AMChartManager = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';

  // Light Theme Color Palette for Scientific Instruments
  const THEME = {
    paperBg: '#FFFFFF',
    plotBg: '#FAFAFC',
    gridColor: '#EAEFF5',
    zeroLineColor: '#D0D7E2',
    textColor: '#202938',
    textMuted: '#667085',
    primaryAccent: '#356AE6',     // Carrier / Primary Blue
    secondaryAccent: '#159A8A',   // Message / Teal Green
    modulatedColor: '#E67E22',    // Modulated RF / Warm Amber
    envelopeColor: '#8C98A9',     // Envelopes / Cool Slate
    receivedColor: '#6366F1',     // Received RF / Indigo
    demodColor: '#DC4C4C',        // Demodulated / Rose Red
    spectrumColor: '#3B82F6',     // Spectrum Bar / Vibrant Blue
    sidebandColor: '#10B981'      // Sideband Markers / Emerald
  };

  const baseLayout = {
    margin: { t: 28, r: 20, b: 36, l: 48 },
    paper_bgcolor: THEME.paperBg,
    plot_bgcolor: THEME.plotBg,
    font: { family: "'Inter', -apple-system, sans-serif", color: THEME.textColor, size: 11 },
    showlegend: false,
    hovermode: 'closest',
    xaxis: {
      gridcolor: THEME.gridColor,
      zerolinecolor: THEME.zeroLineColor,
      tickfont: { family: "'JetBrains Mono', monospace", color: THEME.textMuted, size: 10 },
      title: { font: { size: 11, color: THEME.textMuted } }
    },
    yaxis: {
      gridcolor: THEME.gridColor,
      zerolinecolor: THEME.zeroLineColor,
      tickfont: { family: "'JetBrains Mono', monospace", color: THEME.textMuted, size: 10 },
      title: { font: { size: 11, color: THEME.textMuted } }
    }
  };

  const defaultPlotConfig = {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d']
  };

  // Convert time array from seconds to milliseconds for easy readability (0 to 1 ms)
  function toMs(tArray) {
    const ms = new Float64Array(tArray.length);
    for (let i = 0; i < tArray.length; i++) {
      ms[i] = tArray[i] * 1000;
    }
    return Array.from(ms);
  }

  function initAllPlots(sim) {
    if (!window.Plotly) {
      console.warn('Plotly.js is not loaded.');
      return;
    }

    const tMs = toMs(sim.signals.t);

    // 1. Message Plot (Studio Source)
    Plotly.newPlot('messagePlot', [{
      x: tMs,
      y: Array.from(sim.signals.message),
      mode: 'lines',
      name: 'Studio Audio m(t)',
      line: { color: THEME.secondaryAccent, width: 2 }
    }], {
      ...baseLayout,
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'Amplitude (V)' } }
    }, defaultPlotConfig);

    // 2. Carrier Plot (RF Carrier Generator)
    Plotly.newPlot('carrierPlot', [{
      x: tMs,
      y: Array.from(sim.signals.carrier),
      mode: 'lines',
      name: 'RF Carrier c(t)',
      line: { color: THEME.primaryAccent, width: 1.5 }
    }], {
      ...baseLayout,
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'Amplitude (V)' } }
    }, defaultPlotConfig);

    // 3. Modulated Signal Plot with Envelopes
    Plotly.newPlot('modulatedPlot', [
      {
        x: tMs,
        y: Array.from(sim.signals.modulated),
        mode: 'lines',
        name: 'Modulated AM s(t)',
        line: { color: THEME.modulatedColor, width: 1.3 }
      },
      {
        x: tMs,
        y: Array.from(sim.signals.upperEnv),
        mode: 'lines',
        name: '+ Envelope Boundary',
        line: { color: THEME.envelopeColor, width: 1.8, dash: 'dash' }
      },
      {
        x: tMs,
        y: Array.from(sim.signals.lowerEnv),
        mode: 'lines',
        name: '- Envelope Boundary',
        line: { color: THEME.envelopeColor, width: 1.8, dash: 'dash' }
      }
    ], {
      ...baseLayout,
      showlegend: true,
      legend: { x: 0.7, y: 1.15, orientation: 'h', font: { size: 10, color: THEME.textMuted } },
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'Transmitted (V)' } }
    }, defaultPlotConfig);

    // 4. Received Signal Plot (After Channel)
    Plotly.newPlot('receivedPlot', [{
      x: tMs,
      y: Array.from(sim.signals.received),
      mode: 'lines',
      name: 'Received Signal r(t)',
      line: { color: THEME.receivedColor, width: 1.3 }
    }], {
      ...baseLayout,
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'Received (V)' } }
    }, defaultPlotConfig);

    // 5. Demodulated & Comparison Overlay Plot
    Plotly.newPlot('demodOverlayPlot', [
      {
        x: tMs,
        y: Array.from(sim.signals.message),
        mode: 'lines',
        name: 'Original Message m(t)',
        line: { color: THEME.secondaryAccent, width: 2.2, dash: 'dot' }
      },
      {
        x: tMs,
        y: Array.from(sim.signals.recoveredNormalized),
        mode: 'lines',
        name: 'Recovered Audio m̂(t)',
        line: { color: THEME.demodColor, width: 2 }
      }
    ], {
      ...baseLayout,
      showlegend: true,
      legend: { x: 0.65, y: 1.15, orientation: 'h', font: { size: 10, color: THEME.textMuted } },
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'Recovered (V)' } }
    }, defaultPlotConfig);

    // 6. Spectrum Analyzer Plot
    updateSpectrumPlot(sim);

    // 7. Virtual Receiver Mini Preview Plot
    updateReceiverMiniPreview(sim);
  }

  function updateStaticPlots(sim) {
    if (!window.Plotly) return;
    const tMs = toMs(sim.signals.t);

    Plotly.react('messagePlot', [{
      x: tMs,
      y: Array.from(sim.signals.message),
      mode: 'lines',
      name: 'Studio Audio m(t)',
      line: { color: THEME.secondaryAccent, width: 2 }
    }], {
      ...baseLayout,
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'Amplitude (V)' } }
    });

    Plotly.react('carrierPlot', [{
      x: tMs,
      y: Array.from(sim.signals.carrier),
      mode: 'lines',
      name: 'RF Carrier c(t)',
      line: { color: THEME.primaryAccent, width: 1.5 }
    }], {
      ...baseLayout,
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'Amplitude (V)' } }
    });

    Plotly.react('modulatedPlot', [
      {
        x: tMs,
        y: Array.from(sim.signals.modulated),
        mode: 'lines',
        name: 'Modulated AM s(t)',
        line: { color: THEME.modulatedColor, width: 1.3 }
      },
      {
        x: tMs,
        y: Array.from(sim.signals.upperEnv),
        mode: 'lines',
        name: '+ Envelope Boundary',
        line: { color: THEME.envelopeColor, width: 1.8, dash: 'dash' }
      },
      {
        x: tMs,
        y: Array.from(sim.signals.lowerEnv),
        mode: 'lines',
        name: '- Envelope Boundary',
        line: { color: THEME.envelopeColor, width: 1.8, dash: 'dash' }
      }
    ], {
      ...baseLayout,
      showlegend: true,
      legend: { x: 0.7, y: 1.15, orientation: 'h', font: { size: 10, color: THEME.textMuted } },
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'Transmitted (V)' } }
    });

    Plotly.react('receivedPlot', [{
      x: tMs,
      y: Array.from(sim.signals.received),
      mode: 'lines',
      name: 'Received Signal r(t)',
      line: { color: THEME.receivedColor, width: 1.3 }
    }], {
      ...baseLayout,
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'Received (V)' } }
    });

    Plotly.react('demodOverlayPlot', [
      {
        x: tMs,
        y: Array.from(sim.signals.message),
        mode: 'lines',
        name: 'Original Message m(t)',
        line: { color: THEME.secondaryAccent, width: 2.2, dash: 'dot' }
      },
      {
        x: tMs,
        y: Array.from(sim.signals.recoveredNormalized),
        mode: 'lines',
        name: 'Recovered Audio m̂(t)',
        line: { color: THEME.demodColor, width: 2 }
      }
    ], {
      ...baseLayout,
      showlegend: true,
      legend: { x: 0.65, y: 1.15, orientation: 'h', font: { size: 10, color: THEME.textMuted } },
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'Recovered (V)' } }
    });

    updateSpectrumPlot(sim);
    updateReceiverMiniPreview(sim);
  }

  function updateSpectrumPlot(sim) {
    if (!window.Plotly || !window.AMSignalEngine) return;
    const fft = AMSignalEngine.computeFFT(sim.signals.modulated, sim.params.duration, 45000);
    const peaks = AMSignalEngine.identifySpectrumPeaks(fft, sim.params.fc, sim.params.fm);

    const annotations = [];
    if (peaks.carrier.index !== -1) {
      annotations.push({
        x: peaks.carrier.freq,
        y: peaks.carrier.mag,
        text: `Carrier fc (${(peaks.carrier.freq / 1000).toFixed(0)} kHz)`,
        showarrow: true,
        arrowhead: 2,
        arrowcolor: THEME.primaryAccent,
        font: { size: 10, color: THEME.primaryAccent }
      });
    }
    if (peaks.lsb.index !== -1) {
      annotations.push({
        x: peaks.lsb.freq,
        y: peaks.lsb.mag,
        text: `LSB (${(peaks.lsb.freq / 1000).toFixed(1)} kHz)`,
        showarrow: true,
        arrowhead: 2,
        arrowcolor: THEME.sidebandColor,
        font: { size: 9, color: THEME.sidebandColor }
      });
    }
    if (peaks.usb.index !== -1) {
      annotations.push({
        x: peaks.usb.freq,
        y: peaks.usb.mag,
        text: `USB (${(peaks.usb.freq / 1000).toFixed(1)} kHz)`,
        showarrow: true,
        arrowhead: 2,
        arrowcolor: THEME.sidebandColor,
        font: { size: 9, color: THEME.sidebandColor }
      });
    }

    Plotly.react('spectrumPlot', [{
      x: fft.freq,
      y: fft.mag,
      type: 'bar',
      marker: { color: THEME.spectrumColor, opacity: 0.85 },
      name: 'Spectral Magnitude'
    }], {
      ...baseLayout,
      annotations,
      xaxis: {
        ...baseLayout.xaxis,
        title: { text: 'Frequency (Hz)' },
        range: [0, 40000]
      },
      yaxis: {
        ...baseLayout.yaxis,
        title: { text: 'Magnitude (V)' }
      }
    });
  }

  function updateReceiverMiniPreview(sim) {
    const miniPlotElem = document.getElementById('receiverPreviewPlot');
    if (!miniPlotElem || !window.Plotly) return;

    const tMs = toMs(sim.signals.t);

    Plotly.react('receiverPreviewPlot', [
      {
        x: tMs,
        y: Array.from(sim.signals.received),
        mode: 'lines',
        name: 'Received RF',
        line: { color: '#93C5FD', width: 1 }
      },
      {
        x: tMs,
        y: Array.from(sim.signals.recoveredNormalized),
        mode: 'lines',
        name: 'Demodulated Audio',
        line: { color: THEME.demodColor, width: 2 }
      }
    ], {
      ...baseLayout,
      margin: { t: 15, r: 15, b: 28, l: 38 },
      showlegend: true,
      legend: { x: 0.6, y: 1.15, orientation: 'h', font: { size: 9, color: THEME.textMuted } },
      xaxis: { ...baseLayout.xaxis, title: { text: 'Time (ms)' } },
      yaxis: { ...baseLayout.yaxis, title: { text: 'V' } }
    }, { responsive: true, displayModeBar: false });
  }

  function fastSweepRestyle(sim) {
    if (!window.Plotly) return;

    // Fast restyle of dynamic traces in main modulated & demod plots
    Plotly.restyle('modulatedPlot', {
      y: [
        Array.from(sim.signals.modulated),
        Array.from(sim.signals.upperEnv),
        Array.from(sim.signals.lowerEnv)
      ]
    });

    Plotly.restyle('receivedPlot', {
      y: [Array.from(sim.signals.received)]
    });

    Plotly.restyle('demodOverlayPlot', {
      y: [
        Array.from(sim.signals.message),
        Array.from(sim.signals.recoveredNormalized)
      ]
    });

    Plotly.restyle('receiverPreviewPlot', {
      y: [
        Array.from(sim.signals.received),
        Array.from(sim.signals.recoveredNormalized)
      ]
    });
  }

  function exportChartPNG(plotId, filename) {
    if (!window.Plotly) return;
    Plotly.downloadImage(plotId, {
      format: 'png',
      width: 1200,
      height: 520,
      filename: filename || `AM_Broadcast_Studio_${plotId}`
    });
  }

  return {
    THEME,
    initAllPlots,
    updateStaticPlots,
    updateSpectrumPlot,
    updateReceiverMiniPreview,
    fastSweepRestyle,
    exportChartPNG
  };
});
