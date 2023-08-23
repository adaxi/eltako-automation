#!/usr/bin/env node

'use strict'

import Glue from '@hapi/glue'
import Manifest from './manifest.js'

async function main () {
  const manifest = await Manifest()
  const server = await Glue.compose(manifest.get('/', process.env))
  server.start()
}

main()
  .catch(err => process.stderr.write(err + '\n'))
