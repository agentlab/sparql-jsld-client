import { ObjectProviderImpl } from '../../src/ObjectProviderImpl';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../../src/schema/ArtifactShapeSchema';
import { artifactSchema, classifierSchema, artifactShapeNoProperty, artifactShapeProperty } from './TestSchemas';
import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from '../config';
import { vocabsFiles, shapesFiles, rootFolder } from '../configTests';
import { idComparator } from '../../src/ObjectProvider';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

let rmRepositoryID: string;

const provider = new ObjectProviderImpl();
const client = provider.getClient();
client.setServerUrl(rdfServerUrl);

beforeAll(async () => {
  rmRepositoryID = 'test_ArtifactSchemaSchema_' + Date.now();
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

    await provider.reloadQueryPrefixes();
    //provider.setQueryPrefixes(queryPrefixes);
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

describe('Provider api/classshape-scenario', () => {
  describe('Provider retrieve schema', () => {
    it('Provider should retrieve shape from server', async () => {
      // Class Shape search by property
      const artifactShapeSchema1 = await provider.selectObjects(ArtifactShapeSchema, {
        targetClass: 'rm:Artifact',
      });
      const artifactShapeSchema11 = await provider.selectObjects(ArtifactShapeSchema, {
        targetClass: 'rm:Artifact',
      });
      expect(artifactShapeSchema1).toHaveLength(1);
      expect(artifactShapeSchema1[0]).toEqual(expect.objectContaining(artifactShapeNoProperty));
      expect(artifactShapeSchema1[0].property.sort(idComparator)).toEqual(
        expect.arrayContaining(artifactShapeProperty.sort(idComparator)),
      );
      expect(artifactShapeSchema11).toHaveLength(1);
      expect(artifactShapeSchema11[0]).toEqual(expect.objectContaining(artifactShapeNoProperty));
      expect(artifactShapeSchema11[0].property).toEqual(expect.arrayContaining(artifactShapeProperty));

      // search node shape by shape uri
      const artifactShapeSchema2 = await provider.selectObjects(ArtifactShapeSchema, {
        '@id': 'rm:ArtifactShape',
      });
      expect(artifactShapeSchema2).toHaveLength(1);
      expect(artifactShapeSchema2[0]).toEqual(expect.objectContaining(artifactShapeNoProperty));
      expect(artifactShapeSchema2[0].property).toEqual(expect.arrayContaining(artifactShapeProperty));

      //search property shape by uri
      const modifiedByShapeSchema = await provider.selectObjects(PropertyShapeSchema, {
        '@id': 'rm:modifiedByShape',
      });
      expect(modifiedByShapeSchema).toHaveLength(1);
    });

    it('Provider should retrieve schema from server', async () => {
      //const propertySchema = await provider.getSchemaByUri('rm:identifierShape');
      //expect(propertySchema).toEqual(expect.anything());
      const artifactSchema1 = await provider.getSchemaByUriInternal(artifactSchema['@id']);
      expect(artifactSchema1).toMatchObject(artifactSchema);

      const artifactSchema2 = await provider.getSchemaByUri(artifactSchema['@id']);
      expect(artifactSchema2).toEqual(expect.anything());
      expect(artifactSchema2).toMatchObject(artifactSchema);
    });

    it('Provider get all shape properties from 1 parent shape', async () => {
      const classifierSchema2 = await provider.getSchemaByUri(classifierSchema['@id']);
      expect(classifierSchema2).toEqual(expect.anything());
      expect(classifierSchema2).toMatchObject(classifierSchema);
    });

    it('Provider should retrieve all non-empty schemas from server', async () => {
      const artifactSchema2 = await provider.getSchemaByUri(artifactSchema['@id']);
      const artifactSubclasses = await provider.selectSubclasses(artifactSchema2);
      const allArtifactSubClassesSchemas = await Promise.all(
        artifactSubclasses.map(async (subClass) => provider.getSchemaByUri(subClass['@id'])),
      );
      expect(allArtifactSubClassesSchemas.length).toBeGreaterThan(5);
    });
  });
});
