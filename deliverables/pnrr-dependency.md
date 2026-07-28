# PNRR Dependency Flags

The RRF Regulation requires all PNRR milestones and targets to be complete by **2026-08-31**.
Most candidates’ momentum evidence in this project traces back to PNRR funding — after
that date, "currently investing" stops being safe to assume across most of the lead list
at once. **This is a pre-outreach re-source list, not a re-score** — nothing here changes
any `totalScore` or `momentumSignal` value; re-check the flagged candidates’ funding status
before outreach rather than trusting the score as still current.

59 scored candidates across 7 Gate-2-approved runs: **21 fully PNRR-anchored, 24 partly, 14 not anchored.**

_Tags are a keyword heuristic over already-validated evidence text (see lib/buildPnrrFlags.mjs
for the exact method) — treat "not anchored" as "no PNRR mention found," not as a confirmed
absence of PNRR involvement._

---

## Fully PNRR-anchored (21)

| Company | Region | Momentum score | Momentum justification |
|---|---|---|---|
| Gruppo CAP | Lombardia | 2/5 | PNRR-funded project exists (ev-6, ev-7) but recency not confirmed (recencyOk=false on both), so treated as weak/uncertain timing. |
| ATO2 Lazio Centrale-Roma (Conferenza dei Sindaci) | Lazio | 2/5 | Same attribution ambiguity as nrwEvidence limits confidence that the 2025 districtualisation target (ev-16) is a live signal specific to this governance body. |
| Gruppo CAP | Lombardia | 3/5 | Programme runs through 2025 and is recency-confirmed as active/ongoing (ev-13). |
| Abbanoa | Sardegna | 2/5 | Projects are recency-confirmed as ongoing (ev-17) but no specific recent tender/budget date is given. |
| Acquevenete S.p.A. | Veneto (Padova/Rovigo) | 3/5 | Project has a concrete near-term deadline (31 Dec 2025) and is recency-confirmed as active (ev-25, ev-26). |
| Viacqua S.p.A. | Veneto (Vicenza) | 3/5 | Joint project has a concrete near-term deadline (31 Dec 2025) and is recency-confirmed as active (ev-25). |
| Comune di Tione di Trento | Trentino-Alto Adige (Province of Trento) | 3/5 | Recent, specific, unresolved procurement (zero bids) signals an active but unmet modernization need per ev-20/ev-4. |
| Comune di Porte di Predaia | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-21, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Pinzolo | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-22, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Sella Giudicarie | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-23, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Valdaone | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-24, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Tenno | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-25, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Carisolo | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-26, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Giustino | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-27, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Andalo | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-28, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Vallelaghi | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-29, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Tre Ville | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-30, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Caderzone Terme | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-31, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Bocenago | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-32, recencyOk:true) but no specific dated tender for this municipality. |
| Comune di Primiero San Martino di Castrozza | Trentino-Alto Adige (Province of Trento) | 2/5 | Part of an approved funding programme (ev-33, recencyOk:true) but no specific dated tender for this municipality. |
| GAIA S.p.A. | Toscana — provinces of Lucca, Pistoia, Massa-Carrara (ATO1) | 1/5 | The 53% loss figure and improvement note (ev-8) are flagged recencyOk:false and likely reference 2022 data — a stale, non-specific signal. |

## Partly PNRR-anchored (24)

