# Qualified Leads — V1 (pending ICP calibration with HULO)

**Not final.** The five scoring dimensions and the four target role
categories are provisional assumptions from the internship application
brief, not validated HULO input — see `ASSUMPTIONS-TO-REVISIT.md` items 1
and 6. **The selection rule below is the durable part of this
deliverable; the specific companies listed are provisional** until real
HULO sales/product input calibrates the scoring dimensions and target
roles in internship week 1.

## Selection rule

Hard filters first (disqualifiers, not score inputs), then rank survivors
by `totalScore`, `momentumSignal` breaking ties.

**Filters:**
1. Has at least one named contact with a real source URL in a target
   role category (innovation / operations / asset-management /
   digital-transformation)
2. Not excluded on entity continuity (`leadQualification.status !==
   "excluded"`)
3. Has validated NRW/leakage evidence (`nrwEvidence` dimension score > 0)
   — size alone (`utilitySize`) does not qualify a lead

The contact filter is a hard filter, not a score input, because the goal
is *marketing-qualified* leads, not just high-scoring organisations: a
utility with no named, sourced person to reach isn’t qualified regardless
of its score. A lower-scoring candidate with a real named contact in a
target role is worth more than a higher-scoring one with nobody to
contact.

**19 of 59** scored candidates across 7 Gate-2-approved runs passed the filter.

---

## Top 5 (V1)

### 1. Novareti S.p.A. — 22/25 (Trentino-Alto Adige (Province of Trento))

Run: `2026-07-26T12-50-05-944Z__a7c6658d` — candidate `cand-1`

**Dimension scores:**

- Utility size: 5/5
- NRW evidence: 5/5
- Region fit: 5/5
- Target role presence: 3/5
- Momentum signal: 4/5 — Corrected 2026-07-26 after human verification added ev-41: a live, currently-executing €3.5M PNRR project in Rovereto (€2.5M PNRR-funded), formalised end-2024 and under construction during 2025 — a named, dated, actively-in-progress initiative, not distress or an undated company claim. Sourced from the Comune di Rovereto's own communiqué (Tier A, dated 2024-12-17) and il Dolomiti trade press (Tier B, dated 2024-09-18), both recencyOk:true. Held at 4/5 rather than 5/5 since the exact completion date still varies slightly between sources and no 2026 progress update was found confirming current status.

**Key verified facts:**

- Novareti manages approximately 1,000-1,300 km of drinking-water network serving over 75,000 customers across 11 Trentino municipalities, covering a population of over 200,000 (ev-6).
- Novareti operates under Dolomiti Energia Holding's coordination and control, running the municipal aqueducts of Trento, Rovereto, and smaller municipalities on the group's behalf (ev-7).
- Novareti reports real water losses of around 15%, roughly half the regional average and well below the national average (ev-8).
- As of 2023, Novareti operates 24/7 remote monitoring, digital cartography, intelligent district pressure management, and acoustic-sensor leak detection (ev-9).
- Novareti is executing a live €3.5M PNRR-funded project in Rovereto (€2.5M PNRR, ~€1M municipality), formalised end-2024 and under construction during 2025, creating 21 monitored districts with pressure-reduction valves, leak-detection software, and ~6,000 smart-meter replacements (ev-41).

**Required human verification:**

- Confirm Matteo Frisinghelli's current title and tenure directly via Novareti's own team page or a recent press mention before outreach.
- Confirm the 2026 status of the Rovereto PNRR project (on schedule, delayed, or completed) before using it as a live talking point.
- Confirm whether Dolomiti Energia Holding or Novareti itself is the actual procurement decision-maker for water-network technology.

**Qualifying contact(s):**

- Matteo Frisinghelli — Responsabile Operativo Servizio Idrico (Operational Water Service Manager) (operations), confidence 0.75, source: https://www.linkedin.com/in/matteo-frisinghelli-0414bb229/

### 2. Sorical S.p.A. (Società Risorse Idriche Calabresi) — 21/25 (Calabria)

Run: `2026-07-26T10-37-38-791Z__705731b4` — candidate `cand-1`

**Dimension scores:**

