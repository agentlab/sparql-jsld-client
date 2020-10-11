import { Parser } from 'sparqljs';
import { triple, variable } from '@rdfjs/data-model';
import { SparqlGen } from '../../src/SparqlGen';
import { JSONSchema6forRdf } from '../../src/ObjectProvider';
import { ObjectProviderImpl } from '../../src/ObjectProviderImpl';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../../src/schema/ArtifactShapeSchema';
import { artifactSchema, usedInModuleSchema } from '../schema/TestSchemas';
import { queryPrefixes } from '../configTests';
import { rootStore } from '../../src/models/model';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';

const repository = rootStore.server.repository;
applySnapshot(repository.queryPrefixes.current, queryPrefixes);
const parser = new Parser();

/*describe('ObjectProvider/addSchema', () => {
  it(`provider should return schema by uri`, async () => {
    repository.schemas.addSchema(ArtifactShapeSchema);
    repository.schemas.addSchema(PropertyShapeSchema);

    const getArtifactShapeSchema = await repository.schemas.getSchemaByUri(ArtifactShapeSchema['@id']);
    //console.log('getArtifactShapeSchema', getArtifactShapeSchema);
    expect(getArtifactShapeSchema).toMatchObject(ArtifactShapeSchema);

    const getPropertyShapeSchema = await repository.schemas.getSchemaByUri(PropertyShapeSchema['@id']);
    //console.log('getPropertyShapeSchema', getPropertyShapeSchema);
    expect(getPropertyShapeSchema).toMatchObject(PropertyShapeSchema);
  });
});*/

