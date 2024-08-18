
# Testcases Structure

This document describes test cases structure: from simple unit tests up to high level integration tests touches many components.

Suitable for quick test-based diagnostics in case you have many errors from several library levels.

The list blow is sorted from simple unit tests to more and more complex integration tests (i.e. complexity increases):

## Without SPARQL Generation
SparqlClientUpload.spec.ts -- REST rdf file upload
```bash
yarn test SparqlClientUpload.spec.ts
```
SparqlClient.spec.ts -- namespaces and basic SPARQL Select with RDFS and DT reasoners
```bash
yarn test SparqlClient.spec.ts
```

## With SPARQL Generation
SparqlGen.spec.ts -- without: mobx, client-server I/O
```bash
yarn test SparqlGen.spec.ts
```
ArtifactShapeSchema.spec.ts -- initial shapes, server shapes (simple parentless and with inheritance)
```bash
yarn test ArtifactShapeSchema.spec.ts
```
SimpleRetrieve.spec.ts -- upload all example files and all kind of selects with different conditions
```bash
yarn test SimpleRetrieve.spec.ts
```
Artifact.spec.ts -- Entity deletion and creation
```bash
yarn test Artifact.spec.ts
```
ArtifactsInModule.spec.ts
```bash
yarn test ArtifactsInModule.spec.ts
```

In case of errors we recommend to check and fix errors in this order.
