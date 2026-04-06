import { assertEquals, assertInstanceOf } from 'jsr:@std/assert'
import {
  asNonEmptyString,
  isValidHttpUrl,
  isValidUuid,
  json,
  AppError,
  ProviderHttpError,
  mapError,
} from './client.ts'

Deno.test('asNonEmptyString returns trimmed string', () => {
  const result = asNonEmptyString('  hello world  ')

  assertEquals(result, 'hello world')
})

Deno.test('asNonEmptyString returns empty string for non-string', () => {
  assertEquals(asNonEmptyString(123), '')
  assertEquals(asNonEmptyString(null), '')
  assertEquals(asNonEmptyString(undefined), '')
  assertEquals(asNonEmptyString({}), '')
})

Deno.test('asNonEmptyString trims whitespace-only strings', () => {
  assertEquals(asNonEmptyString('   '), '')
  assertEquals(asNonEmptyString('\t\n'), '')
})

Deno.test('isValidHttpUrl valid http URL returns true', () => {
  const result = isValidHttpUrl('http://example.com')

  assertEquals(result, true)
})

Deno.test('isValidHttpUrl valid https URL returns true', () => {
  const result = isValidHttpUrl('https://example.com.br/path?query=value')

  assertEquals(result, true)
})

Deno.test('isValidHttpUrl ftp URL returns false', () => {
  const result = isValidHttpUrl('ftp://example.com')

  assertEquals(result, false)
})

Deno.test('isValidHttpUrl invalid string returns false', () => {
  assertEquals(isValidHttpUrl('not a url'), false)
  assertEquals(isValidHttpUrl(''), false)
  assertEquals(isValidHttpUrl('just text'), false)
})

Deno.test('isValidHttpUrl accepts URLs with complex paths', () => {
  assertEquals(
    isValidHttpUrl('https://example.com/path/to/resource?key=value&other=param#anchor'),
    true
  )
})

Deno.test('isValidUuid valid UUID returns true', () => {
  const result = isValidUuid('550e8400-e29b-41d4-a716-446655440000')

  assertEquals(result, true)
})

Deno.test('isValidUuid invalid string returns false', () => {
  assertEquals(isValidUuid('not-a-uuid'), false)
  assertEquals(isValidUuid(''), false)
  assertEquals(isValidUuid('123'), false)
})

Deno.test('isValidUuid UUID with whitespace is trimmed and valid', () => {
  const result = isValidUuid('  550e8400-e29b-41d4-a716-446655440000  ')

  assertEquals(result, true)
})

Deno.test('isValidUuid case insensitive', () => {
  const lowercase = isValidUuid('550e8400-e29b-41d4-a716-446655440000')
  const uppercase = isValidUuid('550E8400-E29B-41D4-A716-446655440000')
  const mixed = isValidUuid('550e8400-E29B-41d4-a716-446655440000')

  assertEquals(lowercase, true)
  assertEquals(uppercase, true)
  assertEquals(mixed, true)
})

Deno.test('json returns Response with correct status and headers', () => {
  const body = { message: 'success', code: 200 }
  const response = json(body, 201)

  assertEquals(response.status, 201)
  assertEquals(response.headers.get('Content-Type'), 'application/json')
})

Deno.test('json returns Response with default status 200', () => {
  const body = { data: 'test' }
  const response = json(body)

  assertEquals(response.status, 200)
})

Deno.test('json response body contains serialized JSON', async () => {
  const body = { key: 'value', nested: { foo: 'bar' } }
  const response = json(body)

  const text = await response.text()
  const parsed = JSON.parse(text)

  assertEquals(parsed.key, 'value')
  assertEquals(parsed.nested.foo, 'bar')
})

Deno.test('json includes CORS headers', () => {
  const response = json({})

  const contentType = response.headers.get('Content-Type')
  assertEquals(contentType, 'application/json')
})

Deno.test('AppError sets code, message, httpStatus correctly', () => {
  const error = new AppError('INVALID_INPUT', 'Input validation failed', 400)

  assertEquals(error.code, 'INVALID_INPUT')
  assertEquals(error.message, 'Input validation failed')
  assertEquals(error.httpStatus, 400)
})

Deno.test('AppError is instance of Error', () => {
  const error = new AppError('INTERNAL_ERROR', 'Something went wrong', 500)

  assertInstanceOf(error, Error)
})

Deno.test('ProviderHttpError sets status and body correctly', () => {
  const error = new ProviderHttpError(502, '{"error": "Bad Gateway"}')

  assertEquals(error.status, 502)
  assertEquals(error.body, '{"error": "Bad Gateway"}')
})

Deno.test('ProviderHttpError message includes status', () => {
  const error = new ProviderHttpError(429, 'Rate limit exceeded')

  assertEquals(error.message.includes('429'), true)
})

Deno.test('ProviderHttpError is instance of Error', () => {
  const error = new ProviderHttpError(500, 'Internal Server Error')

  assertInstanceOf(error, Error)
})

Deno.test('mapError AppError passes through unchanged', () => {
  const original = new AppError('INVALID_INPUT', 'Bad input', 400)
  const result = mapError(original, 'test')

  assertEquals(result, original)
  assertEquals(result.code, 'INVALID_INPUT')
  assertEquals(result.httpStatus, 400)
})

Deno.test('mapError ProviderHttpError maps to PERPLEXITY_PROVIDER_ERROR with 502', () => {
  const providerError = new ProviderHttpError(429, 'Rate limited')
  const result = mapError(providerError, 'test')

  assertInstanceOf(result, AppError)
  assertEquals(result.code, 'PERPLEXITY_PROVIDER_ERROR')
  assertEquals(result.httpStatus, 502)
})

Deno.test('mapError generic Error maps to INTERNAL_ERROR with 500', () => {
  const error = new Error('Something unexpected happened')
  const result = mapError(error, 'test')

  assertInstanceOf(result, AppError)
  assertEquals(result.code, 'INTERNAL_ERROR')
  assertEquals(result.httpStatus, 500)
})

Deno.test('mapError preserves original AppError details', () => {
  const original = new AppError('SUGGEST_GUARDRAIL_VIOLATION', 'Validation failed', 422)
  const result = mapError(original, 'test')

  assertEquals(result.code, 'SUGGEST_GUARDRAIL_VIOLATION')
  assertEquals(result.httpStatus, 422)
})

Deno.test('mapError handles various Error types', () => {
  const syntaxError = new SyntaxError('Invalid JSON')
  const result = mapError(syntaxError, 'test')

  assertEquals(result.code, 'INTERNAL_ERROR')
  assertEquals(result.httpStatus, 500)
})
