/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import uuid62 from 'uuid62';
import { IKeyValueMap } from 'mobx';
import {
  types,
  flow,
  IAnyModelType,
  IAnyType,
  getSnapshot,
  Instance,
  IAnyStateTreeNode,
  getEnv,
  SnapshotIn,
  SnapshotOut,
} from 'mobx-state-tree';

import { JSONSchema7LD, copyUniqueObjectPropsWithRenameOrFilter, JsObject, JsStrObjObj } from '../ObjectProvider';
import {
  propertyShapesToSchemaProperties,
  schemaNonPrimitivePropsKeys,
  addToSchemaParentSchema,
} from '../ObjectProviderImpl';

import { ClassSchema } from '../schema/RdfsSchema';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../schema/ArtifactShapeSchema';
import { abbreviateIri, factory } from '../SparqlGen';
import { constructObjectsQuery, selectObjectsQuery } from '../SparqlGenSelect';
import { SparqlClient } from '../SparqlClient';
import { getParentOfName } from './Utils';

export function createSchemaWithSubClassOf(schema: any, iri: string, classIri?: string) {
  return {
    ...schema,
    //'@id': iri,
    '@id': '_' + uuid62.v4(),
    targetClass: classIri || schema.targetClass, //['@type'],
    title: 'Class With Parent Schema',
    description: 'Schema of RDF Class With Parent Schema',
    '@context': {
      ...schema['@context'],
      subClassOf: 'sesame:directSubClassOf', //'rdfs:subClassOf',
    },
    properties: {
      ...schema.properties,
      subClassOf: {
        title: 'Subclass of a Class',
        type: 'string',
        format: 'iri',
      },
    },
    required: [...schema.required, 'subClassOf'],
  };
}

const MstJSONSchema7TypeName = types.enumeration(['string', 'number', 'integer', 'boolean', 'object', 'array', 'null']);
const MstJSONSchema7Type = types.union(
  types.string,
  types.number,
  types.boolean,
  types.late((): IAnyType => JSONSchema7Object),
  types.late((): IAnyType => MstJSONSchema7Array),
  types.null,
);
const JSONSchema7Object = types.map(types.late(() => MstJSONSchema7Type));
const MstJSONSchema7Array = types.array(types.late(() => MstJSONSchema7Type));

//export interface IJSONSchema7Object extends Instance<typeof JSONSchema7Object> {}
//export type TJSONSchema7Object = IJSONSchema7Object;
//export interface IJSONSchema7Array extends Instance<typeof JSONSchema7Array> {}
//export type TJSONSchema7Array = IJSONSchema7Array;

/*type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>;*/

export const MstSchemaRef = types.model('MstJSONSchema7LD', {
  $ref: types.string,
});

/**
 * MST JSON Schema LD
 */
export const MstJSONSchema7LD = types
  .model('MstJSONSchema7LD', {
    /**
     * ext json-ld Node
     * https://github.com/json-ld/json-ld.org/blob/master/schemas/jsonld-schema.json
     */
    '@id': types.identifier, // id of a shape
    '@type': types.maybe(types.string), // type of a shape (Node or Property)
    '@context': types.maybe(types.map(types.union(types.string, types.frozen<JsStrObjObj>()))), // json-ld

    /**
     * Our custom extensions from SHACL
     */
    targetClass: types.string, // targetClass of a shape
    //'path': types.maybe(types.string), // targetClass of a shape

    /**
     * Original JSON Schema
     */

    $schema: types.maybe(types.string),
    $id: types.maybe(types.string),
    type: MstJSONSchema7TypeName,

    allOf: types.maybe(types.array(MstSchemaRef)),

    title: types.maybe(types.string),
    description: types.maybe(types.string),

    properties: types.optional(types.map(types.late((): IAnyModelType => MstJSONSchema7LDProperty)), {}),
    required: types.optional(types.array(types.string), []),
  })

  /**
   * Views
   */

  .views((self) => {
    return {
      get js(): IKeyValueMap<any> {
        return getSnapshot(self);
      },
      get propertiesJs(): IKeyValueMap<any> {
        return getSnapshot(self.properties);
      },
      get requiredJs(): IKeyValueMap<any> {
        return getSnapshot(self.required);
      },
    };
  });

export type TMstJSONSchema7LD = Instance<typeof MstJSONSchema7LD>;
export type TMstJSONSchema7LDSnapshotIn = SnapshotIn<typeof MstJSONSchema7LD>;
export type TMstJSONSchema7LDSnapshotOut = SnapshotOut<typeof MstJSONSchema7LD>;

/**
 * MST JSON Schema LD Property
 */
