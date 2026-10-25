# AM Radio Broadcasting: An Interactive Wireless Signal Modulation and Demodulation Simulator

An advanced, interactive web-based laboratory for **Amplitude Modulation (AM)**, **RF Carrier Propagation**, and **Envelope Demodulation**, built with HTML5, CSS3, JavaScript, Plotly.js, and the Web Audio API.

---

## 📻 Real-World Practical Features

- **Live Broadcast Audio Synthesizer (Web Audio API)**:
  - Synthesizes the transmitted audio message in real time.
  - Simulates the physical acoustic output of a receiver diode envelope detector.
  - Dynamically demonstrates **overmodulation clipping distortion** (odd harmonics & splatter) when $\mu > 1$.
  - Generates realistic **atmospheric static / RF channel noise** (MW nighttime reception).

- **Antenna Physics & Modulation Need**:
  - Live computation of required quarter-wave antenna size ($L = \lambda/4 = c / (4f)$).
  - Demonstrates why baseband audio ($1\text{ kHz}$) cannot be transmitted directly without modulation ($75\text{ km}$ antenna required) compared to RF carriers ($75\text{ m}$ to $3.75\text{ km}$).

- **Broadcast Station Presets**:
  - 🎙️ **Commercial Talk / News**: $\mu = 0.70$ (Clean Voice, ITU compliant)
  - 🎵 **High-Fidelity Music**: $\mu = 0.85$ (Dynamic acoustic range)
  - 🎯 **Critical 100% Modulation**: $\mu = 1.00$ (Maximum theoretical power efficiency)
  - ⚠️ **Transmitter Overdrive**: $\mu = 1.40$ (Severe distortion, envelope inversion & sideband splatter)
  - 🌌 **Nighttime Ionospheric DX**: Realistic atmospheric channel static and skywave propagation.

- **Dynamic RF Telemetry Dashboard**:
  - Real-time **Modulation Index ($\mu$)** gauge and safety status indicator.
  - **RF Transmission Bandwidth ($BW = 2f_m$)** with FCC/ITU medium wave channel spacing analysis.
  - **Transmitter Power Distribution**: Carrier power ($P_c$) vs Sideband power ($P_{sb}$) and broadcast efficiency ($\eta = \frac{\mu^2}{2 + \mu^2}$).

- **Real-Time 5-Channel Visual Oscilloscope & Spectrum Analyzer**:
  1. Baseband Studio Audio Signal $m(t)$
  2. High-Frequency RF Carrier Wave $c(t)$
  3. Modulated AM Wave $s(t)$ with Upper and Lower Envelope boundaries
  4. Receiver Envelope Detector (Diode rectification + RC low-pass filter)
  5. Fast Radix-2 FFT Frequency Spectrum (Carrier, LSB, USB, and bandwidth)

- **Interactive System Architecture Flow**:
  - Step-by-step interactive diagram of the complete broadcasting chain: Audio Studio $\rightarrow$ Carrier Generator $\rightarrow$ Modulator $\rightarrow$ Power Amp $\rightarrow$ Antenna $\rightarrow$ Wireless Channel $\rightarrow$ Receiver Envelope Detector $\rightarrow$ Loudspeaker.

---

## 🚀 Running the Simulator

1. Clone or download this repository.
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari).
3. Alternatively, launch a local server:
   ```bash
   python -m http.server 8000
   ```
   and navigate to `http://localhost:8000`.

---

## 👥 Authors & Credits

**Made by Sraeyes, Kaushik, Padmesh**  
*Wireless Communications & Signal Processing Laboratory*
