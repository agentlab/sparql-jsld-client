import { types } from 'mobx-state-tree';

import { Repository } from './Repository';

import { ResourceSchema, ClassSchema } from '../schema/RdfsSchema';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../schema/ArtifactShapeSchema';

export const Server2 = types
  .model('Server2', {
    url: types.string,
    repository: Repository,
  })
  .actions((self) => ({
    setURL(url: string) {
      self.url = url;
    },
  }));
//export interface IServer2 extends Instance<typeof Server2> {}

export const User = types.model('User', {
  login: types.identifier,
  name: types.string,
});
//export interface IUser extends Instance<typeof User> {}

export const RootModel = types.model('RootModel', {
  server: Server2,
  user: User,
  processArea: types.optional(types.string, 'projects:gishbbProject'),
  //settings: types.optional(Settings, {})
});
//export interface IRootModel extends Instance<typeof RootModel> {}

let initialState = RootModel.create({
  server: {
    url: '',
    repository: {
      repId: '',
      queryPrefixes: {
        current: {
          rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
          rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
          xsd: 'http://www.w3.org/2001/XMLSchema#',
        },
      },
      schemas: {
        json: {
          [ResourceSchema['@id']]: ResourceSchema,
          [ClassSchema['@id']]: ClassSchema,
          //[DataTypeSchema['@id']]: DataTypeSchema,
          [ArtifactShapeSchema['@id']]: ArtifactShapeSchema,
          [PropertyShapeSchema['@id']]: PropertyShapeSchema,
        }
      },
    },
  },
  user: {
    //'@id': 'mailto:guest@example.com',//<mailto:guest@example.com>
    login: 'guest@example.com',
    name: 'Guest',
  },
});

const data = localStorage.getItem('rootState');
if (data) {
  const json = JSON.parse(data);
  if (RootModel.is(json)) {
    initialState = RootModel.create(json as any);
  }
}

export const rootStore = initialState;

/*onSnapshot(rootStore, (snapshot) => {
  console.log('Snapshot: ', snapshot);
  localStorage.setItem('rootState', JSON.stringify(snapshot));
});

onPatch(rootStore, (snapshot) => {
  console.log('Snapshot Patch: ', snapshot);
});*/
