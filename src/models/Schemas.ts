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
import { variable } from '@rdfjs/data-model';
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
  getRoot,
} from 'mobx-state-tree';

import { JSONSchema6forRdf, copyUniqueObjectPropsWithRenameOrFilter, JsObject } from '../ObjectProvider';
import {
  propertyShapesToSchemaProperties,
  uiMapping,
  schemaNonPrimitivePropsKeys,
  addToSchemaParentSchema,
} from '../ObjectProviderImpl';

import { ClassSchema } from '../schema/RdfsSchema';
import { ArtifactShapeSchema, PropertyShapeSchema } from '../schema/ArtifactShapeSchema';
import { abbreviateIri } from '../SparqlGen';
import { constructObjectsQuery, selectObjectsQuery } from '../SparqlGenSelect';
import { SparqlClient } from '../SparqlClient';

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
        title: 'Подкласс класса',
        type: 'string',
        format: 'iri',
      },
    },
    required: [...schema.required, 'subClassOf'],
  };
}

const JSONSchema7TypeName = types.enumeration(['string', 'number', 'boolean', 'object', 'integer', 'array', 'null']);
const JSONSchema7Type = types.union(
  types.string,
  types.number,
  types.boolean,
  types.late((): IAnyType => JSONSchema7Object),
  types.late((): IAnyType => JSONSchema7Array),
  types.null,
);
const JSONSchema7Object = types.map(types.late(() => JSONSchema7Type));
const JSONSchema7Array = types.array(types.late(() => JSONSchema7Type));

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

export const SchemaRef = types.model('JSONSchema7forRdf', {
  $ref: types.string,
});

