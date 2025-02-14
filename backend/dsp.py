from pydub import AudioSegment
from scipy.signal import butter, sosfilt, iirpeak, tf2sos
import numpy as np
import os
import subprocess
import time

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

# Bass boost
def bass_boost(infile, outfile, boost_db=10, cutoff=150):
    # converts the audio into a mono array of samples
    # normalized into the range -1 to 1
    audio = AudioSegment.from_file(infile)
    audio = audio.set_channels(1)
    samples = np.array(audio.get_array_of_samples())
    samples = samples / (2 ** (audio.sample_width * 8 - 1))

    # applies low shelf filter
    fs = audio.frame_rate
    boosted_samples = low_shelf_filter(samples, boost_db, cutoff, fs)

    # applies high shelf filter
    boosted_samples = high_shelf_filter(boosted_samples, boost_db=5, cutoff=3000, fs=fs)

    # normalizes samples and converts to int format
    boosted_samples = boosted_samples / (np.max(np.abs(boosted_samples)) + 1e-10)
    boosted_samples = (boosted_samples * (2 ** (audio.sample_width * 8 - 1))).astype(np.int16)

    # write the modified audio file
    boosted_audio = audio._spawn(boosted_samples.tobytes())
    boosted_audio.export(outfile, format="wav")

    print(f"Bass boosted audio saved to: {outfile}")

# Highs boost
def high_boost(infile, outfile, boost_db=10, cutoff=4000):
    # read in and normalize audio
    audio = AudioSegment.from_file(infile)
    audio = audio.set_channels(1)
    samples = np.array(audio.get_array_of_samples())
    samples = samples / (2 ** (audio.sample_width * 8 - 1))

    # high shelf filter
    fs = audio.frame_rate
    boosted_samples = high_shelf_filter(samples, boost_db, cutoff, fs)

    # normalize and convert back to int format
    boosted_samples = boosted_samples / (np.max(np.abs(boosted_samples)) + 1e-10)
    boosted_samples = (boosted_samples * (2 ** (audio.sample_width * 8 - 1))).astype(np.int16)

    # write the modified audio file
    boosted_audio = audio._spawn(boosted_samples.tobytes())
    boosted_audio.export(outfile, format="wav")

    print(f"High boosted audio saved to: {outfile}")

# Mids enhancing
def mids_boost(infile, outfile, boost_db=10, center_freq=1000, bandwidth=1000):
    # read in from file, normalize
    audio = AudioSegment.from_file(infile)
    audio = audio.set_channels(1)
    samples = np.array(audio.get_array_of_samples())
    samples = samples / (2 ** (audio.sample_width * 8 - 1))

    # mid freq boost
    fs = audio.frame_rate
    boosted_samples = mids_peak_filter(samples, boost_db, center_freq, bandwidth, fs)

    # normalize and convert back to int format
    boosted_samples = boosted_samples / (np.max(np.abs(boosted_samples)) + 1e-10)
    boosted_samples = (boosted_samples * (2 ** (audio.sample_width * 8 - 1))).astype(np.int16)

    # write modified audio file
    boosted_audio = audio._spawn(boosted_samples.tobytes())
    boosted_audio.export(outfile, format="wav")

    print(f"Mids boosted audio saved to: {outfile}")

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

# This will be called from the frontend
def input(link, choice, output_file, input_file):
    os.makedirs("input", exist_ok=True)
    os.makedirs("output", exist_ok=True)
    
    infile = download(link, input_file)  

    if choice == 1:
        bass_boost(infile, output_file)
    elif choice == 2:
        mids_boost(infile, output_file)
    elif choice == 3:
        high_boost(infile, output_file)

    if os.path.exists(output_file):
        print(f"Output file saved: {output_file}")
    else:
        print(f"Error: Output file missing: {output_file}")