- Utility size: 5/5
- NRW evidence: 5/5
- Region fit: 5/5
- Target role presence: 3/5
- Momentum signal: 3/5 — >€100M network-modernization investment plan (ev-18), in-progress Crotone aqueduct and Catanzaro pipeline works (ev-19, ev-20) — all validated and describe active work, but all three trace to a single source (src-8, CrotoneOk, dated 2025-02-24, ~17 months old as of this run) with no independent corroboration, short of the rubric's ≤12-month bar for a top score. Moderate, not strong: credible evidence with a real gap (single-source, past the recency window).

**Key verified facts:**

- Sorical has been the sole manager of Calabria's integrated water service since October 2022, consolidating roughly 400 previously separate municipal water systems (ev-13).
- As of January 2026, Sorical's network spans ~6,000 km of pipelines serving 363 municipalities, with 900 reservoirs and 300 pumping stations (ev-14), and its takeover plan targets ~70% of Calabria's population (ev-15).
- Calabria's regional average water-network loss rate is 48.7%, rising to 66.5% in Cosenza province (ev-1, ev-2) — both above Italy's 42.4% national average (ev-21).
- Sorical is implementing an €8 million water-network digitalisation project in Reggio Calabria using NB-IoT smart metering, a Smart Water Management platform, and a new remote operational control room, with planned region-wide expansion (ev-17).
- Sorical and ARRICAL secured €32.8 million in PNRR funding specifically to improve distribution-network efficiency in 21 municipalities (ev-16).
- Sorical and the Calabria Region have committed to a network-modernization investment plan exceeding €100 million (ev-18), with in-progress works including a new Crotone-area aqueduct (ev-19) and pipeline/plant upgrades in Catanzaro province (ev-20).
- A €1 billion national water fund (SFNIISSI, PNRR M2C4-I4.5) opened applications on 6 May 2026 with a deadline of 8 June 2026, reserving at least 40% of allocable resources for southern regions including Calabria (ev-23).

**Required human verification:**

- Confirm Giovanni Paolo Marati is still Direttore Generale of Sorical at the time of any planning decision, since Sorical's governance structure has changed more than once in recent years.
- Confirm the current titles and employment status of Francesco Iennarella and Mauro Locanto, since their attribution stems from a 2023 conference presentation, not a current company page.
- Verify the €100M+ modernization plan and Crotone/Catanzaro project details against a second, more recent source, since all current evidence traces to a single February 2025 article.
- Verify whether Sorical or ARRICAL applied to the €1B SFNIISSI fund (window closed 8 June 2026) and the outcome, since this was identified only as an open opportunity, not a confirmed action.
- Confirm the exact current boundary between Sorical's own operated network and still-independent municipal systems, given the regional consolidation process is ongoing through 2027.

**Open opportunities:**

- Eligible for the €1B SFNIISSI water fund (application window closed 8 June 2026, 40% reserved for southern regions including Calabria). No confirmation found that Sorical/Arrical applied or the outcome. Not counted toward momentumSignal per the distress≠momentum rubric — surface as an open funding opportunity in the brief, not as demonstrated momentum.

**Qualifying contact(s):**

- Giovanni Paolo Marati — Direttore Generale (Director General) (operations), confidence 0.8, source: https://www.corrieredellacalabria.it/2026/02/07/il-dg-marati-sorical-sta-costruendo-un-modello-pubblico-unico-nel-mezzogiorno/
- Francesco Iennarella — Responsabile Cyber Security e Sistemi Informativi (digital-transformation), confidence 0.5, source: https://www.crotoneok.it/ecomondo-presentato-il-progetto-delle-reti-digitali-di-sorical/
- Mauro Locanto — Responsabile Area Investimenti e Servizi Tecnici (asset-management), confidence 0.5, source: https://www.crotoneok.it/ecomondo-presentato-il-progetto-delle-reti-digitali-di-sorical/

### 3. Acquedotto del Fiora S.p.A. — 20/25 (Toscana — provinces of Grosseto, Siena (ATO6))

Run: `2026-07-27T11-39-25-488Z__cac519a3` — candidate `cand-3`

**Dimension scores:**

- Utility size: 4/5
- NRW evidence: 5/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 4/5 — "Piano Fiora 26/29" was announced in April 2026 — a recent, specific, named investment programme tied to network modernization, per ev-5 (recencyOk true).

**Key verified facts:**

