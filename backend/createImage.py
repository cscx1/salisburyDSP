import numpy as np 
import matplotlib
matplotlib.use('Agg')  # Add this line before importing pyplot
import matplotlib.pyplot as plt 
from scipy.fft import fft, fftfreq 
from scipy.io import wavfile
import os
import subprocess

# Set dark theme for all plots
plt.style.use('dark_background')
DARK_THEME = {
    'figure.facecolor': '#1f1f1f',
    'axes.facecolor': '#1f1f1f',
    'axes.edgecolor': '#808080',
    'grid.color': '#404040',
    'text.color': 'white',
    'axes.labelcolor': 'white',
    'xtick.color': 'white',
    'ytick.color': 'white'
}
plt.rcParams.update(DARK_THEME)

def convert_to_wav(input_file, output_file):
    """Convert audio file to WAV format using ffmpeg"""
    output_wav = output_file.rsplit('.', 1)[0] + '.wav'
    subprocess.run([
        'ffmpeg', '-i', input_file,
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        '-y',  # Overwrite output file if it exists
        output_wav
    ], check=True, capture_output=True)
    return output_wav

def plot_discrete_time(samples, fs, start_time, end_time, title, highlight_start=None, highlight_end=None):
    """Create discrete-time plot for a specific time window"""
    # Use a smaller window around the effect region for better visualization
    window_size = 5  # seconds
    plot_start = max(0, start_time - window_size)
    plot_end = min(len(samples)/fs, end_time + window_size)
    
    start_idx = int(plot_start * fs)
    end_idx = int(plot_end * fs)
    
    # Get samples for the time window
    window_samples = samples[start_idx:end_idx]
    time_points = np.arange(plot_start, plot_end, 1/fs)[:len(window_samples)]
    
    # Downsample if too many points
    if len(window_samples) > 1000:
        step = len(window_samples) // 1000
        window_samples = window_samples[::step]
        time_points = time_points[::step]
    
    # Create figure with dark theme
    fig, ax = plt.subplots(figsize=(12, 6))
    fig.patch.set_facecolor('#1f1f1f')
    ax.set_facecolor('#1f1f1f')
    
    # Find indices for effect region
    effect_start_idx = np.where(time_points >= start_time)[0][0]
    effect_end_idx = np.where(time_points >= end_time)[0][0]
    
    # Plot non-effect regions in gray
    if effect_start_idx > 0:
        ax.stem(time_points[:effect_start_idx], 
                window_samples[:effect_start_idx], 
                basefmt='white', linefmt='#808080', markerfmt='go')
    
    # Plot effect region in cyan
    ax.stem(time_points[effect_start_idx:effect_end_idx], 
            window_samples[effect_start_idx:effect_end_idx], 
            basefmt='white', linefmt='cyan', markerfmt='co')
    
    # Plot remaining samples in gray
    if effect_end_idx < len(time_points):
        ax.stem(time_points[effect_end_idx:], 
                window_samples[effect_end_idx:], 
                basefmt='white', linefmt='#808080', markerfmt='go')
    
    # Add vertical lines to mark effect region
    ax.axvline(x=start_time, color='red', linestyle='--')
    ax.axvline(x=end_time, color='red', linestyle='--')
    
    # Customize appearance
    ax.set_xlabel('Time (s)')
    ax.set_ylabel('Amplitude')
    ax.set_title(f'{title}\nEffect Region: {start_time}s - {end_time}s')
    ax.grid(True, alpha=0.2)
    
    return fig

