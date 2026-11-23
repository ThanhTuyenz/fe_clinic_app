const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { test } = require('node:test')
const ts = require('typescript')
const axios = require('axios')

const keys = { AUTH_TOKEN: 'access', REFRESH_TOKEN: 'refresh', USER_DATA: 'user' }
const deferred = () => {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

// Run the actual store and interceptors in Node, replacing native storage and HTTP transport.
function load(relative, dependencies) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  const exports = {}
  new Function('require', 'exports', compiled)(name =>
    Object.hasOwn(dependencies, name) ? dependencies[name] : require(name), exports)
  return exports
}

async function harness(t, options = {}) {
  const memory = new Map()
  const storage = {
    getItem: async key => memory.get(key) || null,
    setItem: async (key, value) => { memory.set(key, value) },
    removeItem: async key => { memory.delete(key) },
  }
  const config = { STORAGE_KEYS: keys, resolveApiBaseUrl: () => options.base || 'http://mock-api' }
  const { useAuthStore: store } = load('src/store/useAuthStore.ts', {
    '@react-native-async-storage/async-storage': storage, '../constants/config': config,
  })
  await store.getState().setAuth('old-access', { id: 'user-a' }, 'old-refresh')
  const state = { refreshes: 0, logouts: 0, requests: [], refreshRequests: [] }
  const logout = store.getState().logout
  store.setState({ logout: async () => { state.logouts++; await logout() } })
  const previousAdapter = axios.defaults.adapter
  t.after(() => { axios.defaults.adapter = previousAdapter })
  const response = (request, data, status = 200) => ({ config: request, data, status, statusText: String(status), headers: {} })
  const rejectHttp = (request, status) => {
    throw new axios.AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', request, null, response(request, { message: 'HTTP failure' }, status))
  }
  axios.defaults.adapter = async request => {
    if (request.url.endsWith('/auth/refresh')) {
      state.refreshes++
      state.refreshRequests.push(request)
      if (options.refresh) return options.refresh(request, { response, rejectHttp, state })
      // Let concurrent 401 responses join the same refresh.
      await new Promise(resolve => setImmediate(resolve))
      return response(request, { success: true, data: { token: 'new-access', refreshToken: 'new-refresh' } })
    }
    state.requests.push({ url: request.url, token: request.headers.get('Authorization'), retry: request._retry })
    if (options.protectedRequest) return options.protectedRequest(request, { response, rejectHttp, state })
    if (request.headers.get('Authorization') === 'Bearer old-access') rejectHttp(request, 401)
    return response(request, { ok: true })
  }
  const { api } = load('src/services/api.ts', {
    axios, '@react-native-async-storage/async-storage': storage,
    '../constants/config': config, '../store/useAuthStore': { useAuthStore: store },
  })
  return { api, store, memory, storage, state }
}

test('concurrent expired requests share a refresh and retry with persisted rotated tokens', async t => {
  const { api, memory, state } = await harness(t)
  await Promise.all(['a', 'b', 'c'].map(id => api.get(`/private/${id}`)))
  assert.equal(state.refreshes, 1)
  assert.equal(state.logouts, 0)
  assert.equal(memory.get(keys.AUTH_TOKEN), 'new-access')
  assert.equal(memory.get(keys.REFRESH_TOKEN), 'new-refresh')
  assert.equal(state.refreshRequests[0].timeout, 15000)
  assert.equal(JSON.parse(state.refreshRequests[0].data).refreshToken, 'old-refresh')
  assert(state.requests.slice(3).every(request => request.token === 'Bearer new-access' && request.retry))
})

for (const failure of ['network', 'timeout', 429, 500, 503]) {
  test(`refresh ${failure} rejects all waiters and preserves the session for a later attempt`, async t => {
    let failing = true
    const { api, store, memory, state } = await harness(t, {
      refresh: async (request, { response, rejectHttp }) => {
        await new Promise(resolve => setImmediate(resolve))
        if (failing) {
          if (typeof failure === 'number') rejectHttp(request, failure)
          throw new axios.AxiosError('Temporary failure', failure === 'timeout' ? 'ECONNABORTED' : 'ERR_NETWORK', request)
        }
        return response(request, { token: 'new-access', refreshToken: 'new-refresh' })
      },
    })
    const results = await Promise.allSettled([api.get('/a'), api.get('/b')])
    assert(results.every(result => result.status === 'rejected'))
    assert.equal(state.refreshes, 1)
    assert.equal(state.logouts, 0)
    assert.equal(store.getState().isAuthenticated, true)
    assert.equal(memory.get(keys.REFRESH_TOKEN), 'old-refresh')
    failing = false
    await api.get('/retry-later')
    assert.equal(state.refreshes, 2)
  })
}

