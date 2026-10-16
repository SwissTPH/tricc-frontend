# Why visual authoring

A clinical guideline on paper is static: every reader applies it in their head, and the same
recommendation reads differently in two clinics. A digital guideline, a computable _clinical
decision support_ (CDSS) algorithm, turns it into a tool that asks the right question at the right
time and does the arithmetic. Visual authoring keeps that algorithm readable by the people who own
its content.

## What a digital guideline adds

- **From static to dynamic.** Paper guidelines are rigid, organised in silos and limited in how much they can hold. A digital one shows only what applies to the patient in front of you.
- **Local customisation.** Endemicity, local protocols and the drugs actually available differ from site to site. The guideline adapts to them, and stays relevant across settings.
- **Explicit calculations.** Scores, thresholds and doses are written down as precise logic with named inputs, not left to interpretation.
- **Comorbidities and complex cases.** Several conditions are managed together, so the advice is about the patient, not about one disease.

## Who authors

- **Subject-matter experts**, usually clinicians, are the main authors. They are responsible for
  the content and have the final word.
- **End users** give requirements and feedback, so the tool fits their daily work.
- **IT specialists** say what is possible and add the technical details a generated application
  needs.
- **Other stakeholders**, such as the ministry of health, local implementers and sponsors, make
  sure the content fits its context.

The app is built so that the clinician does the clinical authoring and needs the IT specialist for
the technical parts, not for all of it.

## The challenges, and how the app answers them

| Challenge                      | The questions behind it                                                                                                                                                                       | How the app helps                                                                                                                                                                                                    |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Collaboration**              | How do clinicians, the ministry, hospital administration and IT share one view? Who is responsible for the content? How is it validated by peers?                                             | Diagrams that can be read with little training. A project is a folder with one small file per activity, so a change is reviewed as a diff, or proposed as a pull request on GitHub or GitLab.                        |
| **Precise yet readable logic** | How can expressions be technically precise without alienating clinicians, intuitive but not ambiguous, and still be implemented as written?                                                   | Logic is written in [CQL](https://cql.hl7.org/). Concepts show as named chips, not codes. Details sit behind the node, so the diagram is not overwhelming at first sight.                                            |
| **Treatments**                 | How do you avoid double prescriptions, define alternatives per diagnosis, stabilise before referral, and order advice next to drugs?                                                          | Treatment is its own process, with its own decision trees. Diagnoses can have their own concepts, kept in the calculate dictionary.                                                                                  |
| **Reusing activities**         | How do you avoid duplicated activities, and share one within a guideline and across guidelines?                                                                                               | An activity is defined once and reached with **Go to activity** from anywhere. The library shows where each one is used, and the same activity can belong to several interventions.                                  |
| **Sequence logic**             | How do you show only relevant questions, reuse an activity without loops or dead ends, avoid stopping before the data a treatment needs, and let what follows depend on the starting context? | Decisions, conditional connections, several activity ends, bridges and waits, with validation that flags unreachable nodes, missing Go to targets, an activity that leads to itself, and an activity without an end. |
| **When content starts**        | How do you keep immunisation after emergency care, keep lab tests from interrupting measurements, and leave nice-to-have advice out of emergencies?                                           | Content is split into processes (care segments), and each intervention has a start condition. Several guidelines run side by side, segment by segment.                                                               |
| **Conversion**                 | How do you avoid regressions, keep the same guideline equivalent on different platforms, change only what changed, and prepare for mapping?                                                   | [tricc_oo](../guide/tricc-oo) converts the project automatically to ODK, CHT, OpenMRS, DHIS2, FHIR and OpenSRP, from the same files every time.                                                                      |

Next: [Segments, activities and nodes](./layers).
