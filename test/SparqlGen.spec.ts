import { Parser } from 'sparqljs';
import { variable } from '@rdfjs/data-model';
import { SparqlGen } from '../src/SparqlGen';
import { JSONSchema6forRdf } from '../src/ObjectProvider';
import { ObjectProviderImpl } from '../src/ObjectProviderImpl';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../src/schema/ArtifactShapeSchema';
import { artifactSchema } from './schema/TestSchemas';
import { queryPrefixes } from './configTests';

let provider: ObjectProviderImpl;
let sparqlGen: SparqlGen;
const parser = new Parser();

beforeEach(() => {
  provider = new ObjectProviderImpl();
  sparqlGen = new SparqlGen(queryPrefixes);
});

describe('ObjectProvider/addSchema', () => {
  it(`provider should return schema by uri`, async () => {
    provider.addSchema(ArtifactShapeSchema);
    provider.addSchema(PropertyShapeSchema);

    const getArtifactShapeSchema = await provider.getSchemaByUri(ArtifactShapeSchema['@id']);
    //console.log('getArtifactShapeSchema', getArtifactShapeSchema);
    expect(getArtifactShapeSchema).toMatchObject(ArtifactShapeSchema);

    const getPropertyShapeSchema = await provider.getSchemaByUri(PropertyShapeSchema['@id']);
    //console.log('getPropertyShapeSchema', getPropertyShapeSchema);
    expect(getPropertyShapeSchema).toMatchObject(PropertyShapeSchema);
  });
});

const SchemaWithoutArrayProperties: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'http://example.com/product.schema.json',
  '@id': 'sh:PropertyShape',
  '@type': 'sh:PropertyShape',
  type: 'object',
  '@context': {
    path: 'sh:path', // object with unknown type should resolve in Resource URI
    name: 'sh:name',
    minCount: 'sh:minCount',
  },
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
    },
    path: {
      title: 'Путь',
      type: 'object',
    },
    name: {
      title: 'Название',
      type: 'string',
    },
    minCount: {
      title: 'Минимальный предел',
      type: 'integer',
    },
  },
  required: ['@id', 'path'],
};

