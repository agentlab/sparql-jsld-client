
# Testcases Structure

This document describes testcases structure: from simple unit tests up to high level integration tests touches many components.

Suitable for quick test-based diagnostics in case you have many errors from several library levels.

The list blow is sorted from simple unit tests to more and more complex integration tests (i.e. complexity increases):
 - SparqlGen.spec.ts and SparqlClient.spec.ts
 - ArtifactShapeSchema.spec.ts
 - Artifact.spec.ts
 - SimpleRetrieve.spec.ts

In case of errors we recommend to check and fix errors in this order.
