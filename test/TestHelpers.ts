/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { getSnapshot } from 'mobx-state-tree';
import moment from 'moment';

export function genTimestampedName(name: string): string {
  return  name + '_' + moment().format('YYYYMMDD_HHmmssSSSS');
}

export function sleep(ms: number): Promise<NodeJS.Timeout> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
