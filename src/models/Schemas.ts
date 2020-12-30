/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import uuid62 from 'uuid62';
import {
  types,
  flow,
  getParentOfType,
  IAnyModelType,
  IAnyType,
  getSnapshot,
} from 'mobx-state-tree';

import { JSONSchema6forRdf, copyUniqueObjectPropsWithRenameOrFilter, JsObject } from '../ObjectProvider';
import {
  propertyShapesToSchemaProperties,
  uiMapping,
  schemaNonPrimitivePropsKeys,
  addToSchemaParentSchema,
} from '../ObjectProviderImpl';

import { ResourceSchema, ClassSchema } from '../schema/RdfsSchema';
import { ArtifactShapeSchema } from '../schema/ArtifactShapeSchema';

import { Repository } from './Repository';
import { IKeyValueMap } from 'mobx';

export function createSchemaWithSubClassOf(schema: any, iri: string, classIri?: string) {
  return {
    ...schema,
    //'@id': iri,
    '@id': '_' + uuid62.v4(),
    targetClass: classIri || schema.targetClass,//['@type'],
    title: 'Class With Parent Schema',
    description: 'Schema of RDF Class With Parent Schema',
    '@context': {
      ...schema['@context'],
      subClassOf: 'sesame:directSubClassOf',//'rdfs:subClassOf',
    },
    properties: {
      ...schema.properties,
      subClassOf: {
        title: 'Подкласс класса',
        type: 'string',
        format: 'iri',
      }
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

export const SchemaRef = types
  .model('JSONSchema7forRdf', {
    $ref: types.string
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
    'targetClass': types.maybe(types.string), // targetClass of a shape
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

  .views((self) => ({
    get js(): IKeyValueMap<any> {
      return getSnapshot(self);
    },
    get propertiesJs(): IKeyValueMap<any> {
      return getSnapshot(self.properties);
    },
    get requiredJs(): IKeyValueMap<any> {
      return getSnapshot(self.required);
    },
  }));

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
  .views((self) => ({
    get(id: string) {
      return self.json.get(id);
    },
    getByClassId(id: string) {
      return self.class2schema.get(id);
    },
  }))

  /**
   * Actions
   */
  .actions((self) => {
    const repository: any = getParentOfType(self, Repository);

    /**
     * Retrieves element's SHACL Shape from server and converts it to 'JSON Schema + LD' and UI Schema
     * for this element.
     * Element's UI Schema could be further customized during visualization process by concrete View settings
     * @param iri -- element's class uri
     */
    const resolveSchemaFromServer = flow(function* resolveSchemaFromServer(conditions: JsObject) {
      //console.debug('resolveSchemaFromServer conditions=', conditions);
      const shapes = yield repository.selectObjects({
        schema: ArtifactShapeSchema['@id'],
        conditions,
      });
      if (!shapes || shapes.length === 0) {
        return { schema: undefined, uiSchema: undefined };
      }
      const shape = shapes[0];
      const schema: any/*JSONSchema6forRdf*/ = {
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
      const superClassesUris = yield repository.selectObjects({
        shapes: [
          {
            schema: createSchemaWithSubClassOf(ClassSchema, shape['@id']),
            conditions: {
              '@_id': schema.targetClass,
            },
          },
          {
            schema: ArtifactShapeSchema['@id'],
            conditions: {
              targetClass: '?subClassOf0',
            },
            variables: {
              'eIri1': null
            },
          }
        ],
      });
      //console.debug('resolveSchemaFromServer superClasses=', superClassesUris);
      const superClassesSchemas = superClassesUris.filter((c: any) => c.subClassOf && c.subClassOf !== 'rdfs:Resource' &&  c['@id1'] && c['@id1'] !== shape['@id']);
      if (superClassesSchemas.length > 0) {
        schema.allOf = [];
        superClassesSchemas.forEach((superClassesSchema: any) => {
          if (superClassesSchema['@id1'])
            schema.allOf?.push({
              $ref: superClassesSchema['@id1'],
            })
          }
        );
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
    });

    const getSchemaByIriInternal = flow(function* getSchemaByIriInternal(iri: string) {
      iri = repository.queryPrefixes.abbreviateIri(iri);
      //console.debug('getSchemaByIriInternal', iri);
      let schema: any | undefined = self.json.get(iri);
      if (schema === undefined) {
        //console.debug('getSchemaByIriInternal NOT found', { uri, schema });
        const r = yield resolveSchemaFromServer({ '@_id': iri });
        schema = r.schema;
        let uiSchema: any | undefined = r.uiSchema;
        if (!schema) {
          // if not found fallback to Resource with URI and maybe label
          schema = {
            ...ResourceSchema,
            '@id': iri + 'Shape',
            '@type': 'sh:NodeShape',
          };
        }
        if (!uiSchema) {
          uiSchema = {};
        }
        self.json.set(schema['@id'], schema);
        //console.debug('getSchemaByIriInternal self.json.set', schema['@id']);
        const classIri: string = repository.queryPrefixes.abbreviateIri(schema.targetClass);
        if (!self.class2schema.get(classIri)) {
          self.class2schema.set(classIri, schema['@id']);
          //console.debug('getSchemaByIriInternal self.class2schema.set', classIri, schema['@id']);
        }
      } else {
        schema = getSnapshot(schema);
        //console.debug('getSchemaByIriInternal found', { uri, schema });
      }
      //console.debug('END getSchemaByIriInternal', iri);
      return schema;
    });

    const getSchemaByClassIriInternal = flow(function* getSchemaByClassIriInternal(iri: string) {
      iri = repository.queryPrefixes.abbreviateIri(iri);
      //console.debug('getSchemaByClassIriInternal', iri);
      const schemaIri = self.class2schema.get(iri);
      let schema: any | undefined = schemaIri ? self.json.get(schemaIri) : undefined;
      if (schema === undefined) {
        //console.debug('getSchemaByClassIriInternal NOT found', { uri, schema });
        const r = yield resolveSchemaFromServer({ targetClass: iri });
        schema = r.schema;
        let uiSchema: any | undefined = r.uiSchema;
        if (!schema) {
          // if not found fallback to Resource with URI and maybe label
          schema = {
            ...ResourceSchema,
            '@id': iri + 'Shape',
            '@type': 'sh:NodeShape',
          };
        }
        if (!uiSchema) {
          uiSchema = {};
        }
        self.json.set(schema['@id'], schema);
        //console.debug('getSchemaByClassIriInternal self.json.set', schema['@id']);
        const classIri: string = repository.queryPrefixes.abbreviateIri(schema.targetClass);
        if (!self.class2schema.get(classIri)) {
          self.class2schema.set(classIri, schema['@id']);
          //console.debug('getSchemaByClassIriInternal self.class2schema.set', classIri, schema['@id']);
        }
      } else {
        schema = getSnapshot(schema);
        //console.debug('getSchemaByClassIriInternal found', { iri, schema });
      }
      //console.debug('END getSchemaByClassIriInternal', iri);
      return schema;
    });

    const findAllSuperSchemas = flow(function* findAllSuperSchemas(schema: JSONSchema6forRdf) {
      //console.debug('findAllSuperSchemas for schema=', schema['@id']);
      const schemaQueue: JSONSchema6forRdf[] = [];
      const schemaTmpQueue: JSONSchema6forRdf[] = [];
      let schemaOrUndef: JSONSchema6forRdf | undefined = schema;
      do {
        if (schemaOrUndef.allOf) {
          let schemaAllOf: any[] = schemaOrUndef.allOf.filter((s1: any) => s1.$ref !== undefined);
          //console.debug('findAllSuperSchemas allOf', { uri, schema, schemaAllOf });
          let schemaParents: JSONSchema6forRdf[] = [];
          for (let i = 0; i < schemaAllOf.length; i++) {
            const s2 = schemaAllOf[i];
            const s3 = yield getSchemaByIriInternal(s2.$ref);
            schemaParents.push(s3);
          }
          schemaTmpQueue.push(...schemaParents);
          schemaQueue.push(...schemaParents);
        }
        schemaOrUndef = schemaTmpQueue.shift();
      } while (schemaOrUndef !== undefined);
      //console.debug('END findAllSuperSchemas for schema=', schema['@id']);
      return schemaQueue;
    });

    const copyAllSchemasToOne = (schemaQueue: JSONSchema6forRdf[], schema: any) => {
      let schemaOrUndefined: any | undefined;
      //const tmp = schemaQueue.shift();
      //schema = tmp ? { ...tmp } : { ...ResourceSchema, '@id': uri, '@type': uri };
      //schemaQueue.forEach((parentSchema) => addToSchemaParentSchema(schema, parentSchema));
      //alternative realization of above
      while (schemaQueue.length > 0) {
        schemaOrUndefined = schemaQueue.pop();
        if (schemaOrUndefined.js !== undefined)
          schemaOrUndefined = schemaOrUndefined.js();
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
    }

    return {
      addSchema(schema: JSONSchema6forRdf): void {
        const iri: string = repository.queryPrefixes.abbreviateIri(schema['@id']);
        if (!self.json.get(iri)) {
          self.json.set(iri, schema as any);
        }
        const classIri: string = repository.queryPrefixes.abbreviateIri(schema.targetClass);
        if (!self.class2schema.get(classIri)) {
          self.class2schema.set(classIri, schema['@id']);
        }
      },

      /**
       * Возвращает по IRI класса дефолтную для него сборную JSON Schema + JSON-LD с разрешенными ссылками на другие схемы
       * Т.е. полную, со всеми объявлениями полей и списком required
       * @param iri
       */
      getSchemaByClassIri: flow(function* getSchemaByClassIri(iri: string) {
        //console.debug('getSchemaByClassIri', iri);
        let schema = yield getSchemaByClassIriInternal(iri);
        let schemaQueue: JSONSchema6forRdf[] = yield findAllSuperSchemas(schema);
        schemaQueue = [schema, ...schemaQueue];

        let schemaResult = { '@id': schema['@id'], '@type': schema['@type'] };
        schemaResult = copyAllSchemasToOne(schemaQueue, schemaResult);
        //console.debug('END getSchemaByClassIri', iri);
        return schemaResult;
      }),

      /**
       * Возвращает по IRI (значению поля '@id') сборную JSON Schema + JSON-LD с разрешенными ссылками на другие схемы
       * Т.е. полную, со всеми объявлениями полей и списком required
       * @param iri
       */
      getSchemaByIri: flow(function* getSchemaByIri(iri: string) {
        //console.debug('getSchemaByIri', iri);
        let schema = yield getSchemaByIriInternal(iri);
        let schemaQueue: JSONSchema6forRdf[] = yield findAllSuperSchemas(schema);
        schemaQueue = [schema, ...schemaQueue];

        let schemaResult = { '@id': schema['@id'], '@type': schema['@type'] };
        schemaResult = copyAllSchemasToOne(schemaQueue, schemaResult);
        //console.debug('END getSchemaByIri', iri);
        return schemaResult;
      }),
    };
  });

//export interface ISchemas extends Instance<typeof Schemas> {}
