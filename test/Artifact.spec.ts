import { JSONSchema6forRdf, JsObject } from '../src/ObjectProvider';
import { ObjectProviderImpl } from '../src/ObjectProviderImpl';
import {
  rdfServerUrl,
  rmRepositoryParam,
  rmRepositoryType,
  vocabsFiles,
  shapesFiles,
  rootFolder,
  usersFiles,
  projectsFoldersFiles,
} from './configTests';
import { textFormatUri } from './schema/TestSchemas';

import uuid62 from 'uuid62';
//import { sleep } from './SimpleRetrieve.spec';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

let rmRepositoryID: string;
const provider = new ObjectProviderImpl();
const client = provider.getClient();
client.setServerUrl(rdfServerUrl);

let artifactSchema: JSONSchema6forRdf;
let classifierGroupSchema: JSONSchema6forRdf;
const assetFolder = 'folders:folder1';

beforeAll(async () => {
  rmRepositoryID = 'test_Artifact' + Date.now();
  try {
    await client.createRepositoryAndSetCurrent(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    const files = vocabsFiles.concat(shapesFiles, usersFiles, projectsFoldersFiles);
    //console.log('uploadFiles ', files);
    await client.uploadFiles(files, rootFolder);
    //await sleep(5000); // give RDF classifier some time to classify resources after upload

    //let queryPrefixes = await this.getQueryPrefixes();
    //this.sparqlGen.setQueryPrefixes(queryPrefixes);
    artifactSchema = await provider.getSchemaByUri('rm:Artifact');
    classifierGroupSchema = await provider.getSchemaByUri('cpgu:Группировка');
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

async function createRandomTextArtifact(
  schema: JSONSchema6forRdf,
  artifactFormat: string,
  assetFolder: string,
): Promise<JsObject> {
  const uuid = uuid62.v4();
  const newArtifact = {
    title: 'Требование ' + uuid,
    description: 'Описание ' + uuid,
    assetFolder,
    artifactFormat,
  };
  const ret = await provider.createObject(schema, newArtifact);
  return ret;
}

async function deleteAllArtifacts(): Promise<void> {
  //TODO: Delete all class objects with empty conditions call
  let emptyList = await provider.selectObjects(artifactSchema);
  for (const element of emptyList) {
    // eslint-disable-next-line no-await-in-loop
    await provider.deleteObject(artifactSchema, { '@id': element['@id'] });
  }
  /*await Promise.all(
    emptyList.map((element: JsObject) => {
      provider.deleteObject(artifactSchema, { '@id': element['@id'] });
    }),
  );*/
  emptyList = await provider.selectObjects(artifactSchema);
  if (emptyList.length > 0) {
    console.log(emptyList[0]);
  }
  expect(emptyList.length).toBe(0);
  // Fetch latest Id
  const lastId = await provider.selectMaxObjectId(artifactSchema);
  const newId = lastId + 1;
  // Fetch previous list of artifacts
  const previousList = await provider.selectObjects(artifactSchema);
  expect(previousList.find((req: any) => req.identifier === newId)).toBeUndefined();
}

describe('api/artifact-scenario', () => {
  describe('createArtifact 1', () => {
    it(`should persist artifact in the store`, async () => {
      await deleteAllArtifacts();
      expect(await provider.selectMaxObjectId(artifactSchema)).toBe(0);

      //console.log('+++ Create 1st artifact');
      const newArtifact1 = await createRandomTextArtifact(classifierGroupSchema, textFormatUri, assetFolder);
      //console.log('+++ Check 1st artifact');
      const currentList1 = await provider.selectObjects(artifactSchema, { assetFolder });
      expect(currentList1.length).toBe(1);
      expect(currentList1.find((req: any) => req.identifier === newArtifact1.identifier)).toMatchObject(newArtifact1);
      //await sleep(5000);
      const id1 = await provider.selectMaxObjectId(artifactSchema);
      expect(id1).toBe(1);
      expect(newArtifact1.identifier).toBe(1);

      //console.log('+++ Create 2nd artifact');
      const newArtifact2 = await createRandomTextArtifact(classifierGroupSchema, textFormatUri, assetFolder);
      //console.log('+++ Check 2nd artifact');
      const currentList2 = await provider.selectObjects(artifactSchema, { assetFolder });
      expect(currentList2.length).toBe(2);
      expect(currentList2.find((req: any) => req.identifier === newArtifact2.identifier)).toMatchObject(newArtifact2);
      //await sleep(5000);
      const id2 = await provider.selectMaxObjectId(artifactSchema);
      expect(id2).toBe(2);
      expect(newArtifact2.identifier).toBe(2);

      //console.log('+++ Create 3rd artifact');
      const newArtifact3 = await createRandomTextArtifact(classifierGroupSchema, textFormatUri, assetFolder);
      //console.log('=== Check 3rd artifact');
      const currentList3 = await provider.selectObjects(artifactSchema, { assetFolder });
      expect(currentList3.length).toBe(3);
      expect(currentList3.find((req: any) => req.identifier === newArtifact3.identifier)).toMatchObject(newArtifact3);
      //await sleep(5000);
      const id3 = await provider.selectMaxObjectId(artifactSchema);
      expect(id3).toBe(3);
      expect(newArtifact3.identifier).toBe(3);

      //console.log('+++ Delete 1 artifact');
      await provider.deleteObject(artifactSchema, { identifier: newArtifact2.identifier });
      const afterDelList11 = await provider.selectObjects(artifactSchema, { assetFolder });
      expect(afterDelList11.length).toBe(2);
      expect(afterDelList11.filter((req) => req.identifier === newArtifact2.identifier).length).toBe(0);

      const afterDelList12 = await provider.selectObjects(artifactSchema);
      expect(afterDelList12.length).toBe(2);
      expect(afterDelList12.filter((req) => req.identifier === newArtifact2.identifier).length).toBe(0);

      expect(await provider.selectMaxObjectId(artifactSchema)).toBe(3);

      //console.log('+++ Check if the rest 2 artifacts are intact and one is deleted');
      const afterDelList121 = await provider.selectObjects(artifactSchema, {
        assetFolder,
        identifier: newArtifact1.identifier,
      });
      expect(afterDelList121.length).toBe(1);
      expect(afterDelList121[0]).toMatchObject(newArtifact1);

      const afterDelList122 = await provider.selectObjects(artifactSchema, {
        assetFolder,
        identifier: newArtifact2.identifier,
      });
      expect(afterDelList122.length).toBe(0);

      const afterDelList123 = await provider.selectObjects(artifactSchema, {
        assetFolder,
        identifier: newArtifact3.identifier,
      });
      expect(afterDelList123.length).toBe(1);
      expect(afterDelList123[0]).toMatchObject(newArtifact3);

      //console.log('+++ Create artifact after delete');
      const newArtifact4 = await createRandomTextArtifact(classifierGroupSchema, textFormatUri, assetFolder);
      const currentList4 = await provider.selectObjects(artifactSchema, { assetFolder });
      expect(currentList4.length).toBe(3);
      expect(currentList4.find((req: any) => req.identifier === newArtifact4.identifier)).toMatchObject(newArtifact4);
      expect(await provider.selectMaxObjectId(artifactSchema)).toBe(4);
      expect(newArtifact4.identifier).toBe(4);

      //console.log('+++ Modify artifact');
      const forUpdateArtifact4: JsObject = newArtifact4;
      forUpdateArtifact4.title = 'Изменение заголовка требования';

      const updatedArtifact4 = await provider.updateObject(
        artifactSchema,
        { identifier: forUpdateArtifact4.identifier },
        {
          title: forUpdateArtifact4.title,
        },
      );
      //expect(updatedArtifact4.identifier).toBe(forUpdateArtifact4.identifier);
      expect(updatedArtifact4.title).toBe(forUpdateArtifact4.title);
      expect(forUpdateArtifact4.modified).not.toBe(updatedArtifact4.modified);
      forUpdateArtifact4.modified = updatedArtifact4.modified;
      forUpdateArtifact4.modifiedBy = updatedArtifact4.modifiedBy;

      const currentList5 = await provider.selectObjects(artifactSchema, {
        identifier: forUpdateArtifact4.identifier,
      });
      expect(currentList5.length).toBe(1);
      const ss = currentList5[0];
      expect(ss).toMatchObject(forUpdateArtifact4);
      expect(await provider.selectMaxObjectId(artifactSchema)).toBe(4);
      expect(currentList5[0].identifier).toBe(4);

      const currentList6 = await provider.selectObjects(artifactSchema);
      expect(currentList6.length).toBe(3);
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
      const newTitle = 'Изменение заголовка требования';

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
      const newTitle = 'Изменение2 заголовка требования';
      const newDescription = 'Изменение2 описания требования';

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
        title: 'Требование ' + i,
        description: 'Описание ' + i,
        assetFolder: listFolders[0]['@id],
        type: 'http://cpgu.kbpm.ru/ns/rm/cpgu#Группировка',
        format: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
      };

      await createArtifact(newArtifact, graphUri, apiUrl);
    }

    // Creating module
    for (let i = 0; i < 1; ++i) {
      const newArtifact = {
        title: 'Модуль ' + i,
        description: 'Описание ' + i,
        assetFolder: listFolders[0]['@id'],
        type: 'http://cpgu.kbpm.ru/ns/rm/cpgu#Classifier',
        format: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Module',
      };

      await createArtifact(newArtifact, graphUri, apiUrl);
    }

    const folderTree = await fetchProjectFoldersTree({ processArea: projectAreaUri }, foldersGraphUri);

    const insertData = async (assetFolder, index, prefix) => {
      const newArtifact = {
        title: `Требование ${prefix}-${index}`,
        description: 'Это требование содержится в директории ' + assetFolder.title,
        assetFolder: assetFolder['@id'],
        type: 'http://cpgu.kbpm.ru/ns/rm/cpgu#Группировка',
        format: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
      };

      await createArtifact(newArtifact, graphUri, apiUrl);

      const newModule = {
        title: `Модуль ${prefix}-${index}`,
        description: 'Этот модуль содержится в директории ' + assetFolder.title,
        assetFolder: assetFolder['@id'],
        type: 'http://cpgu.kbpm.ru/ns/rm/cpgu#Группировка',
        format: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Text',
      };

      await createArtifact(newModule, graphUri, apiUrl);

      const newArtifactsCollection = {
        title: `Набор требований ${prefix}-${index}`,
        description: 'Этот набор требований содержится в директории ' + assetFolder.title,
        assetFolder: assetFolder['@id'],
        type: 'http://cpgu.kbpm.ru/ns/rm/cpgu#Classifier',
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
  });*/
});
