/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { expect } from 'vitest';
import { getSnapshot } from 'mobx-state-tree';
import dayjs from 'dayjs';
import assert from 'assert';

export function genTimestampedName(name: string): string {
  return name + '_' + dayjs().format('YYYYMMDD_HHmmssSSSS');
}

export function sleep(ms: number): Promise<NodeJS.Timeout> {
  return new Promise((resolve: (value: any) => void) => setTimeout(resolve, ms));
}

/**
 * Typescript assertion wrapper for the Jest's toBeDefined matcher
 * See https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41179#issuecomment-1920177478
 * @param arg
 */
export function expectToBeDefined<T>(arg: T): asserts arg is Exclude<T, undefined> {
  expect(arg).toBeDefined();
}

/**
 * Typescript assertion wrapper for the Jest's toBeUndefined matcher
 * See https://github.com/DefinitelyTyped/DefinitelyTyped/issues/41179#issuecomment-1920177478
 * @param arg
 */
export function expectToBeUndefined(arg: unknown): asserts arg is undefined {
  expect(arg).toBeUndefined();
}

export async function selectHelper(repository: any, data: any, testerFn: (data: any) => void) {
  const coll = repository.addColl(data);
  await coll.loadColl();
  expectToBeDefined(coll);
  //console.log('artifact30000', json2str(artifact30000));
  const loadedData = coll.dataJs;
  testerFn(loadedData);
  repository.removeColl(coll);
}

export function failOnError(err: unknown) {
  if (typeof err === 'string' || err instanceof Error) assert.fail(err);
  else {
    console.log(err);
    assert.fail();
  }
}