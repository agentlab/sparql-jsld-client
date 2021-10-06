/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { afterAll, beforeAll, beforeEach, describe, expect, jest, it } from '@jest/globals';
import { Parser } from 'sparqljs';
import { triple, variable } from '@rdfjs/data-model';

import { JsObject, JSONSchema6forRdf } from '../src/ObjectProvider';
import { SparqlClientImplMock } from './SparqlClientImplMock';

import {
  artifactSchema,
  HSObservationShapeSchemaForCardsList,
  HSObservationShapeSchema,
  ProductCardShapeSchemaForCardsList,
  ProductCardShapeSchema,
  usedInModuleSchema,
} from './schema/TestSchemas';
import { testNs } from './configTests';
import { getFullIriNamedNode, ICollConstrJsOpt } from '../src/SparqlGen';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../src/schema/ArtifactShapeSchema';
import { constructObjectsQuery, selectObjectsQuery } from '../src/SparqlGenSelect';
import { insertObjectQuery, deleteObjectQuery, updateObjectQuery } from '../src/SparqlGenUpdate';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(500000);

const SchemaWithoutArrayProperties: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'http://cpgu.kbpm.ru/ns/rm/rdf#PropertyShapeWithoutArrayProperties',
  '@id': 'rm:PropertyShapeWithoutArrayProperties',
  '@type': 'sh:NodeShape',
  targetClass: 'sh:PropertyShape',
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

describe('SchemaWithoutArrayProperties', () => {
  it('select by type without conditions should generate correctly', async () =>
    selectTestHelper(
      {
        entConstrs: [{ schema: SchemaWithoutArrayProperties }],
      },
      `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh:  <http://www.w3.org/ns/shacl#>
      SELECT ?eIri0 ?path0 ?name0 ?minCount0 WHERE {
        ?eIri0 rdf:type sh:PropertyShape;
          sh:path ?path0.
        OPTIONAL { ?eIri0 sh:name ?name0. }
        OPTIONAL { ?eIri0 sh:minCount ?minCount0. }
      }`,
    ));

  it('select by type and conditions should generate correctly', async () =>
    selectTestHelper(
      {
        entConstrs: [
          {
            schema: SchemaWithoutArrayProperties,
            conditions: {
              path: 'cpgu:fileName',
              name: 'Название',
              minCount: 1,
            },
          },
        ],
      },
      `PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh:   <http://www.w3.org/ns/shacl#>
      PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
      SELECT ?eIri0 WHERE {
        ?eIri0 rdf:type sh:PropertyShape;
          sh:path cpgu:fileName;
          sh:name "Название";
          sh:minCount 1.
      }`,
    ));

  it('select by iri all schema props should generate correctly', async () =>
    selectTestHelper(
      {
        entConstrs: [
          {
            schema: SchemaWithoutArrayProperties,
            conditions: {
              '@_id': 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
            },
          },
        ],
      },
      `PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh:   <http://www.w3.org/ns/shacl#>
      SELECT ?path0 ?name0 ?minCount0 WHERE {
        <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> rdf:type sh:PropertyShape;
          sh:path ?path0.
        OPTIONAL { <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> sh:name ?name0. }
        OPTIONAL { <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> sh:minCount ?minCount0. }
      }`,
    ));

  it('select by iri only titles should generate correctly', async () =>
    selectTestHelper(
      {
        entConstrs: [
          {
            schema: SchemaWithoutArrayProperties,
            conditions: {
              '@_id': 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
            },
            variables: {
              path: null,
              name: null,
            },
          },
        ],
      },
      `PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh:   <http://www.w3.org/ns/shacl#>
      SELECT ?path0 ?name0 WHERE {
        <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> rdf:type sh:PropertyShape;
          sh:path ?path0.
        <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> sh:name ?name0.
      }`,
    ));

  it('select max identifier should generate correctly', async () =>
    selectTestHelper(
      {
        entConstrs: [
          {
            schema: artifactSchema,
            variables: {
              identifier: artifactSchema?.properties?.identifier,
            },
          },
        ],
        orderBy: [{ expression: variable('identifier0'), descending: true }],
        limit: 1,
      },
      `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      SELECT ?identifier0 WHERE {
        ?eIri0 rdf:type rm:Artifact.
        ?eIri0 dcterms:identifier ?identifier0.
      }
      ORDER BY DESC (?identifier0)
      LIMIT 1`,
    ));
});

