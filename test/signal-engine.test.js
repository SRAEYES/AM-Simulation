/**
 * Automated Test Suite for AM Broadcast Studio Signal Processing Engine
 * Executed with Node.js built-in test runner: node --test
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const AMSignalEngine = require('../js/signal-engine.js');

describe('AM Broadcast Studio - Mathematical & Signal Processing Verification', () => {

  test('Modulation Index calculation is mathematically accurate', () => {
    const resUnder = AMSignalEngine.computeSimulation({ Am: 5.0, Ac: 10.0, fm: 1000, fc: 20000 });
    assert.strictEqual(resUnder.derived.mu, 0.5);
    assert.strictEqual(resUnder.derived.modPercent, 50.0);

    const resCrit = AMSignalEngine.computeSimulation({ Am: 10.0, Ac: 10.0, fm: 1000, fc: 20000 });
    assert.strictEqual(resCrit.derived.mu, 1.0);
    assert.strictEqual(resCrit.derived.modPercent, 100.0);

    const resOver = AMSignalEngine.computeSimulation({ Am: 14.0, Ac: 10.0, fm: 1000, fc: 20000 });
    assert.strictEqual(resOver.derived.mu, 1.4);
    assert.strictEqual(resOver.derived.modPercent, 140.0);
  });

  test('Theoretical RF Bandwidth follows BW = 2 * fm', () => {
    const res1 = AMSignalEngine.computeSimulation({ fm: 1000 });
    assert.strictEqual(res1.derived.theoreticalBw, 2000);

    const res2 = AMSignalEngine.computeSimulation({ fm: 2400 });
    assert.strictEqual(res2.derived.theoreticalBw, 4800);
  });

  test('Power Efficiency calculation follows eta = mu^2 / (2 + mu^2)', () => {
    // At mu = 1.0: eta = 1 / (2 + 1) = 1/3 ~ 33.333%
    const resCrit = AMSignalEngine.computeSimulation({ Am: 10, Ac: 10 });
    assert.ok(Math.abs(resCrit.derived.efficiency - (100 / 3)) < 0.01);

    // At mu = 0.7: eta = 0.49 / 2.49 ~ 19.678%
    const res70 = AMSignalEngine.computeSimulation({ Am: 7, Ac: 10 });
    assert.ok(Math.abs(res70.derived.efficiency - 19.678) < 0.1);
  });

  test('Quarter-wave antenna calculation follows lambda / 4 = c / (4 * f)', () => {
    // For fc = 20,000 Hz: lambda = 300,000 km/s / 20,000 1/s = 15 km -> L = 3.75 km
    const res = AMSignalEngine.computeSimulation({ fc: 20000, fm: 1000 });
    assert.strictEqual(res.derived.antennaQuarterKm, 3.75);
    // For baseband fm = 1,000 Hz: L = 300,000 / 4,000 = 75 km
    assert.strictEqual(res.derived.audioAntennaKm, 75);
  });

  test('Envelope detector exhibits low reconstruction error on clean signal and high error on overmodulation', () => {
    const clean = AMSignalEngine.computeSimulation({
      Am: 6.0,
      Ac: 10.0,
      fm: 1000,
      fc: 20000,
      channelNoise: 0,
      fadingDepth: 0,
      interference: 0
    });

    const overmod = AMSignalEngine.computeSimulation({
      Am: 14.0,
      Ac: 10.0,
      fm: 1000,
      fc: 20000,
      channelNoise: 0,
      fadingDepth: 0,
      interference: 0
    });

    // Clean modulation (mu=0.6) should have low reconstruction error (< 8%)
    assert.ok(clean.derived.nrmse < 8.0, `Expected clean NRMSE < 8%, got ${clean.derived.nrmse}%`);

    // Overmodulation (mu=1.4) causes negative peak clipping distortion, significantly higher NRMSE
    assert.ok(overmod.derived.nrmse > 12.0, `Expected overmodulated NRMSE > 12%, got ${overmod.derived.nrmse}%`);
    assert.ok(overmod.derived.nrmse > clean.derived.nrmse * 1.8, 'Overmodulated distortion should exceed clean error by at least 1.8x');
  });

  test('Channel noise reduces model-derived SNR monotonically', () => {
    const clean = AMSignalEngine.computeSimulation({ channelNoise: 0, Ac: 10, Am: 7 });
    const moderateNoise = AMSignalEngine.computeSimulation({ channelNoise: 10, Ac: 10, Am: 7, seed: 42 });
    const heavyNoise = AMSignalEngine.computeSimulation({ channelNoise: 30, Ac: 10, Am: 7, seed: 42 });

    assert.ok(clean.derived.snrDb > moderateNoise.derived.snrDb, 'Clean SNR should exceed moderate noise SNR');
    assert.ok(moderateNoise.derived.snrDb > heavyNoise.derived.snrDb, 'Moderate noise SNR should exceed heavy noise SNR');
  });

  test('FFT accurately resolves Carrier and Sidebands at fc, fc - fm, and fc + fm', () => {
    const fc = 20000;
    const fm = 2000;
    const Ac = 10;
    const Am = 6;

    const sim = AMSignalEngine.computeSimulation({ Ac, Am, fc, fm, channelNoise: 0 });
    const fft = AMSignalEngine.computeFFT(sim.signals.modulated, sim.params.duration);
    const peaks = AMSignalEngine.identifySpectrumPeaks(fft, fc, fm);

    // Carrier peak at 20 kHz
    assert.strictEqual(peaks.carrier.freq, fc);
    // Lower sideband at 18 kHz
    assert.strictEqual(peaks.lsb.freq, fc - fm);
    // Upper sideband at 22 kHz
    assert.strictEqual(peaks.usb.freq, fc + fm);

    // Carrier magnitude should be near Ac (within FFT resolution tolerance)
    assert.ok(Math.abs(peaks.carrier.mag - Ac) < 1.0, `Carrier magnitude should be near 10, got ${peaks.carrier.mag}`);
    // Sideband magnitude should be near Am / 2 = 3.0
    assert.ok(Math.abs(peaks.lsb.mag - (Am / 2)) < 0.8, `LSB magnitude should be near 3, got ${peaks.lsb.mag}`);
    assert.ok(Math.abs(peaks.usb.mag - (Am / 2)) < 0.8, `USB magnitude should be near 3, got ${peaks.usb.mag}`);
  });

  test('Deterministic PRNG produces identical repeatable simulation results with identical seed', () => {
    const run1 = AMSignalEngine.computeSimulation({ channelNoise: 20, seed: 12345 });
    const run2 = AMSignalEngine.computeSimulation({ channelNoise: 20, seed: 12345 });

    assert.strictEqual(run1.derived.snrDb, run2.derived.snrDb);
    assert.strictEqual(run1.derived.nrmse, run2.derived.nrmse);
    assert.strictEqual(run1.signals.received[100], run2.signals.received[100]);
  });
});
