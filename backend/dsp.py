from pydub import AudioSegment
from scipy.signal import butter, sosfilt, iirpeak, tf2sos
import numpy as np
import os
import subprocess

# Low shelf filter
def low_shelf_filter(samples, boost_db, cutoff, fs):
    nyquist = 0.5 * fs
    norm_cutoff = cutoff / nyquist
    sos = butter(2, norm_cutoff, btype='low', output='sos')
    boosted_samples = sosfilt(sos, samples)
    gain = 10 ** (boost_db / 20)
    boosted_samples = samples + boosted_samples * gain
    return boosted_samples

# High shelf filter
def high_shelf_filter(samples, boost_db, cutoff, fs):
    nyquist = 0.5 * fs
    norm_cutoff = cutoff / nyquist
    sos = butter(2, norm_cutoff, btype='high', output='sos')
    boosted_samples = sosfilt(sos, samples)
    gain = 10 ** (boost_db / 20)
    return samples + boosted_samples * gain

# Mids peak filter
def mids_peak_filter(samples, boost_db, center_freq, bandwidth, fs):
    nyquist = 0.5 * fs
    norm_center_freq = center_freq / nyquist
    norm_bandwidth = bandwidth / nyquist

    b, a = iirpeak(norm_center_freq, norm_bandwidth)
    sos = tf2sos(b, a)

    boosted_samples = sosfilt(sos, samples)
    gain = 10 ** (boost_db / 20)
    boosted_samples = samples + boosted_samples * gain 

    return boosted_samples

# Bass boost
def bass_boost(infile, outfile, boost_db=10, cutoff=150):
    audio = AudioSegment.from_file(infile)
    audio = audio.set_channels(1)
    samples = np.array(audio.get_array_of_samples())
    samples = samples / (2 ** (audio.sample_width * 8 - 1))

    fs = audio.frame_rate
    boosted_samples = low_shelf_filter(samples, boost_db, cutoff, fs)
    boosted_samples = high_shelf_filter(boosted_samples, boost_db=5, cutoff=3000, fs=fs)
    boosted_samples = boosted_samples / (np.max(np.abs(boosted_samples)) + 1e-10)
    boosted_samples = (boosted_samples * (2 ** (audio.sample_width * 8 - 1))).astype(np.int16)
    boosted_audio = audio._spawn(boosted_samples.tobytes())
    boosted_audio.export(outfile, format="wav")

    print(f"Bass boosted audio saved to: {outfile}")

# Highs boost
def high_boost(infile, outfile, boost_db=10, cutoff=4000):
    audio = AudioSegment.from_file(infile)
    audio = audio.set_channels(1)
    samples = np.array(audio.get_array_of_samples())
    samples = samples / (2 ** (audio.sample_width * 8 - 1))

    fs = audio.frame_rate
    boosted_samples = high_shelf_filter(samples, boost_db, cutoff, fs)
    boosted_samples = boosted_samples / (np.max(np.abs(boosted_samples)) + 1e-10)
    boosted_samples = (boosted_samples * (2 ** (audio.sample_width * 8 - 1))).astype(np.int16)
    boosted_audio = audio._spawn(boosted_samples.tobytes())
    boosted_audio.export(outfile, format="wav")

    print(f"High boosted audio saved to: {outfile}")

# Mids enhancing
def mids_boost(infile, outfile, boost_db=10, center_freq=1000, bandwidth=1000):
    audio = AudioSegment.from_file(infile)
    audio = audio.set_channels(1)
    samples = np.array(audio.get_array_of_samples())
    samples = samples / (2 ** (audio.sample_width * 8 - 1))

    fs = audio.frame_rate
    boosted_samples = mids_peak_filter(samples, boost_db, center_freq, bandwidth, fs)
    boosted_samples = boosted_samples / (np.max(np.abs(boosted_samples)) + 1e-10)
    boosted_samples = (boosted_samples * (2 ** (audio.sample_width * 8 - 1))).astype(np.int16)
    boosted_audio = audio._spawn(boosted_samples.tobytes())
    boosted_audio.export(outfile, format="wav")

    print(f"Mids boosted audio saved to: {outfile}")

# This will be called from the frontend
def download(link, output_folder="input"):
    os.makedirs(output_folder, exist_ok=True)
    custom_name = output_folder.strip()
    sanitized_name = "".join(c for c in custom_name if c.isalnum() or c == " ").strip()
    output_file = os.path.join(output_folder, f"{sanitized_name}.mp3")
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

def input(link, choice):
    os.makedirs("input", exist_ok=True)
    os.makedirs("output", exist_ok=True)
    infile = download(link)
    outfile = os.path.join("output", "output_" + os.path.basename(infile))

    if choice == 1:
        bass_boost(infile, outfile)
    elif choice == 2:
        mids_boost(infile, outfile)
    elif choice == 3:
        high_boost(infile, outfile)