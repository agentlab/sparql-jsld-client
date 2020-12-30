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
import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { genTimestampedName } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

rootStore.server.setURL(rdfServerUrl);
const repository = rootStore.server.repository;
let rmRepositoryID: string;

beforeAll(async () => {
  rmRepositoryID = genTimestampedName('test_SparqlClientUpload');
});

describe('SparqlClientUpload', () => {
  it(`SparqlClient should create and delete repository`, async () => {
    await repository.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await repository.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload 1 file`, async () => {
    await repository.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await repository.uploadFiles([vocabsFiles[0]], rootFolder);
    await repository.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload 1 cpgu vocab`, async () => {
    await repository.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await repository.uploadFiles([vocabsFiles[6]], rootFolder);
    await repository.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload 7 vocab files`, async () => {
    await repository.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await repository.uploadFiles(
      [vocabsFiles[0], vocabsFiles[1], vocabsFiles[2], vocabsFiles[3], vocabsFiles[4], vocabsFiles[5], vocabsFiles[6]],
      rootFolder,
    );
    await repository.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload all vocab files`, async () => {
    await repository.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await repository.uploadFiles(vocabsFiles, rootFolder);
    await repository.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload all vocabs and shapes files`, async () => {
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
    await repository.deleteRepository(rmRepositoryID);
  });
  //TODO: Did not work
  /*it(`SparqlClient should upload all shapes and vocabs files`, async () => {
    await repository.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await repository.uploadFiles(shapesFiles, rootFolder);
    await repository.uploadFiles(vocabsFiles, rootFolder);
    await repository.deleteRepository(rmRepositoryID);
  });*/
  it(`SparqlClient should upload all vocabs, shapes and data files`, async () => {
    await repository.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    //TODO: Did not work if shapes not last one
    await repository.uploadFiles(vocabsFiles, rootFolder);
    await repository.uploadFiles(usersFiles, rootFolder);
    await repository.uploadFiles(projectsFoldersFiles, rootFolder);
    await repository.uploadFiles(samplesFiles, rootFolder);
    await repository.uploadFiles(shapesFiles, rootFolder);
    await repository.deleteRepository(rmRepositoryID);
  });
});
