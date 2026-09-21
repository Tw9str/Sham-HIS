# Enterprise implementation boundary

This release implements the first local hospital workspace. It is meant to validate UX, workflows, and domain boundaries using fictional data. “Hospital system” spans specialized clinical systems and jurisdiction-specific obligations; the items below require additional implementation and acceptance criteria.

## Current boundaries

| Area           | Implemented                                                                                 | Not yet implemented                                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity       | Hashed passwords, seven seeded roles, sessions, server permissions                          | Account provisioning UI, SSO, MFA, fine-grained privileges, break-glass access, care-team/ward scoping                                                                                   |
| Patient index  | Bilingual demographics, MRNs, editable chart                                                | Duplicate detection / merges, national IDs, guardians, consent, patient portal, document upload                                                                                          |
| Outpatient     | Appointments, queue states, encounters, note signing                                        | Recurrence, durations/overlap scheduling, reminders, referrals, coded terminology services                                                                                               |
| Inpatient      | Fixed 24-bed board, occupied-bed checks, admission/discharge state, transfer by editing bed | Bed/ward configuration, transfer history views, cleaning-state linkage, discharge medication reconciliation                                                                              |
| Emergency      | Case records, manually selected acuity, status tracking                                     | Validated triage algorithms, real-time monitors, resuscitation charts, automatic inpatient admission                                                                                     |
| Nursing        | Care tasks, observations, completion notes                                                  | eMAR, barcode medication administration, dose scheduling, fluid balance, structured observations                                                                                         |
| Lab            | Requests, specimen type, manual results, verification                                       | LIS / instrument integration, specimen barcodes, reference-range engine, critical-result acknowledgments, lab certification workflows                                                    |
| Radiology      | Modality, requests, narrative reports, verification                                         | PACS, DICOM viewer, RIS scheduling, image acquisition                                                                                                                                    |
| Pharmacy       | Prescriptions, stock references, transactional dispensing                                   | Drug dictionary, interaction checks, automated allergy checks, reconciliation, controlled-drug registers, dose calculations, returns                                                     |
| Surgery        | Cases, theatres, preparation notes, completion notes                                        | Structured WHO safety checklist, anesthesia chart, OR conflict/duration scheduling, implant traceability                                                                                 |
| Finance        | Invoice records, statuses, local payment recording, CSV                                     | Itemized pricing/taxes, partial payments, refunds, ledger accounting, reconciliation, payer contracts, online payments, jurisdiction-specific billing                                    |
| Insurance      | Manual claims, policy references, approval states                                           | Electronic submission, clearinghouse, adjudication, preauthorization interfaces                                                                                                          |
| Supply chain   | Stock counts, lots, expiry, thresholds; purchase request records                            | Inventory ledger/stocktake, automated procurement receiving, supplier payments, cross-location movements, stock adjustments with approval                                                |
| Operations     | Housekeeping, incident, maintenance, and roster records                                     | HR/payroll, attendance, credentials, maintenance schedules, infection surveillance, catering, ambulance, blood bank, mortuary                                                            |
| Reporting      | Stored-data dashboard, CSV, printable views, audit                                          | Scheduled reports, warehouse, regulatory extracts, business intelligence                                                                                                                 |
| Infrastructure | SQLite / hosted PostgreSQL, transactional writes, audit history                             | Existing-data migration, multi-hospital tenancy, deployment load testing, failover, backup/restore UI, encryption/key management, disaster recovery, observability, migrations framework |

## Important semantics

- The primary lifecycle buttons advance one step, with confirmation. Final states cannot be edited. Clinical amendments/corrections need a separate addendum workflow before real care use.
- Admissions do not automatically create housekeeping or billing records. Appointment status changes do not automatically create encounters; a clinician creates an encounter from the patient chart.
- Patient demographic edits do not yet have optimistic version checks. Work records do. Collaborative editing and record-level access require further design.
- The quantity in a stock record may currently be edited by an authorized user. The audit log captures the action but not a complete before/after inventory movement ledger. Dispensing is the only automatic stock deduction.
- Pharmacy stock and medication are manually matched. Automatic allergy, contraindication, and dose decision support does not exist.
- `paid`, `submitted`, and `received` indicate manual tracking states. They do not contact a bank, insurer, supplier, or warehouse service.
- Priority notifications are a view of pending records, not delivered clinical alerts.
- The chart shows what each role can read. Basic patient demographics and the staff directory are shared with all signed-in roles; care-team or ward-based scoping is not implemented.
- Local SQLite requires a persistent filesystem. Vercel deployments use hosted PostgreSQL; see deployment.md. Writes currently serialize per database; high-volume and multi-region performance remain unverified.
- Database contents and local backups are not encrypted by the application. Demo credentials, sample patient data, and non-production security settings must be removed for a production implementation.
- Public demo mode intentionally exposes its fictional-workspace login. Local scripts bind localhost.

## Suggested implementation sequence

1. Validate workflows with reception, physicians, nurses, pharmacy, finance, and hospital leadership. Define target country, number of sites, currencies, payer rules, and real integrations.
2. Design the production domain model and PostgreSQL migrations; split generic workflow documents into validated clinical and financial aggregates, with versioned clinical notes and append-only movement journals.
3. Implement account administration, SSO/MFA, least-privilege policies, audit retention, encrypted backup/restore and disaster-recovery drills. Commission a security review and clinical hazard assessment.
4. Deliver a validated outpatient vertical slice, then inpatient/nursing, pharmacy/lab, and financial workflows. Add device/partner interfaces with conformance testing using the required HL7/FHIR/DICOM versions.
5. Complete accessibility, load, recovery, role, data migration, and clinical acceptance testing before a controlled hospital pilot.
