---
name: project_shipping_rule
description: Free shipping is for orders ABOVE R$ 150.00 after the discount (owner's decision, Oct 30, 2026)
metadata:
  type: project
---

An order of exactly R$ 150.00 pays shipping. Free shipping applies only above that, and the value considered is the order's value after the coupon.

**Why:** the doubt came up in a review: the comment said "above" and the constant was named "from". The owner chose "above".

**How to apply:** do not "fix" the `>` to `>=`. If the rule changes, the owner decides, and this note is updated with the date.
