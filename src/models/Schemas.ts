import {
  types,
  flow,
  getParentOfType,
  IAnyModelType,
  IAnyType,
  Instance,
  applySnapshot,
  getSnapshot,
} from 'mobx-state-tree';

import { JSONSchema6forRdf, copyUniqueObjectPropsWithRenameOrFilter } from '../ObjectProvider';
import {
  propertyShapesToSchemaProperties,
  addToSchemaParentSchema,
  uiMapping,
  schemaNonPrimitivePropsKeys,
} from '../ObjectProviderImpl';

import { ResourceSchema, ClassSchema } from '../schema/RdfsSchema';
import { ArtifactShapeSchema } from '../schema/ArtifactShapeSchema';

import { JsObject2 } from './Query';
import { JSONSchema6Definition } from 'json-schema';
import { Repository } from './Repository';
import { IKeyValueMap } from 'mobx';

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

export const JSONSchema7forRdf = types
  .model('JSONSchema7forRdf', {
    /**
     * ext json-ld Node
     * https://github.com/json-ld/json-ld.org/blob/master/schemas/jsonld-schema.json
     */
    '@id': types.identifier,
    '@type': types.maybe(types.string),
    '@context': types.maybe(types.map(types.union(types.string, types.map(types.string)))), // json-ld

    /**
     * Original JSON Schema
     */
    //$schema: types.union(types.string, types.undefined),

    title: types.maybe(types.string),
    description: types.maybe(types.string),

    properties: types.optional(types.map(types.late((): IAnyModelType => JSONSchema7PropertyForRdf)), {}),
    required: types.optional(types.array(types.string), []),
  })

  /**
   * Views
   */
  .views((self) => ({
    get propertiesJs(): IKeyValueMap<any> {
      return getSnapshot(self.properties);
    },
    get requiredJs(): IKeyValueMap<any> {
      return getSnapshot(self.required);
    },
  }));

export interface IJSONSchema7forRdf extends Instance<typeof JSONSchema7forRdf> {}

export const JSONSchema7PropertyForRdf = types.model('JSONSchema7PropertyForRdf', {
  title: types.maybe(types.string),
  description: types.maybe(types.string),

  type: JSONSchema7TypeName,
  enum: types.maybe(JSONSchema7Array),
  default: types.maybe(JSONSchema7Type),

  format: types.maybe(types.string),
  contentMediaType: types.maybe(types.string),
  contentEncoding: types.maybe(types.string),

  readOnly: types.maybe(types.boolean),
  writeOnly: types.maybe(types.boolean),
  // ext
  //valueModifiability: types.maybe(types.string), // user or non -- system
  //shapeModifiability: types.maybe(types.string), // user or non -- system
});

export interface IJSONSchema7PropertyForRdf extends Instance<typeof JSONSchema7PropertyForRdf> {}

