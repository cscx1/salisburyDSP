import numpy as np
from scipy.signal import butter, sosfilt, iirpeak, tf2sos
from scipy.io import wavfile
import os
import subprocess
import time

def convert_to_wav(input_file, output_file):
    """Convert audio file to WAV format using ffmpeg"""
    output_wav = output_file.rsplit('.', 1)[0] + '.wav'
    subprocess.run([
        'ffmpeg', '-i', input_file,
        '-acodec', 'pcm_s16le',
        '-ar', '44100',
        '-y', 
        output_wav
    ], check=True, capture_output=True)
    return output_wav

def convert_to_mp3(input_wav, output_mp3):
    """Convert WAV to MP3 format using ffmpeg"""
    subprocess.run([
        'ffmpeg', '-i', input_wav,
        '-codec:a', 'libmp3lame',
        '-qscale:a', '2',
        '-y',
        output_mp3
    ], check=True, capture_output=True)

# Low shelf filter
# Boosts low frequencies below cutoff
# while not touching high frequencies much
def low_shelf_filter(samples, boost_db, cutoff, fs):

    # nyquist frequency is half of the sampling rate
    nyquist = 0.5 * fs

    # normalized cutoff makes it fit
    # in the range 0 to 1
    norm_cutoff = cutoff / nyquist

    # second order butterworth low pass filter
    # returns second order sections (sos)
    sos = butter(2, norm_cutoff, btype='low', output='sos')

    # applies filter to input audio
    boosted_samples = sosfilt(sos, samples)

    # converting gain from decibels to a linear scale
    gain = 10 ** (boost_db / 20)

    # add boosted signal back to original 
    boosted_samples = samples + boosted_samples * gain
    return boosted_samples

# High shelf filter
def high_shelf_filter(samples, boost_db, cutoff, fs):
    # same process as low shelf filter but
    # using high pass filter instead of low pass filter
    nyquist = 0.5 * fs
    norm_cutoff = cutoff / nyquist
    sos = butter(2, norm_cutoff, btype='high', output='sos')
    boosted_samples = sosfilt(sos, samples)
    gain = 10 ** (boost_db / 20)
    return samples + boosted_samples * gain

# Mids peak filter
def mids_peak_filter(samples, boost_db, center_freq, bandwidth, fs):

    # normalize center frequency and bandwidth
    nyquist = 0.5 * fs
    norm_center_freq = center_freq / nyquist
    norm_bandwidth = bandwidth / nyquist

    # create resonant peak filter (band pass filter)
    # centered at center_freq
    b, a = iirpeak(norm_center_freq, norm_bandwidth)

    # converts filter into a second order section
    sos = tf2sos(b, a)

    # filters the mids, boost them
    boosted_samples = sosfilt(sos, samples)
    gain = 10 ** (boost_db / 20)
    boosted_samples = samples + boosted_samples * gain 

    return boosted_samples

def process_audio(input_file, output_file, effect_func, start_time, end_time, *args):
    """Process audio with the given effect function only within the specified time range"""
    input_wav = convert_to_wav(input_file, input_file)

    try:
        fs, samples = wavfile.read(input_wav)

        if len(samples.shape) > 1:
            samples = np.mean(samples, axis=1)

        samples = samples.astype(np.float32)
        samples = samples / np.max(np.abs(samples))

        # Convert time to sample indices
        start_sample = int(start_time * fs)
        end_sample = int(end_time * fs) if end_time is not None else len(samples)

        # Clamp bounds
        start_sample = max(0, min(start_sample, len(samples)))
        end_sample = max(start_sample, min(end_sample, len(samples)))

        # Print time
        print(f"Applying effect from {start_sample/fs:.2f}s to {end_sample/fs:.2f}s")

        # Slice, process, and reinsert
        region = samples[start_sample:end_sample]
        processed_region = effect_func(region, *args)

        processed = np.copy(samples)
        processed[start_sample:end_sample] = processed_region

        # Normalize entire track
        processed = processed / np.max(np.abs(processed))
        processed = (processed * 32767).astype(np.int16)

        temp_wav = output_file.rsplit('.', 1)[0] + '_temp.wav'
        wavfile.write(temp_wav, fs, processed)
        convert_to_mp3(temp_wav, output_file)

        os.remove(input_wav)
        os.remove(temp_wav)

    except Exception as e:
        print(f"Error processing audio: {e}")
        if os.path.exists(input_wav):
            os.remove(input_wav)
        raise

# Compressor
def compressor_filter(samples, threshold_db=-20, ratio=4.0, attack_ms=10, release_ms=100, makeup_gain_db=0, fs=44100):
    threshold = 10 ** (threshold_db / 20)
    makeup_gain = 10 ** (makeup_gain_db / 20)
    alpha_attack = np.exp(-1.0 / (fs * (attack_ms / 1000.0)))
    alpha_release = np.exp(-1.0 / (fs * (release_ms / 1000.0)))

    gain = 1.0
    gains = np.zeros_like(samples)

    for i in range(len(samples)):
        abs_sample = abs(samples[i])
        if abs_sample > threshold:
            target_gain = (threshold + (abs_sample - threshold) / ratio) / abs_sample
        else:
            target_gain = 1.0

        if target_gain < gain:
            gain = alpha_attack * (gain - target_gain) + target_gain
        else:
            gain = alpha_release * (gain - target_gain) + target_gain

        gains[i] = gain

    compressed = samples * gains * makeup_gain
    return compressed

