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
import { getSnapshot } from 'mobx-state-tree';

import { rootModelInitialState } from '../src/models/Model';
import { MstRepository } from '../src/models/MstRepository';
import { SparqlClientImpl } from '../src/SparqlClientImpl';
import { JsObject } from '../src/ObjectProvider';
import { uploadFiles } from '../src/FileUpload';

import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { textFormatUri } from './schema/TestSchemas';

import { expectToBeDefined, genTimestampedName, sleep } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(500000);

const client = new SparqlClientImpl(rdfServerUrl);
const repository = MstRepository.create(rootModelInitialState, { client });
let rmRepositoryID: string;

const assetFolder = 'folders:folder1';

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_Artifact');
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
});

afterAll(async () => {
  try {
    await client.deleteRepository(rmRepositoryID);
  } catch (err: any) {
    assert.fail(err);
  }
});

/*async function createRandomTextArtifact(schema: any, artifactFormat: string, assetFolder: string): Promise<any> {
  const uuid = uuid62.v4();
  const newArtifact = {
    title: 'Requirement ' + uuid,
    description: 'Description ' + uuid,
    assetFolder,
    artifactFormat,
  };
  const ret = await repository.createObject({
    schema: schema['@id'],
    data: newArtifact,
  });
  return ret;
}*/

describe('create-artifact-scenario', () => {
  it(`should persist artifact in the store`, async () => {
    //await repository.schemas.loadSchemaByClassIri('rm:Artifact');
    //const artifactSchema = repository.schemas.getOrLoadSchemaByClassIri('rm:Artifact');
    //await repository.schemas.loadSchemaByClassIri('clss:Grouping');
    //const classifierGroupSchema = repository.schemas.getOrLoadSchemaByClassIri('clss:Grouping');

    const coll = repository.addColl('rm:ArtifactShape');
    await coll.loadColl();
    expectToBeDefined(coll);
    const data: any[] = coll && coll.data !== undefined ? getSnapshot(coll.data) : [];
    expect(data.length).toBe(15);

    //const element = data[1];
    for (const element of data) {
      await coll.delElem(element);
    }
    expect(coll.data.length).toBe(0);
    //TODO: Async DELETE races! We need to use transactions
    await sleep(data.length * 1500);
    await coll.loadColl();
    expect(coll.data.length).toBe(0);
    repository.removeColl(coll);

    /*await deleteAllArtifacts(artifactSchema);
    expect(await repository.selectMaxObjectId(artifactSchema)).toBe(0);
    //console.log('+++ Create 1st artifact');
    const newArtifact1 = await createRandomTextArtifact(classifierGroupSchema, textFormatUri, assetFolder);
    //console.log('+++ Check 1st artifact');
    const currentList1 = await repository.selectObjectsWithTypeInfo({
      schema: artifactSchema,
      conditions: { assetFolder },
    });
    expect(currentList1.length).toBe(1);
    const tt = currentList1.find((req: any) => req.identifier === newArtifact1.identifier);
    expect(tt).toMatchObject(newArtifact1);
    //await sleep(5000);
    const id1 = await repository.selectMaxObjectId(artifactSchema);
    expect(id1).toBe(1);
    expect(newArtifact1.identifier).toBe(1);

    //console.log('+++ Create 2nd artifact');
    const newArtifact2 = await createRandomTextArtifact(classifierGroupSchema, textFormatUri, assetFolder);
    //console.log('+++ Check 2nd artifact');
    const currentList2 = await repository.selectObjectsWithTypeInfo({
      schema: artifactSchema,
      conditions: { assetFolder },
    });
    expect(currentList2.length).toBe(2);
    expect(currentList2.find((req: any) => req.identifier === newArtifact2.identifier)).toMatchObject(newArtifact2);
    //await sleep(5000);
    const id2 = await repository.selectMaxObjectId(artifactSchema);
    expect(id2).toBe(2);
    expect(newArtifact2.identifier).toBe(2);

    //console.log('+++ Create 3rd artifact');
    const newArtifact3 = await createRandomTextArtifact(classifierGroupSchema, textFormatUri, assetFolder);
    //console.log('=== Check 3rd artifact');
    const currentList3 = await repository.selectObjectsWithTypeInfo({
      schema: artifactSchema,
      conditions: { assetFolder },
    });
    expect(currentList3.length).toBe(3);
    expect(currentList3.find((req: any) => req.identifier === newArtifact3.identifier)).toMatchObject(newArtifact3);
    //await sleep(5000);
    const id3 = await repository.selectMaxObjectId(artifactSchema);
    expect(id3).toBe(3);
    expect(newArtifact3.identifier).toBe(3);

    //console.log('+++ Delete 1 artifact');
    await repository.deleteObject({
      schema: artifactSchema,
      conditions: { identifier: newArtifact2.identifier },
    });
    const afterDelList11 = await repository.selectObjectsWithTypeInfo({
      schema: artifactSchema,
      conditions: { assetFolder },
    });
    expect(afterDelList11.length).toBe(2);
    expect(afterDelList11.filter((req: any) => req.identifier === newArtifact2.identifier).length).toBe(0);

    const afterDelList12 = await repository.selectObjects(artifactSchema);
    expect(afterDelList12.length).toBe(2);
    expect(afterDelList12.filter((req: any) => req.identifier === newArtifact2.identifier).length).toBe(0);

    expect(await repository.selectMaxObjectId(artifactSchema)).toBe(3);

    //console.log('+++ Check if the rest 2 artifacts are intact and one is deleted');
    const afterDelList121 = await repository.selectObjectsWithTypeInfo({
      schema: artifactSchema,
      conditions: {
        assetFolder,
        identifier: newArtifact1.identifier,
      },
    });
    expect(afterDelList121.length).toBe(1);
    expect(afterDelList121[0]).toMatchObject(newArtifact1);

    const afterDelList122 = await repository.selectObjectsWithTypeInfo({
      schema: artifactSchema,
      conditions: {
        assetFolder,
        identifier: newArtifact2.identifier,
      },
    });
    expect(afterDelList122.length).toBe(0);

    const afterDelList123 = await repository.selectObjectsWithTypeInfo({
      schema: artifactSchema,
      conditions: {
        assetFolder,
        identifier: newArtifact3.identifier,
      },
    });
    expect(afterDelList123.length).toBe(1);
    expect(afterDelList123[0]).toMatchObject(newArtifact3);

    //console.log('+++ Create artifact after delete');
    const newArtifact4 = await createRandomTextArtifact(classifierGroupSchema, textFormatUri, assetFolder);
    const currentList4 = await repository.selectObjectsWithTypeInfo({
      schema: artifactSchema,
      conditions: { assetFolder },
    });
    expect(currentList4.length).toBe(3);
    expect(currentList4.find((req: any) => req.identifier === newArtifact4.identifier)).toMatchObject(newArtifact4);
    expect(await repository.selectMaxObjectId(artifactSchema)).toBe(4);
    expect(newArtifact4.identifier).toBe(4);

    //console.log('+++ Modify artifact');
    const forUpdateArtifact4: JsObject = newArtifact4;
    forUpdateArtifact4.title = 'Req Title Change';

    //const updatedArtifact4 =
    await repository.updateObject({
      schema: artifactSchema,
      conditions: { identifier: forUpdateArtifact4.identifier },
      data: {
        title: forUpdateArtifact4.title,
      },
    });
    //expect(updatedArtifact4.identifier).toBe(forUpdateArtifact4.identifier);
    //expect(updatedArtifact4.title).toBe(forUpdateArtifact4.title);
    //expect(forUpdateArtifact4.modified).not.toBe(updatedArtifact4.modified);
    //forUpdateArtifact4.modified = updatedArtifact4.modified;
    //forUpdateArtifact4.modifiedBy = updatedArtifact4.modifiedBy;

    const currentList5 = await repository.selectObjectsWithTypeInfo({
      schema: artifactSchema,
      conditions: {
        identifier: forUpdateArtifact4.identifier,
      },
    });
    expect(currentList5.length).toBe(1);
    const ss = currentList5[0];
    expect(ss).toMatchObject(forUpdateArtifact4);
    expect(await repository.selectMaxObjectId(artifactSchema)).toBe(4);
    expect(currentList5[0].identifier).toBe(4);

    const currentList6 = await repository.selectObjectsWithTypeInfo(artifactSchema);
    expect(currentList6.length).toBe(3);*/
  });
});

