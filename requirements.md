# Requirements – Math Trainer

## Target Use Case

- Mobile-friendly math trainer for elementary school students
- Focused on the 1×1 (multiplication tables 1–10)
- Parents use the app on their phone to quiz their child
- The child answers verbally; the parent taps **Correct** or **Wrong**

## Technical Constraints

- Static files only (`index.html`, `style.css`, `app.js`) — no build step, no server, no dependencies
- Must work on `file://` as well as when deployed via GitHub Pages
- Progress is persisted in `localStorage` (key: `mathtrainer_v1`)

## Data Model

- Each combination stored under a canonical key using `min×max` form (e.g. `3x7`, never `7x3`)
- Each entry tracks `correct` and `wrong` counts independently

## Features

### Matrix Overview

- 10×10 grid showing all multiplication combinations
- Cells are color-coded by average performance once practiced:
  gray = never practiced, green = more correct than wrong, orange = equal, red = more wrong than correct
- Short tap on a cell jumps directly to that question in the quiz; the table filter resets to "All" so the pair is always reachable
- Long press on a cell shows a stats popover (correct / wrong count)

### Table Filter

- Pill buttons to filter by table (All, 1×–10×)
- Multi-select: filtering by "7×" includes all pairs involving 7
- "All" is mutually exclusive with specific table selections

### Quiz Panel

- Displays the current question in large text
- "Show Answer" button reveals the result
- Two large buttons: **Correct** and **Wrong**
- Brief visual feedback after each answer, then next question loads automatically

### Quiz Engine

- Weighted random selection prioritizes struggling combinations
- Exact weights: never asked → 2, wrong > correct → 5, some wrong → 3, correct ≥ 3 → 0.5, otherwise → 1

### Statistics Panel

- Shows mastered count (combinations where correct > wrong), total correct answers, total wrong answers
- Collapsible panel
- "Reset Progress" button with confirmation

## Design

- Mobile-first; all interactive elements optimized for touch
- Child-friendly, colorful visual style
- Maximum width 480px, centered on larger screens

## Deployment

- GitHub Pages, source: `main` branch / root folder