def reverb_filter(samples, delay_ms=30, decay=0.3, fs=44100, num_echoes=3):
    delay_samples = int(fs * (delay_ms / 1000.0))
    output = np.copy(samples)

    for i in range(1, num_echoes + 1):
        delay = delay_samples * i
        echo = np.zeros_like(samples)
        if delay < len(samples):
            echo[delay:] = samples[:-delay] * (decay ** i)
            output += echo

    # Normalize to prevent clipping
    output = output / np.max(np.abs(output))
    return output

def chorus_filter(samples, rate=44100, depth_ms=5, mod_freq=0.15, mix=0.3):
    depth = int((depth_ms / 1000.0) * rate)
    mod = np.sin(2 * np.pi * mod_freq * np.arange(len(samples)) / rate)
    mod = ((mod + 1) / 2) * depth

    output = np.zeros_like(samples)
    for i in range(len(samples)):
        delay = int(mod[i])
        if i - delay >= 0:
            output[i] = (1 - mix) * samples[i] + mix * samples[i - delay]
        else:
            output[i] = samples[i]
    
    # Normalize to avoid clipping
    output = output / np.max(np.abs(output))
    return output

# Bass boost
def bass_boost(infile, outfile, boost_db=10, cutoff=150, start_time=0, end_time=None):
    process_audio(infile, outfile, low_shelf_filter, start_time, end_time, boost_db, cutoff, 44100)

# Highs boost
def high_boost(infile, outfile, boost_db=10, cutoff=4000, start_time=0, end_time=None):
    process_audio(infile, outfile, high_shelf_filter, start_time, end_time, boost_db, cutoff, 44100)

# Mids enhancing
def mids_boost(infile, outfile, boost_db=10, center_freq=1000, bandwidth=1000, start_time=0, end_time=None):
    process_audio(infile, outfile, mids_peak_filter, start_time, end_time, boost_db, center_freq, bandwidth, 44100)

# Compressor
def compressor(infile, outfile, threshold_db=-20, ratio=4.0, attack_ms=10, release_ms=100, makeup_gain_db=0, fs=44100, start_time=0, end_time=None):
    process_audio(infile, outfile, compressor_filter, start_time, end_time, threshold_db, ratio, attack_ms, release_ms, makeup_gain_db, fs)

# Reverb
def reverb(infile, outfile, delay_ms=30, decay=0.3, fs=44100, num_echoes=3, start_time=0, end_time=None):
    process_audio(infile, outfile, reverb_filter, start_time, end_time, delay_ms, decay, fs, num_echoes)

# Chorus effect
def chorus(infile, outfile, rate=44100, depth_ms=5, mod_freq=0.15, mix=0.3, start_time=0, end_time=None):
    process_audio(infile, outfile, chorus_filter, start_time, end_time, rate, depth_ms, mod_freq, mix)


# Download the file here locally
def download(link, output_file):
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    command = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "mp3",
        "--no-playlist",
        "--no-cache-dir",
        "--force-overwrites",
        "-o", output_file,
        link
    ]

    subprocess.run(command, check=True)

    if not os.path.exists(output_file):
        raise FileNotFoundError(f"Download failed: {output_file} was not created.")

    return output_file

# Get the duration of the audio
def get_audio_duration(file):
    """Get duration of audio file using ffmpeg"""
    result = subprocess.run([
        'ffprobe', '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        file
    ], capture_output=True, text=True)
    return float(result.stdout)

# This will be called from the frontend
def inputInfo(link, choice, input_file, output_file, start_time=0, end_time=None, do_download=False, **kwargs):
    os.makedirs("input", exist_ok=True)
    os.makedirs("output", exist_ok=True)

    if do_download:
        infile = download(link, input_file)
    else:
        infile = output_file

    if end_time is None:
        end_time = get_audio_duration(infile)

    # General settings
    boost = float(kwargs.get("boost", 10)) or 10
    cutoff = float(kwargs.get("cutoff", 150)) or 150
    center_freq = float(kwargs.get("center_freq", 1000)) or 1000
    bandwidth = float(kwargs.get("bandwidth", 1000)) or 1000
    threshold = float(kwargs.get("threshold", -20)) or -20

    # Chorus settings
    depth_ms = float(kwargs.get("depth_ms", 5)) or 5
    mod_freq = float(kwargs.get("mod_freq", 0.15)) or 0.15
    mix = float(kwargs.get("mix", 0.3)) or 0.3

    # Reverb settings
    decay = float(kwargs.get("decay", 0.3)) or 0.3
    delay_ms = float(kwargs.get("delay_ms", 30)) or 30
    num_echoes = int(kwargs.get("num_echoes", 3)) or 3

    # Compressor settings
    ratio = float(kwargs.get("ratio", 4.0)) or 4.0
    attack = float(kwargs.get("attack", 10)) or 10
    release = float(kwargs.get("release", 100)) or 100

    if choice == 1:
        bass_boost(infile, output_file, boost, cutoff, start_time, end_time)
    elif choice == 2:
        mids_boost(infile, output_file, boost, center_freq, bandwidth, start_time, end_time)
    elif choice == 3:
        high_boost(infile, output_file, boost, cutoff, start_time, end_time)
        compressor(output_file, output_file, threshold, ratio, attack, release, boost, 44100, start_time, end_time)
    elif choice == 4:
        compressor(infile, output_file, threshold, ratio, attack, release, boost, 44100, start_time, end_time)
    elif choice == 5:
        reverb(infile, output_file, delay_ms, decay, 44100, num_echoes, start_time, end_time)
    elif choice == 6:
        chorus(infile, output_file, 44100, depth_ms, mod_freq, mix, start_time, end_time)

    if os.path.exists(output_file):
        print(f"Output file saved: {output_file}")
    else:
        print(f"Error: Output file missing: {output_file}")