describe('SparqlGen/SchemaWithoutArrayProperties', () => {
  it('select should generate without conditions', async () => {
    provider.addSchema(SchemaWithoutArrayProperties);
    sparqlGen.addSparqlShape(SchemaWithoutArrayProperties).selectObjectsQuery();
    const genQueryStr = sparqlGen.stringify();
    //console.log(genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh: <http://www.w3.org/ns/shacl#>
      SELECT ?eIri0 ?path0 ?name0 ?minCount0 WHERE {
        ?eIri0 rdf:type sh:PropertyShape;
          sh:path ?path0.
        OPTIONAL { ?eIri0 sh:name ?name0. }
        OPTIONAL { ?eIri0 sh:minCount ?minCount0. }
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
  it('select should generate with conditions', async () => {
    provider.addSchema(SchemaWithoutArrayProperties);
    sparqlGen
      .addSparqlShape(SchemaWithoutArrayProperties, {
        path: 'cpgu:fileName',
        name: 'Название',
        minCount: 1,
      })
      .selectObjectsQuery();
    //console.log(sparqlGen.query);
    const genQueryStr = sparqlGen.stringify();
    //console.log(genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      PREFIX sh: <http://www.w3.org/ns/shacl#>
      PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
      SELECT ?eIri0 ?path0 ?name0 ?minCount0 WHERE {
        ?eIri0 rdf:type sh:PropertyShape;
          sh:path ?path0.
        OPTIONAL { ?eIri0 sh:name ?name0. }
        OPTIONAL { ?eIri0 sh:minCount ?minCount0. }
        FILTER(?path0 = cpgu:fileName)
        FILTER(?name0 = "Название"^^xsd:string)
        FILTER(?minCount0 = 1 )
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});

const SchemaWithArrayProperty: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'http://example.com/product.schema.json',
  '@id': 'sh:NodeShape',
  '@type': 'sh:NodeShape',
  '@context': {
    property: {
      '@id': 'sh:property',
      '@type': 'sh:PropertyShape',
    },
  },
  type: 'object',
  properties: {
    '@id': {
      type: 'string',
      format: 'iri',
    },
    property: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
  },
  required: ['@id', 'path'],
};

describe('SparqlGen/SchemaWithArrayProperty', () => {
  it(`select one schema should generate correctly`, async () => {
    provider.addSchema(SchemaWithArrayProperty);
    sparqlGen.addSparqlShape(SchemaWithArrayProperty).selectObjectsQuery();
    const genQueryStr = sparqlGen.stringify();
    //console.log('SchemaWithArrayProperty', genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh: <http://www.w3.org/ns/shacl#>
      SELECT ?eIri0 ?property0 WHERE {
        ?eIri0 rdf:type sh:NodeShape.
        OPTIONAL { ?eIri0 sh:property ?property0. }
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
  it('select two schemas should generate correctly', async () => {
    provider.addSchema(SchemaWithArrayProperty);
    provider.addSchema(SchemaWithoutArrayProperties);
    sparqlGen.addSparqlShape(SchemaWithArrayProperty).addSparqlShape(SchemaWithoutArrayProperties).selectObjectsQuery();
    const genQueryStr = sparqlGen.stringify();
    //console.log('Two Schemas WithArrayProperty', genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh: <http://www.w3.org/ns/shacl#>
      SELECT ?eIri0 ?eIri1 ?path1 ?name1 ?minCount1 WHERE {
        OPTIONAL { ?eIri0 sh:property ?eIri1. }
        ?eIri1 rdf:type sh:PropertyShape.
        ?eIri0 rdf:type sh:NodeShape.
        ?eIri1 sh:path ?path1.
        OPTIONAL { ?eIri1 sh:name ?name1. }
        OPTIONAL { ?eIri1 sh:minCount ?minCount1. }
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});

describe('SparqlGen/ArtifactSchema', () => {
  it(`select selectMaxObjectId should generate correctly`, async () => {
    provider.addSchema(artifactSchema);
    if (artifactSchema.properties === undefined) fail();
    const order = [{ expression: variable('identifier0'), descending: true }];
    const variables = {
      identifier: artifactSchema.properties.identifier,
    };
    sparqlGen.addSparqlShape(artifactSchema, {}, variables).selectObjectsWithTypeInfoQuery().limit(1).orderBy(order);
    const genQueryStr = sparqlGen.stringify();
    //console.log('deleteObjectQuery', genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      SELECT DISTINCT ?identifier0 WHERE {
        OPTIONAL { ?eIri0 dcterms:identifier ?identifier0. }
        ?eIri0 rdf:type ?type0.
        FILTER(NOT EXISTS {
          ?subtype0 ^rdf:type ?eIri0.
          ?subtype0 rdfs:subClassOf ?type0.
          FILTER(?subtype0 != ?type0)
        })
        FILTER(EXISTS {
          ?type0 rdfs:subClassOf* ?supertype0.
          FILTER(?supertype0 = rm:Artifact)
        })
      }
      ORDER BY DESC (?identifier0)
      LIMIT 1`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});

describe('SparqlGen/deleteObjectQuery', () => {
  it(`delete one schema with iri should generate correctly`, async () => {
    provider.addSchema(artifactSchema);
    sparqlGen
      .addSparqlShape(artifactSchema, { '@id': 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml' })
      .deleteObjectQuery();
    const genQueryStr = sparqlGen.stringify();
    //console.log('deleteObjectQuery', genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      DELETE { <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> ?p0 ?o0 }
      WHERE {
        <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> ?p0 ?o0 .
        <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> rdf:type rm:Artifact .
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
  it(`delete one schema with property should generate correctly`, async () => {
    provider.addSchema(artifactSchema);
    sparqlGen.addSparqlShape(artifactSchema, { identifier: 3 }).deleteObjectQuery();
    const genQueryStr = sparqlGen.stringify();
    //console.log('deleteObjectQuery', genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      DELETE { ?eIri0 ?p0 ?o0 }
      WHERE {
        ?eIri0 ?p0 ?o0.
        ?eIri0 rdf:type rm:Artifact.
        OPTIONAL { ?eIri0 dcterms:identifier ?identifier0. }
        FILTER(?identifier0 = 3 )
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});

describe('SparqlGen/insertObjectQuery', () => {
  it(`delete one schema with data should generate correctly`, async () => {
    provider.addSchema(artifactSchema);
    sparqlGen
      .addSparqlShape(
        artifactSchema,
        {},
        {},
        {
          '@id': 'file:///urn-45952.xml',
          creator: 'users:amivanoff',
          created: '1970-01-01T00:00:00-02:00',
        },
      )
      .insertObjectQuery();
    const genQueryStr = sparqlGen.stringify();
    //console.log(genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      PREFIX users: <http://cpgu.kbpm.ru/ns/rm/users#>
      INSERT DATA {
        <file:///urn-45952.xml> rdf:type rm:Artifact;
          dcterms:creator users:amivanoff;
          dcterms:created "1970-01-01T00:00:00-02:00"^^xsd:dateTime.
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});

describe('SparqlGen/updateObjectQuery', () => {
  it(`update one schema with property and no uri should generate correctly`, async () => {
    provider.addSchema(artifactSchema);
    const data = {
      title: 'title',
      modified: '2019-08-07T05:21:43.581Z',
      modifiedBy: 'users:amivanoff',
    };
    sparqlGen.addSparqlShape(artifactSchema, { identifier: 1 }, {}, data).updateObjectQuery();
    const genQueryStr = sparqlGen.stringify();
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      PREFIX users: <http://cpgu.kbpm.ru/ns/rm/users#>
      DELETE {
        ?eIri0 dcterms:title ?title0;
          dcterms:modified ?modified0;
          dcterms:modifiedBy ?modifiedBy0.
      }
      INSERT {
        ?eIri0 dcterms:title "title"^^xsd:string;
          dcterms:modified "2019-08-07T05:21:43.581Z"^^xsd:dateTime;
          dcterms:modifiedBy users:amivanoff.
      }
      WHERE {
        ?eIri0 rdf:type rm:Artifact.
        OPTIONAL { ?eIri0 dcterms:identifier ?identifier0. }
        OPTIONAL { ?eIri0 dcterms:title ?title0. }
        OPTIONAL { ?eIri0 dcterms:modified ?modified0. }
        OPTIONAL { ?eIri0 dcterms:modifiedBy ?modifiedBy0. }
        FILTER(?identifier0 = 1 )
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
  it(`update one schema with property and uri should generate correctly`, async () => {
    provider.addSchema(artifactSchema);
    const data = {
      title: 'title',
      modified: '2019-08-07T05:21:43.581Z',
      modifiedBy: 'users:amivanoff',
    };
    const id = 'rm:myid';
    sparqlGen.addSparqlShape(artifactSchema, { '@id': id, identifier: 1 }, {}, data).updateObjectQuery();
    const genQueryStr = sparqlGen.stringify();
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      PREFIX users: <http://cpgu.kbpm.ru/ns/rm/users#>
      DELETE {
        ${id} dcterms:title ?title0;
          dcterms:modified ?modified0;
          dcterms:modifiedBy ?modifiedBy0.
      }
      INSERT {
        ${id} dcterms:title "title"^^xsd:string;
          dcterms:modified "2019-08-07T05:21:43.581Z"^^xsd:dateTime;
          dcterms:modifiedBy users:amivanoff.
      }
      WHERE {
        ${id} rdf:type rm:Artifact.
        OPTIONAL { ${id} dcterms:identifier ?identifier0. }
        OPTIONAL { ${id} dcterms:title ?title0. }
        OPTIONAL { ${id} dcterms:modified ?modified0. }
        OPTIONAL { ${id} dcterms:modifiedBy ?modifiedBy0. }
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});
