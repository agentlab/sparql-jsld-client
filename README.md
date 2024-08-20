# SPARQL JSON Schema Linked Data Client

It is an intelligent SPARQL Client with SHACL Shapes support. You could use JSON objects and JSON Schemas to query SPARQL Endpoint, semi-similar to GraphQL style.

Some core features requires:

- RDF4J REST API in addition to standard SPARQL 1.1 Query and SPARQL 1.1 Update.
- SHACL Shapes for rdfs classes in server RDF repository.

## Features

- Retrieves lazily SPARQL Prefixes (namespaces) from server (requires RDF4J REST API)
- Retrieves lazily SHACL Shapes from server, converts it into JSON Schemas and UI Schemas and caches them
- Uses JS objects and JSON Schemas (converted from shapes) to generate SPARQL Select Queries and SPARQL Update queries
- Converts SPARQL Results into JS objects for consumption in apps
- Have API server RDF repository creation and deletion (requires RDF4J REST API)
- Supports bulk-load data from local files to server RDF repository (requires RDF4J REST API)

## Usage

### RDF4J Repository Creation and Data Uploading (low level, without MST)

```typescript
import { SparqlClientImpl, uploadFiles } from '@agentlab/sparql-jsld-client';

const client = new SparqlClientImpl('http://localhost:8181/rdf4j-server');
await client.createRepositoryAndSetCurrent({ "Repository ID": "reqs2" }, 'native-rdfs-dt);

const files = [
  {
    file: 'vocabs/rm.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/rdf#>',
  },
  {
    file: 'shapes/shacl/rm/rm-shapes.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/rdf#>',
  },
  {
    file: 'data/cpgu/sample-collection.ttl',
    baseURI: '<http://cpgu.kbpm.ru/ns/rm/reqs#>',
  },
];
await uploadFiles(client, files, './test/data/');
```

### RDF4J Client SPARQL Queries (low level, without MST)

```typescript
const results = await client.sparqlSelect('SELECT * WHERE ?s ?p ?o');
```

### Reactive Collections (with MST and SPARQL Queries Generation)

```typescript
import { MstRepository, rootModelInitialState } from '@agentlab/sparql-jsld-client';

const repository = MstRepository.create(rootModelInitialState, { client }); // client -- the same SparqlClientImpl instance
repository.setId('reqs2');

//select all objects by schema (by rdfs class)
const coll = repository.addColl('rm:ArtifactShape');
await coll.loadColl();
const dataJs: JsObject[] = coll.dataJs;
console.log(dataJs);

//select all objects by schema and conditions and process it reactively
const coll2 = repository.addColl({
  entConstrs: [
    {
      schema: 'rm:ArtifactShape',
      conditions: {
        identifier: 30000,
      },
    },
  ],
});
when(
  () => coll2 !== undefined && coll2.data.length > 0,
  () => {
    const dataJs2: JsObject[] = coll2.dataJs;
    console.log(dataJs2);
    repository.removeColl(coll2); // cleanup to save some memory
  },
);
```

## Local Development

Use pnpm.

To to override the default settings from .env.test create file .env.test.local (git-ignored).

For single test run

```bash
pnpm test -- -t "should select namespaces"
```

For single testsuite run

```bash
pnpm test SparqlClient.spec.ts
```

## License

- [GPL 3.0](LICENSE)
