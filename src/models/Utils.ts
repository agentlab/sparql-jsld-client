/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { getType, IAnyStateTreeNode, IAnyComplexType, isStateTreeNode } from 'mobx-state-tree';

export function arrDiff(newArr: any[] | undefined, oldArr: any[] | undefined) {
  if (oldArr === undefined) oldArr = [];
  if (newArr === undefined) newArr = [];
  const deleted = oldArr.filter((e) => !newArr.includes(e));
  const added = newArr.filter((e) => !oldArr.includes(e));
  return { deleted, added };
}

type AnyObjectNode = any;
function isTypeByName(value: any, typename: string): boolean {
  return getType(value).name === typename;
}
function getStateTreeNode(value: IAnyStateTreeNode): AnyObjectNode {
  if (!isStateTreeNode(value)) {
    // istanbul ignore next
    throw `Value ${value} is no MST Node`;
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return (value as any).$treenode!;
}

export function getParentOfName<IT extends IAnyComplexType>(target: IAnyStateTreeNode, typename: string) {
  let parent = getStateTreeNode(target).parent;
  while (parent) {
    if (isTypeByName(parent.storedValue, typename)) return parent.storedValue;
    parent = parent.parent;
  }
  throw `Failed to find the parent of ${getStateTreeNode(target)} of a given type`;
}
