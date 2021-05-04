/********************************************************************************
 * Copyright (c) 2020 Agentlab and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * https://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/
import fs from 'fs';
import { FileUploadConfig, SparqlClient } from 'SparqlClient';

export async function uploadFiles(client: SparqlClient, files: FileUploadConfig[], rootFolder = ''): Promise<void> {
  //console.debug('uploadFiles ', files);
  let statements = '';
  files.forEach((f) => {
    statements = statements + fs.readFileSync(rootFolder + f.file, 'utf8');
  });

  if (statements.length > 0 && files.length > 0) {
    await client.uploadStatements(statements, files[0].baseURI);
  }
}
