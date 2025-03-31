import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

const Theory = () => {
  return (
    <div className="text-left text-lg px-8 py-12 space-y-10 max-w-5xl mx-auto leading-relaxed">
      <h1 className="text-3xl font-bold text-center">Theory Behind the Processing</h1>

      <section>
        <h2 className="text-2xl font-semibold">Discrete Fourier Transform (DFT)</h2>
        <p className="text-neutral-400">
          The Discrete Fourier Transform is a fundamental tool in signal processing that converts a time-domain signal into its frequency-domain representation:
        </p>
        <div className="my-4 text-center">
          <BlockMath math="X_k = \sum_{n=0}^{N-1} x_n \cdot e^{-2\pi i k n / N}" />
        </div>
        <p className="text-neutral-400">
          Here, <InlineMath math="x_n" /> is the input signal, <InlineMath math="X_k" /> is the DFT output at frequency index <InlineMath math="k" />, and <InlineMath math="N" /> is the total number of samples. This transformation is the backbone of many of the frequency-based effects in this project.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Bass Boost (Low Shelf Filter)</h2>
        <p className="text-neutral-400">
          The bass boost effect uses a low-pass Butterworth filter to isolate and enhance low-frequency content. The Butterworth design ensures a smooth and flat response in the passband:
        </p>
        <BlockMath math="H(s) = \frac{1}{\sqrt{1 + (s / \omega_c)^{2n}}}" />
        <p className="text-neutral-400">
          After filtering, the low frequencies are amplified by a gain factor derived from the user-defined decibel boost:
        </p>
        <BlockMath math="G = 10^{\text{boost}_{\text{dB}} / 20}" />
        <p className="text-neutral-400">
          The processed signal is then added back to the original to achieve a natural-sounding lift.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Treble Boost (High Shelf Filter)</h2>
        <p className="text-neutral-400">
          The treble boost is implemented with a high-pass Butterworth filter, mirroring the structure of the bass boost but emphasizing high frequencies above a set cutoff:
        </p>
        <BlockMath math="H(s) = \frac{(s / \omega_c)^{2n}}{1 + (s / \omega_c)^{2n}}" />
        <p className="text-neutral-400">
          Again, the boosted signal is scaled and added to the original waveform for a more pronounced high-end response.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Mids Boost (Peak Filter)</h2>
        <p className="text-neutral-400">
          The mids boost uses a resonant band-pass filter centered at a user-specified frequency. The filter is designed using a peak filter (also known as a resonator):
        </p>
        <BlockMath math="H(z) = \frac{1 - \alpha^2}{1 - 2\alpha\cos(\omega_0)z^{-1} + \alpha^2 z^{-2}}" />
        <p className="text-neutral-400">
          This allows precise enhancement of frequency bands — useful for vocal clarity, instrument presence, or targeting specific harmonic content.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Dynamic Range Compression</h2>
        <p className="text-neutral-400">
          The compressor reduces the dynamic range by attenuating loud portions of the signal above a given threshold. The compression function is based on a logarithmic gain curve:
        </p>
        <BlockMath math="g[n] = \begin{cases}
        \alpha_{\text{attack}} \cdot (g[n{-}1] - \hat{g}[n]) + \hat{g}[n], & \text{if } \hat{g}[n] < g[n{-}1] \\
        \alpha_{\text{release}} \cdot (g[n{-}1] - \hat{g}[n]) + \hat{g}[n], & \text{otherwise}
        \end{cases}" />
        <p className="text-neutral-400">
          Where <InlineMath math="\hat{g}[n]" /> is the desired gain at time <InlineMath math="n" />, and <InlineMath math="\alpha" /> controls the rate of attack and release smoothing.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Reverb (Feedback Delay)</h2>
        <p className="text-neutral-400">
          Reverb is simulated using a basic delay network that sums several decayed, delayed versions of the input signal:
        </p>
        <BlockMath math="y[n] = x[n] + \sum_{k=1}^{K} a_k \cdot x[n - d_k]" />
        <p className="text-neutral-400">
          This approximates the reflective nature of sound in real acoustic spaces. The decay factor <InlineMath math="a_k" /> and delay times <InlineMath math="d_k" /> are configurable to simulate different room sizes and textures.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Chorus Effect</h2>
        <p className="text-neutral-400">
          The chorus effect is a classic time-based audio effect that simulates the sound of multiple instruments or voices playing in unison with slight variations. This is achieved by duplicating the original signal and introducing a small, **modulated delay** to the copy, which gives the perception of movement and depth.
        </p>

        <div className="my-4 text-center">
          <BlockMath math="y[n] = x[n] + a \cdot x[n - d(n)]" />
        </div>

        <p className="text-neutral-400">
          In this equation:
          <br />
          • <InlineMath math="x[n]" /> is the original audio signal
          <br />
          • <InlineMath math="d(n)" /> is a time-varying delay modulated by a low-frequency oscillator (LFO)
          <br />
          • <InlineMath math="a" /> is the mix ratio controlling the depth of the effect
        </p>

        <p className="text-neutral-400 mt-4">
          The delay time <InlineMath math="d(n)" /> typically oscillates smoothly using a sine wave:
        </p>

        <div className="my-4 text-center">
          <BlockMath math="d(n) = d_0 + D \cdot \sin(2\pi f_L n)" />
        </div>

        <p className="text-neutral-400">
          Where <InlineMath math="d_0" /> is the base delay, <InlineMath math="D" /> is the modulation depth, and <InlineMath math="f_L" /> is the LFO frequency. When this modulated signal is added back to the original, it creates subtle phase variations that our ears perceive as richness and width — especially effective on vocals, synths, and clean guitars.
        </p>
      </section>

    </div>
  );
};

export default Theory;
