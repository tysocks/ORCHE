---
op_id: OP-000002
operation_type: instruction
default_title: Demo Test
estimated_minutes: 8
schema_version: 1
---

# Demo Test (OP-000002)

Functional verification after assembly.

## Step 1 — Power and boot

```orche-input
{"id":"power_on_ok","type":"checkbox","label":"Unit powers on without fault","required":true}
```

```orche-input
{"id":"boot_time_s","type":"number","label":"Boot time (seconds)","required":true}
```

```orche-input
{"id":"firmware_version","type":"text","label":"Firmware version readout","required":true}
```

## Step 2 — Electrical checks

Measure at the test points documented on the unit label.

| Test point | Expected |
| ---------- | -------- |
| TP1        | 3.3 V ±5% |
| TP2        | 5.0 V ±5% |

```orche-input
{"id":"tp1_voltage","type":"number","label":"TP1 voltage (V)","required":true}
```

```orche-input
{"id":"tp2_voltage","type":"number","label":"TP2 voltage (V)","required":true}
```

```orche-input
{"id":"within_spec","type":"select","label":"Within specification?","required":true,"options":["Yes — pass","No — fail","Marginal — review"]}
```

## Step 3 — Sign off

```orche-input
{"id":"test_notes","type":"textarea","label":"Test notes"}
```

```orche-input
{"id":"test_passed","type":"checkbox","label":"All checks passed","required":true}
```
