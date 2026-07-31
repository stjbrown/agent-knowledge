---
type: customer
title: Customers
description: The people and organizations that place orders.
tags: [sales]
generated: { by: process:agent-knowledge-example, at: 2026-01-01T00:00:00Z }
sources:
  - id: sample-sales
    resource: /references/sample_sales_data.md
    title: Synthetic sample sales data
---

Customers are the accounts that place [orders](orders.md). Each customer has a stable `customer_id`
used as the join key from the orders concept.[^sample-sales]

# Examples

- `cust_001` — Acme Corp, enterprise account.
- `cust_002` — Jane Diaz, individual.

[^sample-sales]: Synthetic sample sales data
