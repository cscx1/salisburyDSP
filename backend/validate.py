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