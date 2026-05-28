---
op_id: OP-000001
operation_type: instruction
default_title: Demo Assembly
estimated_minutes: 15
schema_version: 1
---

# Demo Assembly

```required_tools
- Torque wrench (calibrated)
- description: Digital caliper
  part_number: CAL-001
  equipment_id: EQ-42
```

Use this operation to verify unit identity, torque critical fasteners, and final visual inspection.

## Step 1 — Identify unit

Record the unit serial number for this work order. Operator name is set on the home screen.

```orche-input
{"id":"serial_number","type":"text","label":"Serial number","required":true}
```

## Step 2 — Torque sequence

> [!info]
> Reference diagrams live in this operation’s `.assets` folder. They sync with the instruction library in Git.

> [!tip] Torque wrench
> Verify the calibration sticker is in date before applying torque.

> [!success]
> Fastener prep complete when all three bores are deburred and clean.

> [!example] Sequence
> Torque order is **A → B → C** as shown in the diagram below.

Example UI screenshot:

![[OP-000001 - Demo Assembly.assets/image.png|NOVA UI reference]]

> [!question]
> Unsure which fastener size? Check the traveler or unit label before selecting below.

> [!danger] Stop work
> If torque exceeds spec by more than 10%, halt and notify engineering.

```orche-input
{"id":"fastener_size","type":"select","label":"Fastener size","required":true,"options":["M4","M6","M8"]}
```

```orche-input
{"id":"torque_nm","type":"number","label":"Torque applied (N·m)","required":true}
```

```orche-input
{"id":"torque_tool_id","type":"text","label":"Torque tool asset ID","required":true}
```

```orche-input
{"id":"sequence_confirmed","type":"checkbox","label":"Torque sequence A → B → C completed","required":true}
```

## Step 3 — Visual inspection

> [!note]
> Inspect all faces under adequate lighting.

```orche-input
{"id":"no_visible_damage","type":"checkbox","label":"No visible damage","required":true}
```

```orche-input
{"id":"defect_severity","type":"select","label":"Defect severity (if any)","options":["None","Minor — use as-is","Major — hold unit"]}
```

```orche-input
{"id":"notes","type":"textarea","label":"Inspection notes"}
```

## Step 4 — Sign off


```orche-input
{"id":"label_verified","type":"checkbox","label":"Unit label matches serial number","required":true}
```

When all steps are complete, return to the operations list.