export const Schemas = types
  .model('Schemas', {
    json: types.map(JSONSchema7forRdf),
    //ui: types.map(JsObject2),
  })

  /**
   * Views
   */
  .views((self) => ({
    get(id: string) {
      return self.json.get(id);
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
     * @param uri -- element's class uri
     */
    const resolveSchemaFromServer = flow(function* resolveSchemaFromServer(uri: string) {
      //console.log('resolveSchemaFromServer', { uri });
      const shapes = yield repository.selectObjects(ArtifactShapeSchema, {
        targetClass: uri,
      });
      if (!shapes || shapes.length === 0) return { schema: undefined, uiSchema: undefined };
      const shape = shapes[0];
      const schema: JSONSchema6forRdf = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        '@id': shape.targetClass,
        '@type': shape.targetClass,
        title: shape.title,
        description: shape.description,
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
        targetClass: null,
      });
      // properties from shapes hierarchy
      const classSchema = {
        ...ClassSchema,
        '@id': uri,
        '@type': uri,
      };
      const superClassesUris = yield repository.selectDirectSuperClasses(classSchema, { '@id': uri });
      //console.debug(() => `resolveSchemaFromServer superClasses=${superClassesUris}`);
      const superClassesSchemas = yield Promise.all(
        superClassesUris.filter((c: string) => c !== 'rdfs:Resource' && c !== uri),
        /*.map(async (superClassUri) => this.getSchemaByUri(superClassUri))*/
      );
      if (superClassesSchemas.length > 0) {
        schema.allOf = [];
        superClassesSchemas.forEach((superClassesSchema: any) =>
          schema.allOf?.push({
            $ref: superClassesSchema /*['@id']*/,
          }),
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
      //console.log('resolveSchemaFromServer END', { uri, schema, uiSchema });
      return { schema, uiSchema };
    });

    /**
     * Temporal Promise which could be returned while it is in the process if resolving itself into schema
     * If resolved, rewrites itself with value in schemas
     * @param uri
     */
    const getSchemaByUriInternalTmpPromise = flow(function* getSchemaByUriInternalTmpPromise(uri: string) {
      let { schema, uiSchema } = yield resolveSchemaFromServer(uri);
      //console.debug(() => `getSchemaByUriInternalTmpPromise resolveSchemaFromServer =${schema}`);
      if (!schema) {
        // if not found fallback to Resource with URI and maybe label
        schema = {
          ...ResourceSchema,
          '@id': uri,
          '@type': uri,
        };
      }
      if (!uiSchema) {
        uiSchema = {};
      }
      self.json.set(uri, schema);
      //self.ui.set(uri, uiSchema);
      return schema;
    });

    const getSchemaByUriInternal = flow(function* getSchemaByUriInternal(uri: string) {
      //console.log('getSchemaByUriInternal', uri);
      uri = repository.queryPrefixes.abbreviateIri(uri);
      let schema = self.json.get(uri);
      if (schema === undefined) {
        //console.log('getSchemaByUriInternal NOT found', { uri, schema, schemas: this.schemas });
        schema = yield getSchemaByUriInternalTmpPromise(uri);
        //self.json.set(uri, schema); // if Promise, add Promise
      } else {
        //console.log('getSchemaByUriInternal found', { uri, schema, schemas: this.schemas });
      }
      return schema;
    });

    const findAllSuperSchemas = flow(function* findAllSuperSchemas(uri: string) {
      //console.log('getSchemaByUri', { uri });
      const schemaQueue: JSONSchema6forRdf[] = [];
      const schemaTmpQueue: JSONSchema6forRdf[] = [];
      let schemaAllOf: JSONSchema6Definition[];
      let schemaParents: JSONSchema6forRdf[];
      let schema: JSONSchema6forRdf;
      let schemaOrUndefined: JSONSchema6forRdf | undefined;
      schema = yield getSchemaByUriInternal(uri);
      //console.log('getSchemaByUri schema', { uri, schema });
      schemaTmpQueue.push(schema);
      while (schemaTmpQueue.length > 0) {
        schemaOrUndefined = schemaTmpQueue.shift();
        if (schemaOrUndefined !== undefined) {
          schema = schemaOrUndefined;
          if (schema.allOf) {
            schemaAllOf = schema.allOf.filter((s1: any) => s1.$ref !== undefined);
            //console.log('getSchemaByUri allOf', { uri, schema, schemaAllOf });
            // eslint-disable-next-line no-await-in-loop
            schemaParents = yield Promise.all(schemaAllOf.map((s2: any) => getSchemaByUriInternal(s2.$ref)));
            schemaTmpQueue.push(...schemaParents);
          }
          schemaQueue.push(schema);
        }
      }
      return schemaQueue;
    });

    return {
      addSchema(schema: JSONSchema6forRdf): void {
        const uri: string = repository.queryPrefixes.abbreviateIri(schema['@id']);
        if (!self.json.get(uri)) {
          self.json.set(uri, schema as any);
        }
        //const ajv = new Ajv({ allErrors: true });
        //schemaValidators[schema['@id']] = ajv.compile(schema);
      },

      /**
       * Возвращает по URI сборную JSON Schema + JSON-LD с разрешенными ссылками на другие схемы
       * Т.е. полную, со всеми объявлениями полей и списком required
       * @param uri
       */
      getSchemaByUri: flow(function* getSchemaByUri(uri: string) {
        const schema = { '@id': uri, '@type': uri };
        const schemaQueue = yield findAllSuperSchemas(uri);
        let schemaOrUndefined: JSONSchema6forRdf | undefined;
        //const tmp = schemaQueue.shift();
        //schema = tmp ? { ...tmp } : { ...ResourceSchema, '@id': uri, '@type': uri };
        //schemaQueue.forEach((parentSchema) => addToSchemaParentSchema(schema, parentSchema));
        //alternative realization of above
        while (schemaQueue.length > 0) {
          schemaOrUndefined = schemaQueue.pop();
          if (schemaOrUndefined) {
            addToSchemaParentSchema(schema, schemaOrUndefined);
          }
        }
        if (schemaOrUndefined) {
          Object.keys(schemaOrUndefined)
            .filter((k) => !schemaNonPrimitivePropsKeys.includes(k))
            .forEach((key) => {
              if (key && schema && schemaOrUndefined) (schema as any)[key] = (schemaOrUndefined as any)[key];
            });
        }
        //console.log('getSchemaByUri END', { uri, schema });
        return schema;
      }),
    };
  });

export interface ISchemas extends Instance<typeof Schemas> {}
