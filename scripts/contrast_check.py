#!/usr/bin/env python3
"""
contrast_check.py — verifies the IQly palette's actual text/background color pairs
meet a >=4.5:1 WCAG contrast ratio (normal text AA).
Why: the Part 1/3 write-ups both assert the palette was "checked against a >=4.5:1
text-contrast minimum," but that check only existed as hand-computed math quoted in
ai-log.md until now — every other verification claim in this project (funnel-qa,
validate_items, power_calc, render.js) is backed by a re-runnable script; this closes
that gap for the palette claim specifically. Standard library only (no dependencies).

Usage: python3 contrast_check.py
Exit code: 0 if every pair passes 4.5:1, 1 otherwise.
"""

MIN_RATIO = 4.5

# Every text/background pair actually used in src/styles.css (Funnel v4 palette) and
# src/creatives/*.html. Rebuilt for v4's purple/yellow/green tokens; see src/styles.css
# :root for the source hex values.
PAIRS = [
    ("body text on bg", "#1B1530", "#FBFAFF"),
    ("muted text on bg", "#5D5775", "#FBFAFF"),
    ("body text on white card", "#1B1530", "#FFFFFF"),
    ("muted text on white card", "#5D5775", "#FFFFFF"),
    ("purple-deep headline/brand on white card", "#24154F", "#FFFFFF"),
    ("green-ink on green tint (pills, account strip)", "#0E6B45", "#E3F7EE"),
    ("purple on purple tint (pills, eyebrow, option letter)", "#5A3FD8", "#EFEBFF"),
    ("purple-deep text on yellow (CTA, archetype chip)", "#24154F", "#FFD24A"),
    ("purple-deep text on yellow tint (headsup banner)", "#24154F", "#FFF6D6"),
    ("purple on bg (step-num, quiz meta category)", "#5A3FD8", "#FBFAFF"),
    ("purple-deep on bg (landing h1, quiz prompt)", "#24154F", "#FBFAFF"),
    ("white text on purple-deep (dark cards, results hero)", "#FFFFFF", "#24154F"),
    ("white text on purple-mid (hero Q1 options, IQ chip value)", "#FFFFFF", "#2F1F66"),
    ("purple-soft text on purple-deep (dark-card secondary copy)", "#C9BCFF", "#24154F"),
    ("yellow text on purple-deep (teaser percentile emphasis)", "#FFD24A", "#24154F"),
    ("purple-deep text on green-soft (band chip, analyzing dot)", "#24154F", "#7EE2B3"),
    ("error text on white card (field error)", "#C2261E", "#FFFFFF"),
    ("body text on green tint (insight card)", "#1B1530", "#E3F7EE"),
    ("body text on yellow tint (insight card)", "#1B1530", "#FFF6D6"),
    ("body text on purple tint (insight card, selected option)", "#1B1530", "#EFEBFF"),
    ("muted text on green tint (insight title)", "#5D5775", "#E3F7EE"),
    ("muted text on yellow tint (insight title)", "#5D5775", "#FFF6D6"),
    ("muted text on purple tint (insight title)", "#5D5775", "#EFEBFF"),
    ("green-ink on bg (landing check row)", "#0E6B45", "#FBFAFF"),
    ("purple-soft text on purple-mid (iq-chip label)", "#C9BCFF", "#2F1F66"),
    ("green-ink on white card (share feedback)", "#0E6B45", "#FFFFFF"),
    ("green-soft text on purple-deep (320x50/250x250 creative subcopy)", "#7EE2B3", "#24154F"),
    ("purple text on white card (1080x1920 creative payoff labels)", "#5A3FD8", "#FFFFFF"),
]


def srgb_to_linear(channel_8bit: int) -> float:
    c = channel_8bit / 255.0
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(hex_color: str) -> float:
    hex_color = hex_color.lstrip('#')
    r, g, b = (int(hex_color[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * srgb_to_linear(r) + 0.7152 * srgb_to_linear(g) + 0.0722 * srgb_to_linear(b)


def contrast_ratio(hex_a: str, hex_b: str) -> float:
    l1, l2 = relative_luminance(hex_a), relative_luminance(hex_b)
    lighter, darker = max(l1, l2), min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def main():
    print(f"{'Pair':<32} {'Colors':<18} {'Ratio':>8}  Result")
    print("-" * 72)
    all_pass = True
    for name, fg, bg in PAIRS:
        ratio = contrast_ratio(fg, bg)
        passed = ratio >= MIN_RATIO
        all_pass = all_pass and passed
        status = "PASS" if passed else "FAIL"
        print(f"{name:<32} {fg}/{bg:<10} {ratio:>7.2f}:1  {status}")

    print("-" * 72)
    if all_pass:
        print(f"PASS — every pair meets the {MIN_RATIO}:1 minimum.")
    else:
        print(f"FAIL — one or more pairs are below {MIN_RATIO}:1.")
    exit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
