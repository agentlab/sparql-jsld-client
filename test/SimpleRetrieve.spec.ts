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
import { factory } from '../src/SparqlGen';
import { SparqlClientImpl } from '../src/SparqlClientImpl';
import { uploadFiles } from '../src/FileUpload';

import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { expectToBeDefined, failOnError, genTimestampedName, selectHelper } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
vi.setConfig({ testTimeout: 5_000_000 });

const client = new SparqlClientImpl(rdfServerUrl);
const repository = MstRepository.create(rootModelInitialState, { client });
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
    await uploadFiles(client, vocabsFiles, rootFolder);
    await uploadFiles(client, usersFiles, rootFolder);
    await uploadFiles(client, projectsFoldersFiles, rootFolder);
    await uploadFiles(client, samplesFiles, rootFolder);
    await uploadFiles(client, shapesFiles, rootFolder);
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

const artifact30000Orig = {
  '@id': 'file:///myfile.xml',
  '@type': 'clss:Classifier',
  assetFolder: 'folders:samples_module',
  created: '2014-02-10T10:12:16.000Z',
  creator: 'users:user1',
  description: 'Requirement Module 30000 Description',
  artifactFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Module',
  identifier: 30000,
  modifiedBy: 'users:user1',
  modified: '2014-02-10T10:12:16.000Z',
  title: 'Requirement Module 30000 Title',
};

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
      (data) => {
        expect(data.length).toBe(11);
      },
    );
  });

  it('should return NO Artifacts with non-existed values', async () => {
    await repository.schemas.loadSchemaByClassIri('rm:Artifact');
    const schema: any = repository.schemas.getOrLoadSchemaByClassIri('rm:Artifact');
    await selectHelper(
      repository,
      {
        schema,
        conditions: { identifier: 40000 },
      },
      (data) => {
        expect(data.length).toBe(0);
      },
    );
    await selectHelper(
      repository,
      {
        schema,
        conditions: { assetFolder: 'folders:folder2' },
      },
      (data) => {
        expect(data.length).toBe(0);
      },
    );
  });

  it('should return Specific Artifacts with expected schema', async () => {
    await repository.schemas.loadSchemaByClassIri('clss:Grouping');
    const schema = repository.schemas.getOrLoadSchemaByClassIri('clss:Grouping');
    await selectHelper(
      repository,
      {
        schema,
      },
      (data) => {
        expect(data.length).toBe(10);
      },
    );
  });

  it('should return Specific Artifacts with id=30001 with expected schema', async () => {
    await repository.schemas.loadSchemaByClassIri('clss:Grouping');
    const schema = repository.schemas.getOrLoadSchemaByClassIri('clss:Grouping');
    await selectHelper(
      repository,
      {
        schema,
        conditions: { identifier: 30001 },
      },
      (data) => {
        expect(data.length).toBe(1);
      },
    );
    await selectHelper(
      repository,
      {
        schema,
        conditions: { assetFolder: 'folders:samples_module' },
      },
      (data) => {
        expect(data.length).toBe(10);
      },
    );
  });

  it('should return NO Specific Artifacts with non-existed values', async () => {
    await repository.schemas.loadSchemaByClassIri('clss:Grouping');
    const schema = repository.schemas.getOrLoadSchemaByClassIri('clss:Grouping');
    await selectHelper(
      repository,
      {
        schema,
        conditions: { identifier: 40001 },
      },
      (data) => {
        expect(data.length).toBe(0);
      },
    );
    await selectHelper(
      repository,
      {
        schema,
        conditions: { assetFolder: 'folders:samples_collection' },
      },
      (data) => {
        expect(data.length).toBe(0);
      },
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
      (data) => {
        expect(data.length).toBe(3);
      },
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
      (data) => {
        expect(data.length).toBe(39);
      },
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
      (data) => {
        expect(data.length).toBe(8);
      },
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
        const classifierClass0 = data.find((e: any) => e['@id'] === 'clss:Classifier');
        expect(classifierClass0).toMatchObject({
          '@id': 'clss:Classifier',
          '@type': 'rm:ArtifactClasses',
          title: 'RequirementClass Title Classifier',
          description: 'RequirementClass Description Classifier',
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
        expect(data.length).toBeGreaterThan(7);
        const classifierClass = data.find((e: any) => e['@id'] === 'clss:Classifier');
        expect(classifierClass).toMatchObject({
          '@id': 'clss:Classifier',
          '@type': 'rm:ArtifactClasses',
          title: 'RequirementClass Title Classifier',
          description: 'RequirementClass Description Classifier',
          inCreationMenu: true,
        });
        expect(data).toEqual(expect.arrayContaining(artifactClasses0));
      },
    );
  });

  it('should return ProjectView queries', async () => {
    const collConstr: any = {
      // globally unique ID of this Query object, could be used for references in mobx JSON-LD storage or server storage, not processed by query generator
      '@id': 'rm:ProjectViewClass_Artifacts_Query',
      '@type': 'aldkg:CollConstr',
      entConstrs: [
        {
          // globally unique ID of this Shape object, could be used for references in mobx JSON-LD storage or server storage, not processed by query generator
          '@id': 'rm:ProjectViewClass_Artifacts_Query_Shape0',
          '@type': 'aldkg:EntConstr',
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
      orderBy: [{ expression: factory.variable('identifier0'), descending: false }], // if last digit not specified, we assuming '0' (identifier0)
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
        '@type': 'aldkg:CollConstr',
        entConstrs: [
          {
            '@id': 'rm:ProjectViewClass_Folders_Query_Shape0',
            '@type': 'aldkg:EntConstr',
            schema: 'nav:folderShape',
          },
        ],
      },
      (data) => {
        expect(data.length).toBe(8);
      },
    );

    await selectHelper(
      repository,
      {
        '@id': 'rm:ProjectViewClass_Users_Query',
        '@type': 'aldkg:CollConstr',
        entConstrs: [
          {
            '@id': 'rm:Users_Shape0',
            '@type': 'aldkg:EntConstr',
            schema: 'pporoles:UserShape',
          },
        ],
      },
      (data) => {
        expect(data.length).toBe(5);
      },
    );

    await selectHelper(
      repository,
      {
        '@id': 'rm:ProjectViewClass_ArtifactClasses_Query',
        '@type': 'aldkg:CollConstr',
        entConstrs: [
          {
            '@id': 'rm:ProjectViewClass_ArtifactClasses_Query_Shape0',
            '@type': 'aldkg:EntConstr',
            schema: 'rm:ArtifactClassesShape',
          },
        ],
      },
      (data) => {
        expect(data.length).toBe(8);
      },
    );

    await selectHelper(
      repository,
      {
        '@id': 'rm:ProjectViewClass_ArtifactFormats_Query',
        '@type': 'aldkg:CollConstr',
        entConstrs: [
          {
            '@id': 'rm:ProjectViewClass_ArtifactFormats_Query_Shape0',
            '@type': 'aldkg:EntConstr',
            schema: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOowShape',
          },
        ],
      },
      (data) => {
        expect(data.length).toBe(3);
      },
    );
  });
});

