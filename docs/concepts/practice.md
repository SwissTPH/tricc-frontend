# Good practice

## How a guideline gets to the health worker

1. **Author** in the app. The clinician writes the clinical content; the IT specialist adds what
   the generated application needs.
2. **Propose** the changes: as a pull request when the project lives on GitHub or GitLab (see
   [Saving and sharing](../guide/saving)), or as an exported `.tricc` file.
3. **Review**: someone responsible for the content reads the change, activity by activity.
4. **Convert** with [tricc_oo](../guide/tricc-oo) to the target platform.
5. **Test** the generated form on a device, and send the feedback to the authors.
6. **Release** to production.

Maintenance follows the same cycle. Feedback can arrive at any time, and changes are collected,
reviewed, approved and released in batches.

## Recommendations

**Keep each diagram manageable.**

- A few seconds should be enough to see what a diagram does.
- Put complex logic in a calculation, in CQL, rather than in a web of decisions.
- Split long activities: an activity is reused through **Go to activity**, not copied.

**Maintain the data dictionary.**

- Give every concept a code. Reuse a concept rather than creating a second one with the same
  meaning.
- Define each concept properly (display, data type, concept type), so the data collected under it
  is not misused later.

**Work in small iterations.** Make a small change, convert, test. Every addition makes the whole
more complex and gives it more ways to fail (an undefined concept, a loop). A small change also
makes the broken part easy to find.

## Change control

- The app saves one file per activity, so several authors can work on different activities
  without merge conflicts.
- Keep the latest version in one shared place. A git repository with pull requests gives every
  change an author, a review and a history.

## When the conversion fails

- **Read the log** before drawing conclusions. Look at warnings and errors: a failed import, a
  processing error, an undefined concept.
- **"Loop likely" or a conversion that never ends** usually means:
  - an activity or node leads back to itself, perhaps through many nodes in between;
  - a calculation needs a concept that is only defined in a later activity.
- Check the activity's **Validation** tab first: it already flags unreachable nodes, a Go to
  without a target, and an activity without an end.

More in [Converting with tricc_oo](../guide/tricc-oo#when-the-conversion-complains).