- "Piano Fiora 26/29", announced April 2026, allocates €151 million in investments for 2026–2029, roughly €100 per inhabitant per year, above the Italian national average (ev-5).
- Between 2019 and 2025, Acquedotto del Fiora recovered 45 million cubic metres of water and reduced network losses by more than 10% (ev-6).
- Acquedotto del Fiora serves approximately 380,000–400,000 inhabitants across 55 municipalities via roughly 8,400 km of water network (ev-21).
- Acquedotto del Fiora is subject to ARERA's RQTI network-loss technical-quality targets (ev-7).

**Required human verification:**

- Confirm Michela Ticciati's current title, since sourced documents describe her variably as "Responsabile Unità Esercizio Area Operation" and "Responsabile tecnico."
- Reconcile the differing population figures (380,000 vs 400,000) before using either in outward-facing materials.

**Qualifying contact(s):**

- Michela Ticciati — Responsabile Unità Esercizio Area Operation (also referenced as "Responsabile tecnico"), Acquedotto del Fiora S.p.A. (operations), confidence 0.6, source: https://it.linkedin.com/in/ticciati-michela-06856411a

### 4. Publiacqua S.p.A. — 20/25 (Toscana — provinces of Firenze, Prato, Pistoia, Arezzo (ATO3))

Run: `2026-07-27T11-39-25-488Z__cac519a3` — candidate `cand-1`

**Dimension scores:**

- Utility size: 5/5
- NRW evidence: 5/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 3/5 — FY2024 results confirming the loss-reduction target was met were approved May 2025 (ev-1); ARERA's RQTI evaluation cycle opened Feb 2026 adds regulatory timing (ev-7), but no brand-new tender or announcement.

**Key verified facts:**

- Publiacqua's PNRR-financed water-loss reduction project met its funding-call target, per FY2024 results approved May 2025 (ev-1).
- Publiacqua invested approximately €126 million in its network in 2024, of which about €56.5 million came from PNRR funding, the largest PNRR/FOI allocation of any Tuscan water manager (ev-2).
- Publiacqua serves approximately 1,305,000 inhabitants across 46 municipalities, operating nearly 7,000 km of distribution network and almost 410,000 customer connections (ev-13, ev-14).
- Publiacqua is subject to ARERA's RQTI network-loss technical-quality targets under macro-indicator M1 (ev-7).

**Required human verification:**

- Confirm Luciano Caroti's current title and whether he remains Publiacqua's ICT lead in 2026, since the sourced description of his role is undated.
- Confirm the FY2024 loss-reduction milestone refers to network (physical) losses specifically, not billing/commercial losses, before treating it as an NRW signal.

**Qualifying contact(s):**

- Luciano Caroti — ICT Manager, Publiacqua S.p.A. (digital-transformation), confidence 0.5, source: https://www.linkedin.com/in/luciano-caroti-4423263/

### 5. ATI Trapani (Assemblea Territoriale Idrica di Trapani), formerly ATO Idrico n°7 Trapani — 19/25 (Sicilia (Trapani province))

Run: `2026-07-25T09-40-14-107Z__b5971aea` — candidate `cand-6`

**Dimension scores:**

- Utility size: 3/5
- NRW evidence: 4/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 5/5 — Very recent (as of June 2026, recencyOk), concrete €806M investment plan and active private-partner tender per ev-19/ev-20, now confirmed to include named loss-reduction and digitalization categories per ev-58.

**Key verified facts:**

- ATI Trapani approved a new 30-year Piano d'Ambito with a unified provincial tariff and over €806 million in planned infrastructure investment, and tasked Invitalia with launching a tender to select a private operating partner for a mixed public-private water-service company (ev-19).
- As of June 2026, ATI Trapani's Territorial Water Area covers 25 municipalities, following the integration of 15 previously separately-managed municipalities (ev-20).
- Earlier official documentation under the name ATO Idrico n°7 Trapani recorded the same territorial water area as covering 17 municipalities (ev-21).
- In the city of Trapani specifically, water loss is only 17.2% of water put into the network — sharply below the Sicilian regional average of 51.6% (ev-2).
- The €806 million Piano d'Ambito explicitly names loss reduction ("riduzione delle perdite" / "contrasto alla dispersione idrica") and network digitalization as distinct funded intervention categories, alongside network reinforcement and plant modernization (ev-58, corroborated by three sources).

