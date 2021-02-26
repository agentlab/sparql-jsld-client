/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/

export function arrDiff(newArr: any[] | undefined, oldArr: any[] | undefined) {
  if (oldArr === undefined) oldArr = [];
  if (newArr === undefined) newArr = [];
  const deleted = oldArr.filter((e) => newArr && !newArr.includes(e));
  const added = newArr.filter((e) => oldArr && !oldArr.includes(e));
  return { deleted, added };
}