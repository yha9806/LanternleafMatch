# Win Streak System Specification

## ADDED Requirements

### Requirement: Win Streak Tracking
The system SHALL track the player's consecutive level wins and maintain a persistent streak counter.

#### Scenario: Streak increments on level win
- **WHEN** the player completes a level successfully
- **THEN** the streak counter increments by 1
- **AND** the new streak value is persisted to local storage

#### Scenario: Streak resets on level fail without revival
- **WHEN** the player fails a level
- **AND** the player does not use a revival option
- **THEN** the streak counter resets to 0

#### Scenario: Streak persists across sessions
- **WHEN** the player closes and reopens the game
- **THEN** the previous streak value is restored from storage

---

### Requirement: Streak Reward Tiers
The system SHALL provide escalating rewards based on the current streak count.

#### Scenario: Streak 3 rewards
- **WHEN** the player reaches streak 3
- **THEN** the player receives 80 coins
- **AND** the player receives 1 rocket as a pre-booster for the next level

#### Scenario: Streak 5 rewards
- **WHEN** the player reaches streak 5
- **THEN** the player receives 150 coins and 1 gem
- **AND** the player receives 1 rocket + 1 bomb as pre-boosters

#### Scenario: Streak 7 rewards
- **WHEN** the player reaches streak 7
- **THEN** the player receives 220 coins and 2 gems
- **AND** the player receives 1 rocket + 1 bomb + 1 rainbow as pre-boosters

#### Scenario: Streak 10+ rewards
- **WHEN** the player reaches streak 10 or higher
- **THEN** the player receives 300 coins and 3 gems
- **AND** the player receives all standard pre-boosters plus 1 super rainbow
- **AND** these rewards continue for each subsequent level until streak breaks

---

### Requirement: Streak Revival Options
The system SHALL offer options to preserve the streak when a level is failed.

#### Scenario: Ad revival available
- **WHEN** the player fails a level with streak >= 3
- **AND** the player has not used ad revival this level
- **THEN** the system offers a "Watch Ad to Keep Streak" option

#### Scenario: Ad revival success
- **WHEN** the player selects ad revival
- **AND** the ad completes successfully
- **THEN** the streak is preserved
- **AND** the player can retry the level

#### Scenario: Gem revival available
- **WHEN** the player fails a level with streak >= 3
- **THEN** the system offers a "Spend Gems to Keep Streak" option
- **AND** the gem cost is calculated as `min(50, streak * 5)`

#### Scenario: Revival limits
- **WHEN** the player has used 3 revivals in the current hour
- **THEN** the ad revival option is disabled
- **AND** only gem revival is available

---

### Requirement: Super Rainbow Booster
The system SHALL provide a unique Super Rainbow booster for 10+ streaks.

#### Scenario: Super Rainbow effect
- **WHEN** the Super Rainbow booster is activated
- **THEN** all tiles of the same type as the touched tile are cleared
- **AND** one random row is cleared
- **AND** one random column is cleared

#### Scenario: Super Rainbow placement
- **WHEN** a level starts with streak >= 10
- **THEN** the Super Rainbow is placed at the center of the board
- **AND** it is attached to a random tile type

---

### Requirement: Streak UI Display
The system SHALL display the current streak status prominently during gameplay.

#### Scenario: HUD streak counter
- **WHEN** the player is in a level
- **AND** the streak is greater than 0
- **THEN** a flame icon with the streak number is shown in the HUD

#### Scenario: Level complete streak celebration
- **WHEN** the player completes a level
- **THEN** the level complete modal shows the new streak count
- **AND** displays the rewards earned
- **AND** previews the pre-boosters for the next level

#### Scenario: Streak loss warning
- **WHEN** the player fails a level with streak >= 3
- **THEN** the modal emphasizes what will be lost (pre-boosters, streak progress)
- **AND** clearly presents revival options
