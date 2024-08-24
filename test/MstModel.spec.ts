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
import { getSnapshot, isReferenceType } from 'mobx-state-tree';

import { expectToBeDefined, genTimestampedName } from './TestHelpers';
import { SparqlClientImplMock } from './SparqlClientImplMock';

import { rootModelInitialState } from '../src/models/Model';
import { MstRepository, TMstRepositorySnapshotIn } from '../src/models/MstRepository';
import { SparqlClientImpl } from '../src/SparqlClientImpl';
import { uploadFiles } from '../src/FileUpload';
import { TMstCollConstrSnapshotOut, JsObject, ICollConstrJsOpt } from '../src';

const rootModelInitialStateWithColls: TMstRepositorySnapshotIn = {
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
          '@id': 'file:///myfile.xml',
          '@type': 'rm:Artifact',
          identifier: 30000,
          title: 'Requirement Module 30000 Title',
        },
        {
          '@id': 'clss:_tHAikozUEeOiy8owVBW5pQ',
          '@type': 'rm:Artifact',
          identifier: 30001,
          title: 'Requirement Module 30000 - Grouping 30001 Title',
        },
        {
          '@id': 'clss:_zYXy8ozUEeOiy8owVBW5pQ',
          '@type': 'rm:Artifact',
          identifier: 30002,
          title: 'Requirement Module 30000 - Grouping 30002 Title',
        },
        {
          '@id': 'clss:_3AP4kYzUEeOiy8owVBW5pQ',
          '@type': 'rm:Artifact',
          identifier: 30003,
          title: 'Requirement Module 30000 - Grouping 30003 Title',
        },
      ],
      lastSynced: 1723761063624,
      isLoading: false,
      pageSize: 500,
      resolveCollConstrs: true,
    },
  },
};

describe('MstModel_Coll', () => {
  it('MstModel_Coll should correspond JS Types', async () => {
    const client = new SparqlClientImplMock();
    const rep = MstRepository.create(rootModelInitialStateWithColls, { client });
    const repJs = getSnapshot(rep);
    expectToBeDefined(repJs);
    const coll = rep.getColl('rm:Artifacts_Coll');
    expectToBeDefined(coll);
    const collConstr = coll.collConstr;
    expectToBeDefined(collConstr);
    const collConstrJs = getSnapshot<TMstCollConstrSnapshotOut>(collConstr);
    expectToBeDefined(collConstrJs);
    const collConstrJs2: ICollConstrJsOpt = collConstrJs;
    expectToBeDefined(collConstrJs2);
    const collConstrJs3: ICollConstrJsOpt = {
      '@id': '3',
      entConstrs: [],
    };
    expectToBeDefined(collConstrJs3);
  });

  it('MstModel_Coll should update', async () => {
    const client = new SparqlClientImplMock();
    const rep = MstRepository.create(rootModelInitialStateWithColls, { client });
    const coll = rep.getColl('rm:Artifacts_Coll');
    expectToBeDefined(coll);
    expect(coll.dataIntrnl.length).toBe(4);
    // add el
    coll?.addElems({
      '@id': 'clss:_HmFCYozVEeOiy8owVBW5pQ',
      '@type': 'rm:Artifact',
      identifier: 30004,
      title: 'Requirement Module 30000 - Grouping 30004 Title',
    });
    expect(coll.dataIntrnl.length).toBe(5);
    const e1 = coll.dataByIri('clss:_HmFCYozVEeOiy8owVBW5pQ');
    expectToBeDefined(e1);
    const e1Data: JsObject = getSnapshot(e1);
    expect(e1Data.title).toBe('Requirement Module 30000 - Grouping 30004 Title');
    // add two same els and one new el
    coll.addElems([
      // updated el
      {
        '@id': 'clss:_tHAikozUEeOiy8owVBW5pQ',
        '@type': 'rm:Artifact',
        identifier: 30001,
        title: 'Requirement Module 30000 - Grouping 30001 Title -- Changed',
      },
      // same el
      {
        '@id': 'clss:_HmFCYozVEeOiy8owVBW5pQ',
        '@type': 'rm:Artifact',
        identifier: 30004,
        title: 'Requirement Module 30000 - Grouping 30004 Title',
      },
      // new el
      {
        '@id': 'clss:_L8Lf8YzVEeOiy8owVBW5pQ',
        '@type': 'rm:Artifact',
        identifier: 30005,
        title: 'Requirement Module 30000 - Grouping 30005 Title',
      },
    ]);
    //console.log(coll?.dataJs);
    expect(coll.dataIntrnl.length).toBe(6);
    // check updated el
    const e2 = coll.dataByIri('clss:_tHAikozUEeOiy8owVBW5pQ');
    expectToBeDefined(e2);
    const e2Data: JsObject = getSnapshot(e2);
    expect(e2Data.title).toBe('Requirement Module 30000 - Grouping 30001 Title -- Changed');
    // check same el
    const e3 = coll.dataByIri('clss:_HmFCYozVEeOiy8owVBW5pQ');
    expectToBeDefined(e3);
    const e3Data: JsObject = getSnapshot(e3);
    expect(e3Data.title).toBe('Requirement Module 30000 - Grouping 30004 Title');
    // check new added el
    const e4 = coll.dataByIri('clss:_L8Lf8YzVEeOiy8owVBW5pQ');
    expectToBeDefined(e4);
    const e4Data: JsObject = getSnapshot(e4);
    expect(e4Data.title).toBe('Requirement Module 30000 - Grouping 30005 Title');
  });
});
