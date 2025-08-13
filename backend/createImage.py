import numpy as np 
import matplotlib
matplotlib.use('Agg')  # Add this line before importing pyplot
import matplotlib.pyplot as plt 
from scipy.fft import fft, fftfreq 
from scipy.io import wavfile
import os
import subprocess
import json
#Try float 64  ;lower my margin of error on input to make it more sensitive to chnages. we want more accurate info.
#this may be a data type issue.

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

# Add settings to center the plots
plt.rcParams.update({
    'figure.autolayout': True,  # Adjust subplot params for tight layout
    'figure.subplot.wspace': 0.3,  # Width space between subplots
    'figure.subplot.hspace': 0.3,  # Height space between subplots
    'figure.constrained_layout.use': True,  # Use constrained layout for better centering
})

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
    
    # Center the figure horizontally and ensure data is aligned with x-axis
    ax.spines['bottom'].set_position('zero')  # Place x-axis in the middle
    
    # Apply tight layout to ensure proper centering
    plt.tight_layout()
    
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

        # Save time domain plots with centered layout
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
        
        # Center the plot with tight layout
        plt.tight_layout()
        
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

def analyze_audio(input_file, output_file, effect_type, start_time, end_time, **kwargs):
    """Analyze audio and return data for D3 visualization"""
    # Convert MP3s to WAV for processing
    input_wav = convert_to_wav(input_file, input_file)
    output_wav = convert_to_wav(output_file, output_file)

    try:
        # Load audio files
        fs_in, samples_in = wavfile.read(input_wav)
        fs_out, samples_out = wavfile.read(output_wav)

        print(f"Analyzing audio for effect {effect_type}, time range: {start_time}-{end_time}s")
        print(f"Input samples shape: {samples_in.shape}, Output samples shape: {samples_out.shape}")
        
        # Convert to mono if stereo
        if len(samples_in.shape) > 1:
            samples_in = np.mean(samples_in, axis=1)
        if len(samples_out.shape) > 1:
            samples_out = np.mean(samples_out, axis=1)

        # Normalize the full signals once before extracting the window
        # This ensures consistent normalization across different time windows
        samples_in_orig = samples_in.copy()  # Keep original for verification
        samples_out_orig = samples_out.copy()  # Keep original for verification
        
        # Check input signal range
        input_min = np.min(samples_in)
        input_max = np.max(samples_in)
        input_range = input_max - input_min
        
        # Check output signal range
        output_min = np.min(samples_out)
        output_max = np.max(samples_out)
        output_range = output_max - output_min
        
        print(f"Pre-normalization ranges - Input: [{input_min}, {input_max}], Output: [{output_min}, {output_max}]")
        
        # Apply consistent normalization
        samples_in = samples_in.astype(np.float32) / np.max(np.abs(samples_in))
        samples_out = samples_out.astype(np.float32) / np.max(np.abs(samples_out))
        
        # Verify normalization was applied correctly
        if np.max(np.abs(samples_in)) > 1.001 or np.max(np.abs(samples_out)) > 1.001:
            print("WARNING: Normalization did not limit values to [-1, 1] range")
            
        # Get time window
        start_idx = int(start_time * fs_in)
        end_idx = int(end_time * fs_in)
        
        # Validate indices
        if start_idx >= len(samples_in) or end_idx > len(samples_in) or start_idx >= end_idx:
            print(f"WARNING: Invalid indices - start_idx: {start_idx}, end_idx: {end_idx}, samples length: {len(samples_in)}")
            # Apply corrections to prevent out of range errors
            start_idx = max(0, min(start_idx, len(samples_in) - 1))
            end_idx = max(start_idx + 1, min(end_idx, len(samples_in)))
        
        print(f"Time window indices: {start_idx}-{end_idx} (duration: {(end_idx-start_idx)/fs_in:.2f}s)")
        
        # Get samples for the time window
        window_in = samples_in[start_idx:end_idx]
        window_out = samples_out[start_idx:end_idx]
        
        # Also get original (unnormalized) window for comparison
        window_in_orig = samples_in_orig[start_idx:end_idx]
        window_out_orig = samples_out_orig[start_idx:end_idx]

        # Ensure we have enough samples for analysis
        if len(window_in) < 10:
            print(f"WARNING: Very few samples in window: {len(window_in)}")
            # Extend window if needed
            if end_idx < len(samples_in):
                end_idx = min(start_idx + fs_in, len(samples_in))  # At least 1 second if possible
                window_in = samples_in[start_idx:end_idx]
                window_out = samples_out[start_idx:end_idx]
                window_in_orig = samples_in_orig[start_idx:end_idx]
                window_out_orig = samples_out_orig[start_idx:end_idx]

        # Calculate statistics on original window to check for signal integrity issues
        try:
            # Check for any NaN or infinite values
            if np.any(np.isnan(window_in_orig)) or np.any(np.isinf(window_in_orig)):
                print("WARNING: Input signal contains NaN or infinite values")
            if np.any(np.isnan(window_out_orig)) or np.any(np.isinf(window_out_orig)):
                print("WARNING: Output signal contains NaN or infinite values")
                
            # Check for zero values
            if np.all(window_in_orig == 0):
                print("WARNING: Input signal is all zeros")
            if np.all(window_out_orig == 0):
                print("WARNING: Output signal is all zeros")
                
            # Calculate signal stats before normalization
            win_in_max = np.max(np.abs(window_in_orig))
            win_out_max = np.max(np.abs(window_out_orig))
            win_in_mean = np.mean(window_in_orig)
            win_out_mean = np.mean(window_out_orig)
            win_in_std = np.std(window_in_orig)
            win_out_std = np.std(window_out_orig)
            
            print(f"Window statistics before normalization:")
            print(f"  Input - Max: {win_in_max}, Mean: {win_in_mean}, StdDev: {win_in_std}")
            print(f"  Output - Max: {win_out_max}, Mean: {win_out_mean}, StdDev: {win_out_std}")
            
            # Calculate signal stats after normalization
            norm_in_max = np.max(np.abs(window_in))
            norm_out_max = np.max(np.abs(window_out))
            norm_in_mean = np.mean(window_in)
            norm_out_mean = np.mean(window_out)
            norm_in_std = np.std(window_in)
            norm_out_std = np.std(window_out)
            
            print(f"Window statistics after normalization:")
            print(f"  Input - Max: {norm_in_max}, Mean: {norm_in_mean}, StdDev: {norm_in_std}")
            print(f"  Output - Max: {norm_out_max}, Mean: {norm_out_mean}, StdDev: {norm_out_std}")
            
            # Include these in the validation metrics
            normalization_stats = {
                "original": {
                    "input": {"max": float(win_in_max), "mean": float(win_in_mean), "std": float(win_in_std)},
                    "output": {"max": float(win_out_max), "mean": float(win_out_mean), "std": float(win_out_std)}
                },
                "normalized": {
                    "input": {"max": float(norm_in_max), "mean": float(norm_in_mean), "std": float(norm_in_std)},
                    "output": {"max": float(norm_out_max), "mean": float(norm_out_mean), "std": float(norm_out_std)}
                }
            }
        except Exception as e:
            print(f"Error calculating signal statistics: {e}")
            normalization_stats = {"error": str(e)}

        # Compute FFT
        n = len(window_in)
        freqs = fftfreq(n, 1/fs_in)
        mask = freqs >= 0  # Only positive frequencies

        # Compute power spectrum
        fft_in = np.abs(fft(window_in))**2
        fft_out = np.abs(fft(window_out))**2

        # Normalize power spectrums
        fft_in = 10 * np.log10(fft_in / np.max(fft_in) + 1e-10)
        fft_out = 10 * np.log10(fft_out / np.max(fft_out) + 1e-10)

        # Compute frequency response
        freq_response = fft_out - fft_in

        # Create frequency ranges based on effect type
        freq_ranges = {
            0: {"name": "Custom Time Range", "range": (20, 20000)},
            1: {"name": "Bass Boost", "range": (20, 250)},
            2: {"name": "Mids Boost", "range": (250, 4000)},
            3: {"name": "High Boost", "range": (4000, 20000)},
            4: {"name": "Compressor", "range": (20, 20000)},
            5: {"name": "Reverb", "range": (20, 20000)},
            6: {"name": "Chorus", "range": (20, 20000)}
        }

        #handle effect types that aren't in the predefined ranges
        if effect_type not in freq_ranges:
            print(f"WARNING: Unknown effect type: {effect_type}, using full range")
            freq_ranges[effect_type] = {"name": f"Effect {effect_type}", "range": (20, 20000)}

        #prepare time domain data (downsample for visualization)
        step = max(len(window_in) // 1000, 1)
        time_points = np.arange(start_time, end_time, (end_time - start_time)/len(window_in))[::step]
        samples_in = window_in[::step]
        samples_out = window_out[::step]
        
        #For long time ranges (> 10 seconds), use a more strategic downsampling
        # to preserve signal characteristics
        duration = end_time - start_time
        if duration > 10:
            print(f"Long time range detected ({duration:.2f}s) - using enhanced downsampling")
            
            # Calculate a more aggressive downsampling factor to limit points. 
            target_points = min(1000, max(100, 10000 // int(duration)))
            new_step = max(len(window_in) // target_points, 1)
            
            #use the more aggressive step if it's larger than original
            if new_step > step:
                step = new_step
                time_points = np.arange(start_time, end_time, (end_time - start_time)/len(window_in))[::step]
                
                # For long ranges, use peak-finding to preserve signal characteristics
                # This ensures we don't miss peaks and valleys due to downsampling
                samples_in = []
                samples_out = []
                
                # Process in chunks to find local peaks and valleys
                chunk_size = step * 2
                for i in range(0, len(window_in), chunk_size):
                    chunk_in = window_in[i:min(i+chunk_size, len(window_in))]
                    chunk_out = window_out[i:min(i+chunk_size, len(window_out))]
                    
                    if len(chunk_in) > 0:
                        # Include the average and the extremes from each chunk
                        samples_in.append(np.mean(chunk_in))
                        samples_in.append(np.max(chunk_in))
                        samples_in.append(np.min(chunk_in))
                        
                        samples_out.append(np.mean(chunk_out))
                        samples_out.append(np.max(chunk_out))
                        samples_out.append(np.min(chunk_out))
                
                # Generate matching time points
                time_points = np.linspace(start_time, end_time, len(samples_in))
                
                # Convert to numpy arrays
                samples_in = np.array(samples_in)
                samples_out = np.array(samples_out)
                
                print(f"Enhanced downsampling: {len(samples_in)} points for {duration:.2f}s time range")
        
        # Completely re-implement the time domain data preparation to ensure proper signal representation
        # This works for ALL time ranges, not just long ones
        print("Using improved signal representation algorithm")
        
        # Define target number of points based on duration
        min_points = 100  # Minimum number of points to represent the signal adequately
        max_points = 1000  # Maximum number to avoid overwhelming the frontend
        
        # Scale target points based on duration, with a lower bound
        target_points = min(max_points, max(min_points, int(2000 / max(1, duration/5))))
        
        # Number of original samples
        num_samples = len(window_in)
        
        if num_samples <= target_points:
            # For short segments, use all samples
            samples_in_new = window_in
            samples_out_new = window_out
            time_points_new = np.linspace(start_time, end_time, num_samples)
        else:
            # For longer segments, use min-max decimation to preserve peaks
            # This divides the signal into chunks and keeps min, max and midpoint of each chunk
            # to preserve visual characteristics
            
            # Determine chunk size - each chunk will contribute 3 points (min, max, midpoint)
            # to reach our target point count
            points_per_chunk = 3  # min, max, midpoint
            num_chunks = max(1, target_points // points_per_chunk)
            chunk_size = num_samples // num_chunks
            
            if chunk_size < 2:
                # If chunks are too small, use regular downsampling
                step = max(num_samples // target_points, 1)
                samples_in_new = window_in[::step]
                samples_out_new = window_out[::step]
                time_points_new = np.linspace(start_time, end_time, len(samples_in_new))
            else:
                # Use min-max decimation
                samples_in_new = []
                samples_out_new = []
                time_indices = []
                
                for i in range(0, num_samples, chunk_size):
                    # Get the chunk
                    end_idx = min(i + chunk_size, num_samples)
                    chunk_in = window_in[i:end_idx]
                    chunk_out = window_out[i:end_idx]
                    
                    if len(chunk_in) >= 2:
                        # Find min value and its position
                        min_idx_in = i + np.argmin(chunk_in)
                        min_val_in = np.min(chunk_in)
                        
                        # Find max value and its position
                        max_idx_in = i + np.argmax(chunk_in)
                        max_val_in = np.max(chunk_in)
                        
                        # For output signal
                        min_idx_out = i + np.argmin(chunk_out)
                        min_val_out = np.min(chunk_out)
                        max_idx_out = i + np.argmax(chunk_out)
                        max_val_out = np.max(chunk_out)
                        
                        # Ensure we add points in chronological order
                        indices = sorted([min_idx_in, max_idx_in])
                        
                        # Add the first point (min or max)
                        samples_in_new.append(window_in[indices[0]])
                        samples_out_new.append(window_out[indices[0]])
                        time_indices.append(indices[0])
                        
                        # If min and max are at different positions, add the second point
                        if min_idx_in != max_idx_in and indices[0] != indices[1]:
                            samples_in_new.append(window_in[indices[1]])
                            samples_out_new.append(window_out[indices[1]])
                            time_indices.append(indices[1])
                    
                    # Always add the last point in the chunk to maintain continuity
                    if end_idx > i:
                        samples_in_new.append(window_in[end_idx-1])
                        samples_out_new.append(window_out[end_idx-1])
                        time_indices.append(end_idx-1)
                
                # Convert to numpy arrays
                samples_in_new = np.array(samples_in_new)
                samples_out_new = np.array(samples_out_new)
                
                # Generate time points based on original indices
                time_points_new = start_time + (np.array(time_indices) / num_samples) * (end_time - start_time)
        
        # Use the improved time domain data
        time_points = time_points_new
        samples_in = samples_in_new
        samples_out = samples_out_new
        
        print(f"Improved time domain representation: {len(time_points)} points")
        
        # Validate time arrays
        if len(time_points) == 0 or len(samples_in) == 0 or len(samples_out) == 0:
            print("WARNING: Empty time domain arrays after downsampling")
            # Generate at least some data points
            if len(time_points) == 0:
                time_points = np.linspace(start_time, end_time, 10)
            if len(samples_in) == 0:
                samples_in = np.zeros(len(time_points))
            if len(samples_out) == 0:
                samples_out = np.zeros(len(time_points))
        
        # Ensure all arrays are the same length
        min_len = min(len(time_points), len(samples_in), len(samples_out))
        time_points = time_points[:min_len]
        samples_in = samples_in[:min_len]
        samples_out = samples_out[:min_len]
        
        print(f"Final time domain data points: {len(time_points)}")

        #prepare frequency domain data
        freq_points = freqs[mask][::step]
        power_in = fft_in[mask][::step]
        power_out = fft_out[mask][::step]
        response = freq_response[mask][::step]

        # Calculate validation metrics
        # Root Mean Square Error (RMSE)
        rmse = np.sqrt(np.mean((window_in - window_out) ** 2))
        
        #correlation coefficient
        correlation = np.corrcoef(window_in, window_out)[0, 1]
        
        #maximum absolute difference
        max_diff = np.max(np.abs(window_in - window_out))
        
        #Signal-to-Noise Ratio (SNR)
        noise = window_in - window_out
        signal_power = np.mean(window_in**2)
        noise_power = np.mean(noise**2) if np.mean(noise**2) > 0 else 1e-10
        snr_db = 10 * np.log10(signal_power / noise_power)
        
        # Additional frequency-specific metrics
        effect_range = freq_ranges[effect_type]["range"]
        freq_range_mask = (freqs >= effect_range[0]) & (freqs <= effect_range[1]) & mask
        
        # Calculate average change in the effect's frequency range
        if np.any(freq_range_mask):
            freq_response_in_range = freq_response[freq_range_mask]
            avg_change_in_range = np.mean(freq_response_in_range)
            max_change_in_range = np.max(freq_response_in_range)
            min_change_in_range = np.min(freq_response_in_range)
        else:
            avg_change_in_range = 0
            max_change_in_range = 0
            min_change_in_range = 0
        
        # Print metrics for debugging
        print(f"Validation metrics - RMSE: {rmse:.6f}, Correlation: {correlation:.6f}, Max Diff: {max_diff:.6f}, SNR: {snr_db:.2f} dB")
        print(f"Effect range metrics - Avg Change: {avg_change_in_range:.2f} dB, Max: {max_change_in_range:.2f} dB, Min: {min_change_in_range:.2f} dB")

        # Include normalization stats in the validation metrics
        validation_metrics = {
            "rmse": float(rmse),
            "correlation": float(correlation),
            "maxDiff": float(max_diff),
            "snr": float(snr_db),
            "freqRangeMetrics": {
                "avgChange": float(avg_change_in_range),
                "maxChange": float(max_change_in_range),
                "minChange": float(min_change_in_range)
            },
            "normalizationStats": normalization_stats
        }

        visualization_data = {
            "timeDomain": {
                "time": time_points.tolist(),
                "input": samples_in.tolist(),
                "output": samples_out.tolist()
            },
            "frequencyDomain": {
                "frequencies": freq_points.tolist(),
                "powerInput": power_in.tolist(),
                "powerOutput": power_out.tolist(),
                "frequencyResponse": response.tolist()
            },
            "effectInfo": {
                "type": effect_type,
                "name": freq_ranges[effect_type]["name"],
                "range": freq_ranges[effect_type]["range"]
            },
            "validationMetrics": validation_metrics
        }

        return visualization_data

    finally:
        # Clean up temporary WAV files
        if os.path.exists(input_wav):
            os.remove(input_wav)
        if os.path.exists(output_wav):
            os.remove(output_wav)