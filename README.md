# AM Broadcast Studio

> **Interactive AM Receiver & Signal Quality Analysis**  
> *A virtual telecommunications laboratory and software-based amplitude modulation broadcasting suite.*

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?logo=vercel)](https://am-simulation.vercel.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-8%20Passing-emerald)](package.json)

---

## 📌 Project Overview

**AM Broadcast Studio** is an interactive, 100% software-based telecommunications engineering application that demonstrates how an Amplitude-Modulated (AM) broadcast signal is generated in a studio, transmitted across a simulated wireless propagation channel with noise, fading, and interference, received and demodulated by a physical diode envelope detector, and evaluated under realistic reception conditions.

> **Simulation Mode Notice:** This application is an educational software simulation. It does not transmit or receive live radio-frequency electromagnetic waves or require any physical SDR or radio hardware.

---

## 🚀 Key Features

### 1. 🎛️ Virtual AM Receiver & Station Presets
- **Simulated Medium-Wave Presets:**
  - **MW-810 Talk & News** ($\mu = 0.70$, ITU compliant broadcast envelope)
  - **MW-1040 High-Fidelity Music** ($\mu = 0.85$, wideband dynamic audio)
  - **MW-1000 Calibration Carrier** ($\mu = 1.00$, maximum 33.3% power efficiency)
  - **MW-1200 Overmodulated Pirate** ($\mu = 1.40$, envelope inversion & splatter)
  - **MW-640 Nighttime Skywave DX** (Atmospheric static & ionospheric multipath fading)
  - **MW-1420 Adjacent Channel Clash** (Co-channel heterodyne beat whistle)
- **Live Signal Quality Dashboard:**
  - Real-time **Modulation Index ($\mu = A_m / A_c$)** and safety classification
  - **Model-Derived Signal-to-Noise Ratio (SNR in dB)**
  - **Normalized Received Signal Level (0–100%)**
  - **Reconstruction Distortion (Normalized Root-Mean-Square Error NRMSE %)**
  - **Diode Demodulator Operating State** (Linear recovery vs. Cusp clipping)
- **Web Audio API Acoustic Synthesizer:**
  - Synthesizes the exact acoustic output of the diode detector.
  - Generates realistic atmospheric static noise and heterodyne beat tones.
  - Real-time **WaveShaper non-linear diode clipping distortion** for overmodulated signals ($\mu > 1$).
  - Built-in VU meter and multiple test audio sources (1.0 kHz test tone, 440 Hz pitch, dual-tone, harmonic complex voice).

### 2. 📊 Dedicated Signal Analysis Workspace
- **Studio Message $m(t)$**: Clean baseband studio audio source.
- **RF Carrier Wave $c(t)$**: High-frequency sinusoidal continuous wave.
- **Modulated AM Signal $s(t)$**: Double-sideband full-carrier waveform with upper and lower envelope boundaries.
- **Received Wave $r(t)$**: Propagated signal after channel impairments (AWGN noise, fading, interference).
- **Demodulated Overlay Comparison**: Direct visual superposition of original studio audio versus recovered receiver audio.
- **Fast Radix-2 Cooley-Tukey FFT Spectrum Analyzer**: Calibrated frequency axis in Hz with automatic detection of the unmodulated carrier ($f_c$), Lower Sideband ($f_{\text{LSB}} = f_c - f_m$), and Upper Sideband ($f_{\text{USB}} = f_c + f_m$).
- **One-click PNG export** for every waveform.

### 3. 🧪 Experiments & Performance Comparison
- 6 standard laboratory benchmarks:
  1. **Modulation Index & Envelope Distortion** ($\mu = 0.50$ vs $1.00$ vs $1.35$)
  2. **Channel Noise & Demodulator SNR Threshold** (Clean vs Static vs Thunderstorm)
  3. **Carrier Amplitude & Weak-Signal Reception** ($A_c = 16\text{ V}$ vs $8\text{ V}$ vs $3\text{ V}$)
  4. **Multipath Fading vs Co-Channel Interference** (AWGN vs Flutter vs Heterodyne)
  5. **Audio Modulation Frequency & RF Bandwidth** ($f_m = 500\text{ Hz}$ vs $1000\text{ Hz}$ vs $3000\text{ Hz}$)
  6. **Transmitter Power Allocation & Sideband Efficiency** ($\mu = 0.30$ vs $0.70$ vs $1.00$)
- Side-by-side comparison table with automated calculations.
- Direct **"Tune Live ➔"** action to load any experiment condition into the live receiver.
- Full **CSV and JSON data export**.
- Reproducible deterministic noise seed support.

### 4. 📐 Methodology & Technical Documentation
- Mathematical derivations of conventional AM (DSB-FC), power distribution, and Carson bandwidth.
- Physical diode envelope detection principles (charging through forward resistance, discharging through RC load).
- Time constant trade-off ($1/f_c \ll RC \ll 1/f_m$) and diagonal clipping explanation.
- Telecommunications viva voce reference guide (e.g., Why aviation ATC mandates AM due to lack of the capture effect).

---

## 📐 Mathematical Equations

### Message Signal
$$m(t) = A_m \cos(2\pi f_m t)$$

### Carrier Signal
$$c(t) = A_c \cos(2\pi f_c t)$$

### Conventional AM Modulated Wave (DSB-FC)
$$s(t) = [A_c + m(t)] \cos(2\pi f_c t) = A_c [1 + \mu \cos(2\pi f_m t)] \cos(2\pi f_c t)$$

### Modulation Index
$$\mu = \frac{A_m}{A_c}$$

### Transmission Bandwidth
$$BW = 2 f_m$$

### Sideband Frequencies
$$f_{\text{USB}} = f_c + f_m, \quad f_{\text{LSB}} = f_c - f_m$$

### Total Transmitter Power
$$P_t = P_c \left(1 + \frac{\mu^2}{2}\right) = \frac{1}{2} A_c^2 \left(1 + \frac{\mu^2}{2}\right)$$

### Broadcast Power Efficiency
$$\eta = \frac{P_{\text{sidebands}}}{P_{\text{total}}} = \frac{\mu^2}{2 + \mu^2}$$
*(Maximum theoretical efficiency for single-tone AM is 33.3% at $\mu = 1.0$)*

---

## 🛠️ Technology Stack

- **Frontend Core**: Semantic HTML5, Modular CSS3 Design System, Vanilla JavaScript (ES6+ UMD pattern)
- **Scientific Visualization**: Plotly.js (Light instrument theme with fine grids)
- **Real-Time Sound Synthesis**: Web Audio API (WaveShaper non-linear distortion curves, noise generators, oscillators)
- **Spectral Analysis**: Custom Radix-2 Cooley-Tukey FFT
- **Testing**: Node.js built-in test runner (`node:test`, `node:assert`)
- **Hosting & Deployment**: Vercel

---

## 💻 Running Locally

### Prerequisites
- Modern web browser (Chrome, Edge, Firefox, Safari)
- Node.js (v18+) for automated tests (optional)

### 1. Clone the repository
```bash
git clone https://github.com/SRAEYES/AM-Simulation.git
cd AM_Simulation-main
```

### 2. Run automated tests
```bash
npm test
```

### 3. Launch the local web server
```bash
python -m http.server 8000
```
Open `http://localhost:8000` in your web browser.

---

## 👥 Authors & Credits

**Made by Sraeyes, Kaushik, Padmesh**  
*Wireless Communications & Signal Processing Laboratory*
