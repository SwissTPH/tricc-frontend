---
name: RFC (feature proposal)
about: Propose a feature. Once approved, it becomes a feature spec under feature/.
title: 'RFC: '
labels: rfc
---

<!-- rfc: slug= -->

# Title of the feature

| Field             | Value                                                    |
| ----------------- | -------------------------------------------------------- |
| **Status**        | Draft                                                    |
| **Branch target** | `feature/<name>` → `develop`                             |
| **Packages**      | `@tricc/core`, `@tricc/editor`, `apps/local`, `tricc_oo` |
| **Related**       | `YYYYMMDD-other-spec.md` (why it is related)             |

Valid status values: `Draft` → `Approved` → `Implemented` → `Superseded`.

---

## Part I — Business description

### The problem

Who is affected, what they cannot do today, and why it matters. Plain language, for clinical
authors and implementers.

### What changes for an author

- What they will see and do differently.

### Out of scope

- What this RFC deliberately does not cover.

---

## Part II — Technical specification

### 1. Design

The model, file format and API changes. Name the files and types it touches.

### 2. Validation and errors

### 3. Tests

### 4. Phases

1. …

---

## Open questions

1. …