const SchemaWithArrayProperty: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  //$id: 'http://www.w3.org/ns/shacl#SchemaWithArrayProperty',
  '@id': 'sh:SchemaWithArrayProperty',
  '@type': 'sh:NodeShape',
  targetClass: 'sh:NodeShape',
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

describe('SchemaWithArrayProperty', () => {
  it('select one schema should generate correctly', async () =>
    selectTestHelper(
      {
        entConstrs: [
          {
            schema: SchemaWithArrayProperty,
          },
        ],
      },
      `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX sh:  <http://www.w3.org/ns/shacl#>
      SELECT ?eIri0 ?property0 WHERE {
        ?eIri0 rdf:type sh:NodeShape.
        OPTIONAL { ?eIri0 sh:property ?property0. }
      }`,
    ));

  // In case of API modification check ObjectProviderImpl.selectObjectsArrayProperties
  /*it('select two schemas should generate correctly', async () => {
    repository.schemas.addSchema(SchemaWithArrayProperty);
    repository.schemas.addSchema(SchemaWithoutArrayProperties);
    const collConstr = repository.addCollConstr([
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
    const genQueryStr = collConstr.selectObjectsQueryStr();
    repository.removeColl(collConstr);
    console.log('Two Schemas WithArrayProperty', genQueryStr);
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
  });*/
});

const usedInModuleCollConstrJs: any = {
  entConstrs: [
    {
      schema: usedInModuleSchema,
      conditions: {
        object: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
        subject: '?eIri1',
      },
    },
    {
      schema: {
        ...artifactSchema,
        '@id': 'rm:ArtifactInUsedInModuleLink',
        '@context': {
          ...artifactSchema['@context'],
          //hasChild: {
          //  '@id': 'urn:sparqljsldclient:hasChild',
          //  '@type': 'xsd:boolean',
          //},
        },
        properties: {
          ...artifactSchema.properties,
          hasChild: {
            title: 'Имеет потомков',
            description: 'Имеет потомков',
            type: 'boolean',
            shapeModifiability: 'system',
          },
        },
        required: [...(artifactSchema.required || []), 'hasChild'],
      },
      conditions: {
        hasChild: {
          bind: {
            relation: 'exists',
            triples: [
              triple(variable('eIri2'), getFullIriNamedNode('rmUserTypes:parentBinding', testNs), variable('eIri1')),
            ],
          },
        },
      },
      resolveType: true,
    },
  ],
  orderBy: [{ expression: variable('bookOrder0'), descending: false }],
  limit: 10,
};

describe('ArtifactsInModules', () => {
  it('select module arifacts should generate correctly', async () =>
    selectTestHelper(
      usedInModuleCollConstrJs,
      `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX oslc: <http://open-services.net/ns/core#>
      PREFIX nav: <http://cpgu.kbpm.ru/ns/rm/navigation#>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      PREFIX rmUserTypes: <http://cpgu.kbpm.ru/ns/rm/user-types#>
      SELECT ?eIri0 ?creator0 ?created0 ?modifiedBy0 ?modified0 ?processArea0 ?parentBinding0 ?depth0 ?bookOrder0 ?sectionNumber0 ?isHeading0 ?eIri1 ?identifier1 ?title1 ?description1 ?creator1 ?created1 ?modifiedBy1 ?modified1 ?processArea1 ?assetFolder1 ?artifactFormat1 ?hasChild1 ?type1 WHERE {
        ?eIri0 rdf:type rmUserTypes:UsedInModule;
          rdf:object <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml>;
          rdf:subject ?eIri1;
          rmUserTypes:parentBinding ?parentBinding0;
          rmUserTypes:depth ?depth0;
          rmUserTypes:bookOrder ?bookOrder0;
          rmUserTypes:sectionNumber ?sectionNumber0.

        ?eIri1 dcterms:title ?title1.
        ?eIri1 rdf:type ?type1.
        FILTER(NOT EXISTS {
          ?subtype1 ^rdf:type ?eIri1;
            rdfs:subClassOf ?type1.
          FILTER(?subtype1 != ?type1)
        })
        FILTER(EXISTS {
          ?type1 (rdfs:subClassOf*) ?supertype1.
          FILTER(?supertype1 = rm:Artifact)
        })
        BIND(EXISTS{?eIri2 rmUserTypes:parentBinding ?eIri1} AS ?hasChild1)

        OPTIONAL { ?eIri0 dcterms:creator ?creator0. }
        OPTIONAL { ?eIri0 dcterms:created ?created0. }
        OPTIONAL { ?eIri0 oslc:modifiedBy ?modifiedBy0. }
        OPTIONAL { ?eIri0 dcterms:modified ?modified0. }
        OPTIONAL { ?eIri0 nav:processArea ?processArea0. }
        OPTIONAL { ?eIri0 rmUserTypes:isHeading ?isHeading0. }

        OPTIONAL { ?eIri1 dcterms:identifier ?identifier1. }
        OPTIONAL { ?eIri1 dcterms:description ?description1. }
        OPTIONAL { ?eIri1 dcterms:creator ?creator1. }
        OPTIONAL { ?eIri1 dcterms:created ?created1. }
        OPTIONAL { ?eIri1 oslc:modifiedBy ?modifiedBy1. }
        OPTIONAL { ?eIri1 dcterms:modified ?modified1. }
        OPTIONAL { ?eIri1 nav:processArea ?processArea1. }
        OPTIONAL { ?eIri1 rm:assetFolder ?assetFolder1. }
        OPTIONAL { ?eIri1 rm:artifactFormat ?artifactFormat1. }
      } ORDER BY (?bookOrder0) LIMIT 10`,
    ));
});

