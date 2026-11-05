---
name: rfc
description: Propose a new tricc-frontend feature as an RFC GitHub issue written in the feature-spec format (Part I business, Part II technical), refresh it after discussion, or approve it so the rfc-to-feature action turns it into feature/<date>-<slug>.md. Use when the user asks to write, open, propose, update or approve an RFC, a feature proposal or a new spec. Pass --pr to skip the issue and open the feature file directly as a PR.
---

# RFC for a new feature

An RFC is a GitHub issue whose body is a feature spec in the format of `feature/` (see
`feature/README.md`). Discussion happens on the issue. Approval writes the spec file.

```
/rfc <idea>          draft → confirm → issue labelled `rfc`
/rfc update <#n>     fold the discussion into the issue body
/rfc approve <#n>    add `rfc:approved` → action opens the feature-file PR (merge closes the issue)
/rfc --pr <idea>     no issue: write feature/<date>-<slug>.md on a branch and open a PR
```

## 1. Draft

1. Read `feature/README.md`, the specs the idea touches, and enough code to write Part II with
   real file, type and function names. Look for an existing spec or RFC that already covers it:
   `ls feature/`, `gh issue list --label rfc --state all --search "<keywords>"`. Propose revising
   that one instead of a duplicate.
2. Ask the user only for what you cannot find: the problem it solves, who it is for, and scope.
3. Fill the template in `.github/ISSUE_TEMPLATE/rfc.md` (drop its YAML front matter):
   - `<!-- rfc: slug=<slug> -->` stays the first line. The slug is short kebab-case with no date
     (`snippets-tab-and-params`). The action names the file `feature/<approval date>-<slug>.md`,
     so a revised RFC keeps its slug.
   - **Status** stays `Draft`; the action sets `Approved`.
   - Part I in plain language for clinical authors: no code names. Part II for developers: files,
     types, codecs, validation codes, tests, phases. Keep sections short, like the existing specs.
   - Put undecided points under **Open questions**, numbered, each with your recommendation.
   - A change `tricc_oo` must absorb gets its own line under Related ("mirror into
     `../tricc_oo/feature/` on approval").
4. Show the draft and confirm before publishing: an issue is public.

## 2. Publish

```bash
gh label create rfc --color 1d76db --description "Feature proposal" 2>/dev/null || true
gh label create 'rfc:approved' --color 0e8a16 --description "Write the RFC to feature/" 2>/dev/null || true
gh issue create --title "RFC: <Title>" --label rfc --body-file <scratchpad>/rfc-<slug>.md
```

Write the body to the scratchpad, never inline in the shell. Give the user the issue URL.

## 3. Update after discussion

`gh issue view <n> --comments`, then rewrite the body so it reads as the current proposal: fold
agreed answers into Parts I/II, strike them from Open questions, and add a dated line under a
`## Decisions` section (`- 2026-11-04: parameter identity is the name only (@reviewer)`). Show the
diff of the body, then `gh issue edit <n> --body-file …`. Do not keep the history in the body;
the issue comments are the history.

## 4. Approve

Only when the user says the RFC is approved. Check Open questions is empty or explicitly
deferred, then `gh issue edit <n> --add-label 'rfc:approved'`.

`.github/workflows/rfc-to-feature.yml` then:

- runs `.github/scripts/rfc-to-feature.mjs`: writes `feature/<YYYYMMDD>-<slug>.md`, sets Status
  `Approved (<date>, RFC #n)` and an **RFC** row linking the issue, removes an older
  `feature/*-<slug>.md` (the rename-on-revision rule), and runs prettier;
- pushes `rfc/<n>-<slug>` and opens a PR with `Closes #n`, commenting the link on the issue.

To revise after approval, edit the issue, remove and re-add the label: the same PR is refreshed.
Before the PR is merged, add the spec's row to the table in `feature/README.md` on that branch.

The action needs "Allow GitHub Actions to create and approve pull requests" enabled in the
repository's Actions settings. If no PR appears, check `gh run list --workflow rfc-to-feature.yml`.

## 5. `--pr` mode (no issue)

For a spec the user wants reviewed as a file. Branch `rfc/<slug>` from `origin/develop`, write
`feature/<today>-<slug>.md` from the same template (no marker line, Status `Draft`), add the
`feature/README.md` row, `npx prettier --write` both, commit
`Docs: :memo: RFC <title>`, push, `gh pr create --base develop --label rfc`. Discussion happens
on the PR; on approval set Status to `Approved (<date>)` in a follow-up commit.
