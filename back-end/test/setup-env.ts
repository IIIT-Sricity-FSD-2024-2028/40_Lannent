// The suite sends a few thousand requests from one address in well under a
// minute, which the production-style per-IP limit (2000/min) would start
// refusing part-way through, depending on how fast the machine is. Read by
// AppModule when it is imported, so it has to be set before any test loads.
process.env.RATE_LIMIT_PER_MIN = process.env.RATE_LIMIT_PER_MIN || '100000';