describe('ArtifactSchema', () => {
  it('select Artifact with type info should generate correctly', async () =>
    selectTestHelper(
      {
        entConstrs: [
          {
            schema: artifactSchema,
            resolveType: true,
          },
        ],
        distinct: true,
      },
      `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX oslc: <http://open-services.net/ns/core#>
      PREFIX nav: <http://cpgu.kbpm.ru/ns/rm/navigation#>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      SELECT DISTINCT ?eIri0 ?identifier0 ?title0 ?description0 ?creator0 ?created0 ?modifiedBy0 ?modified0 ?processArea0 ?assetFolder0 ?artifactFormat0 ?type0 WHERE {
        ?eIri0 dcterms:title ?title0.
        ?eIri0 rdf:type ?type0.
        FILTER(NOT EXISTS {
          ?subtype0 ^rdf:type ?eIri0;
            rdfs:subClassOf ?type0.
          FILTER(?subtype0 != ?type0)
        })
        FILTER(EXISTS {
          ?type0 (rdfs:subClassOf*) ?supertype0.
          FILTER(?supertype0 = rm:Artifact)
        })
        OPTIONAL { ?eIri0 dcterms:identifier ?identifier0. }
        OPTIONAL { ?eIri0 dcterms:description ?description0. }
        OPTIONAL { ?eIri0 dcterms:creator ?creator0. }
        OPTIONAL { ?eIri0 dcterms:created ?created0. }
        OPTIONAL { ?eIri0 oslc:modifiedBy ?modifiedBy0. }
        OPTIONAL { ?eIri0 dcterms:modified ?modified0. }
        OPTIONAL { ?eIri0 nav:processArea ?processArea0. }
        OPTIONAL { ?eIri0 rm:assetFolder ?assetFolder0. }
        OPTIONAL { ?eIri0 rm:artifactFormat ?artifactFormat0. }
      }`,
    ));

  it('select selectMaxObjectId should generate correctly', async () =>
    selectTestHelper(
      {
        entConstrs: [
          {
            schema: artifactSchema,
            variables: {
              identifier: artifactSchema.properties.identifier,
            },
            resolveType: true,
          },
        ],
        limit: 1,
        orderBy: [{ expression: variable('identifier0'), descending: true }],
        distinct: true,
      },
      `PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm:      <http://cpgu.kbpm.ru/ns/rm/rdf#>
      SELECT DISTINCT ?identifier0 WHERE {
        ?eIri0 dcterms:identifier ?identifier0.
        ?eIri0 rdf:type ?type0.
        FILTER(NOT EXISTS {
          ?subtype0 ^rdf:type ?eIri0;
            rdfs:subClassOf ?type0.
          FILTER(?subtype0 != ?type0)
        })
        FILTER(EXISTS {
          ?type0 (rdfs:subClassOf*) ?supertype0.
          FILTER(?supertype0 = rm:Artifact)
        })
      }
      ORDER BY DESC (?identifier0)
      LIMIT 1`,
    ));
});

