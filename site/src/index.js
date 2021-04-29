import { Router } from './utils/router.js'
import { notFound, timed } from './utils/utils.js'
import { HTTPError } from './errors.js'
import { cors, postCors } from './routes/cors.js'
import { check } from './routes/nfts-check.js'
import { upload } from './routes/nfts-upload.js'
import { status } from './routes/nfts-get.js'
import { remove } from './routes/nfts-delete.js'
import { list } from './routes/nfts-list.js'
import { tokensList } from './routes/tokens-list.js'
import { tokensCreate } from './routes/tokens-create.js'
import { tokensDelete } from './routes/tokens-delete.js'
import { pinsAdd } from './routes/pins-add.js'
import { pinsGet } from './routes/pins-get.js'
import { pinsList } from './routes/pins-list.js'
import { pinsReplace } from './routes/pins-replace.js'
import { pinsDelete } from './routes/pins-delete.js'
import { metrics } from './routes/metrics.js'
import {
  updateUserMetrics,
  updateNftMetrics,
  updateNftDealMetrics,
} from './jobs/metrics.js'
import { updatePinStatuses } from './jobs/pins.js'
import { login } from './routes/login.js'
import { JSONResponse } from './utils/json-response.js'
const { debug } = require('./utils/debug')
const log = debug('router')

const r = new Router({
  onError(req, err) {
    log(err)
    return HTTPError.respond(err)
  },
})

// Monitoring
r.add('get', '/metrics', metrics)

// CORS
r.add('options', '*', cors)

// Auth
r.add('post', '/login', login, [postCors])

// Version
r.add('get', '/version', () => {
  return new JSONResponse({
    // @ts-ignore
    version: VERSION,
    // @ts-ignore
    commit: COMMITHASH,
    // @ts-ignore
    branch: BRANCH,
  })
})

// Remote Pinning API
r.add('post', '/pins', pinsAdd, [postCors])
r.add('get', '/pins', pinsList, [postCors])
r.add('get', '/pins/:requestid', pinsGet, [postCors])
r.add('post', '/pins/:requestid', pinsReplace, [postCors])
r.add('delete', '/pins/:requestid', pinsDelete, [postCors])

// Public API
r.add('post', '/upload', upload, [postCors])
r.add('get', '/check/:cid', check, [postCors])
r.add('get', '', list, [postCors])
r.add('get', '/:cid', status, [postCors])
r.add('delete', '/:cid', remove, [postCors])

// Private API
r.add('get', '/internal/tokens', tokensList, [postCors])
r.add('post', '/internal/tokens', tokensCreate, [postCors])
r.add('delete', '/internal/tokens', tokensDelete, [postCors])

r.add('all', '*', notFound)
addEventListener('fetch', r.listen.bind(r))

// Cron jobs
addEventListener('scheduled', (event) =>
  event.waitUntil(
    (async () => {
      await timed(updateUserMetrics, 'CRON updateUserMetrics')
      await timed(updateNftMetrics, 'CRON updateNftMetrics')
    })()
  )
)
addEventListener('scheduled', (event) =>
  event.waitUntil(timed(updateNftDealMetrics, 'CRON updateNftDealMetrics'))
)
addEventListener('scheduled', (event) =>
  event.waitUntil(timed(updatePinStatuses, 'CRON updatePinStatuses'))
)
