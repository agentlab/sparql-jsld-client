/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { afterAll, beforeAll, describe, expect, vi, it } from 'vitest';

import { rootModelInitialState } from '../../src/models/Model';
import { MstRepository } from '../../src/models/MstRepository';
import { createSchemaWithSubClassOf, resolveSchemaFromServer } from '../../src/models/MstSchemas';
import { SparqlClientImpl } from '../../src/SparqlClientImpl';
import { selectObjectsQuery } from '../../src/SparqlGenSelect';
import { ClassSchema } from '../../src/schema/RdfsSchema';
import { uploadFiles } from '../../src/FileUpload';

import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from '../config';
import { vocabsFiles, shapesFiles, rootFolder, testNs } from '../configTests';
import { artifactSchema, classifierSchema, classifierCompleteSchema } from '../schema/TestSchemas';
import { failOnError, genTimestampedName } from '../TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
vi.setConfig({ testTimeout: 5_000_000});

const client = new SparqlClientImpl(rdfServerUrl);
const repository = MstRepository.create(rootModelInitialState, { client });
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_ArtifactSchemaSchema');
  //console.log(rmRepositoryID);
  try {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    const files = vocabsFiles.concat(shapesFiles);
    await uploadFiles(client, files, rootFolder);
    await repository.ns.reloadNs();
  } catch (err) {
    failOnError(err);
  }
});

afterAll(async () => {
  try {
    await client.deleteRepository(rmRepositoryID);
  } catch (err) {
    failOnError(err);
  }
});

describe('classshape-scenario', () => {
  it('should retrieve shape from server by select', async () => {
    expect(repository.ns.current.size).toBeGreaterThan(4);
    // Class Shape search by property
    const artifactShapeSchema1 = await resolveSchemaFromServer({ targetClass: 'rm:Artifact' }, testNs, client);
    const artifactShapeSchema11 = await resolveSchemaFromServer({ targetClass: 'rm:Artifact' }, testNs, client);

    expect(artifactShapeSchema1).toMatchObject(artifactSchema);
    expect(artifactShapeSchema1).toMatchObject(artifactShapeSchema11);

    // search node shape by shape uri
    const artifactShapeSchema2 = await resolveSchemaFromServer({ '@_id': 'rm:ArtifactShape' }, testNs, client);
    expect(artifactShapeSchema2).toMatchObject(artifactSchema);
  });

  it('should retrieve 0 superclasses for root class from server', async () => {
    const iri = 'rm:Artifact'; //'clss:Document';
    const collConstr = {
      entConstrs: [
        {
          schema: createSchemaWithSubClassOf(ClassSchema, iri, 'rm:ArtifactClasses'),
          conditions: {
            '@_id': iri,
          },
        },
      ],
      // RDF4J REST API options
      //options: {
      //  infer: 'false',
      //},
    };
    const superClassesIris = await selectObjectsQuery(collConstr, testNs, client);
    expect(superClassesIris).toHaveLength(1);
  });

  it('should retrieve 2 superclasses for sub-class from server', async () => {
    const iri = 'clss:Document';
    const collConstr = {
      entConstrs: [
        {
          schema: createSchemaWithSubClassOf(ClassSchema, iri, 'rm:ArtifactClasses'),
          conditions: {
            '@_id': iri,
          },
        },
      ],
      // RDF4J REST API options
      //options: {
      //  infer: 'false',
      //},
    };
    const superClassesIris = await selectObjectsQuery(collConstr, testNs, client);
    expect(superClassesIris).toHaveLength(2);
  });

  it('should retrieve Artifact schema from server by class', async () => {
    expect(repository.ns.current.size).toBeGreaterThan(4);
    //const propertySchema = await repository.schemas.getSchemaByUri('rm:identifierShape');
    //expect(propertySchema).toEqual(expect.anything());

    // check first-time schema retrieving
    const artifactSchema0Observ = await repository.schemas.loadSchemaByClassIri(artifactSchema.targetClass);
    const artifactSchema0 = artifactSchema0Observ?.js;
    expect(artifactSchema0).toMatchObject(artifactSchema);

    const artifactSchema1Observ = repository.schemas.getOrLoadSchemaByClassIri(artifactSchema.targetClass);
    expect(artifactSchema1Observ).toEqual(expect.anything());
    const artifactSchema1 = artifactSchema1Observ?.js;
    expect(artifactSchema1).toMatchObject(artifactSchema);
    // check cached schema retrieving
    const artifactSchema2Observ = repository.schemas.getOrLoadSchemaByClassIri(artifactSchema.targetClass);
    const artifactSchema2 = artifactSchema2Observ?.js;
    expect(artifactSchema2).toEqual(expect.anything());
    expect(artifactSchema2).toMatchObject(artifactSchema);
  });

  it('should retrieve Artifact schema from server by id', async () => {
    expect(repository.ns.current.size).toBeGreaterThan(4);
    // check first-time schema retrieving
    const artifactSchema1Observ = await repository.schemas.loadSchemaByIri(artifactSchema['@id']);
    expect(artifactSchema1Observ).toEqual(expect.anything());
    const artifactSchema1 = artifactSchema1Observ?.js;
    expect(artifactSchema1).toMatchObject(artifactSchema);
    // check cached schema retrieving
    const artifactSchema2Observ = repository.schemas.getOrLoadSchemaByIri(artifactSchema['@id']);
    const artifactSchema2 = artifactSchema2Observ?.js;
    expect(artifactSchema2).toEqual(expect.anything());
    expect(artifactSchema2).toMatchObject(artifactSchema);
  });

  it('get all shape properties from 2 parent entConstrs with ASCII', async () => {
    expect(repository.ns.current.size).toBeGreaterThan(4);
    // check first-time schema retrieving
    await repository.schemas.loadSchemaByClassIri(classifierSchema.targetClass);
    const classifierSchema1Observ = repository.schemas.getOrLoadSchemaByClassIri(classifierSchema.targetClass);
    expect(classifierSchema1Observ).toEqual(expect.anything());
    const classifierSchema1 = classifierSchema1Observ?.js;

    const ss = classifierCompleteSchema;
    expect(classifierSchema1).toMatchObject(ss);
    // check cached schema retrieving
    const classifierSchema2Observ = repository.schemas.getOrLoadSchemaByClassIri(classifierSchema.targetClass);
    expect(classifierSchema2Observ).toEqual(expect.anything());
    const classifierSchema2 = classifierSchema2Observ?.js;
    expect(classifierSchema2).toMatchObject(classifierCompleteSchema);
  });

  it('get all shape properties from 2 parent entConstrs with UTF-8', async () => {
    expect(repository.ns.current.size).toBeGreaterThan(4);
    // check first-time schema retrieving
    await repository.schemas.loadSchemaByClassIri('clss:Grouping');
    const classifierSchema1 = repository.schemas.getOrLoadSchemaByClassIri('clss:Grouping');
    expect(classifierSchema1).toEqual(expect.anything());
    // check cached schema retrieving
    const classifierSchema2 = repository.schemas.getOrLoadSchemaByClassIri('clss:Grouping');
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
