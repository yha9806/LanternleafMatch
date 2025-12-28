# Ad Reward Specification

## ADDED Requirements

### Requirement: Ad Entry Points

The system SHALL provide multiple ad entry points throughout the game.

| Entry Point | Location | Reward | Limit |
|-------------|----------|--------|-------|
| Free Energy | Main Menu | +1 energy | 6/hour |
| Extra Moves | Level Fail | +3 moves | 1/level |
| Item Reward | Item Shop | +2 hint or +1 shuffle | 3/day each |
| Double Reward | Level Clear | 2× coins | Unlimited |
| Daily Bonus | Daily Reward | 2× daily items | 1/day |

#### Scenario: Free energy ad
- **WHEN** player clicks "Free Energy" button on main menu
- **AND** hourly limit is not reached
- **THEN** ad SHALL play
- **AND** player SHALL receive +1 energy upon completion

---

### Requirement: Free Energy Ad

The system SHALL allow players to watch ads for energy on the main menu.

#### Scenario: Energy ad available
- **WHEN** player has less than max energy
- **AND** hourly ad count < 6
- **THEN** "Free Energy" button SHALL be enabled

#### Scenario: Energy ad limit reached
- **WHEN** player has watched 6 ads this hour
- **THEN** "Free Energy" button SHALL be disabled
- **AND** time until next ad SHALL be displayed

#### Scenario: Energy already full
- **WHEN** player has max energy
- **THEN** "Free Energy" button SHALL be disabled
- **AND** "Energy Full" message SHALL be displayed

---

### Requirement: Extra Moves Ad

The system SHALL allow players to continue failed levels by watching an ad.

#### Scenario: Continue option display
- **WHEN** player runs out of moves
- **AND** has not used continue this level
- **THEN** "Watch Ad for +3 Moves" option SHALL be displayed

#### Scenario: Continue after ad
- **WHEN** player watches continue ad successfully
- **THEN** player SHALL receive +3 moves
- **AND** game SHALL resume from current state

#### Scenario: Continue limit
- **WHEN** player has already used continue this level
- **THEN** "Watch Ad" option SHALL NOT be available
- **AND** only "Retry" and "Exit" SHALL be shown

---

### Requirement: Item Ad Rewards

The system SHALL allow players to watch ads for items.

| Ad Type | Reward | Daily Limit |
|---------|--------|-------------|
| Hint Ad | +2 hint | 3 |
| Shuffle Ad | +1 shuffle | 3 |

#### Scenario: Item ad available
- **WHEN** player has not reached daily limit for hint ads
- **THEN** "Watch Ad for Hints" button SHALL be enabled

#### Scenario: Item ad completion
- **WHEN** player completes hint ad
- **THEN** player SHALL receive +2 hint items
- **AND** daily hint ad count SHALL increment

#### Scenario: Item ad limit reached
- **WHEN** player has watched 3 hint ads today
- **THEN** "Watch Ad for Hints" SHALL be disabled until tomorrow

---

### Requirement: Double Reward Ad

The system SHALL allow players to double level completion rewards.

#### Scenario: Double reward option
- **WHEN** player completes a level
- **THEN** "Watch Ad for Double Reward" option SHALL be displayed

#### Scenario: Double reward granted
- **WHEN** player watches double reward ad
- **THEN** coin reward SHALL be multiplied by 2
- **AND** "Doubled!" indicator SHALL be displayed

---

### Requirement: Ad Watch Tracking

The system SHALL track ad watches and enforce limits.

#### Scenario: Hourly reset for energy ads
- **WHEN** 60 minutes have passed since first ad of the hour
- **THEN** hourly ad count SHALL reset to 0

#### Scenario: Daily reset for item ads
- **WHEN** calendar day changes (00:00 local time)
- **THEN** all daily ad counts SHALL reset to 0

#### Scenario: Persist ad counts
- **WHEN** player closes the game
- **THEN** ad counts and timestamps SHALL be saved
- **AND** restored on next session
