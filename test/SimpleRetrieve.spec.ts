/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { variable } from '@rdfjs/data-model';

import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { rootModelInitialState } from '../src/models/model';
import { Repository } from '../src/models/Repository';
import { SparqlClientImpl } from '../src/SparqlClientImpl';

import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { genTimestampedName, selectHelper } from './TestHelpers';
import { when } from 'mobx';
import { getSnapshot } from 'mobx-state-tree';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(5000000);

const client = new SparqlClientImpl(rdfServerUrl);
const repository = Repository.create(rootModelInitialState, { client });
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_SimpleRetrieve');
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
    await client.uploadFiles(vocabsFiles, rootFolder);
    await client.uploadFiles(usersFiles, rootFolder);
    await client.uploadFiles(projectsFoldersFiles, rootFolder);
    await client.uploadFiles(samplesFiles, rootFolder);
    await client.uploadFiles(shapesFiles, rootFolder);
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

describe('SimpleRetrieve', () => {
  it('should return Artifacts with expected schema', async () => {
    await selectHelper(repository, 'rm:ArtifactShape', (data) => {
      expect(data.length).toBe(15);
    });
    const schema = await repository.schemas.loadSchemaByClassIri('rm:Artifact');
    await selectHelper(repository, schema, (data) => {
      expect(data.length).toBe(15);
    });
  });

  it('should return Specific Artifacts with id=30000 with expected schema', async () => {
    const artifact30000Orig = {
      '@id': 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
      '@type': 'cpgu:Classifier',
      assetFolder: 'folders:samples_module',
      created: '2014-02-10T10:12:16.000Z',
      creator: 'users:amivanoff',
      description: 'ТН ВЭД ТС',
      artifactFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Module',
      identifier: 30000,
      modifiedBy: 'users:amivanoff',
      modified: '2014-02-10T10:12:16.000Z',
      title: 'ТН ВЭД ТС',
    };
    await repository.schemas.loadSchemaByClassIri('rm:Artifact');
    let origSchema: any = repository.schemas.getOrLoadSchemaByClassIri('rm:Artifact');
    origSchema = getSnapshot(origSchema);
    let schema = {
      ...origSchema,
      //required: [...origSchema.required, 'identifier'],
    };
    await selectHelper(
      repository,
      {
        schema,
        conditions: { identifier: 30000 },
        resolveType: true,
      },
      (data) => {
        expect(data.length).toBe(1);
        expect(data[0]).toMatchObject(artifact30000Orig);
      },
    );
    schema = {
      ...origSchema,
      //required: [...origSchema.required, 'assetFolder'],
    };
    await selectHelper(
      repository,
      {
        schema,
        conditions: { assetFolder: 'folders:samples_module' },
      },
      (data) => expect(data.length).toBe(11),
    );
  });

  it('should return NO Artifacts with unexisted values', async () => {
    await repository.schemas.loadSchemaByClassIri('rm:Artifact');
    let schema: any = repository.schemas.getOrLoadSchemaByClassIri('rm:Artifact');
    await selectHelper(
      repository,
      {
        schema,
        conditions: { identifier: 40000 },
      },
      (data) => expect(data.length).toBe(0),
    );
    await selectHelper(
      repository,
      {
        schema,
        conditions: { assetFolder: 'folders:folder2' },
      },
      (data) => expect(data.length).toBe(0),
    );
  });

  it('should return Specific Artifacts with expected schema', async () => {
    await repository.schemas.loadSchemaByClassIri('cpgu:Группировка');
    const schema = repository.schemas.getOrLoadSchemaByClassIri('cpgu:Группировка');
    await selectHelper(
      repository,
      {
        schema,
      },
      (data) => expect(data.length).toBe(10),
    );
  });

  it('should return Specific Artifacts with id=30001 with expected schema', async () => {
    await repository.schemas.loadSchemaByClassIri('cpgu:Группировка');
    const schema = repository.schemas.getOrLoadSchemaByClassIri('cpgu:Группировка');
    await selectHelper(
      repository,
      {
        schema,
        conditions: { identifier: 30001 },
      },
      (data) => expect(data.length).toBe(1),
    );
    await selectHelper(
      repository,
      {
        schema,
        conditions: { assetFolder: 'folders:samples_module' },
      },
      (data) => expect(data.length).toBe(10),
    );
  });

  it('should return NO Specific Artifacts with unexisted values', async () => {
    await repository.schemas.loadSchemaByClassIri('cpgu:Группировка');
    const schema = repository.schemas.getOrLoadSchemaByClassIri('cpgu:Группировка');
    await selectHelper(
      repository,
      {
        schema,
        conditions: { identifier: 40001 },
      },
      (data) => expect(data.length).toBe(0),
    );
    await selectHelper(
      repository,
      {
        schema,
        conditions: { assetFolder: 'folders:samples_collection' },
      },
      (data) => expect(data.length).toBe(0),
    );
  });

  it('should return Formats with expected schema', async () => {
    await repository.schemas.loadSchemaByClassIri('rmUserTypes:_YwcOsRmREemK5LEaKhoOow');
    const schema = repository.schemas.getOrLoadSchemaByClassIri('rmUserTypes:_YwcOsRmREemK5LEaKhoOow');
    await selectHelper(
      repository,
      {
        schema,
      },
      (data) => expect(data.length).toBe(3),
    );
  });

  it('should return DataType with expected schema', async () => {
    await repository.schemas.loadSchemaByClassIri('rdfs:Datatype');
    const schema = repository.schemas.getOrLoadSchemaByClassIri('rdfs:Datatype');
    await selectHelper(
      repository,
      {
        schema,
      },
      (data) => expect(data.length).toBe(39),
    );
  });

  it('should return Folders with expected schema', async () => {
    await repository.schemas.loadSchemaByClassIri('nav:folder');
    const schema = repository.schemas.getOrLoadSchemaByClassIri('nav:folder');
    await selectHelper(
      repository,
      {
        schema,
      },
      (data) => expect(data.length).toBe(8),
    );
  });

  it('should return ArtifactClasses with expected schema', async () => {
    //const schema2 = await repository.schemas.getSchemaByIri('rm:ArtifactClassesShape');
    let artifactClasses0: any[] = [];
    await selectHelper(
      repository,
      {
        schema: 'rm:ArtifactClassesShape',
        resolveType: true,
      },
      (data) => {
        artifactClasses0 = data;
        expect(data.length).toBeGreaterThan(0);
        const classifierClass0 = data.find((e: any) => e['@id'] === 'cpgu:Classifier');
        expect(classifierClass0).toMatchObject({
          '@id': 'cpgu:Classifier',
          '@type': 'rm:ArtifactClasses',
          title: 'Классификатор',
          description: 'Классификатор или справочник. Описывает структуру классификатора (не данные из него).',
          inCreationMenu: true,
        });
      },
    );
    await repository.schemas.loadSchemaByClassIri('rm:ArtifactClasses');
    const schema = repository.schemas.getOrLoadSchemaByClassIri('rm:ArtifactClasses');
    await selectHelper(
      repository,
      {
        schema,
      },
      (data) => {
        expect(data.length).toBeGreaterThan(10);
        const classifierClass = data.find((e: any) => e['@id'] === 'cpgu:Classifier');
        expect(classifierClass).toMatchObject({
          '@id': 'cpgu:Classifier',
          '@type': 'rm:ArtifactClasses',
          title: 'Классификатор',
          description: 'Классификатор или справочник. Описывает структуру классификатора (не данные из него).',
          inCreationMenu: true,
        });
        expect(data).toEqual(expect.arrayContaining(artifactClasses0));
      },
    );
  });

  it('should return ProjectView queries', async () => {
    let collConstr: any = {
      // globally unique ID of this Query object, could be used for references in mobx JSON-LD storage or server storage, not processed by query generator
      '@id': 'rm:ProjectViewClass_Artifacts_Query',
      '@type': 'rm:Query',
      entConstrs: [
        {
          // globally unique ID of this Shape object, could be used for references in mobx JSON-LD storage or server storage, not processed by query generator
          '@id': 'rm:ProjectViewClass_Artifacts_Query_Shape0',
          '@type': 'rm:QueryShape',
          // JSON Schema (often same as Class IRI), required!
          // it could be schema object or class IRI string
          schema: 'rm:ArtifactShape',
          // key-value {}:JsObject, could be omitted
          conditions: {
            // globally unique ID of this Condition object, could be used for references in mobx JSON-LD storage or server storage, not processed by query generator
            '@id': 'rm:ProjectViewClass_Artifacts_Query_Shape0_Condition',
            // globally unique ID of the Class of this condition object, could be used for mobx JSON-LD storage or server storage, not processed by query generator
            '@type': 'rm:QueryCondition',
            //'@_id':
            //'@_type':
            assetFolder: 'folders:samples_collection',
          },
          //variables: {},
          //fields: [], //string[]
        },
      ],
      // could be string or string[]. varname or property IRI?
      // ['?identifier0', 'DESC(?title0)']
      orderBy: [{ expression: variable('identifier0'), descending: false }], // if last digit not specified, we assuming '0' (identifier0)
      limit: 4,
    };

    await selectHelper(repository, collConstr, (data) => {
      expect(data.length).toBe(4);
      expect(data[0].identifier).toBe(20000);
    });

    //TODO: sorting is not working
    /*await selectHelper(
      repository,
      {...
        collConstr,
        orderBy: [{ expression: variable('identifier0'), descending: true }], // if last digit not specified, we assuming '0' (identifier0)
        limit: 3,
      },
      (data) => {
        expect(data.length).toBe(3);
        console.log('data[0].identifier', data[0].identifier);
        expect(data[0].identifier).toBe(20003);
      }
    );*/

    await selectHelper(
      repository,
      {
        '@id': 'rm:ProjectViewClass_Folders_Query',
        '@type': 'rm:Query',
        entConstrs: [
          {
            '@id': 'rm:ProjectViewClass_Folders_Query_Shape0',
            '@type': 'rm:QueryShape',
            schema: 'nav:folderShape',
          },
        ],
      },
      (data) => expect(data.length).toBe(8),
    );

    await selectHelper(
      repository,
      {
        '@id': 'rm:ProjectViewClass_Users_Query',
        '@type': 'rm:Query',
        entConstrs: [
          {
            '@id': 'rm:Users_Shape0',
            '@type': 'rm:QueryShape',
            schema: 'pporoles:UserShape',
          },
        ],
      },
      (data) => expect(data.length).toBe(5),
    );

    await selectHelper(
      repository,
      {
        '@id': 'rm:ProjectViewClass_ArtifactClasses_Query',
        '@type': 'rm:Query',
        entConstrs: [
          {
            '@id': 'rm:ProjectViewClass_ArtifactClasses_Query_Shape0',
            '@type': 'rm:QueryShape',
            schema: 'rm:ArtifactClassesShape',
          },
        ],
      },
      (data) => expect(data.length).toBe(56),
    );

    await selectHelper(
      repository,
      {
        '@id': 'rm:ProjectViewClass_ArtifactFormats_Query',
        '@type': 'rm:Query',
        entConstrs: [
          {
            '@id': 'rm:ProjectViewClass_ArtifactFormats_Query_Shape0',
            '@type': 'rm:QueryShape',
            schema: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOowShape',
          },
        ],
      },
      (data) => expect(data.length).toBe(3),
    );
  });
});

