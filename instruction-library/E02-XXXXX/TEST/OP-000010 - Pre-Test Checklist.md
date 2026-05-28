---
op_id: OP-000010
operation_type: checklist
default_title: Pre-Test Checklist
estimated_minutes: 20
schema_version: 1
required_tools:
  - Safety interlock keys (2)
  - Leak detection fluid
  - Calibrated torque wrench
---

# Pre-Test Checklist (OP-000010)

## 1.0 Test cell access

## 1.1 Test cell clear of personnel (y/n)

```orche-input
{"id":"cell_clear","type":"checkbox","label":"","required":true}
```

## 1.2 Test cell armed and posted (y/n)

```orche-input
{"id":"cell_armed","type":"checkbox","label":"","required":true}
```

## 2.0 Grounding and ESD

## 2.1 Grounding verified

```orche-input
{"id":"ground_ok","type":"checkbox","label":"","required":true,"options":["Pass","Fail"]}
```

## 3.0 Propellant panel isolation

## 3.1 Panel isolated (y/n)

```orche-input
{"id":"panel_isolated","type":"checkbox","label":"","required":true}
```

## 3.2 Panel residual pressure (psi)

```orche-input
{"id":"panel_pressure_psi","type":"number","label":"psi","required":true}
```

## 4.0 Data acquisition

## 4.1 DAQ armed and time-synced (y/n)

```orche-input
{"id":"daq_armed","type":"checkbox","label":"","required":true}
```

## 4.2 DAQ operator initials

```orche-input
{"id":"daq_operator","type":"text","label":"Initials","required":true}
```

## 5.0 Abort authority

## 5.1 Abort comm check complete (y/n)

```orche-input
{"id":"abort_comms","type":"checkbox","label":"","required":true}
```
