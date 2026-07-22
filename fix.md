# Dashboard Data Collation Issues Analysis

This document details two potential data collation issues identified during code analysis: the week window inconsistency (Issue 1) and the overall vs. topic-level improvement mismatch (Issue 4).

---

## 1. Week Window Inconsistency (Time Window Mismatch)

### Description
In [lib/data/dashboard.ts](file:///c:/Users/okata/Documents/Aerosub/BETTER-LIFE-OGB/lib/data/dashboard.ts), the meaning of a `"week"` is defined differently depending on the widget:
* **Top Performers**: If class-wide test data exists, `"week"` resolves to a **single day** (the date of the latest class-wide test, plus a 24-hour buffer).
* **Most Improved**: `"week"` is **always** a rolling **7-day period** (`Date.now() - 7 days`).

### Impact on Data Collation
* **Temporal Mismatch**: The two dashboard widgets set to "Week" reflect different spans of time. "Top performers" ranks students based on a single test session, while "Most improved" tracks progress over a sliding week.
* **Score Exclusion**: If multiple tests are sat during the same calendar week, "Top performers" ignores tests taken prior to the absolute latest class-wide test day. This can lead to misleading student rankings for the week.

---

## 2. Overall Averages vs. Topic-Level Deltas

### Description
The original design specification for **Most Improved** states:
> *"ranked by the average of (latest − previous) percentage delta across all their topics that have ≥2 entries, restricted to entries recorded in the last 30 days..."*

However, the actual implementation calculates this by subtracting the student's overall averages across all topics in the two periods:
$$\text{averageDelta} = \text{currentAvg} - \text{previousAvg}$$

### Impact on Data Collation
* **Topic Cross-Contamination**: Instead of tracking progress in individual topics (e.g., comparing Science scores to Science scores), the code compares a student's general performance in one period to another.
* **Skewed Improvement Metrics**: If a student sat a difficult topic (e.g., advanced calculus) in the previous period and an easy topic (e.g., basic addition) in the current period, they will show massive "improvement" even if their actual competency in either subject did not change.
