import { rootStore } from '../../src/models/model';
import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from '../config';
import { vocabsFiles, shapesFiles, rootFolder } from '../configTests';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

rootStore.server.setURL(rdfServerUrl);
const repository = rootStore.server.repository;
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = 'test_MobxSparqlClient_' + Date.now();
  try {
    await repository.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    const files = vocabsFiles.concat(shapesFiles);
    await repository.uploadFiles(files, rootFolder);
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

describe('Mobx Client', () => {
  it(`Mobx should select namespaces`, async () => {
    expect(repository.queryPrefixes.current.size).toBe(3);
    await repository.queryPrefixes.reloadQueryPrefixes();
    //console.log(getSnapshot(repository.queryPrefixes.current));
    expect(repository.queryPrefixes.current.size).toBeGreaterThan(3);

    const namespaces = repository.queryPrefixes.currentJs;
    expect(namespaces.rdf).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#');
  });
  it(`Mobx should select direct parent classes`, async () => {
    const query = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX cpgu: <http://cpgu.kbpm.ru/ns/rm/cpgu#>
    SELECT ?superClass WHERE { cpgu:Classifier rdfs:subClassOf ?superClass. }`;
    const results = await repository.sparqlSelect(query, { infer: 'false' });
    //console.log('results', json2str(results));
    expect(results.bindings).toHaveLength(1);
  });
});