describe('LoadMore', () => {
  it('should sync load incrementally additional data into Coll', async () => {
    const coll = repository.addColl({
      entConstrs: [
        {
          schema: 'rm:ArtifactShape',
        },
      ],
      limit: 10,
    });
    expect(coll).not.toBeUndefined();
    await coll.loadColl();
    const data: any = coll && coll.data !== undefined ? getSnapshot(coll.data) : [];
    expect(data.length).toBe(10);

    await coll.loadMore();
    const data2: any = coll && coll.data !== undefined ? getSnapshot(coll.data) : [];
    expect(data2.length).toBe(15);
    repository.removeColl(coll);

    data.forEach((el, i) => expect(data2[i]).toEqual(el));
    data2.slice(data.length).forEach((el) => expect(data).not.toContainEqual(el));
  });

  it('should async load incrementally additional data into Coll', (done) => {
    const coll = repository.addColl({
      entConstrs: [
        {
          schema: 'rm:ArtifactShape',
        },
      ],
      limit: 10,
    });
    expect(coll).not.toBeUndefined();

    const disp1 = when(
      () => coll !== undefined && coll.data.length === 10,
      () => {
        disp1();
        const disp2 = when(
          () => coll !== undefined && coll.data.length === 15,
          () => {
            disp2();
            repository.removeColl(coll);
            done();
          },
        );
        coll.loadMore();
      },
    );
    coll.loadColl();
  });
});
