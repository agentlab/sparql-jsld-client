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
import { compact, ContextDefinition } from 'jsonld';

import { rootModelInitialState } from '../src/models/Model';
import { MstRepository } from '../src/models/MstRepository';
import { SparqlClientImpl } from '../src/SparqlClientImpl';
import { uploadFiles } from '../src/FileUpload';

import { expectToBeDefined, genTimestampedName } from './TestHelpers';
import { SparqlClientImplMock } from './SparqlClientImplMock';
import exp from 'constants';
import { getSnapshot } from 'mobx-state-tree';
import { JsObject } from '../src';

describe('MstModel_Coll', () => {
  it(`MstModel_Coll should update `, async () => {
    const client = new SparqlClientImplMock();
    const rootModelInitialStateWithColls = {
      ...rootModelInitialState,
      colls: {
        'rm:Artifacts_Coll': {
          '@id': 'rm:Artifacts_Coll',
          collConstr: {
            '@id': 'rm:Artifacts_Coll',
            '@type': 'aldkg:CollConstr',
            entConstrs: [
              {
                '@id': 'rm:Artifacts_Coll_Ent',
                '@type': 'aldkg:EntConstr',
                schema: 'rm:ArtifactShape',
                conditions: {},
                data: {},
              },
            ],
          },
          updPeriod: 300,
          lazy: true,
          dataIntrnl: [
            {
              '@id': 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
              '@type': 'rm:Artifact',
              identifier: 30000,
              title: 'ТН ВЭД ТС',
            },
            {
              '@id': 'cpgu:_tHAikozUEeOiy8owVBW5pQ',
              '@type': 'rm:Artifact',
              identifier: 30001,
              title: 'ТН ВЭД ТС',
            },
            {
              '@id': 'cpgu:_zYXy8ozUEeOiy8owVBW5pQ',
              '@type': 'rm:Artifact',
              identifier: 30002,
              title: 'Наименование раздела',
            },
            {
              '@id': 'cpgu:_3AP4kYzUEeOiy8owVBW5pQ',
              '@type': 'rm:Artifact',
              identifier: 30003,
              title: 'Код товарной группы',
            },
          ],
          lastSynced: 1723761063624,
          isLoading: false,
          pageSize: 500,
          resolveCollConstrs: true,
        },
      },
    };
    const rep = MstRepository.create(rootModelInitialStateWithColls, { client });
    const coll = rep.getColl('rm:Artifacts_Coll');
    expectToBeDefined(coll);
    expect(coll.dataIntrnl.length).toBe(4);
    // add el
    coll?.addElems({
      '@id': 'cpgu:_HmFCYozVEeOiy8owVBW5pQ',
      '@type': 'rm:Artifact',
      identifier: 30004,
      title: 'Код товарной позиции',
    });
    expect(coll.dataIntrnl.length).toBe(5);
    const e1 = coll.dataByIri('cpgu:_HmFCYozVEeOiy8owVBW5pQ');
    expectToBeDefined(e1);
    const e1Data: JsObject = getSnapshot(e1);
    expect(e1Data.title).toBe('Код товарной позиции');
    // add two same els and one new el
    coll.addElems([
      // updated el
      {
        '@id': 'cpgu:_tHAikozUEeOiy8owVBW5pQ',
        '@type': 'rm:Artifact',
        identifier: 30001,
        title: 'ТН ВЭД ТС Changed',
      },
      // same el
      {
        '@id': 'cpgu:_HmFCYozVEeOiy8owVBW5pQ',
        '@type': 'rm:Artifact',
        identifier: 30004,
        title: 'Код товарной позиции',
      },
      // new el
      {
        '@id': 'cpgu:_L8Lf8YzVEeOiy8owVBW5pQ',
        '@type': 'rm:Artifact',
        identifier: 30005,
        title: 'Код товарной субпозиции',
      },
    ]);
    //console.log(coll?.dataJs);
    expect(coll.dataIntrnl.length).toBe(6);
    // check updated el
    const e2 = coll.dataByIri('cpgu:_tHAikozUEeOiy8owVBW5pQ');
    expectToBeDefined(e2);
    const e2Data: JsObject = getSnapshot(e2);
    expect(e2Data.title).toBe('ТН ВЭД ТС Changed');
    // check same el
    const e3 = coll.dataByIri('cpgu:_HmFCYozVEeOiy8owVBW5pQ');
    expectToBeDefined(e3);
    const e3Data: JsObject = getSnapshot(e3);
    expect(e3Data.title).toBe('Код товарной позиции');
    // check new added el
    const e4 = coll.dataByIri('cpgu:_L8Lf8YzVEeOiy8owVBW5pQ');
    expectToBeDefined(e4);
    const e4Data: JsObject = getSnapshot(e4);
    expect(e4Data.title).toBe('Код товарной субпозиции');
  });
});
