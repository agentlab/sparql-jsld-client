/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import moment from 'moment';

export function genTimestampedName(name: string): string {
  return  name + '_' + moment().format('YYYYMMDD_HHmmssSSSS');
}