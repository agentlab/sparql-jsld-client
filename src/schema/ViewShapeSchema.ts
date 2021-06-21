/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import { JSONSchema6forRdf } from '../ObjectProvider';

export const ViewShapeSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'rm:ViewShape',
  '@type': 'sh:NodeShape',
  title: 'View Shape',
  description: 'Artifact Shape',
  targetClass: 'rm:View',
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

export const ViewKindShapeSchema: JSONSchema6forRdf = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  '@id': 'rm:ViewShape',
  '@type': 'sh:NodeShape',
  title: 'View Shape',
  description: 'Artifact Shape',
  targetClass: 'rm:View',
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
