import subprocess
import json

def is_valid_yt(link) -> bool:
    keywords = [
        "https",
        ".com",
        "youtube",
    ]

    for k in keywords:
        if k not in link:
            return False

    return True

def video_duration(link):
    try:
        result = subprocess.run (
            ["yt-dlp", "--dump-json", "--no-playlist", link],
            capture_output=True,
            text=True,
            check=True
        )
        video_info = json.loads(result.stdout)
        return video_info.get("duration", 0)
    except Exception as e:
        print(f"Error fetching video info: {e}")
        return -1

def is_valid_duration(link, max_dur=600):
    # Ensure video does no exceed 600 seconds (10 minutes)
    return 0 <= video_duration(link) <= max_dur