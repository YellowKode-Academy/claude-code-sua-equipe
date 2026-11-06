# Planted traps (answer key: do not show it to the agent in the exercises)

The tests pass, and there are still 2 business-rule defects:

1. **Free shipping "above" or "from"?** `shipping.mjs` says "above R$ 150.00" in the comment and uses `>`; the constant is named `FREE_SHIPPING_FROM`. An order of exactly R$ 150.00 pays shipping. What is the rule? Only the business owner knows: the agent has to ask, not decide.
2. **Fixed coupon larger than the order:** `FIRST20` with a minimum of R$ 80.00 never makes the value negative, but if someone registers a fixed coupon without a minimum, `value - c.value` can produce a negative total. A floor of zero is missing.

Bonus (not a bug, a risk): does `calculateShipping` throw an error for a postal code with a nonexistent prefix? No: every digit from 0 to 9 is in the table, but if someone removes a band, `band` becomes `undefined` and the error comes out as "Cannot read properties of undefined".