/*describe('Retrieve artifacts from folder', () => {
  it(`select should return artifacts with expected schema`, async () => {
    const listFolders = await fetchProjectFoldersList({ processArea: projectAreaUri }, foldersGraphUri);
    const artifacts = await selectArtifacts({ assetFolder: listFolders[0]['@id] }, graphUri, apiUrl);
    expect(artifacts.length).toBe(3);
  });
});

describe('Modify artifact', () => {
  it(`title should be modifiable`, async () => {
    let artifacts = await selectArtifacts({}, graphUri, apiUrl);
    const rec = artifacts[0];
    const newTitle = 'Req Title Change';

    await updateArtifact(
      rec,
      {
        title: newTitle,
      },
      graphUri,
      apiUrl,
    );

    const recsNew = await selectArtifacts({ identifier: rec.identifier }, graphUri, apiUrl);
    expect(recsNew.length).toBe(1);
    expect(recsNew[0].title).toBe(newTitle);

    artifacts = await selectArtifacts({}, graphUri, apiUrl);
    expect(artifacts.length).toBe(3);
    artifacts.forEach((artifact) => {
      if (artifact.identifier === rec.identifier) {
        expect(artifact.title).toBe(newTitle);
      } else {
        expect(artifact.title).not.toBe(newTitle);
      }
    });
  });
  it(`new pred should be addable`, async () => {
    let artifacts = await selectArtifacts({}, graphUri, apiUrl);
    const rec = artifacts[0];
    const newForeignModifiedBy = 'someone';

    await updateArtifact(
      rec,
      {
        foreign_modifiedBy: newForeignModifiedBy,
      },
      graphUri,
      apiUrl,
    );

    const updatedArtifacts = await selectArtifacts({ identifier: rec.identifier }, graphUri, apiUrl);
    expect(updatedArtifacts.length).toBe(1);
    expect(updatedArtifacts[0].foreignModifiedBy).toBe(newForeignModifiedBy);

    artifacts = await selectArtifacts({}, graphUri, apiUrl);
    expect(artifacts.length).toBe(3);
    artifacts.forEach((artifact) => {
      if (artifact.identifier === rec.identifier) {
        expect(artifact.foreignModifiedBy).toBe(newForeignModifiedBy);
      } else {
        expect(artifact.foreignModifiedBy).not.toBe(newForeignModifiedBy);
      }
    });
  });
  it(`title and description should be modifiable`, async () => {
    let artifacts = await selectArtifacts({}, graphUri, apiUrl);
    const rec = artifacts[0];
    const newTitle = 'Req Title Change2';
    const newDescription = 'Req Description Change2';

    await updateArtifact(
      rec,
      {
        title: newTitle,
        description: newDescription,
      },
      graphUri,
      apiUrl,
    );

    const updatedArtifacts = await selectArtifacts({ identifier: rec.identifier }, graphUri, apiUrl);
    expect(updatedArtifacts.length).toBe(1);
    expect(updatedArtifacts[0].title).toBe(newTitle);
    expect(updatedArtifacts[0].description).toBe(newDescription);

    artifacts = await selectArtifacts({}, graphUri, apiUrl);
    expect(artifacts.length).toBe(3);
    artifacts.forEach((artifact) => {
      if (artifact.identifier === rec.identifier) {
        expect(artifact.title).toBe(newTitle);
        expect(artifact.description).toBe(newDescription);
      } else {
        expect(artifact.title).not.toBe(newTitle);
        expect(artifact.description).not.toBe(newDescription);
      }
    });
  });
});

describe('ClearGraph', () => {
  //it('ClearGraph Test', async () => {
  //  const result = await clearGraph(graphUri);
  //});

  it('Create artifacts  Test', async () => {
    const listFolders = await fetchProjectFoldersList({ processArea: projectAreaUri }, foldersGraphUri);
    //const uuid = uuid62.v4();

    // Creating artifacts
    for (let i = 0; i < 1; ++i) {
      const newArtifact = {
        title: 'Requirement ' + i,
        description: 'Description ' + i,
        assetFolder: listFolders[0]['@id],
        type: 'https://agentlab.eu/ns/rm/classifier#Grouping',
        format: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
      };

      await createArtifact(newArtifact, graphUri, apiUrl);
    }

    // Creating module
    for (let i = 0; i < 1; ++i) {
      const newArtifact = {
        title: 'Module ' + i,
        description: 'Description ' + i,
        assetFolder: listFolders[0]['@id'],
        type: 'https://agentlab.eu/ns/rm/classifier#Classifier',
        format: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Module',
      };

      await createArtifact(newArtifact, graphUri, apiUrl);
    }

    const folderTree = await fetchProjectFoldersTree({ processArea: projectAreaUri }, foldersGraphUri);

    const insertData = async (assetFolder, index, prefix) => {
      const newArtifact = {
        title: `Requirement ${prefix}-${index}`,
        description: 'This Requirement contains in the Folder ' + assetFolder.title,
        assetFolder: assetFolder['@id'],
        type: 'https://agentlab.eu/ns/rm/classifier#Grouping',
        format: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
      };

      await createArtifact(newArtifact, graphUri, apiUrl);

      const newModule = {
        title: `Module ${prefix}-${index}`,
        description: 'This Module contains in the Folder ' + assetFolder.title,
        assetFolder: assetFolder['@id'],
        type: 'https://agentlab.eu/ns/rm/classifier#Grouping',
        format: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
      };

      await createArtifact(newModule, graphUri, apiUrl);

      const newArtifactsCollection = {
        title: `Collection ${prefix}-${index}`,
        description: 'This Collection contains in the Folder ' + assetFolder.title,
        assetFolder: assetFolder['@id'],
        type: 'https://agentlab.eu/ns/rm/classifier#Classifier',
        format: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Collection',
      };

      await createArtifact(newArtifactsCollection, graphUri, apiUrl);
    };

    const dfsCreatingFolders = async (folderList, prefix) => {
      for (let i = 0; i < folderList.length; ++i) {
        await insertData(folderList[i], i, prefix);
        if (folderList[i].children) {
          await dfsCreatingFolders(folderList[i].children, `${prefix}-${i}`);
        }
      }
    };

    await dfsCreatingFolders(folderTree, '');

    //console.log("result", result);
  });
});*/
