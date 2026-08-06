// Package core implements the deterministic operations of the Shilu knowledge
// system. It validates, commits, and records every mutation to entries,
// sources, and relationships. All state changes go through the Core, which
// enforces the validation rules defined in the design and types packages.
//
// The Core owns the invariant: every mutation is preceded by validation,
// recorded as an event, and persisted through the appropriate store.
package core
