# Special Tiles Specification

## ADDED Requirements

### Requirement: Extended Special Tile Types

The system SHALL support the following special tile types:

| Type | Icon | Generation | Effect |
|------|------|------------|--------|
| `whirl_h` | 🌀↔️ | 水平4连 | 清除整行 |
| `whirl_v` | 🌀↕️ | 垂直4连 | 清除整列 |
| `lantern` | 🏮 | 5连 | 清除3×3 |
| `rainbow` | 🌈 | T型/L型 | 消除全部指定色 |
| `wildcard` | 🃏 | 连消奖励/随机 | 与任意颜色匹配 |
| `multiplier` | ×2 | 随机(2%) | 收集数×2 |
| `frozen` | ❄️ | 随机(1.5%) | 需消除2次 |
| `bomb_timer` | 💣N | 高难度关卡 | N步内必须消除 |

#### Scenario: New special type recognition
- **WHEN** a T-shape or L-shape match occurs
- **THEN** the system SHALL generate a rainbow tile at the intersection

---

### Requirement: T-Shape and L-Shape Detection

The system SHALL detect T-shape and L-shape matches during match finding.

#### Scenario: T-shape detection
- **WHEN** 3+ tiles match horizontally AND 3+ tiles match vertically at their intersection
- **THEN** the match SHALL be classified as T-shape
- **AND** a rainbow tile SHALL be generated at the intersection

#### Scenario: L-shape detection
- **WHEN** 3+ tiles match horizontally AND 3+ tiles match vertically sharing a corner
- **THEN** the match SHALL be classified as L-shape
- **AND** a rainbow tile SHALL be generated at the corner

---

### Requirement: Rainbow Tile Effect

The system SHALL implement rainbow tile behavior for clearing all tiles of a selected color.

#### Scenario: Rainbow activation
- **WHEN** player swaps rainbow tile with a colored tile
- **THEN** all tiles of that color on the board SHALL be cleared
- **AND** goals for that tile type SHALL be updated

#### Scenario: Rainbow chain
- **WHEN** rainbow tile is triggered by another special tile
- **THEN** a random color SHALL be selected for clearing

---

### Requirement: Wildcard Tile Effect

The system SHALL implement wildcard tile that matches with any color.

#### Scenario: Wildcard matching
- **WHEN** wildcard tile is adjacent to any colored tile
- **THEN** it SHALL be considered a match of that color

#### Scenario: Wildcard in match
- **WHEN** wildcard participates in a 3-match
- **THEN** it SHALL count as the matched color for collection goals

---

### Requirement: Multiplier Tile Effect

The system SHALL implement multiplier tile that doubles collection count.

#### Scenario: Multiplier collection
- **WHEN** multiplier tile (×2) is cleared
- **THEN** the collection count for that tile type SHALL be doubled

#### Scenario: Multiplier stacking
- **WHEN** multiple multiplier tiles are cleared in one match
- **THEN** each multiplier SHALL apply independently (additive, not multiplicative)

---

### Requirement: Frozen Tile Effect

The system SHALL implement frozen tiles that require multiple hits to clear.

#### Scenario: Frozen tile first hit
- **WHEN** frozen tile participates in a match
- **THEN** the ice layer count SHALL decrease by 1
- **AND** the tile SHALL remain if layers > 0

#### Scenario: Frozen tile cleared
- **WHEN** frozen tile's layer count reaches 0
- **THEN** the tile SHALL be cleared normally

---

### Requirement: Bomb Timer Tile

The system SHALL implement bomb timer tiles with countdown.

#### Scenario: Bomb countdown
- **WHEN** a move is made
- **THEN** all bomb_timer tiles SHALL decrease their countdown by 1

#### Scenario: Bomb explosion
- **WHEN** bomb_timer countdown reaches 0
- **THEN** the level SHALL be failed immediately

#### Scenario: Bomb defused
- **WHEN** bomb_timer tile is cleared before countdown reaches 0
- **THEN** the bomb SHALL be defused safely

---

### Requirement: Random Special Tile Generation

The system SHALL randomly generate special tiles during board fill.

| Tile | Probability | Level Requirement |
|------|-------------|-------------------|
| multiplier | 2% | Level 11+ |
| wildcard | 1% | Level 21+ |
| frozen | 1.5% | Level 16+ |
| bomb_timer | 0.5% | Level 31+ |

#### Scenario: Random generation with level check
- **WHEN** filling empty cells at level 15
- **THEN** multiplier tiles MAY be generated (2% chance)
- **AND** frozen tiles SHALL NOT be generated (requires level 16+)

---

### Requirement: Special Tile Combinations

The system SHALL implement enhanced effects when special tiles are combined.

| Combination | Effect |
|-------------|--------|
| whirl_h + whirl_v | Clear entire row AND column (cross) |
| whirl + lantern | Clear 3 rows OR 3 columns |
| lantern + lantern | Clear 5×5 area |
| rainbow + special | Transform all same-color tiles to that special type and trigger |

#### Scenario: Whirl cross combination
- **WHEN** player swaps whirl_h with whirl_v
- **THEN** both the entire row AND column SHALL be cleared

#### Scenario: Rainbow special combination
- **WHEN** player swaps rainbow with lantern
- **THEN** all tiles of a random color SHALL transform into lanterns
- **AND** all transformed lanterns SHALL trigger their effects