**Required human verification:**

- Confirm Pierluigi Carugno's current role and whether ATI Trapani or its future private operating partner is the more appropriate long-term contact point.
- Confirm the itemised euro breakdown within the €806M Piano d'Ambito for the now-confirmed loss-reduction and digitalization categories (ev-58).

**Qualifying contact(s):**

- Pierluigi Carugno — Direttore Generale (operations), confidence 0.5, source: https://www.trapanisi.it/ati-trapani-revocato-il-commissariamento-regionale-si-apre-fase-decisiva-per-il-servizio-idrico/

---

## Also qualified (ranked 6–19)

### 6. Gruppo CAP — 19/25 (Lombardia)

Run: `2026-07-24T08-49-42-948Z__cfa09872` — candidate `cand-2`

**Dimension scores:**

- Utility size: 4/5
- NRW evidence: 5/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 3/5 — Programme runs through 2025 and is recency-confirmed as active/ongoing (ev-13).

**Key verified facts:**

- Gruppo CAP is running a PNRR-funded programme (2022-2025) to complete district metering of its entire managed network, install flow-rate meters, deploy smart meters, and use sensors, radar and hydraulic-modelling software for continuous active leak monitoring, with over €40 million in funding through 2025 (ev-13).
- Gruppo CAP serves 1,886,014 inhabitants across 133 municipalities via 6,531 km of aqueduct network for water distribution (ev-14).

**Required human verification:**

- Confirm Michele Tessera's current title and whether the CIO role still spans Gruppo CAP specifically before treating this as an active contact.
- Confirm the €40M+ PNRR programme funding and 2025 completion timeline are still accurate given the current date.

**Qualifying contact(s):**

- Michele Tessera — Direttore Digital Hub - CIO (digital-transformation), confidence 0.6, source: https://www.linkedin.com/in/michele-tessera-ba0427110/

### 7. Acquedotto Pugliese (AQP) — 19/25 (Puglia)

Run: `2026-07-24T08-49-42-948Z__cfa09872` — candidate `cand-1`

**Dimension scores:**

- Utility size: 5/5
- NRW evidence: 5/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 2/5 — EIB/PNRR financing (ev-9, ev-10) is not recency-confirmed; only the 34,000km network/sensor figure is a recent (2025) data point (ev-12), which is infrastructure reporting rather than a new tender/announcement.

**Key verified facts:**

- AQP has built a digital-twin Smart Water Management platform providing predictive what-if modelling and dashboards for localising and monitoring water losses (ev-8).
- AQP obtained €270 million in EIB financing to improve its water service, including network modernisation (ev-9).
- AQP received approximately €280 million in combined PNRR/REACT-EU co-financing, including a €99.75 million 'Smart water management and rehabilitation of water distribution networks' intervention completed and liquidated by 31 December 2023 (ev-10).
- AQP serves over 4 million citizens and manages the largest ATO in Italy by geographic extension (ev-11).
- AQP's network monitoring infrastructure includes over 34,000 km of distribution network, roughly 11,000 sensors and 570,000 interconnections per 2025 balance-sheet reporting (ev-12).

**Required human verification:**

- Confirm Sebastiano Lopez still holds the Innovation & IT Management role at AQP before any further use of this contact.
- Confirm the current (2026) operational status and vendor of AQP's Smart Water Management digital-twin platform.

**Qualifying contact(s):**

- Sebastiano Lopez — Responsabile, Innovation & IT Management (DIRIT) (digital-transformation), confidence 0.6, source: https://www.aqp.it/societa-trasparente/organizzazione/articolazione-uffici/uffici/innovation-it-management-dirit

### 8. AMAP S.p.A. — 18/25 (Sicilia (Città Metropolitana di Palermo))

Run: `2026-07-24T08-49-42-948Z__cfa09872` — candidate `cand-5`

**Dimension scores:**

- Utility size: 3/5
- NRW evidence: 5/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 3/5 — Both the mains-renewal investment and Control Room build are recency-confirmed as currently active (ev-19, ev-20).

**Key verified facts:**