const SchemaWithoutArrayProperties: JSONSchema6forRdf = {
  //$schema: 'http://json-schema.org/draft-07/schema#',
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
    expect(repository.queryPrefixes.current.size).toBeGreaterThan(3);

    repository.schemas.addSchema(SchemaWithoutArrayProperties);
    const query = repository.addQuery({ schema: SchemaWithoutArrayProperties['@id'] });
    //const s = getSnapshot(repository.queries);
    //console.log(s);
    //const s2 = getSnapshot(query);
    //console.log(s2);

    const genQueryStr = query.selectObjectsQueryStr;
    console.log(genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh:  <http://www.w3.org/ns/shacl#>
      SELECT ?eIri0 ?path0 ?name0 ?minCount0 WHERE {
        ?eIri0 rdf:type sh:PropertyShape;
          sh:path ?path0.
        OPTIONAL { ?eIri0 sh:name ?name0. }
        OPTIONAL { ?eIri0 sh:minCount ?minCount0. }
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
  it('select should generate with conditions', async () => {
    expect(repository.queryPrefixes.current.size).toBeGreaterThan(3);

    repository.schemas.addSchema(SchemaWithoutArrayProperties);
    const query = repository.addQuery({
      schema: SchemaWithoutArrayProperties['@id'],
      conditions: {
        path: 'cpgu:fileName',
        name: 'Название',
        minCount: 1,
      },
    });
    //console.log(sparqlGen.query);
    const genQueryStr = query.selectObjectsQueryStr;
    //console.log(genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh:   <http://www.w3.org/ns/shacl#>
      PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
      SELECT ?eIri0 WHERE {
        ?eIri0 rdf:type sh:PropertyShape;
          sh:path cpgu:fileName;
          sh:name "Название";
          sh:minCount 1.
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});

const SchemaWithArrayProperty: JSONSchema6forRdf = {
  //$schema: 'http://json-schema.org/draft-07/schema#',
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
    repository.schemas.addSchema(SchemaWithArrayProperty);
    const query = repository.addQuery({ schema: SchemaWithArrayProperty['@id'] });
    const genQueryStr = query.selectObjectsQueryStr;
    //console.log('SchemaWithArrayProperty', genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh:  <http://www.w3.org/ns/shacl#>
      SELECT ?eIri0 ?property0 WHERE {
        ?eIri0 rdf:type sh:NodeShape.
        OPTIONAL { ?eIri0 sh:property ?property0. }
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
  // In case of API modification check ObjectProviderImpl.selectObjectsArrayProperties
  it('select two schemas should generate correctly', async () => {
    repository.schemas.addSchema(SchemaWithArrayProperty);
    repository.schemas.addSchema(SchemaWithoutArrayProperties);
    const query = repository.addQuery([
      {
        schema: SchemaWithArrayProperty['@id'],
        conditions: {
          property: '?eIri1',
        },
      },
      {
        schema: SchemaWithoutArrayProperties['@id'],
      },
    ]);

    const genQueryStr = query.selectObjectsQueryStr;
    //console.log('Two Schemas WithArrayProperty', genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh:  <http://www.w3.org/ns/shacl#>
      SELECT ?eIri0 ?eIri1 ?path1 ?name1 ?minCount1 WHERE {
        ?eIri0 rdf:type sh:NodeShape;
          sh:property ?eIri1.
        ?eIri1 rdf:type sh:PropertyShape;
          sh:path ?path1.
        OPTIONAL { ?eIri1 sh:name ?name1. }
        OPTIONAL { ?eIri1 sh:minCount ?minCount1. }
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});

/*describe('SparqlGen/ArtifactsInModules', () => {
  it(`select module arifacts should generate correctly`, async () => {
    sparqlGen
      .addSparqlShape(usedInModuleSchema, {
        object: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
        subject: '?eIri1',
      })
      .addSparqlShape(
        {
          $schema: 'http://json-schema.org/draft-07/schema#',
          //$id: 'rm:Artifact',
          '@id': 'rm:Artifact',
          '@type': 'rm:Artifact',
          title: 'Требование',
          description: 'Тип ресурса',
          type: 'object',
          '@context': {
            '@type': 'rdf:type',
            identifier: 'dcterms:identifier',
            title: 'dcterms:title',
            description: 'dcterms:description',
            creator: {
              '@id': 'dcterms:creator',
              '@type': 'pporoles:User',
            },
            created: 'dcterms:created',
            modifiedBy: {
              '@id': 'oslc:modifiedBy',
              '@type': 'pporoles:User',
            },
            modified: 'dcterms:modified',
            processArea: {
              '@id': 'nav:processArea',
              '@type': 'nav:ProjectArea',
            },
            assetFolder: {
              '@id': 'rm:assetFolder',
              '@type': 'nav:folder',
            },
            artifactFormat: {
              '@id': 'rm:artifactFormat',
              '@type': 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow',
            },
          },
          properties: {
            '@id': {
              title: 'URI',
              type: 'string',
              format: 'iri',
            },
            '@type': {
              title: 'Тип',
              type: 'string',
              format: 'iri',
            },
            identifier: {
              title: 'Идентификатор',
              description: 'Числовой идентификатор требования, уникальный только в пределах этой системы',
              type: 'integer',
              shapeModifiability: 'system',
              //valueModifiability: 'system',
            },
            title: {
              title: 'Название',
              description: 'Краткое название требования',
              type: 'string',
              shapeModifiability: 'system',
              //valueModifiability: 'user',
            },
            description: {
              title: 'Описание',
              description: 'Информация о требовании',
              type: 'string',
              shapeModifiability: 'system',
              //valueModifiability: 'user',
            },
            creator: {
              title: 'Кем создан',
              description: 'Пользователь, создавший требование',
              type: 'string',
              format: 'iri',
              shapeModifiability: 'system',
              //valueModifiability: 'system',
            },
            created: {
              title: 'Когда создан',
              description: 'Когда требование было создано',
              type: 'string',
              format: 'date-time',
              shapeModifiability: 'system',
              //valueModifiability: 'system',
            },
            modifiedBy: {
              title: 'Кем изменен',
              description: 'Пользователь, изменивший требование',
              type: 'string',
              format: 'iri',
              shapeModifiability: 'system',
              //valueModifiability: 'system',
            },
            modified: {
              title: 'Когда изменен',
              description: 'Когда требование было изменено',
              type: 'string',
              format: 'date-time',
              shapeModifiability: 'system',
              //valueModifiability: 'system',
            },
            processArea: {
              title: 'Проект',
              description: 'Связано с проектной областью',
              type: 'string',
              format: 'iri',
              shapeModifiability: 'system',
              //valueModifiability: 'system',
            },
            assetFolder: {
              title: 'Папка',
              description: 'Папка, содержащая требования',
              type: 'string',
              format: 'iri',
              shapeModifiability: 'system',
              //valueModifiability: 'user',
            },
            artifactFormat: {
              title: 'Формат',
              description: 'Формат заполнения/отображения',
              type: 'string',
              format: 'iri',
              shapeModifiability: 'system',
              //valueModifiability: 'user',
            },
            hasChild: {
              title: 'Имеет потомков',
              description: 'Имеет потомков',
              type: 'boolean',
              shapeModifiability: 'system',
            },
          },
          required: ['@id', '@type', 'title', 'hasChild'],
        },
        {
          hasChild: {
            bind: {
              relation: 'exists',
              triples: [
                triple(
                  variable('eIri2'),
                  repository.queryPrefixes.getFullIriNamedNode('rmUserTypes:parentBinding'),
                  variable('eIri1'),
                ),
              ],
            },
          },
        },
      )
      //.addSparqlShape(artifactSchema)
      //.addSparqlShape({
      //  '@id': 'rm:UsedInModuleHasChild',
      //  properties: {
      //    // context-less required property!!!
      //    hasChild: {
      //      title: 'Имеет потомков',
      //      description: 'Имеет потомков',
      //      type: 'boolean',
      //      shapeModifiability: 'system',
      //    },
      //  },
      //  required: ['hasChild'],
      //},
      //{
      //  hasChild: {
      //    bind: {
      //      relation: 'exists',
      //      triples: [
      //        triple(variable('eIri2'), sparqlGen.getFullIriNamedNode('rmUserTypes:parentBinding'), variable('eIri1')),
      //      ],
      //    },
      //  },
      //})
      .selectObjectsQuery()
      .orderBy([{ expression: variable('bookOrder0'), descending: false }])
      .limit(10);
    const genQueryStr = sparqlGen.stringify();
    //console.log('selectModuleContentQuery', genQueryStr);
    const correctParsedQuery = parser.parse(`
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX oslc: <http://open-services.net/ns/core#>
    PREFIX nav: <http://cpgu.kbpm.ru/ns/rm/navigation#>
    PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
    PREFIX rmUserTypes: <http://cpgu.kbpm.ru/ns/rm/user-types#>
    SELECT ?eIri0 ?parentBinding0 ?depth0 ?bookOrder0 ?eIri1 ?identifier1 ?title1 ?description1 ?creator1 ?created1 ?modifiedBy1 ?modified1 ?processArea1 ?assetFolder1 ?artifactFormat1 ?hasChild1 WHERE {
      ?eIri0 rdf:type rmUserTypes:UsedInModule;
        rdf:object <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml>;
        rdf:subject ?eIri1;
        rmUserTypes:parentBinding ?parentBinding0;
        rmUserTypes:depth ?depth0;
        rmUserTypes:bookOrder ?bookOrder0.
      ?eIri1 rdf:type rm:Artifact;
        dcterms:title ?title1.
      OPTIONAL { ?eIri1 dcterms:identifier ?identifier1. }
      OPTIONAL { ?eIri1 dcterms:description ?description1. }
      OPTIONAL { ?eIri1 dcterms:creator ?creator1. }
      OPTIONAL { ?eIri1 dcterms:created ?created1. }
      OPTIONAL { ?eIri1 oslc:modifiedBy ?modifiedBy1. }
      OPTIONAL { ?eIri1 dcterms:modified ?modified1. }
      OPTIONAL { ?eIri1 nav:processArea ?processArea1. }
      OPTIONAL { ?eIri1 rm:assetFolder ?assetFolder1. }
      OPTIONAL { ?eIri1 rm:artifactFormat ?artifactFormat1. }
      BIND(EXISTS{?eIri2 rmUserTypes:parentBinding ?eIri1} AS ?hasChild1)
    } ORDER BY (?bookOrder0) LIMIT 10`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});*/

/*describe('SparqlGen/ArtifactSchema', () => {
  it(`select selectMaxObjectId should generate correctly`, async () => {
    repository.schemas.addSchema(artifactSchema);
    if (artifactSchema.properties === undefined) fail();
    const order = [{ expression: variable('identifier0'), descending: true }];
    const variables = {
      identifier: artifactSchema.properties.identifier,
    };
    const query = repository.addQuery({
      shapes: [{
        schema: artifactSchema['@id'],
        variables,
        limit: 1,
        orderBy: order,
      }]
    });
    const genQueryStr = query.selectObjectsWithTypeInfoQueryStr;
    //console.log('deleteObjectQuery', genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm:      <http://cpgu.kbpm.ru/ns/rm/rdf#>
      SELECT DISTINCT ?identifier0 WHERE {
        ?eIri0 rdf:type ?type0.
        FILTER(NOT EXISTS {
          ?subtype0 ^rdf:type ?eIri0;
            rdfs:subClassOf ?type0.
          FILTER(?subtype0 != ?type0)
        })
        FILTER(EXISTS {
          ?type0 rdfs:subClassOf* ?supertype0.
          FILTER(?supertype0 = rm:Artifact)
        })
        OPTIONAL { ?eIri0 dcterms:identifier ?identifier0. }
      }
      ORDER BY DESC (?identifier0)
      LIMIT 1`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});*/

/*describe('SparqlGen/deleteObjectQuery', () => {
  it(`delete one schema with iri should generate correctly`, async () => {
    repository.schemas.addSchema(artifactSchema);
    sparqlGen
      .addSparqlShape(artifactSchema, { '@id': 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml' })
      .deleteObjectQuery();
    const genQueryStr = sparqlGen.stringify();
    //console.log('deleteObjectQuery', genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rm:  <http://cpgu.kbpm.ru/ns/rm/rdf#>
      DELETE { <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> ?p0 ?o0 }
      WHERE {
        <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> rdf:type rm:Artifact;
          ?p0 ?o0.
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
  it(`delete one schema with property should generate correctly`, async () => {
    repository.schemas.addSchema(artifactSchema);
    sparqlGen.addSparqlShape(artifactSchema, { identifier: 3 }).deleteObjectQuery();
    const genQueryStr = sparqlGen.stringify();
    //console.log('deleteObjectQuery', genQueryStr);
    const correctParsedQuery = parser.parse(`
      PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm:      <http://cpgu.kbpm.ru/ns/rm/rdf#>
      DELETE { ?eIri0 ?p0 ?o0 }
      WHERE {
        ?eIri0 rdf:type rm:Artifact;
          ?p0 ?o0.
        OPTIONAL { ?eIri0 dcterms:identifier ?identifier0. }
        FILTER(?identifier0 = 3 )
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});

describe('SparqlGen/insertObjectQuery', () => {
  it(`delete one schema with data should generate correctly`, async () => {
    repository.schemas.addSchema(artifactSchema);
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
      PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd:     <http://www.w3.org/2001/XMLSchema#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm:      <http://cpgu.kbpm.ru/ns/rm/rdf#>
      PREFIX users:   <http://cpgu.kbpm.ru/ns/rm/users#>
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
    repository.schemas.addSchema(artifactSchema);
    const data = {
      title: 'title',
      modified: '2019-08-07T05:21:43.581Z',
      modifiedBy: 'users:amivanoff',
    };
    sparqlGen.addSparqlShape(artifactSchema, { identifier: 1 }, {}, data).updateObjectQuery();
    const genQueryStr = sparqlGen.stringify();
    const correctParsedQuery = parser.parse(`
      PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd:     <http://www.w3.org/2001/XMLSchema#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX oslc:    <http://open-services.net/ns/core#>
      PREFIX rm:      <http://cpgu.kbpm.ru/ns/rm/rdf#>
      PREFIX users:   <http://cpgu.kbpm.ru/ns/rm/users#>
      DELETE {
        ?eIri0 dcterms:title ?title0;
          dcterms:modified ?modified0;
          oslc:modifiedBy ?modifiedBy0.
      }
      INSERT {
        ?eIri0 dcterms:title "title"^^xsd:string;
          dcterms:modified "2019-08-07T05:21:43.581Z"^^xsd:dateTime;
          oslc:modifiedBy users:amivanoff.
      }
      WHERE {
        ?eIri0 rdf:type rm:Artifact.
        ?eIri0 dcterms:title ?title0.
        OPTIONAL { ?eIri0 dcterms:identifier ?identifier0. }
        OPTIONAL { ?eIri0 dcterms:modified ?modified0. }
        OPTIONAL { ?eIri0 oslc:modifiedBy ?modifiedBy0. }
        FILTER(?identifier0 = 1 )
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
  it(`update one schema with property and uri should generate correctly`, async () => {
    repository.schemas.addSchema(artifactSchema);
    const data = {
      title: 'title',
      modified: '2019-08-07T05:21:43.581Z',
      modifiedBy: 'users:amivanoff',
    };
    const id = 'rm:myid';
    sparqlGen.addSparqlShape(artifactSchema, { '@id': id, identifier: 1 }, {}, data).updateObjectQuery();
    const genQueryStr = sparqlGen.stringify();
    const correctParsedQuery = parser.parse(`
      PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd:     <http://www.w3.org/2001/XMLSchema#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX oslc:    <http://open-services.net/ns/core#>
      PREFIX rm:      <http://cpgu.kbpm.ru/ns/rm/rdf#>
      PREFIX users:   <http://cpgu.kbpm.ru/ns/rm/users#>
      DELETE {
        ${id} dcterms:title ?title0;
          dcterms:modified ?modified0;
          oslc:modifiedBy ?modifiedBy0.
      }
      INSERT {
        ${id} dcterms:title "title"^^xsd:string;
          dcterms:modified "2019-08-07T05:21:43.581Z"^^xsd:dateTime;
          oslc:modifiedBy users:amivanoff.
      }
      WHERE {
        ${id} rdf:type rm:Artifact.
        ${id} dcterms:title ?title0.
        OPTIONAL { ${id} dcterms:identifier ?identifier0. }
        OPTIONAL { ${id} dcterms:modified ?modified0. }
        OPTIONAL { ${id} oslc:modifiedBy ?modifiedBy0. }
      }`);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery);
  });
});
*/
