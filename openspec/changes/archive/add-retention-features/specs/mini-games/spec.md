# Mini Games System Specification

## ADDED Requirements

### Requirement: Mini Game Manager
The system SHALL manage the triggering and lifecycle of mini games.

#### Scenario: Daily login trigger
- **WHEN** the player logs in for the first time each day
- **THEN** the Treasure Hunt mini game is triggered

#### Scenario: Streak milestone trigger
- **WHEN** the player reaches a streak of 5
- **THEN** the Rescue mini game is triggered

#### Scenario: Post-level random trigger
- **WHEN** the player completes a level successfully
- **AND** a random roll (30% chance) succeeds
- **THEN** a random mini game type is triggered

#### Scenario: Post-failure comfort trigger
- **WHEN** the player fails a level
- **AND** a random roll (50% chance) succeeds
- **THEN** the Color Sort mini game is triggered

---

### Requirement: Rescue Mini Game
The system SHALL provide a time-limited rescue scenario game.

#### Scenario: Game initialization
- **WHEN** a Rescue mini game starts
- **THEN** a random scenario from the 6 available is selected
- **AND** a 10-second countdown timer begins
- **AND** the scenario background and character are displayed

#### Scenario: Correct choice
- **WHEN** the player selects the correct option before time expires
- **THEN** a success animation plays
- **AND** the player receives the success reward (100 coins + booster)

#### Scenario: Wrong choice
- **WHEN** the player selects an incorrect option
- **THEN** a failure animation plays
- **AND** the player receives the consolation reward (20 coins)

#### Scenario: Timeout
- **WHEN** the timer reaches 0 without player input
- **THEN** the game counts as failed
- **AND** the player receives the consolation reward

#### Scenario: Retry option
- **WHEN** the player fails the rescue game
- **THEN** a "Watch Ad to Retry" option is offered

---

### Requirement: Rescue Scenario Themes
The system SHALL provide 6 cat/dog themed rescue scenarios.

#### Scenario: Cat in tree
- **WHEN** the "cat_tree" scenario is selected
- **THEN** the scene shows a cat stuck in a tree
- **AND** the options are ladders of different lengths
- **AND** the correct answer is the longest ladder

#### Scenario: Dog crossing river
- **WHEN** the "dog_river" scenario is selected
- **THEN** the scene shows a dog needing to cross a river
- **AND** the options are different stepping stone paths
- **AND** the correct answer is the complete path

#### Scenario: Cat in rain
- **WHEN** the "cat_rain" scenario is selected
- **THEN** the scene shows a cat in the rain
- **AND** the options are umbrellas of different colors
- **AND** the correct answer matches a visual hint

#### Scenario: Dog digging
- **WHEN** the "dog_dig" scenario is selected
- **THEN** the scene shows a dog wanting to dig for a bone
- **AND** the options are different dig spots
- **AND** the correct answer has a subtle indicator

#### Scenario: Cat fishing
- **WHEN** the "cat_fish" scenario is selected
- **THEN** the scene shows a cat with a fishing rod
- **AND** the options are different water spots
- **AND** the correct answer shows fish shadows

#### Scenario: Both rescue
- **WHEN** the "rescue_both" scenario is selected
- **THEN** the scene shows both cat and dog needing help
- **AND** the options are rescue order choices
- **AND** the correct answer is based on urgency hints

---

### Requirement: Color Sort Mini Game
The system SHALL provide a color sequence sorting game.

#### Scenario: Game initialization
- **WHEN** a Color Sort mini game starts
- **THEN** a difficulty level is selected based on player progress
- **AND** a shuffled set of colored tiles is displayed
- **AND** the target order is shown at the top

#### Scenario: Correct selection
- **WHEN** the player taps the correct next color in sequence
- **THEN** the tile moves to the sorted area
- **AND** progress indicator updates

#### Scenario: Wrong selection
- **WHEN** the player taps an incorrect color
- **THEN** a shake/error animation plays
- **AND** mistake counter increments
- **AND** if mistakes reach 2, the game fails

#### Scenario: Completion
- **WHEN** all colors are sorted correctly
- **THEN** success animation plays
- **AND** reward is granted based on mistakes (perfect = 120 coins, with mistakes = 80 coins)

#### Scenario: Difficulty levels
- **WHEN** difficulty is "easy"
- **THEN** 4 colors, 15 second timer
- **WHEN** difficulty is "medium"
- **THEN** 5 colors, 12 second timer
- **WHEN** difficulty is "hard"
- **THEN** 6 colors, 10 second timer

---

### Requirement: Treasure Hunt Mini Game
The system SHALL provide a grid-based treasure discovery game.

#### Scenario: Game initialization
- **WHEN** a Treasure Hunt mini game starts
- **THEN** a 5x5 grid is generated with hidden treasures
- **AND** the player receives 5 shovels
- **AND** treasure distribution: 1 legendary, 2 epic, 4 rare, 8 common, 10 empty

#### Scenario: Dig action
- **WHEN** the player taps an unrevealed cell
- **AND** the player has shovels remaining
- **THEN** the cell is revealed
- **AND** shovel count decreases by 1
- **AND** if treasure found, reward is added to total

#### Scenario: Treasure rewards
- **WHEN** a legendary treasure is found
- **THEN** the player receives a random booster
- **WHEN** an epic treasure is found
- **THEN** the player receives 1-3 gems
- **WHEN** a rare treasure is found
- **THEN** the player receives 50-100 coins
- **WHEN** a common treasure is found
- **THEN** the player receives 10-30 coins

#### Scenario: Extra shovels via ad
- **WHEN** the player has 0 shovels remaining
- **AND** there are unrevealed cells
- **THEN** a "Watch Ad for 3 Shovels" option is shown

#### Scenario: Hint system
- **WHEN** the player requests a hint
- **THEN** an area hint (quadrant) is provided for free
- **AND** a direction hint (arrow) costs 1 gem

#### Scenario: End game
- **WHEN** the player taps "End Hunt"
- **OR** all treasures are found
- **THEN** total rewards are displayed
- **AND** rewards are added to player inventory

---

### Requirement: Mini Game Rewards Integration
The system SHALL integrate mini game rewards with the main economy.

#### Scenario: Coin rewards
- **WHEN** a mini game grants coin rewards
- **THEN** the coins are added to player's coin balance via PlayerProgress

#### Scenario: Gem rewards
- **WHEN** a mini game grants gem rewards
- **THEN** the gems are added to player's gem balance

#### Scenario: Booster rewards
- **WHEN** a mini game grants booster rewards
- **THEN** the boosters are added to player's inventory via BoosterManager

#### Scenario: Ad multiplier
- **WHEN** the player chooses to watch an ad after mini game success
- **THEN** the coin/gem reward is doubled
