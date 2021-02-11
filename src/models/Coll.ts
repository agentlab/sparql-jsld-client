/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { types, getParentOfType, Instance, flow, isStateTreeNode, getRoot, getEnv } from 'mobx-state-tree';
import moment from 'moment';

//import { Repository } from './Repository';
import { constructObjects, constructObjectsSnapshot, JsObject2 } from './CollConstr';
import { IRepository } from './Repository';

/**
 * Collection, retrieved from server based on CollConstr with the same @id
 */
export const Coll = types
.model('Coll', {
  /**
   * Collection id
   */
  '@id': types.identifier,

  /**
   * Collection data array
   */
  data: types.array(JsObject2),

  /**
   * Combined collection schema
   */
  //schema: types.map(JSONSchema7forRdf),

  /**
   * SPARQL Select query
   */
  //selectQuery: types.string,

  /**
   * Last synced with the server datetime
   */
  lastSynced: types.maybe(types.number),
})
/**
 * Views
 */
//.views((self) => ({
//}))
/**
 * Actions
 */
.actions((self) => {
  const repository: any = getRoot(self);//getParentOfType(self, Repository);
  //const ns = repository.ns;
  return {
    /*afterCreate() {
      console.log("afterCreate a new Coll!");
    },
    afterAttach() {
      console.log("afterAttach a new Coll!")
    },
    beforeDetach() {
      console.log("beforeDetach a new Coll!")
    }*/
    loadColl: flow(function* loadColl(collConstr: any) {
      let objects = [];
      if (isStateTreeNode(collConstr)) {
        objects = yield constructObjects(collConstr as any);
      } else {
        objects = yield constructObjectsSnapshot(collConstr, repository.schemas,
          repository.ns.currentJs, getEnv(self).client);
      }
      
      self.data = objects;
      //schema: {},
      //selectQuery: '',
      self.lastSynced = moment.now();
    }),
  };
});
export interface IColl extends Instance<typeof Coll> {};
