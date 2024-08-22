
# Testcases Structure

This document describes test cases structure: from simple unit tests up to high level integration tests touches many components.

Suitable for quick test-based diagnostics in case you have many errors from several library levels.

The list blow is sorted from simple unit tests to more and more complex integration tests (i.e. complexity increases):

## MST Model CRUD Operations and Rx (without SPARQL Generation and client-server I/O)
```bash
pnpm test MstModel.spec.ts
```

## RDF4J Client data uploading & low level textual SPARQL queries (without SPARQL Generation)
SparqlClientUpload.spec.ts -- REST rdf file upload
```bash
pnpm test SparqlClientUpload.spec.ts
```
SparqlClient.spec.ts -- namespaces and basic SPARQL Select with RDFS and DT reasoners
```bash
pnpm test SparqlClient.spec.ts
```

## SPARQL Generation (without MST and client-server I/O)
SparqlGen.spec.ts -- without: MST, client-server I/O
```bash
pnpm test SparqlGen.spec.ts
```

## SPARQL Generation with MST and client-server I/O
ArtifactShapeSchema.spec.ts -- initial shapes, server shapes (simple parentless and with inheritance)
```bash
pnpm test ArtifactShapeSchema.spec.ts
```
SimpleRetrieve.spec.ts -- upload all example files and all kind of selects with different conditions
```bash
pnpm test SimpleRetrieve.spec.ts
```
Artifact.spec.ts -- Entity deletion and creation
```bash
pnpm test Artifact.spec.ts
```
ArtifactsInModule.spec.ts
```bash
pnpm test ArtifactsInModule.spec.ts
```

In case of errors we recommend to check and fix errors in this order.
