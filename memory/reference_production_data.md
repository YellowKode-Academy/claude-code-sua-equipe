---
name: reference_production_data
description: Production data is read through a script that returns counts and masked fields, never a raw row
metadata:
  type: reference
---

The production database is read only through a read script that runs on the server and returns aggregate numbers (counts, sums) and masked fields.

**Why:** raw data fills the context and can expose customers' personal data; the aggregate answer fits in a few lines.

**How to apply:** never `SELECT *` from the agent's terminal. Write the query in a `.sql` file, run it through the script and read only the result.
