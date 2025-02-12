def is_valid_yt(link) -> bool:

    keywords = [
        "http",
        ".com",
        "youtube",
    ]

    for k in keywords:
        if k not in link:
            return False

    return True