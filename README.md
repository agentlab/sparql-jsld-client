# SPARQL JSON Schema Linked Data Client

It is an intelligent SPARQL Client with object-oriented reactive blackboard. You could use JSON/JS objects and JSON Schemas to query SPARQL Endpoint, semi-similar to GraphQL.

You manipulate JS objects programmatically, client generates SPARQL Queries and interacts with SPARQL Endpoint. The Client retrieves SHACL Shapes to infer available class properties and allowed value types.

![SPARQL JSLD Client Architecture Overview](/docs/ArchitectureOverview.png)

## Features

- Retrieves SPARQL Prefixes (namespaces) from a server (requires RDF4J REST API)
- Retrieves RDFS classes and SHACL Shapes from a server, converts it into JSON Schemas and caches them
- Retrieves Linked Data metadata (class contexts, names and descriptions for class and property shapes) and caches them inside JSON Schemas
- Uses object-oriented "entity query" descriptions (Collection Constraints) and JSON Schemas with additional Linked Data metadata (converted from shapes) to generate SPARQL Select and SPARQL Update queries
- Converts SPARQL Results into JS objects and puts it into a blackboard
- Handles state changes and notifies all registered handler functions about specific property change
- Have an API for RDF repository creation and deletion on a server (requires RDF4J REST API)
- Supports bulk-load data from local files to RDF repository on a server (requires RDF4J REST API)
- Supports lazy loading and "load more" incremental page-based fetching
- Could be extended with specialized collection processors via `registerMstCollSchema()`
- Composable MST Model -- MstRepository tree could be inserted into a parent MST tree in another MST project

## Prerequisites

Client requires:

- RDF4J triplestore with RDF4J REST API extensions in addition to standard SPARQL 1.1 Query and SPARQL 1.1 Update.
- RDF triplestore should have SHACL Shapes for rdfs classes and properties (for base classes as well as subclasses used by this client).

## Usage

### RDF4J Repository Creation and Data Uploading (low level client API, without MST)

```typescript
import { SparqlClientImpl, uploadFiles } from '@agentlab/sparql-jsld-client';

const client = new SparqlClientImpl('http://localhost:8181/rdf4j-server');
await client.createRepositoryAndSetCurrent({ "Repository ID": "reqs2" }, 'native-rdfs-dt);

const files = [
  {
    file: 'vocabs/rm.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/rdf#>',
  },
  {
    file: 'shapes/rm/rm-shapes.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/rdf#>',
  },
  {
    file: 'data/sample-collection.ttl',
    baseURI: '<https://agentlab.eu/ns/rm/reqs#>',
  },
];
await uploadFiles(client, files, './test-data/');
```

### RDF4J Client SPARQL Queries (low level client API, without MST)

```typescript
const results = await client.sparqlSelect('SELECT * WHERE ?s ?p ?o');
```

### Reactive Collections (high-level client API with MST and SPARQL Queries Generation)

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

### More complex entity query example

For example, an entity query to retrieve class shapes and property shapes:

```typescript
{
  entConstrs: [
    {
      schema: 'sh:NodeShapeShape',
      conditions: {
        targetClass: 'rm:Artifact',
        property: '?eIri1',
      },
    },
    {
      schema: 'sh:PropertyShapeShape',
    },
  ],
  orderBy: [{ expression: 'order1', descending: false }],
},
```

From this definition the SparqlGen will produce SPARQL Query like this:

```SPARQL
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX rm: <https://agentlab.eu/ns/rm/rdf#>
CONSTRUCT {
  ?eIri0 rdf:type sh:NodeShape.
  ?eIri0 sh:property ?eIri1.
  ?eIri0 sh:targetClass rm:Artifact.
  ?eIri0 dcterms:title ?title0.
  ?eIri0 dcterms:description ?description0.
  ?eIri0 rm:inCreationMenu ?inCreationMenu0.
  ?eIri0 rm:defaultIndividNs ?defaultIndividNs0.
  ?eIri0 rm:defaultFormat ?defaultFormat0.
  ?eIri0 rm:iconReference ?iconReference0.

  ?eIri1 rdf:type sh:PropertyShape.
  ?eIri1 sh:name ?name1.
  ?eIri1 sh:description ?description1.
  ?eIri1 sh:path ?path1.
  ?eIri1 sh:order ?order1.
  ?eIri1 sh:datatype ?datatype1.
  ?eIri1 sh:minCount ?minCount1.
  ?eIri1 sh:maxCount ?maxCount1.
  ?eIri1 sh:class ?class1.
  ?eIri1 sh:nodeKind ?nodeKind1.
  ?eIri1 rm:shapeModifiability ?shapeModifiability1.
  ?eIri1 rm:valueModifiability ?valueModifiability1.
}
WHERE {
  ?eIri0 rdf:type sh:NodeShape;
    sh:targetClass rm:Artifact.
  OPTIONAL { ?eIri0 dcterms:title ?title0. }
  OPTIONAL { ?eIri0 dcterms:description ?description0. }
  OPTIONAL { ?eIri0 rm:inCreationMenu ?inCreationMenu0. }
  OPTIONAL { ?eIri0 rm:defaultIndividNs ?defaultIndividNs0. }
  OPTIONAL { ?eIri0 rm:defaultFormat ?defaultFormat0. }
  OPTIONAL { ?eIri0 rm:iconReference ?iconReference0. }

  OPTIONAL {
    ?eIri1 rdf:type sh:PropertyShape.
    ?eIri0 sh:property ?eIri1.
    ?eIri1 sh:path ?path1.
    OPTIONAL { ?eIri1 sh:name ?name1. }
    OPTIONAL { ?eIri1 sh:description ?description1. }
    OPTIONAL { ?eIri1 sh:order ?order1. }
    OPTIONAL { ?eIri1 sh:datatype ?datatype1. }
    OPTIONAL { ?eIri1 sh:minCount ?minCount1. }
    OPTIONAL { ?eIri1 sh:maxCount ?maxCount1. }
    OPTIONAL { ?eIri1 sh:class ?class1. }
    OPTIONAL { ?eIri1 sh:nodeKind ?nodeKind1. }
    OPTIONAL { ?eIri1 rm:shapeModifiability ?shapeModifiability1. }
    OPTIONAL { ?eIri1 rm:valueModifiability ?valueModifiability1. }
  }
}
ORDER BY (?order1)
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
