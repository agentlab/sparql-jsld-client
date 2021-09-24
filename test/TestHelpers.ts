/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { expect } from '@jest/globals';
import { getSnapshot } from 'mobx-state-tree';
import moment from 'moment';

export function genTimestampedName(name: string): string {
  return name + '_' + moment().format('YYYYMMDD_HHmmssSSSS');
}

// eslint-disable-next-line no-undef
export function sleep(ms: number): Promise<NodeJS.Timeout> {
  return new Promise((resolve: (value: any) => void) => setTimeout(resolve, ms));
}

export async function selectHelper(repository: any, data: any, testerFn: (data: any) => void) {
  const coll = repository.addColl(data);
  await coll.loadColl();
  expect(coll).not.toBeUndefined();
  //console.log('artifact30000', json2str(artifact30000));
  const loadedData = coll && coll.data !== undefined ? getSnapshot(coll.data) : [];
  testerFn(loadedData);
  repository.removeColl(coll);
}
