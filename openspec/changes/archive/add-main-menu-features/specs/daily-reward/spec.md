# Daily Reward Specification

## ADDED Requirements

### Requirement: Daily Login Tracking

The system SHALL track daily login status and consecutive login days.

#### Scenario: First login of day
- **WHEN** player opens the game for the first time today
- **THEN** the system SHALL mark today as logged in
- **AND** consecutive days counter SHALL increment by 1

#### Scenario: Consecutive streak break
- **WHEN** player misses a day of login
- **THEN** consecutive days counter SHALL reset to 1

---

### Requirement: Seven Day Reward Cycle

The system SHALL provide rewards on a 7-day cycle.

| Day | Reward |
|-----|--------|
| 1 | hint ×2 |
| 2 | shuffle ×1 |
| 3 | hammer ×1 |
| 4 | hint ×3 |
| 5 | shuffle ×2 |
| 6 | hint ×2, hammer ×1 |
| 7 | bomb ×1, row_clear ×1, col_clear ×1 |

#### Scenario: Day 1 reward
- **WHEN** player is on day 1 of login cycle
- **AND** player claims daily reward
- **THEN** player SHALL receive 2 hint items

#### Scenario: Day 7 grand reward
- **WHEN** player is on day 7 of login cycle
- **AND** player claims daily reward
- **THEN** player SHALL receive bomb ×1, row_clear ×1, col_clear ×1

#### Scenario: Cycle reset
- **WHEN** player completes day 7
- **THEN** the cycle SHALL reset to day 1 for the next login

---

### Requirement: Reward Claim Once Per Day

The system SHALL allow only one reward claim per calendar day.

#### Scenario: Duplicate claim prevention
- **WHEN** player has already claimed today's reward
- **AND** player attempts to claim again
- **THEN** the claim SHALL be rejected
- **AND** next claim time SHALL be displayed

---

### Requirement: Ad Bonus Option

The system SHALL offer an ad-watching option to double daily rewards.

#### Scenario: Watch ad for double reward
- **WHEN** player clicks "Watch Ad for Double" before claiming
- **AND** ad playback completes successfully
- **THEN** player SHALL receive 2× the day's reward

#### Scenario: Normal claim without ad
- **WHEN** player claims reward without watching ad
- **THEN** player SHALL receive 1× the day's reward
