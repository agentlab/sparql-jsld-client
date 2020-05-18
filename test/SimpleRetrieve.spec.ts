import { ObjectProviderImpl } from '../src/ObjectProviderImpl';
import {
  rdfServerUrl,
  vocabsFiles,
  shapesFiles,
  usersFiles,
  projectsFoldersFiles,
  samplesFiles,
  rootFolder,
} from './configTests';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

let rmRepositoryID: string;
const provider = new ObjectProviderImpl();
const client = provider.getClient();
client.setServerUrl(rdfServerUrl);

export function sleep(ms: number): Promise<NodeJS.Timeout> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeAll(async () => {
  rmRepositoryID = 'test_SimpleRetrieve' + Date.now();
  try {
    await client.createRepositoryAndSetCurrent(rmRepositoryID);
    const files = vocabsFiles.concat(shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles);
    //console.log('uploadFiles ', files);
    await client.uploadFiles(files, rootFolder);

    await provider.reloadQueryPrefixes();
    //await sleep(5000); // give RDF classifier some time to classify resources after upload
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

describe('api/simple-retrieve', () => {
  it('should return Artifacts with expected schema', async () => {
    const artifactSchema = await provider.getSchemaByUri('rm:Artifact');
    const artifacts = await provider.selectObjects(artifactSchema);
    expect(artifacts.length).toBe(15);
    const artifacts2 = await provider.selectObjects('rm:Artifact');
    expect(artifacts2.length).toBe(15);
  });

  it('should return Specific Artifacts with id=30000 with expected schema', async () => {
    const artifact30000Orig = {
      '@id': 'file:///urn-s2-iisvvt-infosystems-classifier-45950.xml',
      '@type': 'cpgu:Classifier',
      assetFolder: 'folders:folder1_1',
      created: '2014-02-10T10:12:16.000Z',
      creator: 'users:amivanoff',
      description: 'ТН ВЭД ТС',
      artifactFormat: 'rmUserTypes:_YwcOsRmREemK5LEaKhoOow_Module',
      identifier: 30000,
      modifiedBy: 'users:amivanoff',
      modified: '2014-02-10T10:12:16.000Z',
      title: 'ТН ВЭД ТС',
    };
    const artifactSchema = await provider.getSchemaByUri('rm:Artifact');
    const artifact30000 = await provider.selectObjectsWithTypeInfo(artifactSchema, { identifier: 30000 });
    //console.log('artifact30000', json2str(artifact30000));
    expect(artifact30000.length).toBe(1);
    expect(artifact30000[0]).toMatchObject(artifact30000Orig);

    const artifactsFromFolder = await provider.selectObjects(artifactSchema, { assetFolder: 'folders:folder1_1' });
    expect(artifactsFromFolder.length).toBe(11);
  });
  it('should return NO Artifacts with unexisted values', async () => {
    const artifactSchema = await provider.getSchemaByUri('rm:Artifact');
    const artifact40000 = await provider.selectObjects(artifactSchema, { identifier: 40000 });
    expect(artifact40000.length).toBe(0);
    const artifactsFromFolder1 = await provider.selectObjects(artifactSchema, { assetFolder: 'folders:folder2' });
    expect(artifactsFromFolder1.length).toBe(0);
  });
  it('should return Specific Artifacts with expected schema', async () => {
    const classifierGroupSchema = await provider.getSchemaByUri('cpgu:Группировка');
    const classifierGroups = await provider.selectObjects(classifierGroupSchema);
    expect(classifierGroups.length).toBe(10);
  });
  it('should return Specific Artifacts with id=30001 with expected schema', async () => {
    const classifierGroupSchema = await provider.getSchemaByUri('cpgu:Группировка');
    const classifierGroups30001 = await provider.selectObjects(classifierGroupSchema, { identifier: 30001 });
    expect(classifierGroups30001.length).toBe(1);
    const classifierGroupsFromFolder = await provider.selectObjects(classifierGroupSchema, {
      assetFolder: 'folders:folder1_1',
    });
    expect(classifierGroupsFromFolder.length).toBe(10);
  });
  it('should return NO Specific Artifacts with unexisted values', async () => {
    const classifierGroupSchema = await provider.getSchemaByUri('cpgu:Группировка');
    const classifierGroups40001 = await provider.selectObjects(classifierGroupSchema, { identifier: 40001 });
    expect(classifierGroups40001.length).toBe(0);
    const classifierGroupsFromFolder1 = await provider.selectObjects(classifierGroupSchema, {
      assetFolder: 'folders:folder1',
    });
    expect(classifierGroupsFromFolder1.length).toBe(0);
  });
  it('should return Formats with expected schema', async () => {
    const formatTypeSchema = await provider.getSchemaByUri('rmUserTypes:_YwcOsRmREemK5LEaKhoOow');
    const formats = await provider.selectObjects(formatTypeSchema);
    //console.log('formats', json2str(formats));
    expect(formats.length).toBe(3);
  });
  it('should return DataType with expected schema', async () => {
    const dataTypeSchema = await provider.getSchemaByUri('rdfs:Datatype');
    const dataTypes = await provider.selectObjects(dataTypeSchema);
    //console.log('dataTypes', json2str(dataTypes));
    expect(dataTypes.length).toBe(7);
  });
  it('should return Folders with expected schema', async () => {
    const folderSchema = await provider.getSchemaByUri('nav:folder');
    const folders = await provider.selectObjects(folderSchema);
    //console.log('dataTypes', json2str(folders));
    expect(folders.length).toBe(6);
  });
  it('should return ArtifactClasses with expected schema', async () => {
    const artifactClasses0 = await provider.selectObjectsWithTypeInfo('rm:ArtifactClasses');
    const classifierClass0 = artifactClasses0.find((e) => e['@id'] === 'cpgu:Classifier');
    expect(classifierClass0).toMatchObject({
      '@id': 'cpgu:Classifier',
      '@type': 'rm:ArtifactClasses',
      title: 'Классификатор',
      description: 'Классификатор или справочник. Описывает структуру классификатора (не данные из него).',
      inCreationMenu: true,
    });
    const artifactClassesSchema = await provider.getSchemaByUri('rm:ArtifactClasses');
    const artifactClasses = await provider.selectObjects(artifactClassesSchema);
    expect(artifactClasses.length).toBeGreaterThan(10);
    const classifierClass = artifactClasses.find((e) => e['@id'] === 'cpgu:Classifier');
    expect(classifierClass).toMatchObject({
      '@id': 'cpgu:Classifier',
      '@type': 'rm:ArtifactClasses',
      title: 'Классификатор',
      description: 'Классификатор или справочник. Описывает структуру классификатора (не данные из него).',
      inCreationMenu: true,
    });
    expect(artifactClasses).toEqual(expect.arrayContaining(artifactClasses0));
  });
});
