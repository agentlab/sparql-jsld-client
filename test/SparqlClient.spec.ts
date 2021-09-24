/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { afterAll, beforeAll, describe, expect, jest, it } from '@jest/globals';
import jsonld from 'jsonld';

import { rootModelInitialState } from '../src/models/Model';
import { MstRepository } from '../src/models/MstRepository';
import { SparqlClientImpl } from '../src/SparqlClientImpl';
//import { json2str } from '../src/ObjectProvider';
import { uploadFiles } from '../src/FileUpload';

import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import {
  vocabsFiles,
  shapesFiles,
  rootFolder,
  testNs,
  projectsFoldersFiles,
  samplesFiles,
  usersFiles,
} from './configTests';
import { genTimestampedName } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

const client = new SparqlClientImpl(rdfServerUrl);
const repository = MstRepository.create(rootModelInitialState, { client });
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_SparqlClient');
  try {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await uploadFiles(client, vocabsFiles, rootFolder);
    await uploadFiles(client, usersFiles, rootFolder);
    await uploadFiles(client, projectsFoldersFiles, rootFolder);
    await uploadFiles(client, samplesFiles, rootFolder);
    await uploadFiles(client, shapesFiles, rootFolder);
  } catch (error: any) {
    if (error.response) {
      // Request made and server responded
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      const s = error.request;
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', error.message);
    }
    // eslint-disable-next-line no-undef
    fail(error);
  }
});

afterAll(async () => {
  try {
    await client.deleteRepository(rmRepositoryID);
  } catch (err) {
    // eslint-disable-next-line no-undef
    fail(err);
  }
});

