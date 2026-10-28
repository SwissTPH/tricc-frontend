import type { Capability } from '../ports/identity.js'

/** Thrown when a mutation needs a capability the session does not have. */
export class CapabilityError extends Error {
  constructor(readonly required: Capability) {
    super(`this action requires the "${required}" capability`)
    this.name = 'CapabilityError'
  }
}
