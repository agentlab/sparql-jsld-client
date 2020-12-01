import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { rootStore } from '../src/models/model';
import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { genTimestampedName } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(5000000);


rootStore.server.setURL(rdfServerUrl);
const repository = rootStore.server.repository;
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_SimpleRetrieve');
  try {
    await repository.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await repository.uploadFiles(vocabsFiles, rootFolder);
    await repository.uploadFiles(usersFiles, rootFolder);
    await repository.uploadFiles(projectsFoldersFiles, rootFolder);
    await repository.uploadFiles(samplesFiles, rootFolder);
    await repository.uploadFiles(shapesFiles, rootFolder);
    await repository.queryPrefixes.reloadQueryPrefixes();
    await repository.queryPrefixes.reloadQueryPrefixes();
    //await sleep(5000); // give RDF classifier some time to classify resources after upload
  } catch (err) {
    fail(err);
  }
});

afterAll(async () => {
  try {
    await repository.deleteRepository(rmRepositoryID);
  } catch (err) {
    fail(err);
  }
});

describe('SimpleRetrieve', () => {
  it('should return Artifacts with expected schema', async () => {
    const schema = await repository.schemas.getSchemaByClassIri('rm:Artifact');
    const artifacts = await repository.selectObjects(schema);
    expect(artifacts.length).toBe(15);
    const artifacts2 = await repository.selectObjects('rm:ArtifactShape');
    expect(artifacts2.length).toBe(15);
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
    const schema = await repository.schemas.getSchemaByClassIri('rm:Artifact');
    const artifact30000 = await repository.selectObjectsWithTypeInfo({
      schema,
      conditions: { identifier: 30000 },
    });
    //console.log('artifact30000', json2str(artifact30000));
    expect(artifact30000.length).toBe(1);
    expect(artifact30000[0]).toMatchObject(artifact30000Orig);

    const artifactsFromFolder = await repository.selectObjects({
      schema,
      conditions: { assetFolder: 'folders:samples_module' },
    });
    expect(artifactsFromFolder.length).toBe(11);
  });
  it('should return NO Artifacts with unexisted values', async () => {
    const schema = await repository.schemas.getSchemaByClassIri('rm:Artifact');
    const artifact40000 = await repository.selectObjects({
      schema,
      conditions: { identifier: 40000 },
    });
    expect(artifact40000.length).toBe(0);
    const artifactsFromFolder1 = await repository.selectObjects({
      schema,
      conditions: { assetFolder: 'folders:folder2' },
    });
    expect(artifactsFromFolder1.length).toBe(0);
  });
  it('should return Specific Artifacts with expected schema', async () => {
    //console.log("Get SCHEMA ===============================");
    const schema = await repository.schemas.getSchemaByClassIri('cpgu:Группировка');
    //console.log("Get DATA ===============================");
    const classifierGroups = await repository.selectObjects(schema);
    //console.log("Check DATA ===============================");
    expect(classifierGroups.length).toBe(10);
  });
  it('should return Specific Artifacts with id=30001 with expected schema', async () => {
    const schema = await repository.schemas.getSchemaByClassIri('cpgu:Группировка');
    const classifierGroups30001 = await repository.selectObjects({
      schema, 
      conditions: { identifier: 30001 },
    });
    expect(classifierGroups30001.length).toBe(1);
    const classifierGroupsFromFolder = await repository.selectObjects({
      schema,
      conditions: { assetFolder: 'folders:samples_module'},
    });
    expect(classifierGroupsFromFolder.length).toBe(10);
  });
  it('should return NO Specific Artifacts with unexisted values', async () => {
    const schema = await repository.schemas.getSchemaByClassIri('cpgu:Группировка');
    const classifierGroups40001 = await repository.selectObjects({
      schema,
      conditions: { identifier: 40001 },
    });
    expect(classifierGroups40001.length).toBe(0);
    const classifierGroupsFromFolder1 = await repository.selectObjects({
      schema,
      conditions: { assetFolder: 'folders:samples_collection' },
    });
    expect(classifierGroupsFromFolder1.length).toBe(0);
  });
  it('should return Formats with expected schema', async () => {
    const schema = await repository.schemas.getSchemaByClassIri('rmUserTypes:_YwcOsRmREemK5LEaKhoOow');
    const formats = await repository.selectObjects(schema);
    //console.log('formats', json2str(formats));
    expect(formats.length).toBe(3);
  });
  it('should return DataType with expected schema', async () => {
    const schema = await repository.schemas.getSchemaByClassIri('rdfs:Datatype');
    const dataTypes = await repository.selectObjects(schema);
    //console.log('dataTypes', json2str(dataTypes));
    expect(dataTypes.length).toBe(39);
  });
  it('should return Folders with expected schema', async () => {
    const schema = await repository.schemas.getSchemaByClassIri('nav:folder');
    const folders = await repository.selectObjects(schema);
    //console.log('dataTypes', json2str(folders));
    expect(folders.length).toBe(8);
  });
  it('should return ArtifactClasses with expected schema', async () => {
    //const schema2 = await repository.schemas.getSchemaByIri('rm:ArtifactClassesShape');
    const artifactClasses0 = await repository.selectObjectsWithTypeInfo('rm:ArtifactClassesShape');
    const classifierClass0 = artifactClasses0.find((e: any) => e['@id'] === 'cpgu:Classifier');
    expect(classifierClass0).toMatchObject({
      '@id': 'cpgu:Classifier',
      '@type': 'rm:ArtifactClasses',
      title: 'Классификатор',
      description: 'Классификатор или справочник. Описывает структуру классификатора (не данные из него).',
      inCreationMenu: true,
    });
    const schema = await repository.schemas.getSchemaByClassIri('rm:ArtifactClasses');
    const artifactClasses = await repository.selectObjects(schema);
    expect(artifactClasses.length).toBeGreaterThan(10);
    const classifierClass = artifactClasses.find((e: any) => e['@id'] === 'cpgu:Classifier');
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
