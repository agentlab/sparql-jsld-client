/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { afterAll, beforeAll, describe, expect, jest, it } from '@jest/globals';

import { rootModelInitialState } from '../src/models/Model';
import { MstRepository } from '../src/models/MstRepository';
import { SparqlClientImpl } from '../src/SparqlClientImpl';
import { uploadFiles } from '../src/FileUpload';

import { rdfServerUrl, rmRepositoryParam, rmRepositoryType } from './config';
import { vocabsFiles, shapesFiles, usersFiles, projectsFoldersFiles, samplesFiles, rootFolder } from './configTests';
import { genTimestampedName } from './TestHelpers';

// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

const client = new SparqlClientImpl(rdfServerUrl);
const repository = MstRepository.create(rootModelInitialState, { client });
let rmRepositoryID: string;

describe('SparqlClientUpload', () => {
  it(`SparqlClient should create and delete repository`, async () => {
    rmRepositoryID = genTimestampedName('test_SparqlClientUpload');
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
    rmRepositoryID = genTimestampedName('test_SparqlClientUpload');
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await uploadFiles(client, [vocabsFiles[0]], rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload 1 cpgu vocab`, async () => {
    rmRepositoryID = genTimestampedName('test_SparqlClientUpload');
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await uploadFiles(client, [vocabsFiles[6]], rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload 7 vocab files`, async () => {
    rmRepositoryID = genTimestampedName('test_SparqlClientUpload');
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await uploadFiles(
      client,
      [vocabsFiles[0], vocabsFiles[1], vocabsFiles[2], vocabsFiles[3], vocabsFiles[4], vocabsFiles[5], vocabsFiles[6]],
      rootFolder,
    );
    await client.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload all vocab files`, async () => {
    rmRepositoryID = genTimestampedName('test_SparqlClientUpload');
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await uploadFiles(client, vocabsFiles, rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  it(`SparqlClient should upload all vocabs and shapes files`, async () => {
    rmRepositoryID = genTimestampedName('test_SparqlClientUpload');
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await uploadFiles(client, vocabsFiles, rootFolder);
    await uploadFiles(client, shapesFiles, rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
  //TODO: Did not work
  /*it(`SparqlClient should upload all shapes and vocabs files`, async () => {
    rmRepositoryID = genTimestampedName('test_SparqlClientUpload');
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    await uploadFiles(client, shapesFiles, rootFolder);
    await uploadFiles(client, vocabsFiles, rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });*/
  it(`SparqlClient should upload all vocabs, shapes and data files`, async () => {
    rmRepositoryID = genTimestampedName('test_SparqlClientUpload');
    await client.createRepository(
      {
        ...rmRepositoryParam,
        'Repository ID': rmRepositoryID,
      },
      rmRepositoryType,
    );
    repository.setId(rmRepositoryID);
    //TODO: Did not work if shapes not last one
    await uploadFiles(client, vocabsFiles, rootFolder);
    await uploadFiles(client, usersFiles, rootFolder);
    await uploadFiles(client, projectsFoldersFiles, rootFolder);
    await uploadFiles(client, samplesFiles, rootFolder);
    await uploadFiles(client, shapesFiles, rootFolder);
    await client.deleteRepository(rmRepositoryID);
  });
});
