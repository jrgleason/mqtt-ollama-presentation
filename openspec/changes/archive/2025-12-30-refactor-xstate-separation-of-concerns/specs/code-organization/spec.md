# Code Organization Spec Delta

## ADDED Requirements

### Requirement: CO-04 - State Machine Organization Pattern
State machines MUST be organized in a dedicated `src/state-machines/` directory with one file per machine, exported as factory functions.

#### Scenario: State machine file structure
**Given** a new state machine is needed
**When** creating the machine
**Then** create file `src/state-machines/MachineName.js`
**And** export factory function `createMachineNameMachine()`
**And** machine encapsulates all states, events, guards, and actions

#### Scenario: State machine import pattern
**Given** a component needs to use a state machine
**When** importing the machine
**Then** import from `src/state-machines/MachineName.js`
**And** call factory function to create machine instance
**And** use XState `interpret()` to start the service