describe('constructObjectsQuery', () => {
  it('construct one Artifact schema should generate correctly', async () => {
    const targetClass = 'rm:Artifact';
    await constructTestHelper(
      {
        entConstrs: [
          {
            schema: ArtifactShapeSchema,
            conditions: {
              targetClass: targetClass,
              property: '?eIri1',
            },
          },
          {
            schema: PropertyShapeSchema,
          },
        ],
        orderBy: [{ expression: variable('order1'), descending: false }],
      },
      `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX sh: <http://www.w3.org/ns/shacl#>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      CONSTRUCT {
        ?eIri0 rdf:type sh:NodeShape.
        ?eIri0 sh:property ?eIri1.
        ?eIri0 sh:targetClass ${targetClass}.
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
          sh:targetClass ${targetClass}.
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
      ORDER BY (?order1)`,
    );
  });

  it('construct one Classifier schema should generate correctly', async () => {
    //repository.schemas.addSchema(SchemaWithArrayProperty);
    const targetClass = 'cpgu:Classifier';
    await constructTestHelper(
      {
        entConstrs: [
          {
            schema: ArtifactShapeSchema,
            conditions: {
              targetClass,
              property: '?eIri1',
            },
          },
          {
            schema: PropertyShapeSchema,
          },
        ],
        orderBy: [{ expression: variable('order1'), descending: false }],
      },
      `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX sh: <http://www.w3.org/ns/shacl#>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
      CONSTRUCT {
        ?eIri0 rdf:type sh:NodeShape.
        ?eIri0 sh:property ?eIri1.
        ?eIri0 sh:targetClass ${targetClass}.
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
          sh:targetClass ${targetClass}.
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
      ORDER BY (?order1)`,
    );
  });

  it('construct module arifacts should generate correctly', async () =>
    constructTestHelper(
      usedInModuleCollConstrJs,
      `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX oslc: <http://open-services.net/ns/core#>
      PREFIX nav: <http://cpgu.kbpm.ru/ns/rm/navigation#>
      PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
      PREFIX rmUserTypes: <http://cpgu.kbpm.ru/ns/rm/user-types#>
      CONSTRUCT {
        ?eIri0 rdf:type rmUserTypes:UsedInModule.
        ?eIri0 rdf:subject ?eIri1.
        ?eIri0 rdf:object <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml>.
        ?eIri0 dcterms:creator ?creator0.
        ?eIri0 dcterms:created ?created0.
        ?eIri0 oslc:modifiedBy ?modifiedBy0.
        ?eIri0 dcterms:modified ?modified0.
        ?eIri0 nav:processArea ?processArea0.
        ?eIri0 rmUserTypes:parentBinding ?parentBinding0.
        ?eIri0 rmUserTypes:depth ?depth0.
        ?eIri0 rmUserTypes:bookOrder ?bookOrder0.
        ?eIri0 rmUserTypes:sectionNumber ?sectionNumber0.
        ?eIri0 rmUserTypes:isHeading ?isHeading0.
        ?eIri1 rdf:type rm:Artifact.
        ?eIri1 rdf:type ?type1.
        ?eIri1 dcterms:identifier ?identifier1.
        ?eIri1 dcterms:title ?title1.
        ?eIri1 dcterms:description ?description1.
        ?eIri1 dcterms:creator ?creator1.
        ?eIri1 dcterms:created ?created1.
        ?eIri1 oslc:modifiedBy ?modifiedBy1.
        ?eIri1 dcterms:modified ?modified1.
        ?eIri1 nav:processArea ?processArea1.
        ?eIri1 rm:assetFolder ?assetFolder1.
        ?eIri1 rm:artifactFormat ?artifactFormat1.
        ?eIri1 <urn:sparqljsldclient:hasChild> ?hasChild1.
      }
      WHERE {
        ?eIri0 rdf:type rmUserTypes:UsedInModule;
          rdf:object <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml>;
          rmUserTypes:parentBinding ?parentBinding0;
          rmUserTypes:depth ?depth0;
          rmUserTypes:bookOrder ?bookOrder0;
          rmUserTypes:sectionNumber ?sectionNumber0.

        ?eIri1 rdf:type rm:Artifact, ?type1.
        ?eIri0 rdf:subject ?eIri1.
        ?eIri1 dcterms:title ?title1.
        ?eIri1 rdf:type ?type1.
        FILTER(NOT EXISTS {
          ?subtype1 ^rdf:type ?eIri1;
            rdfs:subClassOf ?type1.
          FILTER(?subtype1 != ?type1)
        })
        FILTER(EXISTS {
          ?type1 (rdfs:subClassOf*) ?supertype1.
          FILTER(?supertype1 = rm:Artifact)
        })
        BIND(EXISTS { ?eIri2 rmUserTypes:parentBinding ?eIri1. } AS ?hasChild1)

        OPTIONAL { ?eIri0 dcterms:creator ?creator0. }
        OPTIONAL { ?eIri0 dcterms:created ?created0. }
        OPTIONAL { ?eIri0 oslc:modifiedBy ?modifiedBy0. }
        OPTIONAL { ?eIri0 dcterms:modified ?modified0. }
        OPTIONAL { ?eIri0 nav:processArea ?processArea0. }
        OPTIONAL { ?eIri0 rmUserTypes:isHeading ?isHeading0. }

        OPTIONAL { ?eIri1 dcterms:identifier ?identifier1. }
        OPTIONAL { ?eIri1 dcterms:description ?description1. }
        OPTIONAL { ?eIri1 dcterms:creator ?creator1. }
        OPTIONAL { ?eIri1 dcterms:created ?created1. }
        OPTIONAL { ?eIri1 oslc:modifiedBy ?modifiedBy1. }
        OPTIONAL { ?eIri1 dcterms:modified ?modified1. }
        OPTIONAL { ?eIri1 nav:processArea ?processArea1. }
        OPTIONAL { ?eIri1 rm:assetFolder ?assetFolder1. }
        OPTIONAL { ?eIri1 rm:artifactFormat ?artifactFormat1. }
      }
      ORDER BY (?bookOrder0) LIMIT 10`,
    ));

  it('construct with filter should generate correctly', async () => {
    const client = new SparqlClientImplMock();
    const collConstrJs = {
      entConstrs: [
        {
          schema: HSObservationShapeSchema,
          conditions: {
            product: 'https://www.wildberries.ru/catalog/10322023/detail.aspx',
            parsedAt: {
              relation: 'after',
              value: ['2021-07-01T00:00:00'],
            },
          },
        },
      ],
      orderBy: [{ expression: variable('parsedAt0'), descending: false }],
    };
    const coll = await constructObjectsQuery(collConstrJs, testNs, client);
    expect(coll).not.toBeUndefined();
    //expect(coll.length).toBe(0);
    const genQueryStr = client.sparqlConstructParams.query;
    //console.log(genQueryStr);
    const correctQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>  
      PREFIX hs: <https://huntersales.ru/schema#>
      CONSTRUCT {
        ?eIri0 rdf:type hs:HSObservation ;
          hs:product <https://www.wildberries.ru/catalog/10322023/detail.aspx> ;
          hs:parsedAt ?parsedAt0 ;
          hs:price ?price0 .
      } WHERE {
        ?eIri0 rdf:type hs:HSObservation ;
          hs:product <https://www.wildberries.ru/catalog/10322023/detail.aspx> ;
          hs:parsedAt ?parsedAt0 ;
          hs:price ?price0 .
        filter(?parsedAt0 >= "2021-07-01T00:00:00"^^xsd:dateTime)
      }
      ORDER BY (?parsedAt0)`;
    const parser = new Parser();
    const correctParsedQuery = parser.parse(correctQuery);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery as any);
  });

  it('construct Federated with filter should generate correctly', async () => {
    const client = new SparqlClientImplMock();
    const collConstrJs = {
      entConstrs: [
        {
          schema: HSObservationShapeSchema,
          conditions: {
            product: 'https://www.wildberries.ru/catalog/10477067/detail.aspx',
            parsedAt: {
              relation: 'before',
              value: ['2021-07-01T00:00:00'],
            },
          },
          service: 'http://192.168.1.33:8090/sparql',
        },
      ],
      orderBy: [{ expression: variable('parsedAt0'), descending: false }],
    };
    const coll = await constructObjectsQuery(collConstrJs, testNs, client);
    expect(coll).not.toBeUndefined();
    //expect(coll.length).toBe(0);
    const genQueryStr = client.sparqlConstructParams.query;
    //console.log(genQueryStr);
    const correctQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>  
      PREFIX hs: <https://huntersales.ru/schema#>
      CONSTRUCT {
        ?eIri0 rdf:type hs:HSObservation ;
          hs:product <https://www.wildberries.ru/catalog/10477067/detail.aspx> ;
          hs:parsedAt ?parsedAt0 ;
          hs:price ?price0 ;
          hs:totalSales ?totalSales0 ;
          hs:categoryPopularity ?categoryPopularity0 .
      } WHERE {
        SERVICE <http://192.168.1.33:8090/sparql> {
          ?eIri0 rdf:type hs:HSObservation ;
            hs:product <https://www.wildberries.ru/catalog/10477067/detail.aspx> ;
            hs:parsedAt ?parsedAt0 ;
            hs:totalSales ?totalSales0 .
          FILTER(?parsedAt0 <= "2021-07-01T00:00:00"^^xsd:dateTime)
          OPTIONAL{ ?eIri0 hs:price ?price0 . }
          OPTIONAL{ ?eIri0 hs:categoryPopularity ?categoryPopularity0 . }
        }
      }
      ORDER BY (?parsedAt0)`;
    const parser = new Parser();
    const correctParsedQuery = parser.parse(correctQuery);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery as any);
  });

  it('construct subquery should generate correctly', async () => {
    const client = new SparqlClientImplMock();
    const collConstrJs = {
      entConstrs: [
        {
          schema: ProductCardShapeSchema,
          orderBy: [{ expression: variable('lastMonthSalesValue0'), descending: true }],
          limit: 2,
        },
        {
          schema: HSObservationShapeSchema,
          conditions: {
            product: '?eIri0',
            parsedAt: {
              relation: 'after',
              value: ['2021-07-01T00:00:00'],
            },
          },
          orderBy: [{ expression: variable('parsedAt1'), descending: false }],
        },
      ],
      orderBy: [
        { expression: variable('lastMonthSalesValue0'), descending: true },
        { expression: variable('parsedAt1'), descending: false },
      ],
    };
    const coll = await constructObjectsQuery(collConstrJs, testNs, client);
    expect(coll).not.toBeUndefined();
    //expect(coll.length).toBe(0);
    const genQueryStr = client.sparqlConstructParams.query;
    //console.log(genQueryStr);
    const correctQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX hs: <https://huntersales.ru/schema#>
    CONSTRUCT {
      ?eIri0 rdf:type hs:ProductCard .
      ?eIri0 hs:name ?name0 .
      ?eIri0 hs:lastMonthSalesValue ?lastMonthSalesValue0 .
      ?eIri1 rdf:type hs:HSObservation .
      ?eIri1 hs:product ?eIri0 .
      ?eIri1 hs:parsedAt ?parsedAt1 .
      ?eIri1 hs:price ?price1 .
    } WHERE {
      {
        SELECT ?eIri0 ?name0 ?lastMonthSalesValue0 WHERE {
          ?eIri0 rdf:type hs:ProductCard ;
            hs:name ?name0 ;
            hs:lastMonthSalesValue ?lastMonthSalesValue0 .
        }
        ORDER BY DESC(?lastMonthSalesValue0)
        LIMIT 2
      } . {
        ?eIri1 rdf:type hs:HSObservation ;
          hs:product ?eIri0 ;
          hs:parsedAt ?parsedAt1 ;
          hs:price ?price1 .
        filter(?parsedAt1 >= "2021-07-01T00:00:00"^^xsd:dateTime)
      }
    }
    ORDER BY DESC(?lastMonthSalesValue0) ?parsedAt1`;
    const parser = new Parser();
    const correctParsedQuery = parser.parse(correctQuery);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery as any);
  });

  it('construct subquery with inverse reference should generate correctly', async () => {
    const client = new SparqlClientImplMock();
    const collConstrJs = {
      entConstrs: [
        {
          schema: ProductCardShapeSchemaForCardsList,
          conditions: {
            hasObservations: '?eIri1',
          },
          orderBy: [{ expression: variable('lastMonthSalesValue0'), descending: true }],
          limit: 2,
        },
        {
          schema: HSObservationShapeSchemaForCardsList,
          conditions: {
            parsedAt: {
              relation: 'after',
              value: ['2021-07-01T00:00:00'],
            },
          },
          orderBy: [{ expression: variable('parsedAt1'), descending: false }],
        },
      ],
      orderBy: [
        { expression: variable('lastMonthSalesValue0'), descending: true },
        { expression: variable('parsedAt1'), descending: false },
      ],
    };
    const coll = await constructObjectsQuery(collConstrJs, testNs, client);
    expect(coll).not.toBeUndefined();
    //expect(coll.length).toBe(0);
    const genQueryStr = client.sparqlConstructParams.query;
    //console.log(genQueryStr);
    const correctQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX hs: <https://huntersales.ru/schema#>
    CONSTRUCT {
      ?eIri0 rdf:type hs:ProductCard .
      ?eIri0 hs:name ?name0 .
      ?eIri0 hs:lastMonthSalesValue ?lastMonthSalesValue0 .
      ?eIri1 rdf:type hs:HSObservation .
      ?eIri1 hs:product ?eIri0 .
      ?eIri1 hs:parsedAt ?parsedAt1 .
      ?eIri1 hs:price ?price1 .
    } WHERE {
      {
        SELECT ?eIri0 ?name0 ?lastMonthSalesValue0 WHERE {
          ?eIri0 rdf:type hs:ProductCard ;
            hs:name ?name0 ;
            hs:lastMonthSalesValue ?lastMonthSalesValue0 .
        }
        ORDER BY DESC(?lastMonthSalesValue0)
        LIMIT 2
      } . {
        ?eIri1 rdf:type hs:HSObservation ;
          hs:product ?eIri0 ;
          hs:parsedAt ?parsedAt1 ;
          hs:price ?price1 .
        filter(?parsedAt1 >= "2021-07-01T00:00:00"^^xsd:dateTime)
      }
    }
    ORDER BY DESC(?lastMonthSalesValue0) ?parsedAt1`;
    const parser = new Parser();
    const correctParsedQuery = parser.parse(correctQuery);
    expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery as any);
  });
});