| Company | Region | Momentum score | Momentum justification |
|---|---|---|---|
| Acea Ato 2 | Lazio | 3/5 | Active districtualisation programme with a near-term 2025 target (ev-16, recencyOk=true), though funding/results figures themselves are not confirmed-recent (ev-17, ev-18). |
| BrianzAcque | Lombardia (Monza e Brianza) | 4/5 | Recent, specific, funded programme with an explicit numeric loss-reduction target (ev-19, ev-20, ev-21 all recencyOk=true). |
| ATO Città Metropolitana di Milano | Lombardia | 2/5 | A named, funded project exists (ev-6, ev-5) but recency is not confirmed (recencyOk=false on both). |
| Acquedotto Pugliese (AQP) | Puglia | 2/5 | EIB/PNRR financing (ev-9, ev-10) is not recency-confirmed; only the 34,000km network/sensor figure is a recent (2025) data point (ev-12), which is infrastructure reporting rather than a new tender/announcement. |
| AMAP S.p.A. | Sicilia (Città Metropolitana di Palermo) | 3/5 | Both the mains-renewal investment and Control Room build are recency-confirmed as currently active (ev-19, ev-20). |
| GORI S.p.A. | Campania (Sarnese-Vesuviano district, Naples/Salerno provinces) | 2/5 | Funding is recency-confirmed as secured/active (ev-22), but the baseline dispersion data is from 2021 (ev-23, recencyOk false) and the pipeline/smart-meter progress claim did not survive validation. |
| AcegasApsAmga | Veneto / Friuli-Venezia Giulia (Padova, Trieste) | 3/5 | Joint project has a concrete near-term deadline (31 Dec 2025) and is recency-confirmed as active (ev-25). |
| SMAT - Società Metropolitana Acque Torino S.p.A. | Piemonte (Torino) | 3/5 | Multi-year staged targets through 2030 are recency-confirmed as active and ongoing (ev-27, ev-28). |
| Publiacqua S.p.A. | Toscana (Medio Valdarno) | 3/5 | Recency-confirmed achieved results plus an additional recent €9M allocation for the metropolitan-area system (ev-31). |
| CIIP SpA (Cicli Integrati Impianti Primari) | Marche / Abruzzo | 3/5 | 2025 financial results with active investment (€69.6M) are recency-confirmed (ev-34). |
| Siciliacque S.p.A. | Sicilia | 3/5 | Active PNRR-funded infrastructure works (ev-11) plus a recent 2025 leakage-focused research partnership (ev-24), though neither is primarily leak-detection-driven. |
| AMAP S.p.A. (Azienda Municipalizzata Acquedotto Palermo) | Sicilia (Palermo) | 4/5 | Active, recent (recencyOk) build-out of a 24/7 leak/pressure monitoring control room with remote shutoff per ev-14. |
| AMAM S.p.A. (Azienda Meridionale Acque Messina) | Sicilia (Messina) | 3/5 | Recently completed €24M city-centre network contract per ev-17 (recencyOk), though it is a general network project rather than an explicit NRW tender. |
| Sorical S.p.A. (Società Risorse Idriche Calabresi) | Calabria | 3/5 | >€100M network-modernization investment plan (ev-18), in-progress Crotone aqueduct and Catanzaro pipeline works (ev-19, ev-20) — all validated and describe active work, but all three trace to a single source (src-8, CrotoneOk, dated 2025-02-24, ~17 months old as of this run) with no independent corroboration, short of the rubric's ≤12-month bar for a top score. Moderate, not strong: credible evidence with a real gap (single-source, past the recency window). |
| Novareti S.p.A. | Trentino-Alto Adige (Province of Trento) | 4/5 | Corrected 2026-07-26 after human verification added ev-41: a live, currently-executing €3.5M PNRR project in Rovereto (€2.5M PNRR-funded), formalised end-2024 and under construction during 2025 — a named, dated, actively-in-progress initiative, not distress or an undated company claim. Sourced from the Comune di Rovereto's own communiqué (Tier A, dated 2024-12-17) and il Dolomiti trade press (Tier B, dated 2024-09-18), both recencyOk:true. Held at 4/5 rather than 5/5 since the exact completion date still varies slightly between sources and no 2026 progress update was found confirming current status. |
| Comune di Baselga di Pinè | Trentino-Alto Adige (Province of Trento) | 4/5 | Specific, recent, budget-tied tender with a March 2026 completion deadline per ev-17/ev-3. |
| Comune di Cavedine | Trentino-Alto Adige (Province of Trento) | 4/5 | Specific, recent, budget-tied tender with a March 2026 completion deadline per ev-18/ev-3. |
| Comune di Predaia | Trentino-Alto Adige (Province of Trento) | 4/5 | Specific, recent, budget-tied tender with a March 2026 completion deadline per ev-19/ev-3. |
| Etra S.p.A. | Veneto (Padova, Treviso, Vicenza provinces) | 0/5 | Only recent tracked signal is a delay flag on the PNRR project (ev-5) — distress, not momentum; no validated positive recent tender/budget news. |
| Servizi Integrati Bellunesi S.p.A. (SIB spa) | Veneto (Belluno province) | 0/5 | Only recent tracked signal is a delay flag (ev-10) — distress, not momentum; no validated positive recent news. |
| Publiacqua S.p.A. | Toscana — provinces of Firenze, Prato, Pistoia, Arezzo (ATO3) | 3/5 | FY2024 results confirming the loss-reduction target was met were approved May 2025 (ev-1); ARERA's RQTI evaluation cycle opened Feb 2026 adds regulatory timing (ev-7), but no brand-new tender or announcement. |
| Acque S.p.A. | Toscana — provinces of Pisa, Lucca, Firenze (ATO2) | 2/5 | Digital4Zero is targeted for completion March 2026, but ev-3/ev-4 are flagged recencyOk:false, weakening the timing signal. |
| Nuove Acque S.p.A. | Toscana — provinces of Arezzo, Siena (ATO4) | 4/5 | €124M 2025–2029 investment plan exceeding €100/inhabitant vs. Italy's ~€65 average (ev-11) and the PNRR-funded districtization project (ev-12) are both recencyOk:true, giving a current, specific timing signal. |
| GEAL S.p.A. | Toscana — Comune di Lucca (single-municipality historic affidamento within ATO1; distinct from ATO1's designated gestore, GAIA) | 3/5 | Reverted to an evidence-only score: the EUR12,244,496 PNRR-funded digitalization/loss-reduction project (ev-49) is real, named, and dated (January 2025, ~18 months old), but single-sourced (only src-17) and beyond the rubric's strict <=12-month bar for a 5 — capped at 3, consistent with the Calabria precedent for a credible-but-single-sourced signal in the 12-24 month range. This score measures the funding/momentum evidence on its own terms and does NOT factor in GEAL's entity-continuity status (settled merger into GAIA, ev-54/ev-55) — that risk is carried entirely by leadQualification.excluded below, not blended into this dimension. See the candidate's uncertainty field and this brief's leadQualification for why GEAL is excluded from qualified leads despite this score. |

## Not PNRR-anchored (14)

| Company | Region | Momentum score | Momentum justification |
|---|---|---|---|
| Uniacque | Lombardia (Provincia di Bergamo) | 4/5 | Recent, specific, named project launch with quantified impact (ev-23, ev-24, both recencyOk=true). |
| Gruppo Hera | Emilia-Romagna (also Marche, north-eastern Italy, three Tuscan municipalities) | 2/5 | Meter deployment figure is recency-confirmed (Nov 2024, ev-15) but reflects a small-scale rollout, not a major tender/budget announcement. |
| Uniacque S.p.A. | Lombardia (Bergamo) | 3/5 | Recency-confirmed active tech partnership with a specific, current deployment (ev-38). |
| Gruppo Iren | Piemonte / Liguria / Emilia-Romagna | 2/5 | General tech-stack description is recency-confirmed (ev-40) but is not a specific recent tender/announcement; the Sarzana case result is not recency-confirmed (ev-41). |
| AICA (Azienda Idrica Comuni Agrigentini) | Sicilia (Agrigento province) | 0/5 | inference — no validated evidence of any tender, budget, or modernization news; only unresolved debt/loss context exists (ev-23). |
| Acoset S.p.A. | Sicilia (Catania province — Consorzio Calatino) | 0/5 | inference — no validated evidence |
| ATI Trapani (Assemblea Territoriale Idrica di Trapani), formerly ATO Idrico n°7 Trapani | Sicilia (Trapani province) | 5/5 | Very recent (as of June 2026, recencyOk), concrete €806M investment plan and active private-partner tender per ev-19/ev-20, now confirmed to include named loss-reduction and digitalization categories per ev-58. |
| ATI Ragusa (Assemblea Territoriale Idrica di Ragusa) | Sicilia (Ragusa province) | 1/5 | 30-year Piano d'Ambito began in 2022 per ev-26 — an existing plan, not a recent tender, budget announcement, or modernization news item. |
| Acquevenete S.p.A. | Veneto (Padova, Rovigo, Vicenza, Verona, Venezia provinces) | 0/5 | inference — no validated evidence (the €30M Rovigo investment-plan claim was not validated). |
| AcegasApsAmga S.p.A. | Veneto (Padova, Vicenza provinces) and Friuli-Venezia Giulia | 0/5 | inference — no validated evidence |
| Viacqua S.p.A. | Veneto (Vicenza province, Bacchiglione ATO) | 0/5 | inference — no validated evidence |
| Alto Trevigiano Servizi S.p.A. (ATS) | Veneto (Treviso, Belluno, Vicenza provinces) | 5/5 | Recent (July 2026) €26M financing facility secured to support a €160M+ 2026-2029 modernization investment plan per ev-11. |
| Acquedotto del Fiora S.p.A. | Toscana — provinces of Grosseto, Siena (ATO6) | 4/5 | "Piano Fiora 26/29" was announced in April 2026 — a recent, specific, named investment programme tied to network modernization, per ev-5 (recencyOk true). |
| ASA S.p.A. | Toscana — provinces of Livorno, Pisa, Siena (ATO5 Toscana Costa) | 2/5 | The 2024 sensor pilot (ev-10) is recencyOk:false, so it registers as a positive but dated technology-adoption signal rather than a fresh momentum event. |
