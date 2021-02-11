/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { types, flow, applySnapshot, getSnapshot, getEnv } from 'mobx-state-tree';
import { isEmpty } from 'lodash';

import { SparqlClient } from '../SparqlClient';
import { JsStrObj } from '../ObjectProvider';


export const Namespaces = types
  .model('Namespaces', {
    //default: types.map(types.string),
    current: types.map(types.string),
  })

  /**
   * Views
   */
  .views((self) => ({
    get currentJs() {
      return getSnapshot(self.current);
    },
    get(id: string) {
      return self.current.get(id);
    },
  }))

  /**
   * Actions
   */
  .actions((self) => {
    const client: SparqlClient = getEnv(self).client;
    
    return {
      reloadNs: flow(function* reloadNs() {
        //console.log('reloadNs start');
        let ns: JsStrObj = yield client.loadNs();
        //console.log('reloadNs ns =', ns);
        if (ns && !isEmpty(ns)) {
          ns = {
            ...self.currentJs,
            ...ns,
          };
          applySnapshot(self.current, ns);
        }
        //console.log('reloadNs end');
      }),
    };
  });

//export interface IPrefixes extends Instance<typeof Prefixes> {}