describe('deleteObjectQuery', () => {
  it('delete one by iri should generate correctly', async () =>
    //TODO: if @_id is known, drop other conditions
    deleteTestHelper(
      {
        entConstrs: [
          {
            schema: artifactSchema,
          },
        ],
      },
      {
        '@_id': 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
      },
      `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rm:  <http://cpgu.kbpm.ru/ns/rm/rdf#>
      DELETE { <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> ?p0 ?o0 }
      WHERE {
        <file:///urn-s2-iisvvt-infosystems-classifier-45950.xml> rdf:type rm:Artifact;
          ?p0 ?o0.
      }`,
    ));

  it('delete one by property value should generate correctly', async () =>
    // maximum constraints with type and properties
    deleteTestHelper(
      {
        entConstrs: [
          {
            schema: artifactSchema,
          },
        ],
      },
      {
        identifier: 3,
      },
      `PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm:      <http://cpgu.kbpm.ru/ns/rm/rdf#>
      DELETE { ?eIri0 ?p0 ?o0 }
      WHERE {
        ?eIri0 rdf:type rm:Artifact;
          ?p0 ?o0;
          dcterms:identifier ?identifier0.
        FILTER(?identifier0 = 3 )
      }`,
    ));

  it('delete all by type should generate correctly', async () =>
    deleteTestHelper(
      {
        entConstrs: [
          {
            schema: artifactSchema,
          },
        ],
      },
      undefined,
      `PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rm:      <http://cpgu.kbpm.ru/ns/rm/rdf#>
      DELETE { ?eIri0 ?p0 ?o0 }
      WHERE {
        ?eIri0 rdf:type rm:Artifact;
          ?p0 ?o0.
      }`,
    ));
});

