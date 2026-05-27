---
op_id: OP-000001
default_title: Demo Assembly
estimated_minutes: 10
schema_version: 1
---

# Demo Assembly (OP-000001)

This is a demo operation template authored as Markdown (Obsidian-friendly).

## Step 1 — Identify unit

```orche-input
{"id":"serial_number","type":"text","label":"Serial number","required":true}
```

```orche-input
{"id":"operator_name","type":"text","label":"Operator name","required":true}
```

## Step 2 — Visual inspection

```orche-input
{"id":"no_visible_damage","type":"checkbox","label":"No visible damage","required":true}
```

```orche-input
{"id":"notes","type":"textarea","label":"Notes (optional)"}
```

## Step 3 — Complete

When ready, complete this operation in the runner.

