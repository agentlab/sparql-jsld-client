
# Testcases Structure

This document describes testcases structure: from simple unit tests up to high level integration tests touches many components.

Suitable for quick test-based diagnostics in case you have many errors from several library levels.

The list blow is sorted from simple unit tests to more and more complex integration tests (i.e. complexity increases):
 - SparqlGen.spec.ts (SPARQL Genration without client-server I/O)
 - SparqlClientUpload.spec.ts (upload)
 - SparqlClient.spec.ts (namespaces and basic SPARQL Select with RDFS and DT reasoners)
 - ArtifactShapeSchema.spec.ts (initial shapes, server shapes (simple parentless and with inheritance) )
 - SimpleRetrieve.spec.ts (upload all example files and all kind of selects with different conditions)
 - Artifact.spec.ts (deletion and creation)
 - ArtifactsInModule.spec.ts


In case of errors we recommend to check and fix errors in this order.
