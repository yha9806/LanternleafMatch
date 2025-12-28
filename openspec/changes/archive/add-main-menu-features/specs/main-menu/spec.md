# Main Menu Specification

## ADDED Requirements

### Requirement: Extended Main Menu Layout

The system SHALL display an enhanced main menu with the following elements:

- Status bar: Level, Stars, Coins, Items count
- Energy display with free energy button
- Primary button: Start Game
- Secondary buttons: Leaderboard, Collection, Skin, Daily Reward, Settings, Announcements

#### Scenario: Main menu display
- **WHEN** player opens the main menu
- **THEN** all menu elements SHALL be displayed according to layout specification
- **AND** current player stats SHALL be loaded and shown

---

### Requirement: Resource Display

The system SHALL display player resources in the main menu header.

| Resource | Display Format | Location |
|----------|---------------|----------|
| Level | Current level number | Top left |
| Stars | Total stars count | Top center-left |
| Coins | Coin amount | Top center-right |
| Items | Total item count | Top right |

#### Scenario: Resource sync
- **WHEN** player returns to main menu after gameplay
- **THEN** all resource displays SHALL update to reflect current values

---

### Requirement: Menu Navigation

The system SHALL provide navigation to all sub-features.

#### Scenario: Navigate to leaderboard
- **WHEN** player clicks Leaderboard button
- **THEN** player SHALL be navigated to leaderboard page

#### Scenario: Navigate to collection
- **WHEN** player clicks Collection button
- **THEN** player SHALL be navigated to collection page

#### Scenario: Navigate to daily reward
- **WHEN** player clicks Daily Reward button
- **THEN** player SHALL be navigated to daily reward page
- **AND** if unclaimed reward exists, a badge indicator SHALL be shown

---

### Requirement: Coming Soon Features

The system SHALL display placeholder states for upcoming features.

#### Scenario: Skin button placeholder
- **WHEN** player clicks Skin button
- **THEN** a "Coming Soon" message SHALL be displayed
- **AND** no navigation SHALL occur

#### Scenario: Announcements placeholder
- **WHEN** player clicks Announcements button
- **THEN** a "No announcements" message SHALL be displayed
