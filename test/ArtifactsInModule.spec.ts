/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { rootModelInitialState } from '../src/models/model';
import { Repository } from '../src/models/Repository';
import { SparqlClientImpl } from '../src/SparqlClientImpl';

import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { artifactSchema, usedInModuleSchema, usedInSchema } from './schema/TestSchemas';
import { triple, variable, namedNode } from '@rdfjs/data-model';
import { genTimestampedName } from './TestHelpers';
import { when } from 'mobx';
import { getSnapshot } from 'mobx-state-tree';
import { JsObject } from '../src/ObjectProvider';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

const client = new SparqlClientImpl(rdfServerUrl);
const repository = Repository.create(rootModelInitialState, { client });
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_ArtifactsInModule');
  console.log(rmRepositoryID);
  try {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await client.uploadFiles(vocabsFiles, rootFolder);
    await client.uploadFiles(usersFiles, rootFolder);
    await client.uploadFiles(projectsFoldersFiles, rootFolder);
    await client.uploadFiles(shapesFiles, rootFolder);
    await client.uploadFiles(samplesFiles, rootFolder);
    //await sleep(5000); // give RDF classifier some time to classify resources after upload

    await repository.ns.reloadNs();
  } catch (err) {
    fail(err);
  }
});

afterAll(async () => {
  try {
    await client.deleteRepository(rmRepositoryID);
  } catch (err) {
    fail(err);
  }
});

const usedInModuleCollConstrJs: any = {
  '@id': 'rm:ModuleViewClass_Query', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
  '@type': 'rm:Query', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
  entConstrs: [
    {
      '@id': 'rm:UsedInModuleLink_Shape0', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      '@type': 'rm:QueryShape', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
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
        object: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
        subject: '?eIri1',
      },
      //variables: {},
    },
    {
      '@id': 'rm:LinketArtifact_Shape1', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      '@type': 'rm:QueryShape', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
      schema: {
        ...artifactSchema,
        '@id': 'rm:ArtifactInUsedInModuleLink',
        properties: {
          ...artifactSchema.properties,
          hasChild: {
            title: 'Имеет потомков',
            description: 'Имеет потомков',
            type: 'boolean',
            shapeModifiability: 'system',
          },
        },
        required: [
          ...artifactSchema.required || [],
          'hasChild',
        ],
      }, // it could be schema object or class IRI string
      // key-value {}:JsObject
      conditions: {
        // context-less property calculated by EXISTS function
        hasChild: {
          bind: {
            relation: 'exists',
            triples: [
              triple(
                variable('eIri2'),
                namedNode('http://cpgu.kbpm.ru/ns/rm/user-types#parentBinding'),
                variable('eIri1'),
              ),
            ],
          },
        },
      },
      //variables: {},
      resolveType: true,
    },
  ],
  orderBy: [{
    expression: variable('bookOrder0'),
    descending: false,
  }],
  //limit: 10,
};

