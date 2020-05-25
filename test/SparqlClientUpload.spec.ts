import { ObjectProviderImpl } from '../src/ObjectProviderImpl';
import { rdfServerUrl, rmRepositoryParam, rmRepositoryType, vocabsFiles, shapesFiles, rootFolder } from './configTests';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

let rmRepositoryID: string;

const provider = new ObjectProviderImpl();
const client = provider.getClient();
client.setServerUrl(rdfServerUrl);

beforeAll(async () => {
  rmRepositoryID = 'test_SparqlClientUpload_' + Date.now();
});

describe('SparqlClientUpload', () => {
  it(`should create and delete repository`, async () => {
    await client.createRepositoryAndSetCurrent(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    await client.deleteRepository(rmRepositoryID);
  });
  it(`should upload 1 file`, async () => {
    await client.createRepositoryAndSetCurrent(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    await client.uploadFiles([vocabsFiles[0]], rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  it(`should upload 1 cpgu vocab`, async () => {
    await client.createRepositoryAndSetCurrent(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    await client.uploadFiles([vocabsFiles[6]], rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  it(`should upload 7 vocab files`, async () => {
    await client.createRepositoryAndSetCurrent(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    await client.uploadFiles(
      [vocabsFiles[0], vocabsFiles[1], vocabsFiles[2], vocabsFiles[3], vocabsFiles[4], vocabsFiles[5], vocabsFiles[6]],
      rootFolder,
    );
    await client.deleteRepository(rmRepositoryID);
  });
  it(`should upload all vocab files`, async () => {
    await client.createRepositoryAndSetCurrent(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    await client.uploadFiles(vocabsFiles, rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  it(`should upload all vocabs and shapes files`, async () => {
    await client.createRepositoryAndSetCurrent(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    const files = vocabsFiles.concat(shapesFiles);
    await client.uploadFiles(files, rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
});
