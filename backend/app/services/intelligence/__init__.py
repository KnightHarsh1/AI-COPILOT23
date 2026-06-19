"""Business Command Center intelligence engines.

Three deterministic analytics engines (collections, product, compliance)
plus a compliance-calendar generator. Each engine computes from existing
canonical tables, returns a graceful "not enough data" result rather than
raising when its inputs are missing, and never writes to canonical tables.
"""
