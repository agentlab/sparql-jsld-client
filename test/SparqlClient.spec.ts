import { rootStore } from '../src/models/model';
import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { vocabsFiles, shapesFiles, rootFolder } from './configTests';
import { genTimestampedName } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

rootStore.server.setURL(rdfServerUrl);
const repository = rootStore.server.repository;
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_SparqlClient');
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
    await repository.uploadFiles(shapesFiles, rootFolder);
  } catch (error) {
    if (error.response) {
      // Request made and server responded
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      const s = error.request;
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', error.message);
    }
    fail(error);
  }
});

afterAll(async () => {
  try {
    await repository.deleteRepository(rmRepositoryID);
  } catch (err) {
    fail(err);
  }
});

describe('SparqlClient', () => {
  it(`SparqlClient should select namespaces`, async () => {
    expect(repository.queryPrefixes.current.size).toBe(4);
    await repository.queryPrefixes.reloadQueryPrefixes();
    //console.log(getSnapshot(repository.queryPrefixes.current));
    expect(repository.queryPrefixes.current.size).toBeGreaterThan(4);

    const namespaces = repository.queryPrefixes.currentJs;
    expect(namespaces.rdf).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
  });
  it(`SparqlClient should select direct parent classes`, async () => {
    const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
    SELECT ?superClass WHERE { cpgu:Classifier rdfs:subClassOf ?superClass. }`;
    const results = await repository.sparqlSelect(query, { infer: 'false' });
    //console.log('results', json2str(results));
    expect(results.bindings).toHaveLength(1);
  });
  it(`SparqlClient should select one directSubClassOf with enabled inference`, async () => {
    const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
    SELECT ?superClass WHERE { cpgu:Classifier sesame:directSubClassOf ?superClass. }`;
    const results = await repository.sparqlSelect(query);
    //console.log('results', json2str(results));
    expect(results.bindings).toHaveLength(1);
  });
});
