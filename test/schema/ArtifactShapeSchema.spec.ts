import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from '../config';
import { rootStore } from '../../src/models/model';
import { createSchemaWithSubClassOf } from '../../src/models/Schemas';
import { idComparator } from '../../src/ObjectProvider';

import { ClassSchema, ResourceSchema } from '../../src/schema/RdfsSchema';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../../src/schema/ArtifactShapeSchema';
import { artifactSchema, classifierSchema, artifactShapeNoProperty, artifactShapeProperty, classifierCompleteSchema } from '../schema/TestSchemas';
import { vocabsFiles, shapesFiles, rootFolder } from '../configTests';
import { genTimestampedName } from '../TestHelpers';


// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(5000000);


rootStore.server.setURL(rdfServerUrl);
const repository = rootStore.server.repository;
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_ArtifactSchemaSchema');
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
    await repository.queryPrefixes.reloadQueryPrefixes();
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

describe('classshape-scenario', () => {
  describe('retrieve schema', () => {
    it('should retrieve shape from server', async () => {
      expect(repository.queryPrefixes.current.size).toBeGreaterThan(4);
      // Class Shape search by property
      let artifactShapeSchema1 = await repository.selectObjects({
        schema: ArtifactShapeSchema['@id'],
        conditions: {
          targetClass: 'rm:Artifact',
        },
      });

      let artifactShapeSchema11 = await repository.selectObjects({
        schema: ArtifactShapeSchema['@id'],
        conditions: {
          targetClass: 'rm:Artifact',
        },
      });

      expect(artifactShapeSchema1).toHaveLength(1);
      artifactShapeSchema1[0] = {
        ...artifactShapeSchema1[0],
        $schema: 'http://json-schema.org/draft-07/schema#',
      };
      expect(artifactShapeSchema1[0]).toEqual(expect.objectContaining(artifactShapeNoProperty));
      expect(artifactShapeSchema1[0].property.sort(idComparator)).toEqual(
        expect.arrayContaining(artifactShapeProperty.sort(idComparator)),
      );
      expect(artifactShapeSchema11).toHaveLength(1);
      artifactShapeSchema11[0] = {
        ...artifactShapeSchema11[0],
        $schema: 'http://json-schema.org/draft-07/schema#',
      };
      expect(artifactShapeSchema11[0]).toEqual(expect.objectContaining(artifactShapeNoProperty));
      expect(artifactShapeSchema11[0].property).toEqual(expect.arrayContaining(artifactShapeProperty));

      // search node shape by shape uri
      let artifactShapeSchema2 = await repository.selectObjects({
        schema: ArtifactShapeSchema['@id'],
        conditions: {
          '@_id': 'rm:ArtifactShape',
        },
      });
      expect(artifactShapeSchema2).toHaveLength(1);
      artifactShapeSchema2[0] = {
        ...artifactShapeSchema2[0],
        $schema: 'http://json-schema.org/draft-07/schema#',
      };
      const ss = artifactShapeNoProperty;
      expect(artifactShapeSchema2[0]).toEqual(expect.objectContaining(ss));
      expect(artifactShapeSchema2[0].property).toEqual(expect.arrayContaining(artifactShapeProperty));

      //search property shape by uri
      let modifiedByShapeSchema = await repository.selectObjects({
        schema: PropertyShapeSchema['@id'],
        conditions: {
          '@_id': 'rm:modifiedByShape',
        }
      });
      expect(modifiedByShapeSchema).toHaveLength(1);
    });

    it('should retrieve 0 superclasses for root class from server', async () => {
      expect(repository.queryPrefixes.current.size).toBeGreaterThan(4);
      const iri = 'rm:Artifact';//'cpgu:Document';
      const query = {
        shapes: [{
          schema: createSchemaWithSubClassOf(ClassSchema, iri, 'rm:ArtifactClasses'),
          conditions: {
            '@_id': iri,
          },
        }],
        // RDF4J REST API options
        //options: {
        //  infer: 'false',
        //},
      };
      const superClassesIris = await repository.selectObjects(query);
      expect(superClassesIris).toHaveLength(1);
    });

    it('should retrieve 2 superclasses for sub-class with  from server', async () => {
      expect(repository.queryPrefixes.current.size).toBeGreaterThan(4);
      const iri = 'cpgu:Document';
      const query = {
        shapes: [{
          schema: createSchemaWithSubClassOf(ClassSchema, iri, 'rm:ArtifactClasses'),
          conditions: {
            '@_id': iri,
          },
        }],
        // RDF4J REST API options
        //options: {
        //  infer: 'false',
        //},
      };
      const superClassesIris = await repository.selectObjects(query);
      expect(superClassesIris).toHaveLength(2);
    });

    it('should retrieve schema from server', async () => {
      expect(repository.queryPrefixes.current.size).toBeGreaterThan(4);
      //const propertySchema = await repository.schemas.getSchemaByUri('rm:identifierShape');
      //expect(propertySchema).toEqual(expect.anything());

      // check first-time schema retrieving
      const artifactSchema1 = await repository.schemas.getSchemaByClassIri(artifactSchema.targetClass);
      expect(artifactSchema1).toEqual(expect.anything());
      expect(artifactSchema1).toMatchObject(artifactSchema);
      // check cached schema retrieving
      const artifactSchema2 = await repository.schemas.getSchemaByClassIri(artifactSchema.targetClass);
      expect(artifactSchema2).toEqual(expect.anything());
      expect(artifactSchema2).toMatchObject(artifactSchema);
    });

    it('get all shape properties from 2 parent shapes', async () => {
      expect(repository.queryPrefixes.current.size).toBeGreaterThan(4);
      // check first-time schema retrieving
      const classifierSchema1 = await repository.schemas.getSchemaByClassIri(classifierSchema.targetClass);
      expect(classifierSchema1).toEqual(expect.anything());
      const ss = classifierCompleteSchema;
      expect(classifierSchema1).toMatchObject(ss);
      // check cached schema retrieving
      const classifierSchema2 = await repository.schemas.getSchemaByClassIri(classifierSchema.targetClass);
      expect(classifierSchema2).toEqual(expect.anything());
      expect(classifierSchema2).toMatchObject(classifierCompleteSchema);
    });

    it('get all shape properties from 2 parent shapes with UTF-8', async () => {
      expect(repository.queryPrefixes.current.size).toBeGreaterThan(4);
      // check first-time schema retrieving
      const classifierSchema1 = await repository.schemas.getSchemaByClassIri('cpgu:Группировка');
      expect(classifierSchema1).toEqual(expect.anything());
      // check cached schema retrieving
      const classifierSchema2 = await repository.schemas.getSchemaByClassIri('cpgu:Группировка');
      expect(classifierSchema2).toEqual(expect.anything());
    });

    /*it('should retrieve all non-empty schemas from server', async () => {
      const artifactSchema2 = await repository.schemas.getSchemaByUri(artifactSchema['@id']);
      const artifactSubclasses = await repository.selectSubclasses(artifactSchema2);
      const allArtifactSubClassesSchemas = await Promise.all(
        artifactSubclasses.map(async (subClass) => repository.schemas.getSchemaByUri(subClass['@id'])),
      );
      expect(allArtifactSubClassesSchemas.length).toBeGreaterThan(5);
    });*/
  });
});