- AMAP is investing approximately €50 million in PNRR funds to renew primary water-supply mains and reduce losses in its Destra Oreto system, targeting a 62% reduction in losses in the affected districts (Brancaccio, Giardini, Bonagia) via roughly 20 km of pipe renewal (ev-19).
- AMAP is building a 'Control Room' to centralise data from network-connected water users, giving real-time visibility of consumption, pressure and leak monitoring for the Brancaccio district and neighbouring zones (ev-20).
- AMAP is a wholly publicly owned water utility managing the integrated water service for 44 municipalities in the Città Metropolitana di Palermo, described as Italy's second-largest publicly owned water operator after AQP (ev-21).

**Required human verification:**

- Confirm Giovanni Sciortino is still AMAP's Amministratore Unico before treating this as a current contact.
- Confirm whether AMAP has a named digital-transformation or asset-management lead distinct from the sole administrator.

**Qualifying contact(s):**

- Giovanni Sciortino — Amministratore Unico (Sole Administrator/CEO) (operations), confidence 0.5, source: https://qds.it/palermo-super-tecnologica-control-room-amap/

### 9. Uniacque S.p.A. — 18/25 (Lombardia (Bergamo))

Run: `2026-07-24T08-49-42-948Z__cfa09872` — candidate `cand-13`

**Dimension scores:**

- Utility size: 3/5
- NRW evidence: 5/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 3/5 — Recency-confirmed active tech partnership with a specific, current deployment (ev-38).

**Key verified facts:**

- Amazon Web Services (AWS) and Aganova launched an AI-based, acoustic water-leak-detection project with utility Uniacque in the Bergamo area, using sensors and machine-learning algorithms to detect non-visible leaks with millimetre-level precision, projected to save 200 million litres of water per year over 10 years (ev-38).
- Uniacque's network extends across over 200 municipalities in the Bergamo area, serving approximately one million citizens (ev-39).

**Required human verification:**

- Confirm Ezio Nini is still Uniacque's Direttore Generale.
- Confirm the current coverage scope of the AWS/Aganova leak-detection deployment (pilot vs. full network).

**Qualifying contact(s):**

- Ezio Nini — Direttore Generale (appointed 25 October 2023, effective 20 November 2023) (operations), confidence 0.55, source: https://www.uniacque.bg.it/amministrazione-trasparente/personale/incarico-direttore-generale/

### 10. Acque S.p.A. — 18/25 (Toscana — provinces of Pisa, Lucca, Firenze (ATO2))

Run: `2026-07-27T11-39-25-488Z__cac519a3` — candidate `cand-2`

**Dimension scores:**

- Utility size: 4/5
- NRW evidence: 5/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 2/5 — Digital4Zero is targeted for completion March 2026, but ev-3/ev-4 are flagged recencyOk:false, weakening the timing signal.

**Key verified facts:**

- Acque S.p.A. is receiving €32.6 million in PNRR funding (of a €41 million total project) for its 'Digital4Zero' project to digitalise its aqueduct network and reduce losses, targeted for completion by March 2026 (ev-3).
- Digital4Zero will expand network sectorization from 1,100 km to approximately 2,600 km of pipelines across 28 priority municipalities selected for high water-loss levels (ev-4).
- Acque manages the integrated water service for 55 municipalities via a network exceeding 6,000 km, with the Digital4Zero priority zone alone serving more than 220,000 private users (ev-15, ev-16).
- All Italian water operators, including Acque, must meet ARERA's RQTI network-loss targets (ev-7).

**Required human verification:**

- Confirm Guastamacchia is still CEO of Acque S.p.A. and whether he has direct oversight of the Digital4Zero programme.
- Verify Digital4Zero's actual completion status against its March 2026 target.

**Qualifying contact(s):**

- Andrea Guastamacchia — Amministratore Delegato (digital-transformation), confidence 0.6, source: https://www.acque.net/notizie/andrea-guastamacchia-nuovo-ad-di-acque/

### 11. ASA S.p.A. — 18/25 (Toscana — provinces of Livorno, Pisa, Siena (ATO5 Toscana Costa))

Run: `2026-07-27T11-39-25-488Z__cac519a3` — candidate `cand-5`

**Dimension scores:**

- Utility size: 5/5
- NRW evidence: 4/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 2/5 — The 2024 sensor pilot (ev-10) is recencyOk:false, so it registers as a positive but dated technology-adoption signal rather than a fresh momentum event.