describe('RetrieveWithParent', () => {
  it('Retrieve With Parent should sync load', async () => {
    const coll1 = repository.addColl({
      '@id': 'rm:collConstr1',
      entConstrs: [
        {
          '@id': 'rm:entConstr1',
          schema: 'rm:ArtifactShape',
          resolveType: true,
        },
      ],
    });
    expectToBeDefined(coll1);

    const coll2 = repository.addColl({
      '@id': 'rm:collConstr2',
      '@parent': 'rm:collConstr1',
      entConstrs: [
        {
          '@id': 'rm:entConstr2',
          '@parent': 'rm:entConstr1',
          conditions: { identifier: 30000 },
        },
      ],
      limit: 10,
    });
    expectToBeDefined(coll2);

    await coll2.loadColl();
    const data = coll2.dataJs;
    expect(data.length).toBe(1);
    expect(data[0]).toMatchObject(artifact30000Orig);

    repository.removeColl(coll2);
    repository.removeColl(coll1);
  });
});

describe('LoadMore', () => {
  it('should sync load incrementally additional data into Coll', async () => {
    const objects = [{ '@id': 'same' }, { '@id': 'other1' }];
    const dataIntrnl = [{ '@id': 'same' }, { '@id': 'other2' }];

    /*const objectsToAdd: any[] = objects.filter((o: any) => {
      const ret1 = dataIntrnl.some((d: any) => {
        const ret2 = d['@id'] === o['@id'];
        return ret2;
      });
      return !ret1;
    });*/

    const coll = repository.addColl(
      {
        entConstrs: [
          {
            schema: 'rm:ArtifactShape',
          },
        ],
        limit: 2,
      },
      { pageSize: 10 },
    );
    expectToBeDefined(coll);
    await coll.loadColl();
    const data = coll.dataJs;
    expect(data.length).toBe(2);

    // load another page=10
    await coll.loadMore();
    const data2 = coll.dataJs;
    expect(data2.length).toBe(12);
    data.forEach((el, i) => {
      expect(data2[i]).toEqual(el);
    });
    data2.slice(data.length).forEach((el: any) => {
      expect(data).not.toContainEqual(el);
    });

    // load another 5 (the rest of it)
    await coll.loadMore();
    const data3 = coll.dataJs;
    expect(data3.length).toBe(15);

    // check empty load
    await coll.loadMore();
    const data4 = coll.dataJs;
    expect(data4.length).toBe(15);

    repository.removeColl(coll);
  });

  it('should async load incrementally additional data into Coll', () =>
    new Promise<void>((done) => {
      const coll = repository.addColl(
        {
          entConstrs: [
            {
              schema: 'rm:ArtifactShape',
            },
          ],
          limit: 10,
        },
        { pageSize: 10 },
      );
      expectToBeDefined(coll);

      const disp1 = when(
        () => coll.data.length === 10,
        () => {
          disp1();
          const disp2 = when(
            () => coll.data.length === 15,
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
    }));
});
