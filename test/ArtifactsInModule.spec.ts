/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { afterAll, beforeAll, describe, expect, vi, it } from 'vitest';
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
import { artifactSchema, usedInModuleSchema, usedInSchema } from './schema/TestSchemas';
import { expectToBeDefined, failOnError, genTimestampedName } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
vi.setConfig({ testTimeout: 50_000});

const client = new SparqlClientImpl(rdfServerUrl);
const repository = MstRepository.create(rootModelInitialState, { client });
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_ArtifactsInModule');
  //console.log(rmRepositoryID);
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
    await uploadFiles(client, shapesFiles, rootFolder);
    await uploadFiles(client, samplesFiles, rootFolder);
    //await sleep(5000); // give RDF classifier some time to classify resources after upload
    await repository.ns.reloadNs();
  } catch (err) {
    failOnError(err);
  }
});

afterAll(async () => {
  try {
    await client.deleteRepository(rmRepositoryID);
  } catch (err) {
    failOnError(err);
  }
});

const SchemaWithHasChildProp: any = {
  ...artifactSchema,
  '@id': 'rm:ArtifactInUsedInModuleLink',
  properties: {
    ...artifactSchema.properties,
    hasChild: {
      title: 'Has Child',
      description: 'Has Child',
      type: 'boolean',
      shapeModifiability: 'system',
    },
  },
  required: [...(artifactSchema.required ?? []), 'hasChild'],
};

const usedInModuleCollConstrJs: any = {
  '@id': 'rm:ModuleViewClass_Query', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
  '@type': 'aldkg:CollConstr', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
  entConstrs: [
    {
      '@id': 'rm:UsedInModuleLink_Shape0', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      '@type': 'aldkg:EntConstr', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      schema: 'rmUserTypes:UsedInModuleShape', // it could be schema object or class IRI string
      //schema: usedInModuleSchema,
      conditions: {
        // key-value JsObject
        // pay attention to the collisions with '@id', '@type' and other JSON-LD props!
        // it should be screened like '@_id', '@_type'
        '@id': 'rmUserTypes:my_link', // IRI of an element, but should be ID of condition object itself ('@id': 'rm:UsedInModuleLink_Shape0_Condition')
        '@type': 'aldkg:EntConstrCondition', // normally gets from schema @id
        //'@_id':
        //'@_type':
        object: 'file:///myfile.xml',
        subject: '?eIri1',
      },
      //variables: {},
    },
    {
      '@id': 'rm:LinkedArtifact_Shape1', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      '@type': 'aldkg:EntConstr', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      schema: SchemaWithHasChildProp, // it could be schema object or class IRI string
      // key-value {}:JsObject
      conditions: {
        // context-less property calculated by EXISTS function
        //TODO: Move this to the schema because it is not a constraint
        hasChild: {
          bind: {
            relation: 'exists',
            triples: [
              factory.quad(
                factory.variable('eIri2'),
                factory.namedNode('https://agentlab.eu/ns/rm/user-types#parentBinding'),
                factory.variable('eIri1'),
              ),
            ],
          },
        },
      },
      //variables: {},
      resolveType: true,
    },
  ],
  orderBy: [
    {
      expression: factory.variable('bookOrder0'),
      descending: false,
    },
  ],
  limit: 3,
};

const moduleObject: any = {
  '@id': 'reqs:_M1HusThYEem2Z_XixsC3pQ',
  '@type': 'rmUserTypes:UsedInModule',
  bookOrder: 1,
  created: '2014-02-10T10:12:16.000Z',
  creator: 'users:user1',
  depth: 1,
  modified: '2014-02-10T10:12:16.000Z',
  modifiedBy: 'users:user1',
  object: 'file:///myfile.xml',
  parentBinding: 'file:///myfile.xml',
  processArea: 'projects:defaultProject',
  sectionNumber: '0-1',
  subject: {
    '@id': 'clss:_tHAikozUEeOiy8owVBW5pQ',
    '@type': 'clss:Grouping',
    artifactFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
    assetFolder: 'folders:samples_module',
    created: '2014-02-10T10:12:16.000Z',
    creator: 'users:user1',
    hasChild: true,
    identifier: 30001,
    modified: '2014-02-10T10:12:16.000Z',
    modifiedBy: 'users:user1',
    processArea: 'projects:defaultProject',
    title: 'Requirement Module 30000 - Grouping 30001 Title',
  },
};

