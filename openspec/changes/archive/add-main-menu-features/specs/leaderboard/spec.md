# Leaderboard Specification

## ADDED Requirements

### Requirement: Leaderboard Types

The system SHALL support multiple leaderboard types.

| Type | Ranking Criteria | Reset Cycle |
|------|------------------|-------------|
| Total Stars | Lifetime star count | Never |
| Weekly Stars | Stars earned this week | Monday 00:00 |
| Current Level | Highest level reached | Never |
| Friends | Stars among friends | Real-time |

#### Scenario: View total stars leaderboard
- **WHEN** player opens leaderboard
- **THEN** total stars leaderboard SHALL be displayed by default

#### Scenario: Switch leaderboard type
- **WHEN** player taps on a different leaderboard tab
- **THEN** the display SHALL update to show that leaderboard

---

### Requirement: Leaderboard Display

The system SHALL display leaderboard entries with player information.

Each entry SHALL include:
- Rank position (1, 2, 3...)
- Player avatar/name
- Score value
- Highlight for current player

#### Scenario: Current player highlight
- **WHEN** leaderboard is displayed
- **THEN** the current player's entry SHALL be visually highlighted
- **AND** SHALL show "You" indicator

---

### Requirement: Local Leaderboard Storage

The system SHALL maintain leaderboard data locally for demo purposes.

#### Scenario: Initial leaderboard population
- **WHEN** leaderboard is accessed for the first time
- **THEN** placeholder data with simulated players SHALL be generated

#### Scenario: Player rank update
- **WHEN** player's score changes
- **THEN** player's position in relevant leaderboards SHALL update

---

### Requirement: Weekly Leaderboard Rewards

The system SHALL distribute rewards based on weekly rankings.

| Rank | Reward |
|------|--------|
| 1st | bomb ×3, hammer ×5, coins ×1000 |
| 2nd-3rd | bomb ×2, hammer ×3, coins ×500 |
| 4th-10th | hammer ×2, hint ×5, coins ×200 |
| 11th-50th | hint ×3, coins ×100 |

#### Scenario: Weekly reward distribution
- **WHEN** weekly leaderboard resets on Monday
- **THEN** rewards SHALL be distributed based on final rankings
- **AND** players SHALL receive notification of their reward