export const JSONSchema7forRdf = types
  .model('JSONSchema7forRdf', {
    /**
     * ext json-ld Node
     * https://github.com/json-ld/json-ld.org/blob/master/schemas/jsonld-schema.json
     */
    '@id': types.identifier, // id of a shape
    '@type': types.maybe(types.string), // type of a shape (Node or Property)
    '@context': types.maybe(types.map(types.union(types.string, types.map(types.string)))), // json-ld

    /**
     * Our custom extensions from SHACL
     */
    targetClass: types.maybe(types.string), // targetClass of a shape
    //'path': types.maybe(types.string), // targetClass of a shape

    /**
     * Original JSON Schema
     */

    $schema: types.maybe(types.string),
    $id: types.maybe(types.string),
    type: JSONSchema7TypeName,

    allOf: types.maybe(types.array(SchemaRef)),

    title: types.maybe(types.string),
    description: types.maybe(types.string),

    properties: types.optional(types.map(types.late((): IAnyModelType => JSONSchema7PropertyForRdf)), {}),
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

//export interface IJSONSchema7forRdf extends Instance<typeof JSONSchema7forRdf> {}

export const JSONSchema7PropertyForRdf = types.model('JSONSchema7PropertyForRdf', {
  title: types.maybe(types.string),
  description: types.maybe(types.string),

  type: JSONSchema7TypeName,
  enum: types.maybe(JSONSchema7Array),
  default: types.maybe(JSONSchema7Type),
  items: types.maybe(types.late((): IAnyModelType => JSONSchema7PropertyForRdf)),

  format: types.maybe(types.string),
  contentMediaType: types.maybe(types.string),
  contentEncoding: types.maybe(types.string),

  readOnly: types.maybe(types.boolean),
  writeOnly: types.maybe(types.boolean),

  // extension
  valueModifiability: types.maybe(types.string), // user or non -- system
  shapeModifiability: types.maybe(types.string), // user or non -- system
});

//export interface IJSONSchema7PropertyForRdf extends Instance<typeof JSONSchema7PropertyForRdf> {}

export const JSONSchema7forRdfReference = types.maybe(
  types.reference(JSONSchema7forRdf, {
    get(identifier: string, parent): any {
      if (!parent) return null;
      const repository: IAnyStateTreeNode = getRoot(parent);
      if (!repository) return null;
      const schemas = repository.schemas as Instance<typeof Schemas>;
      const ss = getSnapshot(schemas);
      const r = schemas.getOrLoadSchemaByIri(identifier);
      return r;
    },
    set(value) {
      return value['@id'];
    },
  }),
);

export const Schemas = types
  .model('Schemas', {
    /**
     * Schemas by id
     */
    json: types.map(JSONSchema7forRdf),
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
    const repository: IAnyStateTreeNode = getRoot(self);
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
        iri = abbreviateIri(iri, repository.ns.currentJs);
        if (self.class2schema.has(iri)) {
          const schemaIri = self.class2schema.get(iri);
          return schemaIri ? self.json.get(schemaIri) : null;
        } else {
          // TODO: this is ugly, but workaround the idea that views should be side effect free.
          // We need a more elegant solution.
          //@ts-ignore
          setImmediate(() => self.loadSchemaByClassIri(iri));
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
        iri = abbreviateIri(iri, repository.ns.currentJs);
        if (!self.json.has(iri)) {
          // TODO: this is ugly, but workaround the idea that views should be side effect free.
          // We need a more elegant solution.
          setImmediate(async () => {
            try {
              //@ts-ignore
              await self.loadSchemaByIri(iri);
            } catch (err) {
              console.log(err);
            }
          });
          return null;
        } else {
          return self.json.get(iri);
        }
      },
    };
  })

  /**
   * Actions
   */
  .actions((self) => {
    const repository: IAnyStateTreeNode = getRoot(self);
    const client: SparqlClient = getEnv(self).client;

    const loadSchemaInternal = flow(function* loadSchemaInternal(conditions: JsObject) {
      const r = yield resolveSchemaFromServer(conditions, repository.ns.currentJs, client);
      const schema = r.schema;
      let uiSchema = r.uiSchema;
      if (!schema) return Promise.reject('Cannot load schema with conditions' + conditions);
      // get parent schemas
      let schemaQueue: JSONSchema6forRdf[] = yield getDirectSuperSchemas(schema);
      schemaQueue = [schema, ...schemaQueue];
      // copy loaded schema and parents into new schema
      let schemaResult: any = { '@id': schema['@id'], '@type': schema['@type'] };
      schemaResult = copyAllSchemasToOne(schemaQueue, schemaResult);
      // add schema to registries
      self.json.set(schemaResult['@id'], schemaResult);
      //console.log('loadSchemaInternal self.json.set', schema['@id']);
      const classIri: string = abbreviateIri(schemaResult.targetClass, repository.ns.currentJs);
      if (!self.class2schema.get(classIri)) {
        self.class2schema.set(classIri, schemaResult['@id']);
        //console.log('loadSchemaInternal self.class2schema.set', classIri, schema['@id']);
      }
      //console.log('END loadSchemaInternal', conditions);
      return self.json.get(schemaResult['@id']);
    });

    const getDirectSuperSchemas = flow(function* getDirectSuperSchemas(schema: JSONSchema6forRdf) {
      //console.debug('getDirectSuperSchemas for schema=', schema['@id']);
      let schemaOrUndef: JSONSchema6forRdf | undefined = schema;
      let parentSchemas: any[] = [];
      if (schemaOrUndef.allOf) {
        let schemaAllOf: any[] = schemaOrUndef.allOf.filter((s1: any) => s1.$ref !== undefined);
        //console.debug('getDirectSuperSchemas allOf', { uri, schema, schemaAllOf });
        for (let i = 0; i < schemaAllOf.length; i++) {
          const iri = schemaAllOf[i].$ref;
          if (!self.json.has(iri)) {
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

    const copyAllSchemasToOne = (schemaQueue: JSONSchema6forRdf[], schema: any) => {
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

    return {
      addSchema(schema: JSONSchema6forRdf): void {
        const iri: string = abbreviateIri(schema['@id'], repository.ns.currentJs);
        if (!self.json.get(iri)) {
          self.json.set(iri, schema as any);
        }
        if (schema.targetClass) {
          const classIri: string = abbreviateIri(schema.targetClass, repository.ns.currentJs);
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
        const schemaObs = yield loadSchemaInternal({ targetClass: iri });
        //console.log('END loadSchemaByClassIri', iri);
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
        const schemaObs = yield loadSchemaInternal({ '@_id': iri });
        //console.log('END loadSchemaByIri', iri);
        return schemaObs;
      }),
    };
  });

export interface ISchemas extends Instance<typeof Schemas> {}

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
      orderBy: [{ expression: variable('order1'), descending: false }],
    },
    nsJs,
    client,
  );

  if (!shapes || shapes.length === 0) {
    return { schema: undefined, uiSchema: undefined };
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
        title: 'Тип',
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
  const [props, contexts, reqs, uiSchemaTmp] = propertyShapesToSchemaProperties(shape.property);
  schema.properties = { ...schema.properties, ...props };
  schema['@context'] = { ...(schema['@context'] as any), ...contexts };
  schema.required?.push(...reqs);

  const uiSchema = {
    '@id': {
      ...uiMapping['@id'],
      'ui:disabled': true,
      'ui:order': 0,
    },
    '@type': {
      ...uiMapping['@type'],
      'ui:disabled': true,
      'ui:order': 1,
    },
    ...uiSchemaTmp,
  };
  //console.debug('resolveSchemaFromServer END conditions=', conditions);
  return { schema, uiSchema };
}