describe('insertObjectQuery', () => {
  it('insert one with data should generate correctly', async () =>
    insertTestHelper(
      {
        entConstrs: [
          {
            schema: artifactSchema,
          },
        ],
      },
      {
        // screened with '_' to distinguish from Condition object @id
        '@_id': 'file:///urn-45952.xml',
        creator: 'users:amivanoff',
        created: '1970-01-01T00:00:00-02:00',
      },
      `PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX xsd:     <http://www.w3.org/2001/XMLSchema#>
      PREFIX dcterms: <http://purl.org/dc/terms/>
      PREFIX rm:      <http://cpgu.kbpm.ru/ns/rm/rdf#>
      PREFIX users:   <http://cpgu.kbpm.ru/ns/rm/users#>
      INSERT DATA {
        <file:///urn-45952.xml> rdf:type rm:Artifact;
          dcterms:creator users:amivanoff;
          dcterms:created "1970-01-01T00:00:00-02:00"^^xsd:dateTime.
      }`,
    ));
});

describe('updateObjectQuery', () => {
  it('update one with property and no uri should generate correctly', async () =>
    updateTestHelper(
      {
        entConstrs: [
          {
            schema: artifactSchema,
          },
        ],
      },
      {
        identifier: 1,
      },
      {
        title: 'title',
        modified: '2019-08-07T05:21:43.581Z',
        modifiedBy: 'users:amivanoff',
      },
      `PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
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
      }`,
    ));

  it('update one with property and uri should generate correctly', async () => {
    const id = 'rm:myid';
    await updateTestHelper(
      {
        entConstrs: [
          {
            schema: artifactSchema,
          },
        ],
      },
      {
        '@_id': id,
        identifier: 1,
      },
      {
        title: 'title',
        modified: '2019-08-07T05:21:43.581Z',
        modifiedBy: 'users:amivanoff',
      },
      `PREFIX rdf:     <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
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
      }`,
    );
  });
});

