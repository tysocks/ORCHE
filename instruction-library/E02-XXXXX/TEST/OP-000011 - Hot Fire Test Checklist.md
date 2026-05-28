---
op_id: OP-000011
operation_type: checklist
default_title: Hot Fire Test Checklist
estimated_minutes: 45
schema_version: 1
required_tools:
  - Remote engine shutdown
  - High-speed camera trigger
---

# Hot Fire Test Checklist (OP-000011)

## 1.0 Final GO / NO-GO

## 1.1 GO / NO-GO decision (y/n)

```orche-input
{"id":"go_no_go","type":"select","label":"","required":true,"options":["GO","NO-GO","HOLD"]}
```

## 1.2 Test conductor

```orche-input
{"id":"conductor","type":"text","label":"Name","required":true}
```

## 2.0 Ignition sequence

## 2.1 Ignition armed (y/n)

```orche-input
{"id":"ignition_armed","type":"checkbox","label":"","required":true}
```

## 2.2 Fire command issued (y/n)

```orche-input
{"id":"fire_command","type":"checkbox","label":"","required":true}
```

## 2.3 Time to ignition (ms)

```orche-input
{"id":"ignition_time_ms","type":"number","label":"ms","required":true}
```

## 3.0 Steady-state monitor

## 3.1 Steady-state within limits (y/n)

```orche-input
{"id":"steady_ok","type":"checkbox","label":"","required":true}
```

## 3.2 Peak chamber pressure (psi)

```orche-input
{"id":"peak_chamber_psi","type":"number","label":"psi","required":true}
```

## 4.0 Shutdown and safing

## 4.1 Clean shutdown (y/n)

```orche-input
{"id":"shutdown_ok","type":"checkbox","label":"","required":true}
```

## 4.2 Post-fire safing complete (y/n)

```orche-input
{"id":"safing_complete","type":"checkbox","label":"","required":true}
```

## 4.3 Test notes / anomalies

```orche-input
{"id":"test_notes","type":"textarea","label":"Notes","required":false}
```
