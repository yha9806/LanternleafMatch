# Collection Specification

## ADDED Requirements

### Requirement: Collection Categories

The system SHALL organize collectibles into categories.

| Category | Content | Count |
|----------|---------|-------|
| Postcards | Unlockable artwork | 5 |
| Achievements | Milestone badges | 20 |
| Story Chapters | Narrative content | 5 |

#### Scenario: View collection
- **WHEN** player opens collection page
- **THEN** all categories SHALL be displayed with unlock progress

---

### Requirement: Postcard Collection

The system SHALL unlock postcards based on level progress.

| Postcard | Unlock Condition |
|----------|------------------|
| Postcard 1 | Complete level 10 |
| Postcard 2 | Complete level 20 |
| Postcard 3 | Complete level 30 |
| Postcard 4 | Complete level 40 |
| Postcard 5 | Complete level 50 |

#### Scenario: Postcard unlock
- **WHEN** player completes level 10
- **THEN** Postcard 1 SHALL be unlocked
- **AND** player SHALL receive unlock notification

#### Scenario: View unlocked postcard
- **WHEN** player taps on an unlocked postcard
- **THEN** full-size artwork SHALL be displayed

---

### Requirement: Achievement System

The system SHALL track and reward achievements.

| Achievement | Condition | Reward |
|-------------|-----------|--------|
| First Steps | Complete level 1 | hint ×3 |
| Rising Star | Complete level 10 | shuffle ×2 |
| Collector | Collect 100 stars | hammer ×2 |
| Combo Master | Achieve 5-combo | bomb ×1 |
| Perfectionist | 3-star 10 levels | Skin fragment |
| Speedster | Clear level in 5 moves | hint ×5 |
| Moss Cleaner | Clear 100 moss | shuffle ×3 |
| ... | (20 total achievements) | ... |

#### Scenario: Achievement unlock
- **WHEN** player meets achievement condition
- **THEN** achievement SHALL be marked as completed
- **AND** reward SHALL be automatically granted
- **AND** notification SHALL be displayed

#### Scenario: View achievement progress
- **WHEN** player views incomplete achievement
- **THEN** current progress toward goal SHALL be displayed

---

### Requirement: Story Chapters

The system SHALL unlock story chapters based on progress.

| Chapter | Unlock Condition | Content |
|---------|------------------|---------|
| Chapter 1 | Start game | Intro story |
| Chapter 2 | Complete level 15 | Cat meets Dog |
| Chapter 3 | Complete level 30 | Forest adventure |
| Chapter 4 | Complete level 45 | The challenge |
| Chapter 5 | Complete level 50 | Happy ending |

#### Scenario: Story chapter unlock
- **WHEN** player reaches chapter unlock condition
- **THEN** chapter content SHALL become available to view

#### Scenario: Read story
- **WHEN** player taps on unlocked chapter
- **THEN** story content SHALL be displayed with illustrations
