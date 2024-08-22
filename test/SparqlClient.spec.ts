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
import assert from 'assert';
import { compact, ContextDefinition } from 'jsonld';

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
  } catch (err: any) {
    if (err.response) {
      // Request made and server responded
      console.log(err.response.data);
      console.log(err.response.status);
      console.log(err.response.headers);
    } else if (err.request) {
      // The request was made but no response was received
      const s = err.request;
      console.log(err.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', err.message);
    }
    assert.fail(err);
  }
});

afterAll(async () => {
  try {
    await client.deleteRepository(rmRepositoryID);
  } catch (err: any) {
    assert.fail(err);
  }
});

describe('SparqlClient', () => {
  it(`SparqlClient should select namespaces`, async () => {
    expect(repository.ns.current.size).toBe(6);
    await repository.ns.reloadNs();
    //console.log(getSnapshot(repository.ns.current));
    expect(repository.ns.current.size).toBeGreaterThan(6);

    const ns = repository.ns.currentJs;
    expect(ns.rdf).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
  });
  it(`SparqlClient should select direct parent classes`, async () => {
    const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX clss: <https://agentlab.eu/ns/rm/classifier#>
    SELECT ?superClass WHERE { clss:Classifier rdfs:subClassOf ?superClass. }`;
    const results = await client.sparqlSelect(query, { infer: 'false' });
    //console.log('results', json2str(results));
    expect(results.bindings).toHaveLength(1);
  });
  it(`SparqlClient should select one directSubClassOf with enabled inference`, async () => {
    const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX clss: <https://agentlab.eu/ns/rm/classifier#>
    SELECT ?superClass WHERE { clss:Classifier sesame:directSubClassOf ?superClass. }`;
    const results = await client.sparqlSelect(query);
    //console.log('results', json2str(results));
    expect(results.bindings).toHaveLength(1);
  });

  it(`SparqlClient should construct Artifact shape with array props`, async () => {
    /*const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX sh: <http://www.w3.org/ns/shacl#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX rm: <https://agentlab.eu/ns/rm/rdf#>
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
    PREFIX rm: <https://agentlab.eu/ns/rm/rdf#>
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
    const context: ContextDefinition = {
      // mismatch in property type, number 1.1 in jsonld.js vs string "1.1" in @types/jsonld
      '@version': 1.1 as any,
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
    const compacted = await compact(results, context);
    //console.log(JSON.stringify(compacted, null, 2));
    // replace native types
    // { @id: 'some-iri' } -> 'some-iri'
    // { @type: xsd:integer, value: '1' } -> 1
    // xhtml string
    // localized string
    // abbreviate IRIs
  });

  it(`SparqlClient should construct Classifier shape with array props`, async () => {
    const targetClass = 'clss:Classifier';
    /*const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX sh: <http://www.w3.org/ns/shacl#>
    PREFIX rm: <https://agentlab.eu/ns/rm/rdf#>
    PREFIX clss: <https://agentlab.eu/ns/rm/classifier#>
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
    PREFIX rm: <https://agentlab.eu/ns/rm/rdf#>
    PREFIX clss: <https://agentlab.eu/ns/rm/classifier#>
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
    const context: ContextDefinition = {
      // mismatch in property type, number 1.1 in jsonld.js vs string "1.1" in @types/jsonld
      '@version': 1.1 as any,
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
    const compacted = await compact(results, context);
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
    PREFIX nav: <https://agentlab.eu/ns/rm/navigation#>
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
    PREFIX nav: <https://agentlab.eu/ns/rm/navigation#>
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

  //TODO: Federated Queries tests not working due to shut downed services
  // it(`SparqlClient should get federated timeseries`, async () => {
  //   const client = new SparqlClientImpl(rdfServerUrl);
  //   client.setRepositoryId('mktp-fed');
  //   const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  //   PREFIX iot: <https://agentlab.eu/ns/iot#>
  //   CONSTRUCT {
  //     ?eIri0 rdf:type iot:HSObservation.
  //     ?eIri0 iot:product <https://www.acme.com/catalog/10477061/detail.aspx>.
  //     ?eIri0 iot:parsedAt ?parsedAt0.
  //     ?eIri0 iot:categoryPopularity ?categoryPopularity0.
  //     ?eIri0 iot:commentsCount ?commentsCount0.
  //     ?eIri0 iot:price ?price0.
  //     ?eIri0 iot:questionsCount ?questionsCount0.
  //     ?eIri0 iot:saleValue ?saleValue0.
  //     ?eIri0 iot:salesAmountDiff ?salesAmountDiff0.
  //     ?eIri0 iot:stocksDiffOrders ?stocksDiffOrders0.
  //     ?eIri0 iot:stocksDiffReturns ?stocksDiffReturns0.
  //     ?eIri0 iot:stocks ?stocks0.
  //     ?eIri0 iot:totalSalesDiff ?totalSalesDiff0.
  //     ?eIri0 iot:totalSales ?totalSales0.
  //   }
  //   WHERE {
  //     SERVICE <http://192.168.1.33:8090/sparql> {
  //     ?eIri0 rdf:type iot:HSObservation;
  //       iot:product <https://www.acme.com/catalog/10477061/detail.aspx>;
  //       iot:parsedAt ?parsedAt0;
  //       iot:categoryPopularity ?categoryPopularity0;
  //       iot:commentsCount ?commentsCount0;
  //       iot:price ?price0;
  //       iot:questionsCount ?questionsCount0;
  //       iot:saleValue ?saleValue0;
  //       iot:salesAmountDiff ?salesAmountDiff0;
  //       iot:stocksDiffOrders ?stocksDiffOrders0;
  //       iot:stocksDiffReturns ?stocksDiffReturns0;
  //       iot:stocks ?stocks0;
  //       iot:totalSalesDiff ?totalSalesDiff0;
  //       iot:totalSales ?totalSales0.
  //   }
  //   }
  //   ORDER BY (?parsedAt)`;
  //   //const markerJsonLdStart = 'json-ld-start';
  //   //const markerJsonLdStop = 'json-ld-stop';
  //   //performance.mark(markerJsonLdStart);
  //   //let results = await client.sparqlConstruct(query, {}, 'application/ld+json');
  //   //performance.mark(markerJsonLdStop);
  //   //performance.measure('json-ld measure', markerJsonLdStart, markerJsonLdStop);
  //   //expect(results.length).toBeGreaterThan(50);

  //   //const markerRdfXmlStart = 'rdf+xml-start';
  //   //const markerRdfXmlStop = 'rdf+xml-stop';
  //   //performance.mark(markerRdfXmlStart);
  //   const results = await client.sparqlConstruct(query, {}, 'application/rdf+xml');
  //   //performance.mark(markerRdfXmlStop);
  //   //performance.measure('rdf+xml measure', markerRdfXmlStart, markerRdfXmlStop);

  //   //const markerNTriplesStart = 'n-triples-start';
  //   //const markerNTriplesStop = 'n-triples-stop';
  //   //performance.mark(markerNTriplesStart);
  //   //results = await client.sparqlConstruct(query, {}, 'text/plain');
  //   //performance.mark(markerNTriplesStop);
  //   //performance.measure('n-triples measure', markerNTriplesStart, markerNTriplesStop);

  //   // Pull out all of the measurements.
  //   //console.log(performance.getEntriesByType('measure'));
  //   // Finally, clean up the entries.
  //   //performance.clearMarks();
  //   //performance.clearMeasures();
  //   //
  // });

  // it(`SparqlClient should get LIMITed timeseries`, async () => {
  //   const client = new SparqlClientImpl(rdfServerUrl);
  //   client.setRepositoryId('mktp-fed');
  //   /*const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  //   PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  //   PREFIX iot: <https://agentlab.eu/ns/iot#>
  //   CONSTRUCT {
  //     ?eIri0 rdf:type iot:ProductCard .
  //     ?eIri0 iot:name ?name0 .
  //     ?eIri0 iot:lastMonthSalesValue ?lastMonthSalesValue0 .
  //     ?eIri0 iot:saleValue ?saleValue0 .
  //     ?eIri0 iot:brand ?brand0 .
  //     ?eIri0 iot:seller ?seller0 .
  //     ?eIri0 iot:imageUrl ?imageUrl0 .
  //     ?eIri1 rdf:type iot:HSObservation .
  //     ?eIri1 iot:product ?eIri0 .
  //     ?eIri1 iot:parsedAt ?parsedAt1 .
  //     ?eIri1 iot:price ?price1 .
  //   } WHERE {
  //     {
  //       SELECT ?eIri0 ?name0 ?lastMonthSalesValue0 ?seller0 ?saleValue0 ?brand0 ?imageUrl0 WHERE {
  //         {
  //           SELECT ?eIri0 ?name0 ?lastMonthSalesValue0 ?seller0 ?saleValue0 ?brand0 WHERE {
  //             ?eIri0 rdf:type iot:ProductCard ;
  //               iot:name ?name0 ;
  //               iot:lastMonthSalesValue ?lastMonthSalesValue0 ;
  //               iot:seller ?seller0.
  //             OPTIONAL { ?eIri0 iot:saleValue ?saleValue0. }
  //             OPTIONAL { ?eIri0 iot:brand ?brand0. }
  //           }
  //           ORDER BY DESC(?lastMonthSalesValue0)
  //           LIMIT 2
  //         }
  //         OPTIONAL { ?eIri0 iot:imageUrl ?imageUrl }
  //       }
  //     } {
  //       ?eIri1 rdf:type iot:HSObservation ;
  //         iot:product ?eIri0 ;
  //         iot:parsedAt ?parsedAt1 ;
  //         iot:price ?price1 .
  //       filter(?parsedAt1 >= "2021-07-01T00:00:00"^^xsd:dateTime)
  //     }
  //   }
  //   ORDER BY DESC(?lastMonthSalesValue0) ?parsedAt1`;*/
  //   const query = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  //   PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  //   PREFIX iot: <https://agentlab.eu/ns/iot#>
  //   CONSTRUCT {
  //     ?eIri0 rdf:type iot:ProductCard .
  //     ?eIri0 iot:name ?name0 .
  //     ?eIri0 iot:lastMonthSalesValue ?lastMonthSalesValue0 .
  //     ?eIri0 iot:imageUrl ?imageUrl0 .
  //     ?eIri1 rdf:type iot:HSObservation .
  //     ?eIri1 iot:product ?eIri0 .
  //     ?eIri1 iot:parsedAt ?parsedAt1 .
  //     ?eIri1 iot:price ?price1 .
  //   } WHERE {
  //     {
  //       SELECT ?eIri0 ?name0 ?lastMonthSalesValue0 ?imageUrl0 WHERE {
  //         {
  //           SELECT ?eIri0 ?name0 ?lastMonthSalesValue0 WHERE {
  //             ?eIri0 rdf:type iot:ProductCard ;
  //               iot:name ?name0 ;
  //               iot:lastMonthSalesValue ?lastMonthSalesValue0 .
  //           }
  //           ORDER BY DESC(?lastMonthSalesValue0)
  //           LIMIT 2
  //         }
  //         OPTIONAL { ?eIri0 iot:imageUrl ?imageUrl }
  //       }
  //     } {
  //       ?eIri1 rdf:type iot:HSObservation ;
  //         iot:product ?eIri0 ;
  //         iot:parsedAt ?parsedAt1 ;
  //         iot:price ?price1 .
  //       filter(?parsedAt1 >= "2021-07-01T00:00:00"^^xsd:dateTime)
  //     }
  //   }
  //   ORDER BY DESC(?lastMonthSalesValue0) ?parsedAt1`;
  //   const results = await client.sparqlConstruct(query);
  //   expect(results).toHaveLength(2);
  // });
});