describe('ArtifactsInModules query should return Module UsedInModules with associated Artifact', () => {
  it('sorted by bookOrder', (done) => {
    // not nessesary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const collConstr = repository.addCollConstr(usedInModuleCollConstrJs);
    const coll = collConstr.coll;
    expect(coll).not.toBeUndefined();
    when(
      () => coll !== undefined && coll.lastSynced !== undefined,
      () => {
        const linksAndArtifacts: JsObject[] = getSnapshot(coll?.data);
        expect(linksAndArtifacts.length).toBe(10);
        expect(linksAndArtifacts[0]).toMatchObject({
          '@id': 'reqs:_M1HusThYEem2Z_XixsC3pQ',
          '@type': 'rmUserTypes:UsedInModule',
          bookOrder: 1,
          created: '2014-02-10T10:12:16.000Z',
          creator: 'users:amivanoff',
          depth: 1,
          modified: '2014-02-10T10:12:16.000Z',
          modifiedBy: 'users:amivanoff',
          object: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
          parentBinding: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
          processArea: 'projects:gishbbProject',
          sectionNumber: '0-1',
          subject: {
            "@id": "cpgu:_tHAikozUEeOiy8owVBW5pQ",
            "@type": "cpgu:Группировка",
            artifactFormat: "rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text",
            assetFolder: "folders:samples_module",
            created: "2014-02-10T10:12:16.000Z",
            creator: "users:amivanoff",
            hasChild: true,
            identifier: 30001,
            modified: "2014-02-10T10:12:16.000Z",
            modifiedBy: "users:amivanoff",
            processArea: "projects:gishbbProject",
            title: "ТН ВЭД ТС",
          }
        });
        repository.removeCollConstr(collConstr);
        done();
      }
    );
  });

  it('sorted by ASC bookOrder', (done) => {
    // not nessesary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const collConstr = repository.addCollConstr({
      ...usedInModuleCollConstrJs,
      orderBy: [{
        expression: variable('bookOrder0'),
        descending: false,
      }],
    });
    const coll = collConstr.coll;
    expect(coll).not.toBeUndefined();
    when(
      () => coll !== undefined && coll.lastSynced !== undefined,
      () => {
        const linksAndArtifacts: JsObject[] = getSnapshot(coll?.data);
        expect(linksAndArtifacts.length).toBe(10);
        expect(linksAndArtifacts[0]).toMatchObject({
          "@id": "reqs:_M1HusThYEem2Z_XixsC3pQ",
          "@type": "rmUserTypes:UsedInModule",
          processArea: "projects:gishbbProject",
          bookOrder: 1,
          depth: 1,
          parentBinding: "file:///urn-s2-iisvvt-infosystems-classifier-45950.xml",
          sectionNumber: "0-1",
          modifiedBy: "users:amivanoff",
          created: "2014-02-10T10:12:16.000Z",
          creator: "users:amivanoff",
          modified: "2014-02-10T10:12:16.000Z",
          object: "file:///urn-s2-iisvvt-infosystems-classifier-45950.xml",
          subject: {
            "@id": "cpgu:_tHAikozUEeOiy8owVBW5pQ",
            "@type": "cpgu:Группировка",
            processArea: "projects:gishbbProject",
            artifactFormat: "rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text",
            assetFolder: "folders:samples_module",
            modifiedBy: "users:amivanoff",
            created: "2014-02-10T10:12:16.000Z",
            creator: "users:amivanoff",
            identifier: 30001,
            modified: "2014-02-10T10:12:16.000Z",
            title: "ТН ВЭД ТС",
            hasChild: true,
          },
        });
        repository.removeCollConstr(collConstr);
        done();
      }
    );
  });

  //TODO: sorting is not working
  /*it('sorted by DESC bookOrder', (done) => {
    // not nessesary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const collConstr = repository.addCollConstr({
      ...usedInModuleCollConstrJs,
      entConstrs: [
        {
          '@id': 'rm:UsedInModuleLink_Shape0', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
          '@type': 'rm:QueryShape', // not processed by query generator, could be omitted (object id could be used for mobx JSON-LD storage or server storage)
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
            object: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
          },
          //variables: {},
        },
      ],
      orderBy: [{
        expression: variable('bookOrder0'),
        descending: true,
      }],
    });
    const coll = collConstr.coll;
    expect(coll).not.toBeUndefined();
    when(
      () => coll !== undefined && coll.lastSynced !== undefined,
      () => {
        const linksAndArtifacts: JsObject[] = getSnapshot(coll?.data);
        expect(linksAndArtifacts.length).toBe(10);
        expect(linksAndArtifacts[0]).toMatchObject({
          '@id': 'reqs:_N1HusThYEem2Z_XixsC3pQ',
          '@type': ['rmUserTypes:UsedInModule', 'rm:Artifact'],
          object: 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
          subject: 'cpgu:///_Ep8ocYzVEeOiy8owVBW5pQ',
          parentBinding: 'cpgu:///_zYXy8ozUEeOiy8owVBW5pQ',
          depth: 3,
          bookOrder: 10,
          '@id1': 'cpgu:///_Ep8ocYzVEeOiy8owVBW5pQ',
          identifier: 30010,
          title: 'Наименование товарной позиции',
          creator: 'users:amivanoff',
          created: '2014-02-10T10:12:16.000Z',
          modifiedBy: 'users:amivanoff',
          modified: '2014-02-10T10:12:16.000Z',
          processArea: 'projects:gishbbProject',
          assetFolder: 'folders:samples_module',
          artifactFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
          hasChild: false,
        });
        repository.removeCollConstr(collConstr);
        done();
      }
    );
  });

  it('sorted by two: ASC bookOrder and DESC depth', (done) => {
    // not nessesary to add, it could be retrieved from server by type IRI
    // used here to increase predictability
    //provider.addSchema(artifactSchema);
    //provider.addSchema(usedInSchema);
    //provider.addSchema(usedInModuleSchema);

    const collConstr = repository.addCollConstr({
      ...usedInModuleCollConstrJs,
      orderBy: [
        {
          expression: variable('depth0'),
          descending: true,
        },
        {
          expression: variable('bookOrder0'),
          descending: false,
        }
      ],
    });
    const coll = collConstr.coll;
    expect(coll).not.toBeUndefined();
    when(
      () => coll !== undefined && coll.lastSynced !== undefined,
      () => {
        const linksAndArtifacts: JsObject[] = getSnapshot(coll?.data);
        expect(linksAndArtifacts.length).toBe(10);
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
        repository.removeCollConstr(collConstr);
        done();
      }
    );
  });*/
});