export const MstJSONSchema7LDProperty = types.model('MstJSONSchema7LDProperty', {
  title: types.maybe(types.string),
  description: types.maybe(types.string),

  type: MstJSONSchema7TypeName,
  enum: types.maybe(MstJSONSchema7Array),
  default: types.maybe(MstJSONSchema7Type),
  items: types.maybe(types.late((): IAnyModelType => MstJSONSchema7LDProperty)),

  format: types.maybe(types.string),
  contentMediaType: types.maybe(types.string),
  contentEncoding: types.maybe(types.string),

  readOnly: types.maybe(types.boolean),
  writeOnly: types.maybe(types.boolean),

  // Linked Data SHACL Shapes
  order: types.maybe(types.integer),

  // extension
  valueModifiability: types.maybe(types.string), // user or non -- system
  shapeModifiability: types.maybe(types.string), // user or non -- system
});

export type TMstJSONSchema7LDProperty = Instance<typeof MstJSONSchema7LDProperty>;
export type TMstJSONSchema7LDPropertySnapshotIn = SnapshotIn<typeof MstJSONSchema7LDProperty>;
export type TMstJSONSchema7LDPropertySnapshotOut = SnapshotOut<typeof MstJSONSchema7LDProperty>;

export const MstJSONSchema7LDReference = types.maybe(
  types.reference(MstJSONSchema7LD, {
    get(identifier: string, parent): any {
      if (!parent) return null;
      const rep: IAnyStateTreeNode = getParentOfName(parent, 'MstRepository');
      //console.log('MstSchemas-rep-1', rep);
      if (!rep) return null;
      const schemas = rep.schemas as Instance<typeof MstSchemas>;
      //const ss = getSnapshot(schemas);
      const r = schemas.getOrLoadSchemaByIri(identifier);
      return r;
    },
    set(value) {
      return value['@id'];
    },
  }),
);