describe('SparqlClient', () => {
  it(`SparqlClient should select namespaces`, async () => {
    expect(repository.ns.current.size).toBe(5);
    await repository.ns.reloadNs();
    //console.log(getSnapshot(repository.ns.current));
    expect(repository.ns.current.size).toBeGreaterThan(5);

    const ns = repository.ns.currentJs;
    expect(ns.rdf).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
  });
  it(`SparqlClient should select direct parent classes`, async () => {
    const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
    SELECT ?superClass WHERE { cpgu:Classifier rdfs:subClassOf ?superClass. }`;
    const results = await client.sparqlSelect(query, { infer: 'false' });
    //console.log('results', json2str(results));
    expect(results.bindings).toHaveLength(1);
  });
  it(`SparqlClient should select one directSubClassOf with enabled inference`, async () => {
    const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
    SELECT ?superClass WHERE { cpgu:Classifier sesame:directSubClassOf ?superClass. }`;
    const results = await client.sparqlSelect(query);
    //console.log('results', json2str(results));
    expect(results.bindings).toHaveLength(1);
  });

  it(`SparqlClient should construct Artifact shape with array props`, async () => {
    /*const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX sh: <http://www.w3.org/ns/shacl#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
    CONSTRUCT {
      ?eIri0 rdf:type sh:NodeShape;
        sh:targetClass rm:Artifact;
        dcterms:title ?title0;
        dcterms:description ?description0;
        rm:inCreationMenu ?inCreationMenu0;
        rm:defaultIndividNs ?defaultIndividNs0;
        rm:defaultFormat ?defaultFormat0;
        rm:iconReference ?iconReference0;
        sh:property ?eIri1.
      ?eIri1 rdf:type sh:PropertyShape;
        sh:path ?path1;
        sh:name ?name1;
        sh:description ?description1;
        sh:order ?order1;
        sh:datatype ?datatype1;
        sh:minCount ?minCount1;
        sh:maxCount ?maxCount1;
        sh:class ?class1;
        sh:nodeKind ?nodeKind1;
        rm:shapeModifiability ?shapeModifiability1;
        rm:valueModifiability ?valueModifiability1.
    } WHERE {
      ?eIri0 rdf:type sh:NodeShape;
        sh:targetClass rm:Artifact.
      OPTIONAL { ?eIri0 dcterms:title ?title0. }
      OPTIONAL { ?eIri0 dcterms:description ?description0. }
      OPTIONAL { ?eIri0 rm:inCreationMenu ?inCreationMenu0. }
      OPTIONAL { ?eIri0 rm:defaultIndividNs ?defaultIndividNs0. }
      OPTIONAL { ?eIri0 rm:defaultFormat ?defaultFormat0. }
      OPTIONAL { ?eIri0 rm:iconReference ?iconReference0. }
      OPTIONAL {
        ?eIri0 sh:property ?eIri1.
        ?eIri1 rdf:type sh:PropertyShape;
          sh:path ?path1.
      }
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
    }`;*/

    const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX sh: <http://www.w3.org/ns/shacl#>
    PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
    CONSTRUCT {
      ?eIri0 rdf:type sh:NodeShape;
        sh:targetClass rm:Artifact;
        sh:property ?eIri1;
        dcterms:title ?title0;
        dcterms:description ?description0;
        rm:inCreationMenu ?inCreationMenu0;
        rm:defaultIndividNs ?defaultIndividNs0;
        rm:defaultFormat ?defaultFormat0;
        rm:iconReference ?iconReference0.
      ?eIri1 rdf:type sh:PropertyShape;
        sh:name ?name1;
        sh:description ?description1;
        sh:path ?path1;
        sh:order ?order1;
        sh:datatype ?datatype1;
        sh:minCount ?minCount1;
        sh:maxCount ?maxCount1;
        sh:class ?class1;
        sh:nodeKind ?nodeKind1;
        rm:shapeModifiability ?shapeModifiability1;
        rm:valueModifiability ?valueModifiability1.
    } WHERE {
      ?eIri0 rdf:type sh:NodeShape;
        sh:targetClass rm:Artifact.
      OPTIONAL { ?eIri0 sh:property ?eIri1. }
      OPTIONAL { ?eIri0 dcterms:title ?title0. }
      OPTIONAL { ?eIri0 dcterms:description ?description0. }
      OPTIONAL { ?eIri0 rm:inCreationMenu ?inCreationMenu0. }
      OPTIONAL { ?eIri0 rm:defaultIndividNs ?defaultIndividNs0. }
      OPTIONAL { ?eIri0 rm:defaultFormat ?defaultFormat0. }
      OPTIONAL { ?eIri0 rm:iconReference ?iconReference0. }
      OPTIONAL { ?eIri1 rdf:type sh:PropertyShape. }
      OPTIONAL { ?eIri1 sh:path ?path1. }
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
    }`;
    const results = await client.sparqlConstruct(query);
    //expect(results).toHaveLength(1);
    //console.log('results', json2str(results));
    const context = {
      '@version': 1.1,
      ...testNs,
      targetClass: {
        '@id': 'sh:targetClass',
        '@type': '@id',
      },
      title: 'dcterms:title',
      description: 'dcterms:description',
      inCreationMenu: 'rm:inCreationMenu',
      defaultIndividNs: {
        '@id': 'rm:defaultIndividNs',
        '@type': '@id',
      },
      defaultFormat: {
        '@id': 'rm:defaultFormat',
        '@type': '@id',
      },
      iconReference: {
        '@id': 'rm:iconReference',
        '@type': '@id',
      },
      //property: 'sh:property',
      property: {
        '@id': 'sh:property',
        '@container': '@id',
        '@context': {
          //'@base': 'rm:',
          description: 'sh:description',
          datatype: {
            '@id': 'sh:datatype',
            '@type': '@id',
          },
          path: {
            '@id': 'sh:path',
            '@type': '@id',
          },
          order: {
            '@id': 'sh:order',
            '@type': 'xsd:integer',
          },
          name: 'sh:name',
          minCount: {
            '@id': 'sh:minCount',
            '@type': 'xsd:integer',
          },
          maxCount: {
            '@id': 'sh:maxCount',
            '@type': 'xsd:integer',
          },
          class: {
            '@id': 'sh:class',
            '@type': '@id',
          },
          nodeKind: {
            '@id': 'sh:nodeKind',
            '@type': '@id',
          },
          shapeModifiability: 'rm:shapeModifiability',
          valueModifiability: 'rm:valueModifiability',
        },
      },

      /*description: 'sh:description',
      datatype: {
        '@id': 'sh:datatype',
        '@type': '@id',
      },
      path: {
        '@id': 'sh:path',
        '@type': '@id',
      },
      order: {
        '@id': 'sh:order',
        '@type': 'xsd:integer',
      },
      name: 'sh:name',
      minCount: {
        '@id': 'sh:minCount',
        '@type': 'xsd:integer',
      },
      maxCount: {
        '@id': 'sh:maxCount',
        '@type': 'xsd:integer',
      },
      class: {
        '@id': 'sh:class',
        '@type': '@id',
      },
      nodeKind: {
        '@id': 'sh:nodeKind',
        '@type': '@id',
      },
      shapeModifiability: 'rm:shapeModifiability',
      valueModifiability: 'rm:valueModifiability',*/
    };
    const compacted = await jsonld.compact(results, context);
    //console.log(JSON.stringify(compacted, null, 2));
    // replace native types
    // { @id: 'some-iri' } -> 'some-iri'
    // { @type: xsd:integer, value: '1' } -> 1
    // xhtml string
    // localized string
    // abbreviate IRIs
  });

  it(`SparqlClient should construct Classifier shape with array props`, async () => {
    const targetClass = 'cpgu:Classifier';
    /*const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX sh: <http://www.w3.org/ns/shacl#>
    PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
    PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
    CONSTRUCT {
      ?eIri0 rdf:type sh:NodeShape.
      ?eIri0 sh:targetClass ${targetClass}.
      ?eIri0 sh:property ?eIri1.
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
      {
        ?eIri0 rdf:type sh:NodeShape;
          sh:targetClass ${targetClass}.
        OPTIONAL { ?eIri0 dcterms:title ?title0. }
        OPTIONAL { ?eIri0 dcterms:description ?description0. }
        OPTIONAL { ?eIri0 rm:inCreationMenu ?inCreationMenu0. }
        OPTIONAL { ?eIri0 rm:defaultIndividNs ?defaultIndividNs0. }
        OPTIONAL { ?eIri0 rm:defaultFormat ?defaultFormat0. }
        OPTIONAL { ?eIri0 rm:iconReference ?iconReference0. }
      } UNION {
        ?eIri0 rdf:type sh:NodeShape;
          sh:targetClass ${targetClass};
          sh:property ?eIri1.
        ?eIri1 rdf:type sh:PropertyShape.
        OPTIONAL { ?eIri1 sh:path ?path1. }
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
    ORDER BY (?order1)`;*/
    const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX sh: <http://www.w3.org/ns/shacl#>
    PREFIX rm: <http://cpgu.kbpm.ru/ns/rm/rdf#>
    PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
    CONSTRUCT {
      ?eIri0 rdf:type sh:NodeShape.
      ?eIri0 sh:targetClass ${targetClass}.
      ?eIri0 sh:property ?eIri1.
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
        ?eIri0 sh:property ?eIri1.
        ?eIri1 rdf:type sh:PropertyShape;
          sh:path ?path1.
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
    ORDER BY (?order1)`;
    const results = await client.sparqlConstruct(query);
    expect(results).toHaveLength(1);
    //console.log('results', json2str(results));
    const context = {
      '@version': 1.1,
      ...testNs,
      targetClass: {
        '@id': 'sh:targetClass',
        '@type': '@id',
      },
      title: 'dcterms:title',
      description: 'dcterms:description',
      inCreationMenu: 'rm:inCreationMenu',
      defaultIndividNs: {
        '@id': 'rm:defaultIndividNs',
        '@type': '@id',
      },
      defaultFormat: {
        '@id': 'rm:defaultFormat',
        '@type': '@id',
      },
      iconReference: {
        '@id': 'rm:iconReference',
        '@type': '@id',
      },
      //property: 'sh:property',
      property: {
        '@id': 'sh:property',
        //'@container': '@id',
        '@context': {
          //'@base': 'rm:',
          description: 'sh:description',
          datatype: {
            '@id': 'sh:datatype',
            '@type': '@id',
          },
          path: {
            '@id': 'sh:path',
            '@type': '@id',
          },
          order: {
            '@id': 'sh:order',
            '@type': 'xsd:integer',
          },
          name: 'sh:name',
          minCount: {
            '@id': 'sh:minCount',
            '@type': 'xsd:integer',
          },
          maxCount: {
            '@id': 'sh:maxCount',
            '@type': 'xsd:integer',
          },
          class: {
            '@id': 'sh:class',
            '@type': '@id',
          },
          nodeKind: {
            '@id': 'sh:nodeKind',
            '@type': '@id',
          },
          shapeModifiability: 'rm:shapeModifiability',
          valueModifiability: 'rm:valueModifiability',
        },
      },

      /*description: 'sh:description',
      datatype: {
        '@id': 'sh:datatype',
        '@type': '@id',
      },
      path: {
        '@id': 'sh:path',
        '@type': '@id',
      },
      order: {
        '@id': 'sh:order',
        '@type': 'xsd:integer',
      },
      name: 'sh:name',
      minCount: {
        '@id': 'sh:minCount',
        '@type': 'xsd:integer',
      },
      maxCount: {
        '@id': 'sh:maxCount',
        '@type': 'xsd:integer',
      },
      class: {
        '@id': 'sh:class',
        '@type': '@id',
      },
      nodeKind: {
        '@id': 'sh:nodeKind',
        '@type': '@id',
      },
      shapeModifiability: 'rm:shapeModifiability',
      valueModifiability: 'rm:valueModifiability',*/
    };
    const compacted = await jsonld.compact(results, context);
    //console.log(JSON.stringify(compacted, null, 2));
    // replace native types
    // { @id: 'some-iri' } -> 'some-iri'
    // { @type: xsd:integer, value: '1' } -> 1
    // xhtml string
    // localized string
    // abbreviate IRIs
  });

  /*
  const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX nav: <http://cpgu.kbpm.ru/ns/rm/navigation#>
    PREFIX oslc: <http://open-services.net/ns/core#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    CONSTRUCT {
      ?eIri0 rdf:type nav:folder.
      ?eIri0 nav:parent ?parent0.
      ?eIri0 dcterms:title ?title0.
      ?eIri0 dcterms:description ?description0.
      ?eIri0 dcterms:creator ?creator0.
      ?eIri0 dcterms:created ?created0.
      ?eIri0 oslc:modifiedBy ?modifiedBy0.
      ?eIri0 dcterms:modified ?modified0.
      ?eIri0 nav:processArea ?processArea0.
    }
    WHERE {
      ?eIri0 rdf:type nav:folder;
        dcterms:title ?title0.
      OPTIONAL { ?eIri0 nav:parent ?parent0. }
      OPTIONAL { ?eIri0 dcterms:description ?description0. }
      OPTIONAL { ?eIri0 dcterms:creator ?creator0. }
      OPTIONAL { ?eIri0 dcterms:created ?created0. }
      OPTIONAL { ?eIri0 oslc:modifiedBy ?modifiedBy0. }
      OPTIONAL { ?eIri0 dcterms:modified ?modified0. }
      OPTIONAL { ?eIri0 nav:processArea ?processArea0. }
    }`; 
   */

  it(`SparqlClient should construct Folder`, async () => {
    const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX nav: <http://cpgu.kbpm.ru/ns/rm/navigation#>
    PREFIX oslc: <http://open-services.net/ns/core#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    CONSTRUCT {
      ?eIri0 rdf:type nav:folder.
      ?eIri0 nav:parent ?parent0.
      ?eIri0 dcterms:title ?title0.
      ?eIri0 dcterms:description ?description0.
      ?eIri0 dcterms:creator ?creator0.
      ?eIri0 dcterms:created ?created0.
      ?eIri0 oslc:modifiedBy ?modifiedBy0.
      ?eIri0 dcterms:modified ?modified0.
      ?eIri0 nav:processArea ?processArea0.
    }
    WHERE {
      ?eIri0 rdf:type nav:folder;
        dcterms:title ?title0.
      OPTIONAL { ?eIri0 nav:parent ?parent0. }
      OPTIONAL { ?eIri0 dcterms:description ?description0. }
      OPTIONAL { ?eIri0 dcterms:creator ?creator0. }
      OPTIONAL { ?eIri0 dcterms:created ?created0. }
      OPTIONAL { ?eIri0 oslc:modifiedBy ?modifiedBy0. }
      OPTIONAL { ?eIri0 dcterms:modified ?modified0. }
      OPTIONAL { ?eIri0 nav:processArea ?processArea0. }
    }`;
    const results = await client.sparqlConstruct(query);
    expect(results).toHaveLength(8);
  });
});
