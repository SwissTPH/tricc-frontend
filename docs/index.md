---
layout: home

hero:
  name: TRICC Authoring
  text: Clinical guidelines, drawn and checked in the browser
  image:
    src: /swisstph-mark.png
    alt: Swiss TPH
  tagline: Draw TRICC decision-support flowcharts in an editor that understands them. Projects stay on your computer as reviewable YAML, and tricc_oo converts them to ODK, CHT, OpenMRS, DHIS2 and FHIR.
  actions:
    - theme: brand
      text: Open the app
      link: https://swisstph.github.io/tricc-frontend/app/
    - theme: alt
      text: Run it locally
      link: /guide/getting-started
    - theme: alt
      text: Download
      link: /download

features:
  - title: Knows what a node is
    details: A weight question offers minimum, maximum, unit and concept, and nothing else. Branches are chosen, not typed. A goto picks from activities that exist.
  - title: Logic in CQL
    details: Every condition and calculation is written in CQL. Concepts are stored by code and shown by name as chips.
  - title: Nothing leaves your computer
    details: There is no server and no account. Projects stay in your browser or in a folder you choose, ready for git.
  - title: Reviewable files
    details: One small YAML file per activity, so guideline changes can be reviewed as a diff in git.
---

<p class="home-note">
TRICC Authoring is the authoring editor. A companion platform for sharing, review and use is in
development.
</p>
