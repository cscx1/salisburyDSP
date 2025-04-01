import numpy as np
from scipy.signal import butter, sosfilt, iirpeak, tf2sos
from scipy.io import wavfile
import os
import subprocess
import time

class DSP:
    #
    # Name: convert_to_wav()
    # Parameters: input_file, output_file
    # Return: output_wav
    # Description: Converts an input file to a WAV file using FFmpeg.
    #
    def convert_to_wav(self, input_file, output_file):
        output_wav = output_file.rsplit('.', 1)[0] + '.wav'
        subprocess.run([
            'ffmpeg', '-i', input_file,
            '-acodec', 'pcm_s16le',
            '-ar', '44100',
            '-y', 
            output_wav
        ], check=True, capture_output=True)
        return output_wav

    #
    # Name: convert_to_mp3()
    # Parameters: input_wav, output_mp3
    # Return: None
    # Description: Converts a WAV file to an MP3 file using FFmpeg.
    #
    def convert_to_mp3(self, input_wav, output_mp3):
        subprocess.run([
            'ffmpeg', '-i', input_wav,
            '-codec:a', 'libmp3lame',
            '-qscale:a', '2',
            '-y',
            output_mp3
        ], check=True, capture_output=True)
    #
    # Name: low_shelf_filter()
    # Parameters: samples, boost_db, cutoff, fs
    # Return: boosted samples
    # Description: Applies a low shelf filter to boost low frequencies.
    #
    def low_shelf_filter(self, samples, boost_db, cutoff, fs):
        # Normalize cutoff freq based on sampling rate
        nyquist = 0.5 * fs
        norm_cutoff = cutoff / nyquist
        # Low pass filter
        sos = butter(2, norm_cutoff, btype='low', output='sos')
        # Apply filter to input
        boosted_samples = sosfilt(sos, samples)
        # Convert dB boost to a linear gain factor
        gain = 10 ** (boost_db / 20)
        # Add boosted signal to original
        return samples + boosted_samples * gain

    #
    # Name: high_shelf_filter()
    # Parameters: samples, boost_db, cutoff, fs
    # Return: boosted samples
    # Description: Applies a high shelf filter to boost high frequencies.
    #
    def high_shelf_filter(self, samples, boost_db, cutoff, fs):
        # Normalize cutoff freq based on sampling rate
        nyquist = 0.5 * fs
        norm_cutoff = cutoff / nyquist
        # High pass filter
        sos = butter(2, norm_cutoff, btype='high', output='sos')
        # Apply filter to input
        boosted_samples = sosfilt(sos, samples)
        # Convert dB boost to a linear gain factor
        gain = 10 ** (boost_db / 20)
        # Add boosted signal to original
        return samples + boosted_samples * gain

    #
    # Name: mids_peak_filter()
    # Parameters: samples, boost_db, center_freq, bandwidth, fs
    # Return: boosted samples
    # Description: Applies a peaking filter to boost midrange frequencies.
    #
    def mids_peak_filter(self, samples, boost_db, center_freq, bandwidth, fs):
        # Normalize cutoff freq based on sampling rate
        nyquist = 0.5 * fs
        norm_center_freq = center_freq / nyquist
        norm_bandwidth = bandwidth / nyquist
        # Peaking filter centered at target frequency
        b, a = iirpeak(norm_center_freq, norm_bandwidth)
        sos = tf2sos(b, a)
        # Apply filter to input
        boosted_samples = sosfilt(sos, samples)
        # Convert dB boost to a linear gain factor
        gain = 10 ** (boost_db / 20)
        # Add boosted signal to original
        return samples + boosted_samples * gain

    #
    # Name: compressor_filter()
    # Parameters: samples, threshold_db, ratio, attack_ms, release_ms, makeup_gain_db, fs
    # Return: compressed samples
    # Description: Applies dynamic range compression to the audio signal.
    #
    def compressor_filter(self, samples, threshold_db=-20, ratio=4.0, attack_ms=10, release_ms=100, makeup_gain_db=0, fs=44100):
        # Convert dB values to linear scale
        threshold = 10 ** (threshold_db / 20)
        makeup_gain = 10 ** (makeup_gain_db / 20)
        # Calculate attack and release smoothing coefficients
        alpha_attack = np.exp(-1.0 / (fs * (attack_ms / 1000.0)))
        alpha_release = np.exp(-1.0 / (fs * (release_ms / 1000.0)))
        gain = 1.0
        gains = np.zeros_like(samples)
        # Loop through samples, apply compression
        for i in range(len(samples)):
            abs_sample = abs(samples[i])
            if abs_sample > threshold:
                target_gain = (threshold + (abs_sample - threshold) / ratio) / abs_sample
            else:
                target_gain = 1.0
            # Apply smoothing so transitions are not harsh
            if target_gain < gain:
                gain = alpha_attack * (gain - target_gain) + target_gain
            else:
                gain = alpha_release * (gain - target_gain) + target_gain
            gains[i] = gain
        # Apply calculated gains to signal with makeup gain
        return samples * gains * makeup_gain

    #
    # Name: reverb_filter()
    # Parameters: samples, delay_ms, decay, fs, num_echoes
    # Return: reverberated samples
    # Description: Adds echo and reverberation to the audio signal.
    #
    def reverb_filter(self, samples, delay_ms=30, decay=0.3, fs=44100, num_echoes=3):
        # Convert delay time to number of samples
        delay_samples = int(fs * (delay_ms / 1000.0))
        # Copy original signal to avoid clashes
        output = np.copy(samples)
        # Generate multiple echoes with decreasing volume
        for i in range(1, num_echoes + 1):
            delay = delay_samples * i
            echo = np.zeros_like(samples)
            if delay < len(samples):
                echo[delay:] = samples[:-delay] * (decay ** i)
                output += echo
        # Normalize output
        return output / np.max(np.abs(output))

    #
    # Name: chorus_filter()
    # Parameters: samples, rate, depth_ms, mod_freq, mix
    # Return: chorus samples
    # Description: Applies a chorus effect by modulating delay.
    #
    def chorus_filter(self, samples, rate=44100, depth_ms=5, mod_freq=0.15, mix=0.3):
        # Convert modulation depth from ms to samples
        depth = int((depth_ms / 1000.0) * rate)
        # Create modulation signal using a sine wave
        mod = np.sin(2 * np.pi * mod_freq * np.arange(len(samples)) / rate)
        mod = ((mod + 1) / 2) * depth
        output = np.zeros_like(samples)
        # Apply delay based on modulation to create effect
        for i in range(len(samples)):
            delay = int(mod[i])
            if i - delay >= 0:
                output[i] = (1 - mix) * samples[i] + mix * samples[i - delay]
            else:
                output[i] = samples[i]
        # Normalize output
        return output / np.max(np.abs(output))

    #
    # Name: download()
    # Parameters: link, output_file
    # Return: output_file
    # Description: Downloads an audio file from a given link using yt-dlp.
    #
    def download(self, link, output_file):
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        command = [
            "yt-dlp", "--extract-audio", "--audio-format", "mp3",
            "--no-playlist", "--no-cache-dir", "--force-overwrites",
            "-o", output_file, link
        ]
        subprocess.run(command, check=True)
        if not os.path.exists(output_file):
            raise FileNotFoundError(f"Download failed: {output_file} was not created.")
        return output_file

    #
    # Name: get_audio_duration()
    # Parameters: file
    # Return: duration
    # Description: Returns the duration of the audio file in seconds using ffprobe.
    #
    def get_audio_duration(self, file):
        result = subprocess.run([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', file
        ], capture_output=True, text=True)
        return float(result.stdout)

    #
    # Name: process_audio()
    # Parameters: input_file, output_file, effect_func, start_time, end_time, *args
    # Return: None
    # Description: Applies a specified audio effect to a region of the input file and saves the output.
    #
    def process_audio(self, input_file, output_file, effect_func, start_time, end_time, *args):
        input_wav = self.convert_to_wav(input_file, input_file)
        try:
            fs, samples = wavfile.read(input_wav)
            if len(samples.shape) > 1:
                samples = np.mean(samples, axis=1)
            samples = samples.astype(np.float32) / np.max(np.abs(samples))
            start_sample = int(start_time * fs)
            end_sample = int(end_time * fs) if end_time else len(samples)
            start_sample = max(0, min(start_sample, len(samples)))
            end_sample = max(start_sample, min(end_sample, len(samples)))
            region = samples[start_sample:end_sample]
            processed_region = effect_func(region, *args)
            processed = np.copy(samples)
            processed[start_sample:end_sample] = processed_region
            processed = processed / np.max(np.abs(processed))
            processed = (processed * 32767).astype(np.int16)
            temp_wav = output_file.rsplit('.', 1)[0] + '_temp.wav'
            wavfile.write(temp_wav, fs, processed)
            self.convert_to_mp3(temp_wav, output_file)
            os.remove(input_wav)
            os.remove(temp_wav)
        except Exception as e:
            print(f"Error processing audio: {e}")
            if os.path.exists(input_wav):
                os.remove(input_wav)
            raise

    #
    # Name: inputInfo()
    # Parameters: link, choice, input_file, output_file, start_time, end_time, do_download, **kwargs
    # Return: None
    # Description: Parses user input, sets parameters, downloads file if needed, and calls the appropriate processing function.
    #
    def inputInfo(self, link, choice, input_file, output_file, start_time=0, end_time=None, do_download=False, **kwargs):
        os.makedirs("input", exist_ok=True)
        os.makedirs("output", exist_ok=True)
        infile = self.download(link, input_file) if do_download else output_file
        if end_time is None:
            end_time = self.get_audio_duration(infile)
        boost = float(kwargs.get("boost", 10))
        cutoff = float(kwargs.get("cutoff", 150))
        center_freq = float(kwargs.get("center_freq", 1000))
        bandwidth = float(kwargs.get("bandwidth", 1000))
        threshold = float(kwargs.get("threshold", -20))
        depth_ms = float(kwargs.get("depth_ms", 5))
        mod_freq = float(kwargs.get("mod_freq", 0.15))
        mix = float(kwargs.get("mix", 0.3))
        decay = float(kwargs.get("decay", 0.3))
        delay_ms = float(kwargs.get("delay_ms", 30))
        num_echoes = int(kwargs.get("num_echoes", 3))
        ratio = float(kwargs.get("ratio", 4.0))
        attack = float(kwargs.get("attack", 10))
        release = float(kwargs.get("release", 100))

        if choice == 1:
            self.process_audio(infile, output_file, self.low_shelf_filter, start_time, end_time, boost, cutoff, 44100)
        elif choice == 2:
            self.process_audio(infile, output_file, self.mids_peak_filter, start_time, end_time, boost, center_freq, bandwidth, 44100)
        elif choice == 3:
            self.process_audio(infile, output_file, self.high_shelf_filter, start_time, end_time, boost, cutoff, 44100)
            self.process_audio(output_file, output_file, self.compressor_filter, start_time, end_time, threshold, ratio, attack, release, boost, 44100)
        elif choice == 4:
            self.process_audio(infile, output_file, self.compressor_filter, start_time, end_time, threshold, ratio, attack, release, boost, 44100)
        elif choice == 5:
            self.process_audio(infile, output_file, self.reverb_filter, start_time, end_time, delay_ms, decay, 44100, num_echoes)
        elif choice == 6:
            self.process_audio(infile, output_file, self.chorus_filter, start_time, end_time, 44100, depth_ms, mod_freq, mix)

        if os.path.exists(output_file):
            print(f"Output file saved: {output_file}")
        else:
            print(f"Error: Output file missing: {output_file}")