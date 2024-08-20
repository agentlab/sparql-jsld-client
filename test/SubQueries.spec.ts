/********************************************************************************
 * Copyright (c) 2021 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { afterAll, beforeAll, describe, expect, jest, it } from '@jest/globals';
import { when } from 'mobx';
import { getSnapshot } from 'mobx-state-tree';

import { rootModelInitialState } from '../src/models/Model';
import { MstRepository } from '../src/models/MstRepository';
import { JsObject } from '../src/ObjectProvider';
import { factory } from '../src/SparqlGen';
import { SparqlClientImpl } from '../src/SparqlClientImpl';
import { uploadFiles } from '../src/FileUpload';

import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import {
  artifactSchema,
  HSObservationShapeSchema,
  HSObservationShapeSchemaForCardsList,
  ProductCardShapeSchemaForCardsList,
  usedInModuleSchema,
  usedInSchema,
} from './schema/TestSchemas';
import { expectToBeDefined, genTimestampedName } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

const client = new SparqlClientImpl(
  'https://rdf4j.agentlab.ru/rdf4j-server',
  'https://rdf4j.agentlab.ru/rdf4j-server/repositories/mktp-schema20/namespaces',
);
client.setRepositoryId('mktp-fed20');

describe.skip('SubQueries should work', () => {
  it('SubQueries ProductCards', async () => {
    const result = await client.sparqlSelect(
      `PREFIX hs: <https://huntersales.ru/schema#>
      SELECT ?card ?name ?lastMonthSalesValue WHERE {
        ?card a hs:ProductCard ;
          hs:name ?name ;
          hs:lastMonthSalesValue ?lastMonthSalesValue .
      }
      ORDER BY DESC(?lastMonthSalesValue)
      LIMIT 20`,
    );
    //console.log(result.bindings);
    expect(result.bindings.length).toBe(20);
  });
  it('SubQueries HSObservation1', async () => {
    const result = await client.sparqlSelect(
      `PREFIX hs: <https://huntersales.ru/schema#>
      SELECT DISTINCT ?obs ?parsedAt ?price ?saleValue ?totalSales WHERE {
        ?obs a hs:HSObservation ;
          hs:product <https://www.wildberries.ru/catalog/10322023/detail.aspx> ;
          hs:parsedAt ?parsedAt ;
          hs:price ?price ;
          hs:saleValue ?saleValue ;
          hs:totalSales ?totalSales .
      }
      ORDER BY ?parsedAt
      LIMIT 20`,
    );
    //console.log(result.bindings);
    expect(result.bindings.length).toBeGreaterThan(0);
  });
  it('SubQueries HSObservation2', async () => {
    const result = await client.sparqlSelect(
      `PREFIX hs: <https://huntersales.ru/schema#>
      SELECT DISTINCT ?obs ?parsedAt ?price ?saleValue ?totalSales WHERE {
        ?obs a hs:HSObservation ;
          hs:product <https://www.wildberries.ru/catalog/10322023/detail.aspx> ;
          hs:parsedAt ?parsedAt ;
          hs:price ?price ;
          hs:saleValue ?saleValue ;
          hs:totalSales ?totalSales .
        filter(?parsedAt >= "2021-07-01T00:00:00"^^xsd:dateTime)
      }
      ORDER BY ?parsedAt
      LIMIT 20`,
    );
    //console.log(result.bindings);
    expect(result.bindings.length).toBeGreaterThan(0);
  });
  it('SubQueries HSObservation-of-ProductCards', async () => {
    const result = await client.sparqlSelect(
      `PREFIX hs: <https://huntersales.ru/schema#>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      SELECT ?card ?name ?lastMonthSalesValue ?obs ?parsedAt ?price ?saleValue ?totalSales WHERE {
        ?obs a hs:HSObservation ;
          hs:product ?card ;
          hs:parsedAt ?parsedAt ;
          hs:price ?price ;
          hs:saleValue ?saleValue ;
          hs:totalSales ?totalSales .
        {
          SELECT ?card ?name ?lastMonthSalesValue WHERE {
            ?card a hs:ProductCard ;
              hs:name ?name ;
              hs:lastMonthSalesValue ?lastMonthSalesValue .
          }
          ORDER BY DESC(?lastMonthSalesValue)
          LIMIT 2
        }
        filter(?parsedAt >= "2021-07-01T00:00:00"^^xsd:dateTime)
      }
      ORDER BY DESC(?lastMonthSalesValue) ?parsedAt`,
    );
    //console.log(result.bindings);
    expect(result.bindings.length).toBeGreaterThan(0);
  });
});

describe.skip('Retrieve subqueries', () => {
  const client = new SparqlClientImpl(
    'https://rdf4j.agentlab.ru/rdf4j-server',
    'https://rdf4j.agentlab.ru/rdf4j-server/repositories/mktp-schema20/namespaces',
  );
  const repository = MstRepository.create({ ...rootModelInitialState, repId: 'mktp-fed20' }, { client });

  beforeAll(async () => {
    await repository.ns.reloadNs();
  });

  it('Retrieve HSObservation-of-ProductCards with hardcoded schema', async () => {
    const coll1 = repository.addColl({
      '@id': 'rm:collConstr1',
      entConstrs: [
        {
          schema: ProductCardShapeSchemaForCardsList,
          conditions: {
            hasObservations: '?eIri1',
          },
          orderBy: [{ expression: factory.variable('lastMonthSalesValue0'), descending: true }],
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
          orderBy: [{ expression: factory.variable('parsedAt1'), descending: false }],
        },
      ],
      orderBy: [
        { expression: factory.variable('lastMonthSalesValue0'), descending: true },
        { expression: factory.variable('parsedAt1'), descending: false },
      ],
    });
    expectToBeDefined(coll1);
    await coll1.loadColl();
    const data: any = coll1.dataJs;
    expect(data.length).toBe(2);
    expect(data[0]).toMatchObject({});
    repository.removeColl(coll1);
  });

  it('Retrieve Federated HSObservation with hardcoded schema', async () => {
    const coll1 = repository.addColl({
      '@id': 'rm:collConstr1',
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
          service: 'http://192.168.1.33:8090/sparql',
        },
      ],
      orderBy: [{ expression: factory.variable('parsedAt0'), descending: false }],
    });
    expectToBeDefined(coll1);
    await coll1.loadColl();
    const data: any = coll1.dataJs;
    expect(data.length).toBeGreaterThan(10);
    expect(data[0]).toMatchObject({});
    repository.removeColl(coll1);
  });

  it('should return ProductCardCardsListShape schema with reverse property', async () => {
    let schema = await repository.schemas.loadSchemaByIri('hs:ProductCardCardsListShape');
    schema = getSnapshot(schema);
    expectToBeDefined(schema);
  });

  it('Retrieve HSObservation-of-ProductCards with remote schema', async () => {
    const coll1 = repository.addColl({
      '@id': 'rm:collConstr1',
      entConstrs: [
        {
          schema: 'hs:ProductCardCardsListShape',
          conditions: {
            hasObservations: '?eIri1',
          },
          orderBy: [{ expression: factory.variable('lastMonthSalesValue0'), descending: true }],
          limit: 2,
        },
        {
          schema: 'hs:HSObservationCardsListShape',
          conditions: {
            parsedAt: {
              relation: 'after',
              value: ['2021-07-01T00:00:00'],
            },
          },
          orderBy: [{ expression: factory.variable('parsedAt1'), descending: false }],
        },
      ],
      orderBy: [
        { expression: factory.variable('lastMonthSalesValue0'), descending: true },
        { expression: factory.variable('parsedAt1'), descending: false },
      ],
    });
    expectToBeDefined(coll1);
    await coll1.loadColl();
    const data: any = coll1.dataJs;
    expect(data.length).toBe(2);
    expect(data[0]).toMatchObject({});
    repository.removeColl(coll1);
  });
});
