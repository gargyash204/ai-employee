import { isExecutionActive, nextPollDelayMs } from './execution-poll.ts'

function assert(condition: boolean, label: string): void {
  if (!condition) {
    throw new Error(`execution-poll.check failed: ${label}`)
  }
}

assert(isExecutionActive('Queued') === true, 'queued is active')
assert(isExecutionActive('Running') === true, 'running is active')
assert(isExecutionActive('Completed') === false, 'completed is settled')
assert(isExecutionActive('Paused') === false, 'paused is settled')
assert(isExecutionActive('Cancelled') === false, 'cancelled is settled')
assert(nextPollDelayMs(1_000) === 2_000, 'doubles')
assert(nextPollDelayMs(8_000) === 16_000, 'doubles to max')
assert(nextPollDelayMs(16_000) === 16_000, 'caps at max')

console.log('execution-poll.check passed')