describe('ArtifactsInModules query should return Module UsedInModules with associated Artifact', () => {
  it('sorted by bookOrder', () => new Promise<void>((done) => {
    // not necessary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const coll = repository.addColl(usedInModuleCollConstrJs /*{ lazy: false }*/);
    expectToBeDefined(coll);
    when(
      () => coll.data.length > 0,
      () => {
        const linksAndArtifacts: JsObject[] = coll.dataJs;
        expect(linksAndArtifacts.length).toBe(3);
        expect(linksAndArtifacts[0]).toMatchObject(moduleObject);
        repository.removeColl(coll);
        done();
      },
    );
  }));

  it('sorted by ASC bookOrder', () => new Promise<void>((done) => {
    // not necessary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const coll = repository.addColl({
      ...usedInModuleCollConstrJs,
      orderBy: [
        {
          expression: factory.variable('bookOrder0'),
          descending: false,
        },
      ],
    });
    expectToBeDefined(coll);
    when(
      () => coll.data.length > 0,
      () => {
        const linksAndArtifacts: JsObject[] = coll.dataJs;
        expect(linksAndArtifacts.length).toBe(3);
        expect(linksAndArtifacts[0]).toMatchObject({
          '@id': 'reqs:_M1HusThYEem2Z_XixsC3pQ',
          '@type': 'rmUserTypes:UsedInModule',
          processArea: 'projects:defaultProject',
          bookOrder: 1,
          depth: 1,
          parentBinding: 'file:///myfile.xml',
          sectionNumber: '0-1',
          modifiedBy: 'users:user1',
          created: '2014-02-10T10:12:16.000Z',
          creator: 'users:user1',
          modified: '2014-02-10T10:12:16.000Z',
          object: 'file:///myfile.xml',
          subject: {
            '@id': 'clss:_tHAikozUEeOiy8owVBW5pQ',
            '@type': 'clss:Grouping',
            processArea: 'projects:defaultProject',
            artifactFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
            assetFolder: 'folders:samples_module',
            modifiedBy: 'users:user1',
            created: '2014-02-10T10:12:16.000Z',
            creator: 'users:user1',
            identifier: 30001,
            modified: '2014-02-10T10:12:16.000Z',
            title: 'Requirement Module 30000 - Grouping 30001 Title',
            hasChild: true,
          },
        });
        repository.removeColl(coll);
        done();
      },
    );
  }));

  //TODO: sorting is not working
  it.skip('sorted by DESC bookOrder', () => new Promise<void>((done) => {
    // not necessary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const coll = repository.addColl({
      ...usedInModuleCollConstrJs,
      entConstrs: [
        {
          '@id': 'rm:UsedInModuleLink_Shape0', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
          '@type': 'aldkg:EntConstr', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
          schema: 'rmUserTypes:UsedInModuleShape', // it could be schema object or class IRI string
          //schema: usedInModuleSchema,
          conditions: {
            // key-value JsObject
            // pay attention to the collisions with '@id', '@type' and other JSON-LD props!
            // it should be screened like '@_id', '@_type'
            '@id': 'rmUserTypes:my_link', // IRI of an element, but should be ID of condition object itself ('@id': 'rm:UsedInModuleLink_Shape0_Condition')
            '@type': 'some conditions type', // normally gets from schema @id
            //'@_id':
            //'@_type':
            object: 'file:///myfile.xml',
          },
          //variables: {},
        },
      ],
      orderBy: [
        {
          expression: factory.variable('bookOrder0'),
          descending: true,
        },
      ],
    });
    expectToBeDefined(coll);
    when(
      () => coll.data.length > 0,
      () => {
        const linksAndArtifacts: JsObject[] = coll.dataJs;
        expect(linksAndArtifacts.length).toBe(3);
        expect(linksAndArtifacts[0]).toMatchObject({
          '@id': 'reqs:_N1HusThYEem2Z_XixsC3pQ',
          '@type': ['rmUserTypes:UsedInModule', 'rm:Artifact'],
          object: 'file:///myfile.xml',
          subject: 'clss:///_Ep8ocYzVEeOiy8owVBW5pQ',
          parentBinding: 'clss:///_zYXy8ozUEeOiy8owVBW5pQ',
          depth: 3,
          bookOrder: 10,
          '@id1': 'clss:///_Ep8ocYzVEeOiy8owVBW5pQ',
          identifier: 30010,
          title: 'Requirement Module 30000 - Grouping 30010 Title',
          creator: 'users:user1',
          created: '2014-02-10T10:12:16.000Z',
          modifiedBy: 'users:user1',
          modified: '2014-02-10T10:12:16.000Z',
          processArea: 'projects:defaultProject',
          assetFolder: 'folders:samples_module',
          artifactFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
          hasChild: false,
        });
        repository.removeColl(coll);
        done();
      },
    );
  }));

  it.skip('sorted by two: ASC bookOrder and DESC depth', () => new Promise<void>((done) => {
    // not necessary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const coll = repository.addColl({
      ...usedInModuleCollConstrJs,
      orderBy: [
        {
          expression: factory.variable('depth0'),
          descending: true,
        },
        {
          expression: factory.variable('bookOrder0'),
          descending: false,
        },
      ],
    });
    expectToBeDefined(coll);
    when(
      () => coll.data.length > 0,
      () => {
        const linksAndArtifacts: JsObject[] = coll.dataJs;
        expect(linksAndArtifacts.length).toBe(3);
        expect(linksAndArtifacts[0]).toMatchObject({
          depth: 6,
          bookOrder: 6,
          hasChild: false,
        });
        expect(linksAndArtifacts[1]).toMatchObject({
          depth: 6,
          bookOrder: 7,
          hasChild: false,
        });
        repository.removeColl(coll);
        done();
      },
    );
  }));
});

