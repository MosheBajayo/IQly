#!/usr/bin/env python3
"""
power_calc.py — sample size and runtime estimator for a two-proportion A/B test.

Why: before committing to a Part 2 variant, we need to know how many visitors and
days a test actually needs so "no peeking" and a pre-defined stopping rule are
possible. Standard library only (math module) — no scipy/numpy dependency.

Usage:
    python3 power_calc.py --baseline 0.15 --mde 0.10 --alpha 0.05 --power 0.8 \
        --daily-visitors 1500

--mde is a RELATIVE minimum detectable effect (0.10 = a 10% relative lift over
baseline, e.g. 0.15 -> 0.165), not an absolute percentage-point difference.
"""

import argparse
import math


def norm_cdf(x: float) -> float:
    """Standard normal CDF via the error function (math.erf is stdlib)."""
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))


def norm_ppf(p: float, tol: float = 1e-10) -> float:
    """Inverse standard normal CDF via bisection (avoids a scipy dependency)."""
    if not (0.0 < p < 1.0):
        raise ValueError("p must be strictly between 0 and 1")
    lo, hi = -10.0, 10.0
    while hi - lo > tol:
        mid = (lo + hi) / 2.0
        if norm_cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2.0


def sample_size_per_arm(baseline: float, relative_mde: float, alpha: float, power: float) -> dict:
    p1 = baseline
    p2 = baseline * (1.0 + relative_mde)
    if p2 >= 1.0:
        raise ValueError("baseline * (1 + relative_mde) must be < 1.0")

    z_alpha = norm_ppf(1.0 - alpha / 2.0)  # two-sided test
    z_beta = norm_ppf(power)

    p_bar = (p1 + p2) / 2.0
    numerator = (
        z_alpha * math.sqrt(2 * p_bar * (1 - p_bar))
        + z_beta * math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))
    ) ** 2
    denominator = (p2 - p1) ** 2

    n_per_arm = math.ceil(numerator / denominator)
    return {"p1": p1, "p2": p2, "z_alpha": z_alpha, "z_beta": z_beta, "n_per_arm": n_per_arm}


def days_needed(n_per_arm: int, daily_visitors: float, num_arms: int = 2) -> int:
    total_needed = n_per_arm * num_arms
    visitors_per_arm_per_day = daily_visitors / num_arms
    return math.ceil(n_per_arm / visitors_per_arm_per_day) if visitors_per_arm_per_day > 0 else None


def main():
    parser = argparse.ArgumentParser(description="Two-proportion A/B test sample size calculator.")
    parser.add_argument("--baseline", type=float, required=True, help="Baseline conversion rate, e.g. 0.15")
    parser.add_argument("--mde", type=float, required=True, help="Relative minimum detectable effect, e.g. 0.10 for a 10%% relative lift")
    parser.add_argument("--alpha", type=float, default=0.05, help="Significance level (two-sided), default 0.05")
    parser.add_argument("--power", type=float, default=0.8, help="Statistical power, default 0.8")
    parser.add_argument("--daily-visitors", type=float, required=True, help="Total daily visitors across both arms")
    args = parser.parse_args()

    result = sample_size_per_arm(args.baseline, args.mde, args.alpha, args.power)
    days = days_needed(result["n_per_arm"], args.daily_visitors)

    print("A/B Test Sample Size Calculator")
    print("--------------------------------")
    print(f"Baseline rate (control):      {result['p1']:.4f}")
    print(f"Target rate (variant):        {result['p2']:.4f}  (relative MDE {args.mde:.2%})")
    print(f"Alpha (two-sided):            {args.alpha}")
    print(f"Power:                        {args.power}")
    print(f"z_alpha/2:                    {result['z_alpha']:.4f}")
    print(f"z_beta:                       {result['z_beta']:.4f}")
    print("--------------------------------")
    print(f"Required sample size per arm: {result['n_per_arm']}")
    print(f"Total sample size (2 arms):   {result['n_per_arm'] * 2}")
    print(f"Daily visitors (both arms):   {args.daily_visitors:.0f}")
    print(f"Estimated days to collect:    {days}")


if __name__ == "__main__":
    main()
