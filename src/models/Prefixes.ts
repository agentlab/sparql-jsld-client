import { types, flow, applySnapshot, getParentOfType, getSnapshot } from 'mobx-state-tree';
import { isEmpty } from 'lodash';
import { NamedNode } from 'rdf-js';
import { literal, namedNode, triple, variable } from '@rdfjs/data-model';

import { Results, sendGet } from '../SparqlClient';
import { Repository } from './Repository';

/**
 * See getFullIriNamedNode
 */
export type GetFullIriNamedNodeType = (uri: string | NamedNode) => NamedNode;
export type StrConvertorType = (data: string) => string;

export const Prefixes = types
  .model('Prefixes', {
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

    /**
     * See https://www.w3.org/TR/rdf11-concepts/#vocabularies
     * @param fullIri -- full-qualified IRI
     * @returns abbreviated IRI based on this.queryPrefixesMap
     * For example, the IRI http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral would be abbreviated as rdf:XMLLiteral
     */
    abbreviateIri(fullIri: string): string {
      let nsEntries: { prefix: string; ns: string }[] = [];
      if (fullIri) {
        //@ts-ignore  
        const currentJs = self.currentJs;
        Object.keys(currentJs).forEach((prefix) => {
          let ns = currentJs[prefix];
          if (ns && fullIri.startsWith(ns)) nsEntries.push({ prefix, ns });
        });
        if (nsEntries.length > 1) {
          nsEntries = [nsEntries.reduce((prev, curr) => (curr.ns.length > prev.ns.length ? curr : prev))];
        }
        if (nsEntries.length === 1) {
          const value = fullIri.substring(nsEntries[0].ns.length);
          return `${nsEntries[0].prefix}:${value}`;
        } else {
          const [, value] = fullIri.match(/[#]([\d\w-_а-яА-ЯёЁ]+)$/i) || ['', ''];
          if (value) {
            const shortUri = fullIri.substring(0, fullIri.lastIndexOf(value));
            const prefix = Object.keys(currentJs).find((key) => currentJs[key] === shortUri);

            if (prefix) {
              return `${prefix}:${value}`;
            }
          }
        }
      }
      return fullIri;
    },

    /**
     * See https://www.w3.org/TR/rdf11-concepts/#vocabularies
     * @param abbreviatedIri
     * @returns not abbreviated Iri
     * For example, the IRI rdf:XMLLiteral would be de-abbreviated as http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral
     */
    deAbbreviateIri(abbreviatedIri: string): string {
      if (abbreviatedIri) {
        const [, prefixKey, propertyKey] = abbreviatedIri.match(/^([\d\w-_]+):([\d\w-_а-яА-ЯёЁ]+)$/i) || ['', '', ''];
        if (prefixKey && propertyKey) return `${self.current.get(prefixKey)}${propertyKey}`;
      }
      return abbreviatedIri;
    },

    /**
     * See getFullIriNamedNodeType
     * @param uri
     */
    getFullIriNamedNode(uri: string | NamedNode): NamedNode {
      if (typeof uri === 'object') {
        uri = uri.value;
      }
      //@ts-ignore
      return namedNode(self.deAbbreviateIri(uri));
    },
  }))

  /**
   * Actions
   */
  .actions((self) => {
    const repository = getParentOfType(self, Repository) as any;

    const loadNamespaces = flow(function* loadNamespaces() {
      let url = repository.repositoryUrl + '/namespaces';
      let response = yield sendGet(url);
      if (response.status < 200 && response.status > 204) return Promise.reject('Cannot get namespaces');
      let queryPrefixes: { [s: string]: string } = {};
      //console.log('response.data', response.data);
      if (response.data && response.data.results) {
        let results: Results = { bindings: [] };
        results = response.data.results;
        if (results) {
          results.bindings.forEach((b) => {
            if (b.prefix && b.namespace && b.prefix.value && b.namespace.value) {
              queryPrefixes[b.prefix.value] = b.namespace.value;
            }
          });
        }
      }
      return queryPrefixes;
    });
    return {
      reloadQueryPrefixes: flow(function* reloadQueryPrefixes() {
        //console.log('reloadQueryPrefixes start');
        let ns = yield loadNamespaces();
        //console.log('reloadQueryPrefixes ns =', ns);
        if (ns && !isEmpty(ns)) {
          //self.current = ns;
          applySnapshot(self.current, ns);
        }
        //console.log('reloadQueryPrefixes end');
      }),
    };
  });

//export interface IPrefixes extends Instance<typeof Prefixes> {}
