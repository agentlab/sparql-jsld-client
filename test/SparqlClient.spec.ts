import { ObjectProviderImpl } from '../src/ObjectProviderImpl';
import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { vocabsFiles, shapesFiles, rootFolder } from './configTests';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

let rmRepositoryID: string;

const provider = new ObjectProviderImpl();
const client = provider.getClient();
client.setServerUrl(rdfServerUrl);

beforeAll(async () => {
  rmRepositoryID = 'test_SparqlClient_' + Date.now();
  try {
    await client.createRepositoryAndSetCurrent(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    const files = vocabsFiles.concat(shapesFiles);
    await client.uploadFiles(files, rootFolder);
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

describe('SparqlClient', () => {
  it(`should select namespaces`, async () => {
    const namespaces = await provider.client.getNamespaces();
    expect(namespaces.rdf).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
  });
  it(`should select direct parent classes`, async () => {
    const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
    SELECT ?superClass WHERE { cpgu:Classifier rdfs:subClassOf ?superClass. }`;
    const results = await provider.client.sparqlSelect(query, { infer: 'false' });
    //console.log('results', json2str(results));
    expect(results.bindings).toHaveLength(1);
  });
});
