# Combo Reward Specification

## ADDED Requirements

### Requirement: Combo Tracking

The system SHALL track consecutive cascades during a single move.

#### Scenario: Cascade counting
- **WHEN** a match triggers and causes additional matches
- **THEN** cascadeCount SHALL increment for each cascade level

#### Scenario: Cascade reset
- **WHEN** player makes a new move
- **THEN** cascadeCount SHALL reset to 0

---

### Requirement: Combo Reward Tiers

The system SHALL generate special tiles based on combo level.

| Combo Level | Reward Tile | Quantity |
|-------------|-------------|----------|
| 3-combo | multiplier (×2) | 1 |
| 4-combo | wildcard | 1 |
| 5-combo+ | rainbow | 1 |

#### Scenario: 3-combo reward
- **WHEN** 3rd cascade completes
- **THEN** one multiplier tile SHALL be generated at a random empty position

#### Scenario: 4-combo reward
- **WHEN** 4th cascade completes
- **THEN** one wildcard tile SHALL be generated at a random empty position

#### Scenario: 5-combo reward
- **WHEN** 5th or higher cascade completes
- **THEN** one rainbow tile SHALL be generated at a random empty position

---

### Requirement: Reward Tile Placement

The system SHALL place reward tiles at valid positions.

#### Scenario: Random placement
- **WHEN** reward tile is generated
- **THEN** it SHALL be placed at a random empty cell after gravity
- **AND** before new tiles are filled

#### Scenario: No empty position
- **WHEN** no empty position exists for reward tile
- **THEN** reward SHALL be skipped for that cascade
- **AND** a visual indicator SHALL still show combo level

---

### Requirement: Combo Visual Feedback

The system SHALL provide escalating visual feedback for combos.

| Combo Level | Text Size | Color | Animation |
|-------------|-----------|-------|-----------|
| 2-combo | Normal | White | Fade in/out |
| 3-combo | Large | Yellow | Pulse |
| 4-combo | Larger | Orange | Shake + Pulse |
| 5-combo+ | Largest | Red/Rainbow | Screen flash |

#### Scenario: Combo display
- **WHEN** cascade occurs
- **THEN** combo text SHALL display with appropriate style
- **AND** reward indicator SHALL show if reward was generated

---

### Requirement: Combo Statistics

The system SHALL track combo statistics for achievements.

#### Scenario: Session max combo
- **WHEN** cascade count exceeds current session maximum
- **THEN** session max combo SHALL be updated

#### Scenario: All-time max combo
- **WHEN** cascade count exceeds all-time maximum
- **THEN** all-time max combo SHALL be updated
- **AND** persisted to storage

#### Scenario: Achievement trigger
- **WHEN** player achieves 5-combo for the first time
- **THEN** "Combo Master" achievement SHALL be unlocked

---

### Requirement: Combo Bonus Score

The system SHALL award bonus collection for high combos.

#### Scenario: Combo multiplier
- **WHEN** combo level >= 3
- **THEN** collection count for that cascade SHALL be multiplied by (1 + 0.1 * comboLevel)
- **Example**: 3-combo = 1.3×, 4-combo = 1.4×, 5-combo = 1.5×

#### Scenario: Bonus display
- **WHEN** bonus is applied
- **THEN** bonus amount SHALL be displayed separately (e.g., "+2 bonus")