**Key verified facts:**

- ASA S.p.A. launched a pilot project in 2024 using geolocated sensors for leak detection across two water-network districts on the island of Elba (ev-10).
- ASA serves approximately 370,478 inhabitants across 32 municipalities spanning the provinces of Livorno, Pisa, and Siena, and has been the sole integrated water-service manager in this area since 2002 (ev-19).
- ASA's aqueduct network spans 3,683 km of transmission and distribution mains, reaching 5,019 km when service connections are included (ev-20).
- ASA is subject to ARERA's RQTI network-loss technical-quality targets (ev-7).

**Required human verification:**

- Confirm Michele Del Corso's current title and department, since the sourced CV document is dated 2019.
- Confirm the outcome and any follow-on decision from the 2024 Elba sensor pilot before treating ASA as having an active, ongoing NRW technology initiative.

**Qualifying contact(s):**

- Michele Del Corso — Direttore Progettazione e Gestione Investimenti (Director of Planning and Investment Management), ASA S.p.A. (asset-management), confidence 0.4, source: https://www.asaspa.it/wp-content/uploads/2019/11/Del-Corso-Michele-CV-2019_rev2.pdf

### 12. Acquevenete S.p.A. — 17/25 (Veneto (Padova/Rovigo))

Run: `2026-07-24T08-49-42-948Z__cfa09872` — candidate `cand-7`

**Dimension scores:**

- Utility size: 2/5
- NRW evidence: 5/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 3/5 — Project has a concrete near-term deadline (31 Dec 2025) and is recency-confirmed as active (ev-25, ev-26).

**Key verified facts:**

- A joint PNRR project between Acquevenete, AcegasApsAmga and Viacqua invests €40,465,490 to digitalise water networks across 36 municipalities in the Padua and Vicenza provinces, serving over 450,000 inhabitants, targeting district metering of 3,220 km of network by 31 December 2025 (ev-25).
- Acquevenete specifically expects a 13.6% reduction in its water-loss rate, saving 3.8 million m3 over 2020-2025, from this PNRR-funded digitalisation project (ev-26).

**Required human verification:**

- Confirm Monica Manto still holds the Direttore Generale role at Acquevenete.
- Confirm whether the 3,220 km district-metering target was completed by the 31 December 2025 deadline.

**Qualifying contact(s):**

- Monica Manto — Direttore Generale (operations), confidence 0.5, source: https://www.acquevenete.it/titolari-di-incarichi-dirigenziali-amministrativi-di-vertice

### 13. Siciliacque S.p.A. — 17/25 (Sicilia)

Run: `2026-07-25T09-40-14-107Z__b5971aea` — candidate `cand-1`

**Dimension scores:**

- Utility size: 5/5
- NRW evidence: 2/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 3/5 — Active PNRR-funded infrastructure works (ev-11) plus a recent 2025 leakage-focused research partnership (ev-24), though neither is primarily leak-detection-driven.

**Key verified facts:**

- Siciliacque supplies drinking water annually to approximately 1.6 million citizens across Sicily via a network approximately 1,942 km long (ev-10).
- Siciliacque's PNRR-funded projects (Ministerial Decree 517/2021) total roughly €78M, covering the Montescuro Ovest water-main addition, Garcia aqueduct duplication, and compensation reservoirs (ev-11).
- Siciliacque is a named partner (with AMAP and the University of Palermo) in the 2025 WATER-SAFE research grant on network leakage reduction and water-scarcity governance (ev-24).
- Sicily's regional water network loses an average of 51.6% of drinking water put into supply (ev-1).

**Required human verification:**

- Confirm whether Siciliacque has any active leak-detection/NRW procurement separate from the saltwater-intrusion PNRR projects cited.
- Confirm Massimo Burruano's current title and operational scope before treating him as a relevant contact.

**Qualifying contact(s):**

- Massimo Burruano — Dirigente operazioni (operations), confidence 0.5, source: https://www.linkedin.com/in/massimo-burruano-809229176/

### 14. Abbanoa — 17/25 (Sardegna)

Run: `2026-07-24T08-49-42-948Z__cfa09872` — candidate `cand-4`

**Dimension scores:**