export const MstSchemas = types
  .model('MstSchemas', {
    /**
     * Schemas by id
     */
    json: types.map(MstJSONSchema7LD),
    /**
     * Default schemas for classes
     */
    class2schema: types.map(types.string),
    //ui: types.map(JsObject2),
  })

  /**
   * Views
   */
  .views((self) => {
    const rep: IAnyStateTreeNode = getParentOfName(self, 'MstRepository');
    //console.log('MstSchemas-rep-2', rep);
    return {
      get(id: string) {
        return self.json.get(id);
      },
      getByClassId(id: string) {
        return self.class2schema.get(id);
      },
      /**
       * Возвращает по IRI класса дефолтную для него сборную JSON Schema + JSON-LD с разрешенными ссылками на другие схемы
       * Т.е. полную, со всеми объявлениями полей и списком required
       * @param iri
       */
      getOrLoadSchemaByClassIri(iri: string | undefined) {
        if (!iri || iri.length === 0) return null;
        iri = abbreviateIri(iri, rep.ns.currentJs);
        if (self.class2schema.has(iri)) {
          const schemaIri = self.class2schema.get(iri);
          return schemaIri ? self.json.get(schemaIri) : null;
        } else {
          // TODO: this is ugly, but workaround the idea that views should be side effect free.
          // We need a more elegant solution.
          setImmediate(() => {
            if (iri && !self.class2schema.has(iri)) {
              try {
                //@ts-ignore
                self.loadSchemaByClassIri(iri);
              } catch (err) {
                console.log(err);
              }
            }
          });
          return null;
        }
      },
      /**
       * Возвращает по IRI (значению поля '@id') сборную JSON Schema + JSON-LD с разрешенными ссылками на другие схемы
       * Т.е. полную, со всеми объявлениями полей и списком required
       * @param iri
       */
      getOrLoadSchemaByIri(iri: string | undefined) {
        if (!iri || iri.length === 0) return null;
        iri = abbreviateIri(iri, rep.ns.currentJs);
        if (self.json.has(iri)) {
          //console.log('getOrLoadSchemaByIri: return schema', iri);
          return self.json.get(iri);
        }
        // TODO: this is ugly, but workaround the idea that views should be side effect free.
        // We need a more elegant solution.
        setImmediate(async () => {
          if (iri && !self.json.has(iri)) {
            try {
              //@ts-ignore
              await self.loadSchemaByIri(iri);
            } catch (err) {
              console.log(err);
            }
          }
        });
        return null;
      },
    };
  })

  /**
   * Actions
   */
  .actions((self) => {
    const rep: IAnyStateTreeNode = getParentOfName(self, 'MstRepository');
    //console.log('MstSchemas-rep-3', rep);
    const client: SparqlClient = getEnv(self).client;

    const loadSchemaInternal = flow(function* loadSchemaInternal(conditions: JsObject) {
      const schema = yield resolveSchemaFromServer(conditions, rep.ns.currentJs, client);
      if (!schema) return Promise.reject('Cannot load schema with conditions' + conditions);
      // get parent schemas
      let schemaQueue: JSONSchema7LD[] = yield getDirectSuperSchemas(schema);
      schemaQueue = [schema, ...schemaQueue];
      // copy loaded schema and parents into new schema
      let schemaResult: any = { '@id': schema['@id'], '@type': schema['@type'] };
      schemaResult = copyAllSchemasToOne(schemaQueue, schemaResult);
      // add schema to registries
      self.json.set(schemaResult['@id'], schemaResult);
      //console.log('loadSchemaInternal self.json.set', schema['@id']);
      const classIri: string = abbreviateIri(schemaResult.targetClass, rep.ns.currentJs);
      if (!self.class2schema.get(classIri)) {
        self.class2schema.set(classIri, schemaResult['@id']);
        //console.log('loadSchemaInternal self.class2schema.set', classIri, schema['@id']);
      }
      //console.log('END loadSchemaInternal', conditions);
      return self.json.get(schemaResult['@id']);
    });

    const getDirectSuperSchemas = flow(function* getDirectSuperSchemas(schema: JSONSchema7LD) {
      //console.debug('getDirectSuperSchemas for schema=', schema['@id']);
      const schemaOrUndef: JSONSchema7LD | undefined = schema;
      const parentSchemas: any[] = [];
      if (schemaOrUndef.allOf) {
        const schemaAllOf: any[] = schemaOrUndef.allOf.filter((s1: any) => s1.$ref !== undefined);
        //console.debug('getDirectSuperSchemas allOf', { uri, schema, schemaAllOf });
        for (const elem of schemaAllOf) {
          const iri = elem.$ref;
          if (!self.json.has(iri)) {
            //console.log('getDirectSuperSchemas: load schema', iri);
            //@ts-ignore
            yield self.loadSchemaByIri(iri);
          }
          const parentSchema = self.json.get(iri);
          parentSchemas.push(parentSchema);
        }
      }
      //console.debug('END getDirectSuperSchemas for schema=', schema['@id']);
      return parentSchemas;
    });

    const copyAllSchemasToOne = (schemaQueue: JSONSchema7LD[], schema: any) => {
      let schemaOrUndefined: any | undefined;
      while (schemaQueue.length > 0) {
        schemaOrUndefined = schemaQueue.pop();
        if (schemaOrUndefined.js !== undefined) schemaOrUndefined = schemaOrUndefined.js;
        if (schemaOrUndefined) {
          addToSchemaParentSchema(schema, schemaOrUndefined);
        }
      }
      if (schemaOrUndefined) {
        Object.keys(schemaOrUndefined)
          .filter((k) => !schemaNonPrimitivePropsKeys.includes(k))
          .forEach((key) => {
            if (key && (schemaOrUndefined as any)[key] && schema && schemaOrUndefined)
              (schema as any)[key] = (schemaOrUndefined as any)[key];
          });
      }
      //console.debug('getSchemaByUri END', { uri, schema });
      return schema;
    };

    const loadingByClass: any = {};
    const loadingByIri: any = {};

    return {
      addSchema(schema: JSONSchema7LD): void {
        const iri: string = abbreviateIri(schema['@id'], rep.ns.currentJs);
        if (!self.json.get(iri)) {
          self.json.set(iri, schema as any);
        }
        if (schema.targetClass) {
          const classIri: string = abbreviateIri(schema.targetClass, rep.ns.currentJs);
          if (!self.class2schema.get(classIri)) {
            self.class2schema.set(classIri, schema['@id']);
          }
        }
      },

      /**
       * Загружает по IRI класса дефолтную для него сборную JSON Schema + JSON-LD с разрешенными ссылками на другие схемы
       * Т.е. полную, со всеми объявлениями полей и списком required
       * @param iri
       */
      loadSchemaByClassIri: flow(function* loadSchemaByClassIri(iri: string | undefined) {
        //console.log('loadSchemaByClassIri', iri);
        if (!iri || iri.length === 0) return;
        // check loaded repo
        let schemaObs: any = self.class2schema.get(iri);
        if (schemaObs !== undefined) {
          schemaObs = self.json.get(schemaObs);
          if (schemaObs !== undefined) return schemaObs;
        }
        // check loading process
        let loadSchemaGen = loadingByClass[iri];
        if (loadSchemaGen) {
          //console.log('WAIT START loadSchemaByClassIri', iri);
          schemaObs = yield loadSchemaGen;
          //console.log('WAIT END loadSchemaByClassIri', iri);
        } else {
          //console.log('LOAD START loadSchemaByClassIri', iri);
          loadSchemaGen = loadSchemaInternal({ targetClass: iri });
          loadingByClass[iri] = loadSchemaGen;
          schemaObs = yield loadSchemaGen;
          delete loadingByClass[iri];
          //console.log('LOAD END loadSchemaByClassIri', iri);
        }
        return schemaObs;
      }),

      /**
       * Загружает по IRI (значению поля '@id') сборную JSON Schema + JSON-LD с разрешенными ссылками на другие схемы
       * Т.е. полную, со всеми объявлениями полей и списком required
       * @param iri
       */
      loadSchemaByIri: flow(function* loadSchemaByIri(iri: string | undefined) {
        //console.log('loadSchemaByIri', iri);
        if (!iri || iri.length === 0) return;
        // check loaded repo
        let schemaObs: any = self.json.get(iri);
        if (schemaObs !== undefined) return schemaObs;
        // check loading process
        let loadSchemaGen = loadingByIri[iri];
        if (loadSchemaGen) {
          //console.log('WAIT START loadSchemaByIri', iri);
          schemaObs = yield loadSchemaGen;
          //console.log('WAIT END loadSchemaByIri', iri);
        } else {
          //console.log('LOAD START loadSchemaByIri', iri);
          loadSchemaGen = loadSchemaInternal({ '@_id': iri });
          loadingByIri[iri] = loadSchemaGen;
          schemaObs = yield loadSchemaGen;
          delete loadingByIri[iri];
          //console.log('LOAD END loadSchemaByIri', iri);
        }
        return schemaObs;
      }),
    };
  });