async function selectTestHelper(collConstrJs: ICollConstrJsOpt, correctQuery: string) {
  const client = new SparqlClientImplMock();
  const coll = await selectObjectsQuery(collConstrJs, testNs, client);
  expect(coll).not.toBeUndefined();
  //expect(coll.length).toBe(0);
  const genQueryStr = client.sparqlSelectParams.query;
  //console.log(genQueryStr);
  const parser = new Parser();
  const correctParsedQuery = parser.parse(correctQuery);
  expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery as any);
}

async function constructTestHelper(collConstrJs: ICollConstrJsOpt, correctQuery: string) {
  const client = new SparqlClientImplMock();
  const coll = await constructObjectsQuery(collConstrJs, testNs, client);
  expect(coll).not.toBeUndefined();
  //expect(coll.length).toBe(0);
  const genQueryStr = client.sparqlConstructParams.query;
  //console.log(genQueryStr);
  const parser = new Parser();
  const correctParsedQuery = parser.parse(correctQuery);
  expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery as any);
}

async function deleteTestHelper(
  collConstrJs: ICollConstrJsOpt,
  conditions: JsObject | JsObject[] | undefined,
  correctQuery: string,
) {
  const client = new SparqlClientImplMock();
  await deleteObjectQuery(collConstrJs, testNs, client, conditions);
  const genQueryStr = client.sparqlUpdateParams.query;
  //console.log(genQueryStr);
  const parser = new Parser();
  const correctParsedQuery = parser.parse(correctQuery);
  expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery as any);
}

async function insertTestHelper(
  collConstrJs: ICollConstrJsOpt,
  data: JsObject | JsObject[] | undefined,
  correctQuery: string,
) {
  const client = new SparqlClientImplMock();
  await insertObjectQuery(collConstrJs, testNs, client, data);
  const genQueryStr = client.sparqlUpdateParams.query;
  //console.log(genQueryStr);
  const parser = new Parser();
  const correctParsedQuery = parser.parse(correctQuery);
  expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery as any);
}

async function updateTestHelper(
  collConstrJs: ICollConstrJsOpt,
  conditions: JsObject | JsObject[] | undefined,
  data: JsObject | JsObject[] | undefined,
  correctQuery: string,
) {
  const client = new SparqlClientImplMock();
  await updateObjectQuery(collConstrJs, testNs, client, conditions, data);
  const genQueryStr = client.sparqlUpdateParams.query;
  //console.log(genQueryStr);
  const parser = new Parser();
  const correctParsedQuery = parser.parse(correctQuery);
  expect(parser.parse(genQueryStr)).toMatchObject(correctParsedQuery as any);
}
