# SPARQL JSON Schema Linked Data Client

It is an intelligent SPARQL Client with SHACL Shapes support. You could use JSON objects and JSON Schemas to query SPARQL Endpoint, semi-similar to GraphQL style.

Some core features requires:
- RDF4J REST API in addition to standard SPARQL 1.1 Query and SPARQL 1.1 Update.
- SHACL Shapes for rdfs classes in server RDF repository.

## Features
- Retrieves lazily SPARQL Prefixes (namespaces) from server (requires RDF4J REST API)
- Retrieves lazily SHACL Shapes from server, converts it into JSON Schems and UI Schems and caches them
- Uses JS objects and JSON Schemas (converted from shapes) to generate SPARQL Select Queries and SPARQL Update queries
- Converts SPARQL Results into JS objects for consumption in apps
- Have API server RDF repository creation and deletion  (requires RDF4J REST API)
- Supports bulk-load data from local files to server RDF repository (requires RDF4J REST API)

## Usage

```typescript
const provider = new ObjectProviderImpl();
provider.setUser('users:guest');
const client = provider.getClient();
client.setServerUrl('<url to ref4j rest api server>');
await client.createRepository(rmRepositoryID);
client.setRepositoryId(rmRepositoryID);
await client.uploadFiles(files, rootFolder);

//select all objects by schema (by rdfs class)
const artifacts = await provider.selectObjects('rm:Artifact');

//select all objects by schema (by rdfs class) with explisit schema object
const artifactSchema = await provider.getSchemaByUri('rm:Artifact');
const artifacts2 = await provider.selectObjects(artifactSchema);

//select all objects by schema and conditions
const artifact30000 = await provider.selectObjectsWithTypeInfo(artifactSchema, { identifier: 30000 });
const artifactsFromFolder = await provider.selectObjects(artifactSchema, { assetFolder: 'folders:folder1_1' });
```

## Local Development

This project was bootstrapped with [TSDX](https://github.com/jaredpalmer/tsdx).

For single test run
```bash
npm test -- -t "should select namespaces"
```

For single testsuite run
```bash
npm test SparqlClient.spec.ts
```

## License

- [Eclipse Public License 2.0](LICENSE)
- [一 (Secondary) GNU General Public License, version 2 with the GNU Classpath Exception](LICENSE)
