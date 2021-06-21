/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/

export function arrDiff(newArr: any[] | undefined, oldArr: any[] | undefined) {
  if (oldArr === undefined) oldArr = [];
  if (newArr === undefined) newArr = [];
  const deleted = oldArr.filter((e) => newArr && !newArr.includes(e));
  const added = newArr.filter((e) => oldArr && !oldArr.includes(e));
  return { deleted, added };
}