for (const status of [401, 403]) {
  test(`refresh ${status} clears the session and rejects every waiter`, async t => {
    const { api, store, memory, state } = await harness(t, {
      refresh: async (request, { rejectHttp }) => {
        await new Promise(resolve => setImmediate(resolve))
        rejectHttp(request, status)
      },
    })
    const results = await Promise.allSettled([api.get('/a'), api.get('/b')])
    assert(results.every(result => result.status === 'rejected'))
    assert.equal(state.logouts, 1)
    assert.equal(store.getState().isAuthenticated, false)
    assert.equal(memory.size, 0)
  })
}

test('a queued request still returning 401 is never refreshed twice', async t => {
  const { api, state } = await harness(t, {
    protectedRequest: (request, { response, rejectHttp }) => {
      if (request.headers.get('Authorization') === 'Bearer old-access' || request.url === '/denied') rejectHttp(request, 401)
      return response(request, { ok: true })
    },
  })
  const results = await Promise.allSettled([api.get('/allowed'), api.get('/denied')])
  assert.equal(results[1].status, 'rejected')
  assert.equal(state.refreshes, 1)
  assert.equal(state.requests.filter(request => request.url === '/denied').length, 2)
})

test('a late 401 reuses the newly issued access token', async t => {
  const started = deferred(), release = deferred()
  const { api, state } = await harness(t, {
    protectedRequest: async (request, { response, rejectHttp }) => {
      if (request.url === '/slow' && request.headers.get('Authorization') === 'Bearer old-access') {
        started.resolve()
        await release.promise
        rejectHttp(request, 401)
      }
      if (request.headers.get('Authorization') === 'Bearer old-access') rejectHttp(request, 401)
      return response(request, { ok: true })
    },
  })
  const slow = api.get('/slow')
  await started.promise
  await api.get('/fast')
  release.resolve()
  await slow
  assert.equal(state.refreshes, 1)
  assert.equal(state.logouts, 0)
})

for (const action of ['logout', 'switch-account']) {
  test(`${action} during refresh prevents restoring or replaying the old session`, async t => {
    const started = deferred(), release = deferred()
    const { api, store, memory, state } = await harness(t, {
      refresh: async (request, { response }) => {
        started.resolve()
        await release.promise
        return response(request, { token: 'old-session-new-access', refreshToken: 'old-session-new-refresh' })
      },
    })
    const pending = api.get('/private')
    const rejection = assert.rejects(pending, error => axios.isCancel(error))
    await started.promise
    if (action === 'logout') await store.getState().logout()
    else await store.getState().setAuth('user-b-access', { id: 'user-b' }, 'user-b-refresh')
    release.resolve()
    await rejection
    assert.equal(state.requests.length, 1)
    assert.equal(memory.get(keys.AUTH_TOKEN), action === 'logout' ? undefined : 'user-b-access')
    assert.equal(memory.get(keys.REFRESH_TOKEN), action === 'logout' ? undefined : 'user-b-refresh')
  })
}

test('a new login without a refresh token removes the previous account refresh token', async t => {
  const { store, memory } = await harness(t)
  await store.getState().setAuth('user-b-access', { id: 'user-b' })
  assert.equal(memory.get(keys.REFRESH_TOKEN), undefined)
  assert.equal(store.getState().user.id, 'user-b')
})

test('missing refresh token logs out without sending a refresh request', async t => {
  const { api, memory, state } = await harness(t)
  memory.delete(keys.REFRESH_TOKEN)
  await assert.rejects(api.get('/private'), /Phiên đăng nhập đã hết hạn/)
  assert.equal(state.refreshes, 0)
  assert.equal(state.logouts, 1)
})

test('storage errors stop the retry and propagate to the caller', async t => {
  const { api, store, storage, state } = await harness(t)
  storage.setItem = async () => { throw new Error('Storage unavailable') }
  await assert.rejects(api.get('/private'), /Storage unavailable/)
  assert.equal(state.requests.length, 1)
  assert.equal(store.getState().token, 'old-access')
  await assert.rejects(store.getState().setAuth('other-token', { id: 'other' }), /Storage unavailable/)
  assert.equal(store.getState().user.id, 'user-a')
})

test('malformed refresh response preserves the session without retrying with an invalid token', async t => {
  const { api, store, state } = await harness(t, { refresh: async (request, { response }) => response(request, { success: true, data: {} }) })
  await assert.rejects(api.get('/private'), /chưa cấp được token mới/)
  assert.equal(state.logouts, 0)
  assert.equal(state.requests.length, 1)
  assert.equal(store.getState().token, 'old-access')
})

test('login failures do not refresh or discard an existing session', async t => {
  const { api, state } = await harness(t, { protectedRequest: (request, { rejectHttp }) => rejectHttp(request, 401) })
  await assert.rejects(api.post('/api/v1/auth/login'))
  assert.equal(state.refreshes, 0)
  assert.equal(state.logouts, 0)
})

test('refresh URL normalizes an API base URL already containing /api/v1', async t => {
  const { api, state } = await harness(t, { base: 'http://mock-api/api/v1/' })
  await api.get('/private')
  assert.equal(state.refreshRequests[0].url, 'http://mock-api/api/v1/auth/refresh')
})
