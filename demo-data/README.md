# Synthetic Intelligence Datasets

All records in this directory are synthetic and created only for demonstration and testing purposes. There is no real PII (Personally Identifiable Information) or sensitive real-world investigative data included.

## Folder Directory

- `cdr/`: Contains synthetic Call Detail Records (CSV format).
  Columns required: `source_id`, `target_id`, `timestamp`, `duration`, `metadata`.
- `transactions/`: Contains synthetic financial ledger details (CSV format).
  Columns required: `sender_id`, `receiver_id`, `amount`, `timestamp`, `transaction_id`.
- `locations/`: Contains location markers for entity routing (CSV format).
  Columns required: `entity_id`, `location`, `timestamp`.
- `fir/`: Unstructured police incident reports (TXT/PDF formats). No specific columns required.
