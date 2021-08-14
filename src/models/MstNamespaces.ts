/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { types, flow, applySnapshot, getSnapshot, getEnv } from 'mobx-state-tree';
import { isEmpty } from 'lodash-es';

import { SparqlClient } from '../SparqlClient';
import { JsStrObj } from '../ObjectProvider';

export const MstNamespaces = types
  .model('MstNamespaces', {
    //default: types.map(types.string),
    current: types.map(types.string),
  })
  .views((self) => {
    return {
      get currentJs() {
        return getSnapshot(self.current);
      },
      get(id: string) {
        return self.current.get(id);
      },
    };
  })
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
