// eslint-disable-next-line @typescript-eslint/camelcase
import { Quad, NamedNode, Variable } from 'rdf-js';
import { variable } from '@rdfjs/data-model';
import _isUrl from 'is-url';

import {
  JSONSchema6forRdf,
  JSONSchema6forRdfProperty,
  JsObject,
  QueryShape,
} from './ObjectProvider';

export function isUrl(str: string): boolean {
  if (_isUrl(str) === true) return true;
  if (str.startsWith('cpgu:///')) return true;
  return false;
}

export function serializeUri(uri: string): string {
  if (isUrl(uri) === true) {
    return `<${uri}>`;
  }
  return uri;
}

/**
 * BiMap on two JS objects
 * Maps Schema properties keys to SPARQL query variable names and vice versa
 * @param shape
 * @param propName
 * @param varName
 */
export function addprops2vars2props(
  shape: Pick<SparqlShapeInternal, 'props2vars' | 'vars2props'>,
  propName: string,
  varName: string,
): void {
  shape.props2vars[propName] = varName;
  shape.vars2props[varName] = propName;
}

/**
 * Mapping from JSON Schema-like properties to SPARQL named variables
 * More complx then one to one because of '@id' props from JSON-LD
 * '@id' -> 'uri'
 * @param schemaProps -- map of properties
 */
export function propsToSparqlVars(shape: Pick<SparqlShapeInternal, 'props2vars' | 'query'>): Variable[] {
  if (shape.query.variables === undefined) return [];
  const variables = Object.keys(shape.query.variables).map((key) => {
    const val = shape.props2vars[key];
    if (val !== undefined) key = val;
    return variable(key);
  });
  return variables;
}

export function getSchemaPropUri(schema: JSONSchema6forRdf, propertyKey: string): string | undefined {
  const properties = schema.properties;
  const context = schema['@context'];
  if (properties && context && typeof context !== 'string') {
    const prop: JSONSchema6forRdfProperty | undefined = properties[propertyKey];
    if (prop !== undefined && propertyKey !== '@id') {
      const propContext = (context as any)[propertyKey];
      if (propContext) {
        if (typeof propContext === 'string') {
          return propContext;
        } else if (propContext['@id']) {
          return propContext['@id'];
        }
      }
    }
  }
  return undefined;
}

export function getSchemaPropType(
  properties: { [key: string]: JSONSchema6forRdfProperty },
  context: JsObject,
  propertyKey: string,
): string | undefined {
  const prop: JSONSchema6forRdfProperty | undefined = properties[propertyKey];
  const propContext = context[propertyKey];
  if (prop && prop.type && propContext && propContext['@type']) {
    if (prop.type === 'object') {
      return propContext['@type'];
    } else if (prop.type === 'string' && prop.format === 'iri') {
      return propContext['@type'];
    } else if (prop.type === 'array' && prop.items && (prop.items as any).type) {
      if ((prop.items as any).type === 'object') {
        return propContext['@type'];
      } else if ((prop.items as any).type === 'string' && (prop.items as any).format === 'iri') {
        return propContext['@type'];
      }
    }
  }
  return undefined;
}

export function addTo(query: any, key: string, statements: any[]): void {
  if (query) {
    if (query[key]) query[key].push(...statements);
    else query[key] = statements;
  }
}

export function addToBgp(triples: any[]): any[] {
  const resultBgp: any[] = [];
  addToResult(resultBgp, triples);
  return resultBgp;
}

export function addToResult(result: any[], bgpTriples: any[], options?: Quad[], filters?: any[], binds?: any[]): void {
  if (bgpTriples.length > 0) {
    result.push({
      type: 'bgp',
      triples: bgpTriples,
    });
  }
  if (options) {
    options.forEach((option) => {
      result.push({
        type: 'optional',
        patterns: [
          {
            type: 'bgp',
            triples: [option],
          },
        ],
      });
    });
  }
  if (filters) {
    filters.forEach((filter) => {
      result.push(filter);
    });
  }
  if (binds) {
    binds.forEach((bind) => {
      result.push(bind);
    });
  }
}

interface SparqlShapeInternal extends QueryShape {
  // external properties from SparqlShape could be changed by client-code only (GUI code, etc.), immutable within SPARQL generation
  schema: JSONSchema6forRdf;
  conditions: JsObject;
  variables: JsObject;
  data: JsObject;
  // internal properties, created and changed within SPARQL generation
  subj: NamedNode | Variable;
  props2vars: { [s: string]: string };
  vars2props: { [s: string]: string };
  query: { [s: string]: any }; // partial query (variables and conditions)
}
