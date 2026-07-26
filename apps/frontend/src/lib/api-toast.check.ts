import { extractApiMessage, shouldToastSuccess } from './api-message.ts'

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`api-toast.check failed: ${label}`)
  }
}

assert(extractApiMessage({ message: 'Runtime created' }) === 'Runtime created', 'string message')
assert(
  extractApiMessage({ message: ['name must be a string'] }) ===
    'name must be a string',
  'array message',
)
assert(extractApiMessage({ message: '' }) === undefined, 'empty message')
assert(extractApiMessage(null) === undefined, 'null payload')
assert(shouldToastSuccess('post', false) === true, 'post success toast')
assert(shouldToastSuccess('get', false) === false, 'get no success toast')
assert(shouldToastSuccess('post', true) === false, 'skip success toast')

console.log('api-toast.check passed')