const usedInModuleParentCollConstrJs: any = {
  '@id': 'rm:ModuleViewClass_Parent_CollConstr',
  '@type': 'aldkg:CollConstr',
  entConstrs: [
    {
      '@id': 'rm:UsedInModuleLink_Parent_EntConstr0',
      '@type': 'aldkg:EntConstr',
      schema: 'rmUserTypes:UsedInModuleShape',
      conditions: {
        '@id': 'rm:UsedInModuleLink_Parent_EntConstr0_Condition',
        '@type': 'aldkg:EntConstrCondition',
        subject: '?eIri1',
      },
    },
    {
      '@id': 'rm:UsedInModuleLink_Parent_EntConstr1',
      '@type': 'aldkg:EntConstr',
      schema: SchemaWithHasChildProp,
      conditions: {
        hasChild: {
          bind: {
            relation: 'exists',
            triples: [
              factory.quad(
                factory.variable('eIri2'),
                factory.namedNode('https://agentlab.eu/ns/rm/user-types#parentBinding'),
                factory.variable('eIri1'),
              ),
            ],
          },
        },
      },
      resolveType: true,
    },
  ],
  orderBy: [
    {
      expression: factory.variable('bookOrder0'),
      descending: false,
    },
  ],
  limit: 3,
};

const usedInModuleChildCollConstrJs: any = {
  '@id': 'rm:ModuleViewClass_Child_CollConstr',
  '@type': 'aldkg:CollConstr',
  '@parent': 'rm:ModuleViewClass_Parent_CollConstr',
  entConstrs: [
    {
      '@id': 'rm:UsedInModuleLink_Child_EntConstr0',
      '@type': 'aldkg:EntConstr',
      '@parent': 'rm:UsedInModuleLink_Parent_EntConstr0',
      conditions: {
        '@id': 'rm:UsedInModuleLink_Child_EntConstr0_Condition',
        '@type': 'aldkg:EntConstrCondition',
        object: 'file:///myfile.xml',
      },
    },
  ],
};

describe('RetrieveModuleWithParent', () => {
  it('RetrieveModuleWithParent should sync load', async () => {
    const coll1 = repository.addColl(usedInModuleParentCollConstrJs);
    expectToBeDefined(coll1);

    const coll2 = repository.addColl(usedInModuleChildCollConstrJs);
    expectToBeDefined(coll2);

    await coll2.loadColl();
    const data: any = coll2.dataJs;
    expect(data.length).toBe(3);
    expect(data[0]).toMatchObject(moduleObject);

    repository.removeColl(coll2);
    repository.removeColl(coll1);
  });
});
