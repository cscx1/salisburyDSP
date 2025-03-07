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
        '-y',  # Overwrite output file if it exists
        output_wav
    ], check=True, capture_output=True)
    return output_wav

def convert_to_mp3(input_wav, output_mp3):
    """Convert WAV to MP3 format using ffmpeg"""
    subprocess.run([
        'ffmpeg', '-i', input_wav,
        '-codec:a', 'libmp3lame',
        '-qscale:a', '2',
        '-y',  # Overwrite output file if it exists
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

def process_audio(input_file, output_file, effect_func, *args):
    """Process audio with the given effect function"""
    # Convert input to WAV
    input_wav = convert_to_wav(input_file, input_file)
    
    try:
        # Read the WAV file
        fs, samples = wavfile.read(input_wav)
        
        # Convert to mono if stereo
        if len(samples.shape) > 1:
            samples = np.mean(samples, axis=1)
        
        # Convert to float32 and normalize
        samples = samples.astype(np.float32)
        samples = samples / np.max(np.abs(samples))
        
        # Apply the effect
        processed = effect_func(samples, *args)
        
        # Normalize and convert back to int16
        processed = processed / np.max(np.abs(processed))
        processed = (processed * 32767).astype(np.int16)
        
        # Save as temporary WAV
        temp_wav = output_file.rsplit('.', 1)[0] + '_temp.wav'
        wavfile.write(temp_wav, fs, processed)
        
        # Convert to MP3
        convert_to_mp3(temp_wav, output_file)
        
        # Clean up temporary files
        os.remove(input_wav)
        os.remove(temp_wav)
        
    except Exception as e:
        print(f"Error processing audio: {e}")
        if os.path.exists(input_wav):
            os.remove(input_wav)
        raise

# Bass boost
def bass_boost(infile, outfile, boost_db=10, cutoff=150, start_time=0, end_time=None):
    process_audio(infile, outfile, low_shelf_filter, boost_db, cutoff, 44100)

# Highs boost
def high_boost(infile, outfile, boost_db=10, cutoff=4000, start_time=0, end_time=None):
    process_audio(infile, outfile, high_shelf_filter, boost_db, cutoff, 44100)

# Mids enhancing
def mids_boost(infile, outfile, boost_db=10, center_freq=1000, bandwidth=1000, start_time=0, end_time=None):
    process_audio(infile, outfile, mids_peak_filter, boost_db, center_freq, bandwidth, 44100)

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
def inputInfo(link, choice, input_file, output_file, start_time=0, end_time=None, do_download=False):

    os.makedirs("input", exist_ok=True)
    os.makedirs("output", exist_ok=True)

    if do_download:
        infile = download(link, input_file)  
    else:
        infile = output_file

    if end_time is None:
        end_time = get_audio_duration(infile)

    if choice == 1:
        bass_boost(infile, output_file, start_time=start_time, end_time=end_time)
    elif choice == 2:
        mids_boost(infile, output_file, start_time=start_time, end_time=end_time)
    elif choice == 3:
        high_boost(infile, output_file, start_time=start_time, end_time=end_time)

    if os.path.exists(output_file):
        print(f"Output file saved: {output_file}")
    else:
        print(f"Error: Output file missing: {output_file}")