#!/usr/bin/env node

'use strict'

import Glue from '@hapi/glue'
import Manifest from './manifest.js'

async function main () {

  const manifest = await Manifest()
  const server = await Glue.compose(manifest.get('/', process.env))
  server.start()

  let stopping = false
  const exit = async function () {  
    if (!stopping) {
      stopping = true
      await server.stop()
      process.exit(0)
    }
  }

  process.on('SIGINT', exit)
  process.on('SIGTERM', exit)
}



main()
  .catch(err => process.stderr.write(err + '\n'))
