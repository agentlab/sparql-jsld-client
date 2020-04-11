import { ObjectProviderImpl } from '../../src/ObjectProviderImpl';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../../src/schema/ArtifactShapeSchema';
import { artifactSchema, classifierSchema } from './TestSchemas';
import { rdfServerUrl, vocabsFiles, shapesFiles, rootFolder } from '../configTests';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

let rmRepositoryID: string;

const provider = new ObjectProviderImpl();
const client = provider.getClient();
client.setServerUrl(rdfServerUrl);

beforeAll(async () => {
  rmRepositoryID = 'test_ArtifactSchemaSchema_' + Date.now();
  try {
    await client.createRepository(rmRepositoryID);
    client.setRepositoryId(rmRepositoryID);
    const files = vocabsFiles.concat(shapesFiles);
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

describe('api/classshape-scenario', () => {
  describe('retrieve schema', () => {
    it('should persist schema in cache', async () => {
      // Class Shape search by property
      const artifactShapeSchema1 = await provider.selectObjects(ArtifactShapeSchema, {
        targetClass: 'rm:Artifact',
      });
      //console.log('classifierShapeSchema1', artifactShapeSchema1);
      expect(artifactShapeSchema1).toHaveLength(1);

      const artifactShapeSchema11 = await provider.selectObjects(ArtifactShapeSchema, {
        targetClass: 'rm:Artifact',
      });
      //console.log('classifierShapeSchema1', artifactShapeSchema1);
      expect(artifactShapeSchema11).toHaveLength(1);
      expect(artifactShapeSchema11).toMatchObject(artifactShapeSchema1);

      // search node shape by shape uri
      const artifactShapeSchema2 = await provider.selectObjects(ArtifactShapeSchema, {
        '@id': 'rm:ArtifactShape',
      });
      //console.log('classifierShapeSchema2', artifactShapeSchema2);
      expect(artifactShapeSchema2).toHaveLength(1);
      expect(artifactShapeSchema2).toMatchObject(artifactShapeSchema1);

      //search property shape by uri
      const modifiedByShapeSchema = await provider.selectObjects(PropertyShapeSchema, {
        '@id': 'rm:modifiedByShape',
      });
      //console.log('modifiedByShapeSchema', modifiedByShapeSchema);
      expect(modifiedByShapeSchema).toHaveLength(1);
    });

    it('should retrieve schema from server', async () => {
      //const propertySchema = await provider.getSchemaByUri('rm:identifierShape');
      //expect(propertySchema).toEqual(expect.anything());

      const artifactSchema2 = await provider.getSchemaByUri(artifactSchema['@id']);
      expect(artifactSchema2).toEqual(expect.anything());
      expect(artifactSchema2).toMatchObject(artifactSchema);
    });

    it('get all shape properties from 1 parent shape', async () => {
      const classifierSchema2 = await provider.getSchemaByUri(classifierSchema['@id']);
      //console.log('classifierSchema2', classifierSchema2);
      expect(classifierSchema2).toEqual(expect.anything());
      expect(classifierSchema2).toMatchObject(classifierSchema);
    });

    it('should retrieve all non-empty schemas from server', async () => {
      const artifactSchema2 = await provider.getSchemaByUri(artifactSchema['@id']);
      const artifactSubclasses = await provider.selectSubclasses(artifactSchema2);
      const allArtifactSubClassesSchemas = await Promise.all(
        artifactSubclasses.map(async (subClass) => provider.getSchemaByUri(subClass['@id'])),
      );
      expect(allArtifactSubClassesSchemas.length).toBeGreaterThan(5);
    });
  });
});

// it('Schema Ref resolution should work', async () => {
// });