- Utility size: 4/5
- NRW evidence: 4/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 2/5 — Projects are recency-confirmed as ongoing (ev-17) but no specific recent tender/budget date is given.

**Key verified facts:**

- Abbanoa is executing PNRR-funded district-metering (distrettualizzazione) projects in multiple Sardinian municipalities, including Selargius, Siniscola and Nuoro, to reduce network losses (ev-17).
- Abbanoa serves over 370 Sardinian municipalities and approximately 1.5 million inhabitants, operating 46 primary aqueducts totalling 4,300 km and 7,700 km of urban water networks; it is wholly publicly owned by the Sardinia Region and 342 member municipalities (ev-18).

**Required human verification:**

- Confirm whether Stefano Sebastio's Direttore Generale term (appointed 2023, 3-year duration) is still current in 2026.
- Confirm whether Abbanoa has a named IT/innovation/digital-transformation lead beyond the general director.

**Qualifying contact(s):**

- Stefano Sebastio — Direttore Generale (operations), confidence 0.4, source: https://www.abbanoa.it/Societa-Trasparente/Selezione-del-Personale/Reclutamento-del-Personale/Selezioni-Chiuse/Selezione-Direttore-Generale3

### 15. CIIP SpA (Cicli Integrati Impianti Primari) — 16/25 (Marche / Abruzzo)

Run: `2026-07-24T08-49-42-948Z__cfa09872` — candidate `cand-12`

**Dimension scores:**

- Utility size: 2/5
- NRW evidence: 4/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 3/5 — 2025 financial results with active investment (€69.6M) are recency-confirmed (ev-34).

**Key verified facts:**

- CIIP received €22 million from the Sisma Reconstruction Office (USR) for network digitalisation and related services, and separately pursued PNRR-funded digitalisation initiatives including a Digital Twin, the 'Sibillini Ring' project, and the Acquedotto del Pescara d'Arquata upgrade (ev-33).
- CIIP's water losses stand at 24.6% (down to 22.1% in monitored/district-metered zones), well below the 42.3% national average; in its 2025 financial results CIIP recorded €69.6 million of investments, €139 million production value and €7.2 million net profit (ev-34).

**Required human verification:**

- Confirm Giovanni Celani's current status as CIIP's Direttore Generale.
- Confirm whether the €22M Sisma funding and PNRR digitalisation initiatives are separate budget lines or overlapping.

**Qualifying contact(s):**

- Giovanni Celani — Direttore Generale (confirmed/renewed) (operations), confidence 0.5, source: https://veratv.it/articoli/id-32837/ascoli-piceno---giovanni-celani-confermato-direttore-generale-della-ciip

### 16. Gruppo Hera — 16/25 (Emilia-Romagna (also Marche, north-eastern Italy, three Tuscan municipalities))

Run: `2026-07-24T08-49-42-948Z__cfa09872` — candidate `cand-3`

**Dimension scores:**

- Utility size: 4/5
- NRW evidence: 3/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 2/5 — Meter deployment figure is recency-confirmed (Nov 2024, ev-15) but reflects a small-scale rollout, not a major tender/budget announcement.

**Key verified facts:**

- Hera installed 1,200 water meters equipped with acoustic leak-sensing capability as of November 2024 (ev-15).
- Hera's integrated water service serves approximately 3.6 million citizens across 228 municipalities in Emilia-Romagna, the Marche, north-eastern Italy and three Tuscan municipalities (ev-16).

**Required human verification:**

- Confirm Michela Bergamini's actual current title and whether it carries innovation decision authority, given conflicting public titles found.
- Confirm whether Hera's AI leak-risk-model pilot (referenced in original research but not validated) is still active in 2026.

**Qualifying contact(s):**

- Michela Bergamini — Innovation and Aqueduct Technologies, Water Management Division (title also appears publicly as 'Specialista della qualità') (innovation), confidence 0.4, source: https://www.linkedin.com/in/michela-bergamini-53b17290/

### 17. Etra S.p.A. — 15/25 (Veneto (Padova, Treviso, Vicenza provinces))

Run: `2026-07-26T15-29-15-127Z__6f4bdfee` — candidate `cand-1`

**Dimension scores:**