export type TMstSchemas = Instance<typeof MstSchemas>;
export type TMstSchemasSnapshotIn = SnapshotIn<typeof MstSchemas>;
export type TMstSchemasSnapshotOut = SnapshotOut<typeof MstSchemas>;

/**
 * Retrieves element's SHACL Shape from server and converts it to 'JSON Schema + LD' and UI Schema
 * for this element.
 * Element's UI Schema could be further customized during visualization process by concrete View settings
 * @param iri -- element's class uri
 */
export async function resolveSchemaFromServer(conditions: JsObject, nsJs: any, client: SparqlClient) {
  //console.debug('resolveSchemaFromServer conditions=', conditions);
  const shapes = await constructObjectsQuery(
    {
      entConstrs: [
        {
          schema: ArtifactShapeSchema,
          conditions: {
            ...conditions,
            property: '?eIri1',
          },
        },
        {
          schema: PropertyShapeSchema,
        },
      ],
      orderBy: [{ expression: factory.variable('order1'), descending: false }],
    },
    nsJs,
    client,
  );

  if (!shapes || shapes.length === 0) {
    return undefined;
  }
  const shape = shapes[0];
  const schema: any = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    '@context': {
      '@type': 'rdf:type',
    },
    properties: {
      '@id': {
        title: 'URI',
        type: 'string',
        format: 'iri',
      },
      '@type': {
        title: 'Class',
        type: 'string',
        format: 'iri',
      },
    },
    required: ['@id', '@type'],
  };
  copyUniqueObjectPropsWithRenameOrFilter(schema, shape, {
    property: null,
  });
  // properties from shapes hierarchy
  const superClassesSchema = createSchemaWithSubClassOf(ClassSchema, shape['@id']);
  const superClassesUris = await selectObjectsQuery(
    {
      entConstrs: [
        {
          schema: superClassesSchema,
          conditions: {
            '@_id': schema.targetClass,
          },
        },
        {
          schema: ArtifactShapeSchema,
          conditions: {
            targetClass: '?subClassOf0',
          },
          variables: {
            eIri1: null,
          },
        },
      ],
    },
    nsJs,
    client,
  );
  //console.debug('resolveSchemaFromServer superClasses=', superClassesUris);
  const superClassesSchemas = superClassesUris.filter(
    (c: any) => c.subClassOf && c.subClassOf !== 'rdfs:Resource' && c['@id1'] && c['@id1'] !== shape['@id'],
  );
  if (superClassesSchemas.length > 0) {
    schema.allOf = [];
    superClassesSchemas.forEach((superClassesSchema: any) => {
      if (superClassesSchema['@id1'])
        schema.allOf?.push({
          $ref: superClassesSchema['@id1'],
        });
    });
  }
  const [props, contexts, reqs] = propertyShapesToSchemaProperties(shape.property);
  schema.properties = { ...schema.properties, ...props };
  schema['@context'] = { ...(schema['@context'] as any), ...contexts };
  schema.required?.push(...reqs);
  //console.debug('resolveSchemaFromServer END conditions=', conditions);
  return schema;
}
