import numpy as np
from scipy.signal import butter, sosfilt, iirpeak, tf2sos
from scipy.io import wavfile
import os
import subprocess
import time

class DSP:
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

    def convert_to_mp3(self, input_wav, output_mp3):
        subprocess.run([
            'ffmpeg', '-i', input_wav,
            '-codec:a', 'libmp3lame',
            '-qscale:a', '2',
            '-y',
            output_mp3
        ], check=True, capture_output=True)

    def low_shelf_filter(self, samples, boost_db, cutoff, fs):
        nyquist = 0.5 * fs
        norm_cutoff = cutoff / nyquist
        sos = butter(2, norm_cutoff, btype='low', output='sos')
        boosted_samples = sosfilt(sos, samples)
        gain = 10 ** (boost_db / 20)
        return samples + boosted_samples * gain

    def high_shelf_filter(self, samples, boost_db, cutoff, fs):
        nyquist = 0.5 * fs
        norm_cutoff = cutoff / nyquist
        sos = butter(2, norm_cutoff, btype='high', output='sos')
        boosted_samples = sosfilt(sos, samples)
        gain = 10 ** (boost_db / 20)
        return samples + boosted_samples * gain

    def mids_peak_filter(self, samples, boost_db, center_freq, bandwidth, fs):
        nyquist = 0.5 * fs
        norm_center_freq = center_freq / nyquist
        norm_bandwidth = bandwidth / nyquist
        b, a = iirpeak(norm_center_freq, norm_bandwidth)
        sos = tf2sos(b, a)
        boosted_samples = sosfilt(sos, samples)
        gain = 10 ** (boost_db / 20)
        return samples + boosted_samples * gain

    def compressor_filter(self, samples, threshold_db=-20, ratio=4.0, attack_ms=10, release_ms=100, makeup_gain_db=0, fs=44100):
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
        return samples * gains * makeup_gain

    def reverb_filter(self, samples, delay_ms=30, decay=0.3, fs=44100, num_echoes=3):
        delay_samples = int(fs * (delay_ms / 1000.0))
        output = np.copy(samples)
        for i in range(1, num_echoes + 1):
            delay = delay_samples * i
            echo = np.zeros_like(samples)
            if delay < len(samples):
                echo[delay:] = samples[:-delay] * (decay ** i)
                output += echo
        return output / np.max(np.abs(output))

    def chorus_filter(self, samples, rate=44100, depth_ms=5, mod_freq=0.15, mix=0.3):
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
        return output / np.max(np.abs(output))

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

    def get_audio_duration(self, file):
        result = subprocess.run([
            'ffprobe', '-v', 'error', '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1', file
        ], capture_output=True, text=True)
        return float(result.stdout)

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