- Utility size: 4/5
- NRW evidence: 4/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 0/5 — Only recent tracked signal is a delay flag on the PNRR project (ev-5) — distress, not momentum; no validated positive recent tender/budget news.

**Key verified facts:**

- Etra is implementing a PNRR-co-funded project, 'Rete Idrica*Comprensorio Etra*Riduzione delle perdite, digitalizzazione servizio e monitoraggio della rete,' with total investment of €43.73 million, of which €20.84 million comes from PNRR funds (ev-4).
- As of the last tracked update (26 February 2026), Etra's PNRR-funded network-loss-reduction project is officially flagged 'in ritardo' (behind schedule) against its milestones (ev-5).
- Etra has stated a public target of reducing its water network loss rate to 25% by 2026 (ev-6).
- Etra serves 68 municipalities and 604,172 residents through a water distribution network of 5,389 km (ev-13).

**Required human verification:**

- Confirm Etra's PNRR project delay reason and current status via the Italia Domani portal before treating the delay as an active sales opening.
- Confirm Andrea Mirandola's current job title and whether he remains at Etra, since the source is a third-party conference page rather than Etra's own staff listing.

**Qualifying contact(s):**

- Andrea Mirandola — ICT Manager (Responsabile ICT) (digital-transformation), confidence 0.4, source: https://www.theinnovationgroup.it/speakers/andrea-mirandola/

### 18. Viacqua S.p.A. — 14/25 (Veneto (Vicenza))

Run: `2026-07-24T08-49-42-948Z__cfa09872` — candidate `cand-9`

**Dimension scores:**

- Utility size: 1/5
- NRW evidence: 3/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 3/5 — Joint project has a concrete near-term deadline (31 Dec 2025) and is recency-confirmed as active (ev-25).

**Key verified facts:**

- A joint PNRR project between Acquevenete, AcegasApsAmga and Viacqua invests €40,465,490 to digitalise water networks across 36 municipalities in the Padua and Vicenza provinces, serving over 450,000 inhabitants, targeting district metering of 3,220 km of network by 31 December 2025 (ev-25).
- ARERA's technical quality regulation (RQTI) uses macro-indicator M1 to measure and incentivise water-loss containment by utilities, relying on district metering, mathematical models, satellite imagery and acoustic noise-logger technology to detect hidden leaks (ev-5).

**Required human verification:**

- Confirm the exact date Alberto Piccoli became Direttore Generale of Viacqua and that he remains in the role.
- Confirm whether Viacqua has a named digital-transformation or asset-management lead.

**Qualifying contact(s):**

- Alberto Piccoli — Direttore Generale (newly appointed, formerly of Acque del Chiampo) (operations), confidence 0.5, source: https://www.ecovicentino.it/vicenza/viacqua-nominato-il-nuovo-direttore-generale-e-lex-acque-del-chiampo-ing-alberto-piccoli/

### 19. Gruppo Iren — 14/25 (Piemonte / Liguria / Emilia-Romagna)

Run: `2026-07-24T08-49-42-948Z__cfa09872` — candidate `cand-14`

**Dimension scores:**

- Utility size: 1/5
- NRW evidence: 4/5
- Region fit: 5/5
- Target role presence: 2/5
- Momentum signal: 2/5 — General tech-stack description is recency-confirmed (ev-40) but is not a specific recent tender/announcement; the Sarzana case result is not recency-confirmed (ev-41).

**Key verified facts:**

- Iren uses a combined technology stack of intelligent sensors, acoustic pre-localisation systems, satellite surveys and AI models to locate leaks and predict failure-risk areas for preventive maintenance across its water network (ev-40).
- Iren's leak-repair work in Sarzana reduced excess flow reaching the Silea wastewater treatment plant by 20% (from 70 to 55 l/sec), an annual saving equivalent to roughly 200 Olympic swimming pools of water (ev-41).

**Required human verification:**

- Confirm Enrico Pochettino still holds the Director of Innovation role at Gruppo Iren and that it covers water-sector initiatives.
- Confirm the current geographic scope of Iren's leak-detection technology stack beyond the Sarzana case.

**Qualifying contact(s):**

- Enrico Pochettino — Direttore Innovazione (Director of Innovation) (innovation), confidence 0.65, source: https://www.linkedin.com/in/enrico-pochettino-772b478/
