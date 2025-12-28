# Item System Specification

## ADDED Requirements

### Requirement: Item Types

The system SHALL support the following item types:
- `hint` - 提示：高亮一个可消除位置
- `shuffle` - 重排：重新排列所有方块
- `hammer` - 锤子：消除任意1个普通方块
- `row_clear` - 清行：清除一整行
- `col_clear` - 清列：清除一整列
- `bomb` - 爆破：清除3×3区域

#### Scenario: Item type enumeration
- **WHEN** the game initializes
- **THEN** all six item types SHALL be available in the type system

---

### Requirement: Item Inventory

The system SHALL maintain an inventory tracking the quantity of each item type per player.

#### Scenario: Initial inventory
- **WHEN** a new player starts the game
- **THEN** the inventory SHALL contain: hint=3, shuffle=2, hammer=1, row_clear=0, col_clear=0, bomb=0

#### Scenario: Inventory persistence
- **WHEN** the player closes and reopens the game
- **THEN** the inventory quantities SHALL be restored from local storage

---

### Requirement: Item Usage

The system SHALL allow players to use items during gameplay.

#### Scenario: Use hint item
- **WHEN** player clicks the hint button AND has hint items > 0
- **THEN** one hint item SHALL be consumed AND a valid move SHALL be highlighted

#### Scenario: Use hammer item
- **WHEN** player activates hammer mode AND clicks a normal tile
- **THEN** one hammer item SHALL be consumed AND the tile SHALL be removed

#### Scenario: Insufficient items
- **WHEN** player attempts to use an item with quantity = 0
- **THEN** the action SHALL be rejected AND a notification SHALL be shown

---

### Requirement: Usage Limits

The system SHALL enforce per-level usage limits for certain items.

| Item | Per-Level Limit | Cooldown |
|------|-----------------|----------|
| hint | unlimited | 3 seconds |
| shuffle | 2 | 5 seconds |
| hammer | 3 | none |
| row_clear | 1 | none |
| col_clear | 1 | none |
| bomb | 1 | none |

#### Scenario: Per-level limit enforcement
- **WHEN** player uses row_clear once in a level
- **THEN** further row_clear usage SHALL be disabled for that level

#### Scenario: Cooldown enforcement
- **WHEN** player uses hint
- **THEN** hint button SHALL be disabled for 3 seconds

---

### Requirement: Item Rewards

The system SHALL award items to players based on gameplay achievements.

#### Scenario: Level completion reward
- **WHEN** player completes a level
- **THEN** player SHALL receive +1 hint item

#### Scenario: Three-star completion reward
- **WHEN** player completes a level with 3 stars
- **THEN** player SHALL receive +1 shuffle item (in addition to hint)

#### Scenario: Boss level reward
- **WHEN** player completes a boss level (every 25th level)
- **THEN** player SHALL receive +1 hammer item (in addition to other rewards)

---

### Requirement: Star Milestone Rewards

The system SHALL award items when players reach star milestones.

| Stars | Reward |
|-------|--------|
| 15 | row_clear ×1 (unlock) |
| 30 | col_clear ×1 (unlock) |
| 50 | bomb ×1 (unlock) |
| 75 | hint ×3, shuffle ×2 |
| 100 | hammer ×2, bomb ×1 |
| 150 | All items ×2 |

#### Scenario: Milestone reward claim
- **WHEN** player's total stars reaches a milestone threshold
- **THEN** player SHALL receive the corresponding reward once
- **AND** the milestone SHALL be marked as claimed

#### Scenario: Duplicate claim prevention
- **WHEN** player already claimed a milestone
- **THEN** the reward SHALL NOT be given again

---

### Requirement: Item Unlock System

The system SHALL require certain items to be unlocked before they appear in the item bar.

| Item | Unlock Condition |
|------|------------------|
| hint, shuffle, hammer | Available from start |
| row_clear | 15 stars |
| col_clear | 30 stars |
| bomb | 50 stars |

#### Scenario: Locked item display
- **WHEN** player has not unlocked bomb item
- **THEN** bomb slot SHALL show locked state with unlock requirement

#### Scenario: Item unlock
- **WHEN** player reaches 50 stars
- **THEN** bomb item SHALL become unlocked AND visible in item bar
