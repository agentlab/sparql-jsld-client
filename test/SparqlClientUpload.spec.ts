/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { rootModelInitialState } from '../src/models/model';
import { Repository } from '../src/models/Repository';
import { SparqlClientImpl } from '../src/SparqlClientImpl';

import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { genTimestampedName } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

const client = new SparqlClientImpl(rdfServerUrl);
const repository = Repository.create(rootModelInitialState, { client });
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_SparqlClientUpload');
});

describe('SparqlClientUpload', () => {
  it(`SparqlClient should create and delete repository`, async () => {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await client.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload 1 file`, async () => {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await client.uploadFiles([vocabsFiles[0]], rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload 1 cpgu vocab`, async () => {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await client.uploadFiles([vocabsFiles[6]], rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload 7 vocab files`, async () => {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await client.uploadFiles(
      [vocabsFiles[0], vocabsFiles[1], vocabsFiles[2], vocabsFiles[3], vocabsFiles[4], vocabsFiles[5], vocabsFiles[6]],
      rootFolder,
    );
    await client.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload all vocab files`, async () => {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await client.uploadFiles(vocabsFiles, rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload all vocabs and shapes files`, async () => {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await client.uploadFiles(vocabsFiles, rootFolder);
    await client.uploadFiles(shapesFiles, rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  //TODO: Did not work
  /*it(`SparqlClient should upload all shapes and vocabs files`, async () => {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await client.uploadFiles(shapesFiles, rootFolder);
    await client.uploadFiles(vocabsFiles, rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });*/
  it(`SparqlClient should upload all vocabs, shapes and data files`, async () => {
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    //TODO: Did not work if shapes not last one
    await client.uploadFiles(vocabsFiles, rootFolder);
    await client.uploadFiles(usersFiles, rootFolder);
    await client.uploadFiles(projectsFoldersFiles, rootFolder);
    await client.uploadFiles(samplesFiles, rootFolder);
    await client.uploadFiles(shapesFiles, rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
});