def plot_fft(input_file, output_file, effect_type, start_time, end_time):
    """Create FFT plots for each effect timestamp"""
    os.makedirs("DSPinput", exist_ok=True)
    os.makedirs("DSPoutput", exist_ok=True)

    # Convert MP3s to WAV for processing
    input_wav = convert_to_wav(input_file, input_file)
    output_wav = convert_to_wav(output_file, output_file)

    try:
        # Load audio files
        fs_in, samples_in = wavfile.read(input_wav)
        fs_out, samples_out = wavfile.read(output_wav)

        # Convert to mono if stereo
        if len(samples_in.shape) > 1:
            samples_in = np.mean(samples_in, axis=1)
        if len(samples_out.shape) > 1:
            samples_out = np.mean(samples_out, axis=1)

        # Normalize samples
        samples_in = samples_in.astype(np.float32) / np.max(np.abs(samples_in))
        samples_out = samples_out.astype(np.float32) / np.max(np.abs(samples_out))

        # Define effect types and their descriptions
        effect_names = {
            1: "Bass Boost (20-250 Hz)",
            2: "Mids Boost (250-4000 Hz)",
            3: "High Boost (4000-20000 Hz)"
        }

        # Create discrete time domain plots with proper labels
        # For input signal, use the original input file
        input_time_fig = plot_discrete_time(
            samples_in, fs_in, start_time, end_time, 
            f"Original Signal\nBefore {effect_names[effect_type]}"
        )

        # For output signal, use the processed output file
        output_time_fig = plot_discrete_time(
            samples_out, fs_out, start_time, end_time,
            f"Processed Signal\nAfter {effect_names[effect_type]}"
        )

        # Generate filenames
        base_filename = os.path.basename(output_file).split('.')[0]
        input_time_path = os.path.join("DSPinput", f"{base_filename}_time_{start_time}_{end_time}.png")
        output_time_path = os.path.join("DSPoutput", f"{base_filename}_time_{start_time}_{end_time}.png")

        # Save time domain plots
        input_time_fig.savefig(input_time_path, dpi=300, bbox_inches='tight')
        output_time_fig.savefig(output_time_path, dpi=300, bbox_inches='tight')
        plt.close('all')

        # Clean up temporary WAV files
        os.remove(input_wav)
        os.remove(output_wav)

        return input_time_path, output_time_path

    except Exception as e:
        print(f"Error in plot_fft: {e}")
        if os.path.exists(input_wav):
            os.remove(input_wav)
        if os.path.exists(output_wav):
            os.remove(output_wav)
        raise

def create_spectrogram(audio_file, effect_type, start_time, end_time):
    """Create spectrogram for specific time window"""
    audio_wav = convert_to_wav(audio_file, audio_file)

    try:
        # Load audio
        fs, samples = wavfile.read(audio_wav)
        
        # Convert to mono if stereo
        if len(samples.shape) > 1:
            samples = np.mean(samples, axis=1)
        
        # Convert to float32 and normalize
        samples = samples.astype(np.float32)
        samples = samples / np.max(np.abs(samples))
        
        # Use a window around the effect region
        window_size = 5  # seconds
        plot_start = max(0, start_time - window_size)
        plot_end = min(len(samples)/fs, end_time + window_size)
        
        start_idx = int(plot_start * fs)
        end_idx = int(plot_end * fs)
        window_samples = samples[start_idx:end_idx]
        
        # Create figure with dark theme
        plt.figure(figsize=(12, 6))
        
        # Calculate spectrogram
        plt.specgram(window_samples, Fs=fs, NFFT=2048, noverlap=1024, 
                    cmap='magma')
        
        # Define effect types and their frequency ranges
        effect_info = {
            1: ("Bass Frequencies (20-250 Hz)", 0, 250),
            2: ("Mid Frequencies (250-4000 Hz)", 250, 4000),
            3: ("High Frequencies (4000-20000 Hz)", 4000, 20000)
        }
        
        # Get effect info
        title, freq_min, freq_max = effect_info[effect_type]
        
        # Add vertical lines to mark effect region
        plt.axvline(x=start_time-plot_start, color='red', linestyle='--', alpha=0.5)
        plt.axvline(x=end_time-plot_start, color='red', linestyle='--', alpha=0.5)
        
        # Adjust y-axis and title
        plt.ylim(freq_min, freq_max)
        plt.title(f"Spectrogram: {title}\nEffect Region: {start_time}s - {end_time}s")
        plt.xlabel("Time (s)")
        plt.ylabel("Frequency (Hz)")
        plt.colorbar(label="Intensity (dB)")
        
        # Save spectrogram
        filename = os.path.basename(audio_file).split('.')[0]
        spec_path = os.path.join("DSPoutput", f"{filename}_spec_{start_time}_{end_time}.png")
        plt.savefig(spec_path, dpi=300, bbox_inches='tight')
        plt.close()

        # Clean up temporary WAV file
        os.remove(audio_wav)
        
        return spec_path

    except Exception as e:
        print(f"Error in create_spectrogram: {e}")
        if os.path.exists(audio_wav):
            os.remove(audio_wav)
        raise