---
type: order
title: Orders
description: Purchases placed by customers.
tags: [sales, revenue]
generated: { by: process:agent-knowledge-example, at: 2026-01-01T00:00:00Z }
sources:
  - id: sample-sales
    resource: /references/sample_sales_data.md
    title: Synthetic sample sales data
---

Orders are purchases placed by [customers](customers.md), joined on `customer_id`. Revenue is the
sum of order totals across successful orders.[^sample-sales]

# Schema

| Field | Type | Description |
|---|---|---|
| `order_id` | string | Unique order identifier. |
| `customer_id` | string | The [customer](customers.md) who placed the order. |
| `total_usd` | number | Order total in US dollars. |
| `status` | string | `success`, `pending`, or `refunded`. |

[^sample-sales]: Synthetic sample sales data
