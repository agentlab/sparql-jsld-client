/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { rootStore } from '../../src/models/model';


// See https://stackoverflow.com/questions/49603939/async-callback-was-not-invoked-within-the-5000ms-timeout-specified-by-jest-setti
jest.setTimeout(50000);

test('mobx model initial state', () => {
  expect(rootStore.server.repository.repositoryUrl).toBe('/repositories/');
  expect(rootStore.server.repository.statementsUrl).toBe('/repositories//statements');
});

test('mobx model mutate state', () => {
  rootStore.server.repository.setId('rep1');
  expect(rootStore.server.repository.repositoryUrl).toBe('/repositories/rep1');
  expect(rootStore.server.repository.statementsUrl).toBe('/repositories/rep1/statements');

  rootStore.server.setURL('http://server.com');
  expect(rootStore.server.repository.repositoryUrl).toBe('http://server.com/repositories/rep1');
  expect(rootStore.server.repository.statementsUrl).toBe('http://server.com/repositories/rep1/statements');
});
