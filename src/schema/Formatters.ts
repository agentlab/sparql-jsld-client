/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the GNU General Public License v. 3.0 which is available at
 * https://www.gnu.org/licenses/gpl-3.0.html.
 *
 * SPDX-License-Identifier: GPL-3.0-only
 ********************************************************************************/
import dayjs from 'dayjs';
import { JSONSchema7LD } from '../ObjectProvider';

interface FormatterAndDefaultAndTitle {
  propertyFormatter?: (value: any) => any;
  propertyDefault?: any;
  propertyTitle?: string;
}

export function getPropertyFormatterAndDefault(schema: JSONSchema7LD, propKey: string): FormatterAndDefaultAndTitle {
  const properties = schema.properties;
  const contexts = schema['@context'];
  const result: FormatterAndDefaultAndTitle = {};
  if (properties && contexts && typeof contexts !== 'string' && !Array.isArray(contexts)) {
    const property = properties[propKey];
    const context = (contexts as any)[propKey];
    if (property && context) {
      result.propertyTitle = property.title;
      if (property.type === 'integer') {
        if (context['@id'] === 'dcterms:identifier') {
          result.propertyFormatter = (value: any): any => value.toString().padStart(5, '0');
          result.propertyDefault = 0;
        } else {
          result.propertyFormatter = (value: any): any => value.toString();
          result.propertyDefault = 0;
        }
      } else if (property.type === 'string') {
        if (property.format === 'date-time') {
          result.propertyFormatter = (value: any): any => dayjs(value).format();
          result.propertyDefault = '';
        } else {
          result.propertyFormatter = (value: any): any => value;
          result.propertyDefault = '';
        }
      } else {
        result.propertyFormatter = (value: any): any => value;
        result.propertyDefault = [];
      }
    }
  }
  return result;
}
