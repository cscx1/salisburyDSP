import numpy as np 
import matplotlib.pyplot as plt 
from scipy.fft import fft, fftfreq 
from pydub import AudioSegment 

def plot_fft(input, output):

    # Load audio files
    audio_in = AudioSegment.from_file(input).set_channels(1)
    audio_out = AudioSegment.from_file(output).set_channels(1)

    # Convert audio to numpy arrays
    samples_in = np.array(audio_in.get_array_of_samples(), dtype=np.float32)
    samples_out = np.array(audio_out.get_array_of_samples(), dtype=np.float32)

    # Normalize samples
    samples_in /= np.max(np.abs(samples_in))
    samples_out /= np.max(np.abs(samples_out))

    # Sampling rate
    fs = audio_in.frame_rate 

    # Apply FFT 
    fft_in = fft(samples_in)
    fft_out = fft(samples_out)

    # Get frequency bins 
    freqs = fftfreq(len(samples_in), 1/fs)

    # Plot FFT 
    half_idx = len(freqs) // 2
    freqs = freqs[:half_idx]
    fft_in = np.abs(fft_inp[:half_idx])
    fft_out = np.abs(fft_out[:half_idx])

    # Save as file
    input_filename = os.path.basename(input).split('.')[0]
    output_filename = os.path.basename(output).split('.')[0]

    input_plot_path = os.path.join("DSPinput", f"{input_filename}_FFT.png")
    output_plot_path = os.path.join("DSPoutput", f"{output_filename}_FFT.png")

    # Save input FFT
    plt.figure(figsize=(10, 5))
    plt.plot(freqs, fft_in, label="Input Audio", color="blue", alpha=0.7)
    plt.xlabel("Frequency (Hz)")
    plt.ylabel("Magnitude")
    plt.title("Fourier Transform of Input Audio")
    plt.legend()
    plt.grid()
    plt.savefig(input_plot_path)
    plt.close() 

    # Save output FFT
    plt.figure(figsize=(10, 5))
    plt.plot(freqs, fft_out, label="Output Audio", color="red", alpha=0.7)
    plt.xlabel("Frequency (Hz)")
    plt.ylabel("Magnitude")
    plt.title("Fourier Transform of Output Audio")
    plt.legend()
    plt.grid()
    plt.savefig(output_plot_path)
    plt.close()