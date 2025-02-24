import subprocess
import json

# looks for keywords in
# the inputted link
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

# validates that the given link
# is no more than 600 seconds
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