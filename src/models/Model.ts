/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import { ResourceSchema, ClassSchema } from '../schema/RdfsSchema';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../schema/ArtifactShapeSchema';

import { mstSchemas } from './Coll';
import { ViewDescr } from './ViewDescr';


export const rootModelInitialState = {
  repId: '',
  user: {
    //'@id': 'mailto:guest@example.com',//<mailto:guest@example.com>
    login: 'guest@example.com',
    name: 'Guest',
  },
  processArea: 'projects:gishbbProject',
  ns: {
    current: {
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      sesame: 'http://www.openrdf.org/schema/sesame#',
    },
  },
  schemas: {
    json: {
      [ResourceSchema['@id']]: ResourceSchema,
      [ClassSchema['@id']]: ClassSchema,
      //[DataTypeSchema['@id']]: DataTypeSchema,
      [ArtifactShapeSchema['@id']]: ArtifactShapeSchema,
      [PropertyShapeSchema['@id']]: PropertyShapeSchema,
    },
    class2schema: {
      [ResourceSchema.targetClass]: ResourceSchema['@id'],
      [ClassSchema.targetClass]: ClassSchema['@id'],
      //[DataTypeSchema.targetClass]: DataTypeSchema['@id'],
      [ArtifactShapeSchema.targetClass]: ArtifactShapeSchema['@id'],
      [PropertyShapeSchema.targetClass]: PropertyShapeSchema['@id'],
    },
  },
  //collsConstr: {},
  colls: {},
};


mstSchemas['rm:View'] = ViewDescr;


/*onSnapshot(rootStore, (snapshot) => {
  console.debug('Snapshot: ', snapshot);
  localStorage.setItem('rootState', JSON.stringify(snapshot));
});

onPatch(rootStore, (snapshot) => {
  console.debug('Snapshot Patch: ', snapshot);
});*/