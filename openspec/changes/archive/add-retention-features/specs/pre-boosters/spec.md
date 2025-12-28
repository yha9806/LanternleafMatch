# Pre-Boosters System Specification

## ADDED Requirements

### Requirement: Pre-Level Booster Selection
The system SHALL allow players to select boosters before starting a level.

#### Scenario: Selection screen displayed
- **WHEN** the player taps "Play" on the level select screen
- **THEN** a pre-level booster selection screen is displayed
- **AND** available boosters are shown with their costs

#### Scenario: Booster selection
- **WHEN** the player taps a booster on the selection screen
- **THEN** the booster is added to the selected list
- **AND** the total cost is updated

#### Scenario: Booster deselection
- **WHEN** the player taps a selected booster
- **THEN** the booster is removed from the selected list
- **AND** the total cost is reduced

#### Scenario: Start level with boosters
- **WHEN** the player taps "Start" on the selection screen
- **AND** the player has sufficient coins/gems
- **THEN** the cost is deducted
- **AND** the level starts with selected boosters placed on the board

---

### Requirement: Available Pre-Booster Types
The system SHALL support the following pre-booster types with their costs.

#### Scenario: Extra moves booster
- **WHEN** the player selects "+3 Moves" pre-booster (50 coins)
- **THEN** the level starts with 3 additional moves

#### Scenario: Extra moves large booster
- **WHEN** the player selects "+5 Moves" pre-booster (100 coins or 5 gems)
- **THEN** the level starts with 5 additional moves

#### Scenario: Rocket pre-booster
- **WHEN** the player selects "Rocket" pre-booster (80 coins or 3 gems)
- **THEN** a rocket special tile is placed on a random valid position at level start

#### Scenario: Bomb pre-booster
- **WHEN** the player selects "Bomb" pre-booster (120 coins or 5 gems)
- **THEN** a lantern (bomb) special tile is placed on a random valid position at level start

#### Scenario: Rainbow pre-booster
- **WHEN** the player selects "Rainbow" pre-booster (8 gems)
- **THEN** a rainbow special tile is placed on a random valid position at level start

#### Scenario: Shuffle pre-booster
- **WHEN** the player selects "Shuffle" pre-booster (60 coins)
- **THEN** the player receives 1 free shuffle use during the level

---

### Requirement: Streak-Granted Pre-Boosters
The system SHALL automatically grant free pre-boosters based on the player's win streak.

#### Scenario: Streak boosters displayed
- **WHEN** the player has a streak >= 3
- **THEN** the selection screen shows "Streak Bonus" section
- **AND** the granted boosters are marked as "Free"

#### Scenario: Streak boosters applied
- **WHEN** the player starts a level with streak-granted boosters
- **THEN** the boosters are placed without any cost deduction

#### Scenario: Streak boosters cannot be deselected
- **WHEN** the player views streak-granted boosters
- **THEN** they are shown as locked/mandatory
- **AND** cannot be removed from selection

---

### Requirement: Smart Booster Recommendation
The system SHALL recommend boosters after repeated failures.

#### Scenario: Recommendation trigger
- **WHEN** the player fails the same level 2 or more times
- **THEN** the pre-level screen highlights a recommended booster combination

#### Scenario: Discounted recommendation
- **WHEN** a recommendation is shown
- **THEN** the combined cost is discounted by 20-30%
- **AND** a "Use This Combo" button is prominently displayed

#### Scenario: Ad-based free trial
- **WHEN** the player has never used a specific booster type
- **THEN** an option to "Watch Ad for Free Trial" is shown

---

### Requirement: Booster Placement Logic
The system SHALL place pre-boosters on the board intelligently.

#### Scenario: Random valid placement
- **WHEN** a booster needs to be placed
- **THEN** it is placed on a random position that is not blocked by moss
- **AND** positions are unique (no two boosters on same cell)

#### Scenario: Streak boosters priority
- **WHEN** both streak boosters and purchased boosters need placement
- **THEN** streak boosters are placed first
- **AND** purchased boosters fill remaining valid positions

#### Scenario: Center priority for super rainbow
- **WHEN** a super rainbow booster needs placement
- **THEN** it is placed as close to center (3,3) as possible
