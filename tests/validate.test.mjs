import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../lib/workflow/validate.mjs';

test('accepts a valid object', () => {
  const schema = { type: 'object', required: ['a'], properties: { a: { type: 'string' } } };
  assert.deepEqual(validate(schema, { a: 'hi' }), []);
});

test('reports a missing required field', () => {
  const schema = { type: 'object', required: ['a'], properties: { a: { type: 'string' } } };
  const errors = validate(schema, {});
  assert.equal(errors.length, 1);
  assert.match(errors[0], /\.a: required/);
});

test('reports a wrong type', () => {
  const errors = validate({ type: 'string' }, 42);
  assert.match(errors[0], /expected string, got number/);
});

test('integer rejects a float; number accepts it', () => {
  assert.equal(validate({ type: 'integer' }, 3.5).length, 1);
  assert.equal(validate({ type: 'number' }, 3.5).length, 0);
});

test('enum rejects an unknown value', () => {
  assert.equal(validate({ enum: ['a', 'b'] }, 'c').length, 1);
  assert.equal(validate({ enum: ['a', 'b'] }, 'b').length, 0);
});

test('minimum and maximum are enforced', () => {
  assert.equal(validate({ type: 'number', minimum: 0, maximum: 1 }, 1.2).length, 1);
  assert.equal(validate({ type: 'number', minimum: 0, maximum: 1 }, 0.5).length, 0);
});

test('type array allows null', () => {
  assert.equal(validate({ type: ['string', 'null'] }, null).length, 0);
  assert.equal(validate({ type: ['string', 'null'] }, 7).length, 1);
});

test('const must match', () => {
  assert.equal(validate({ const: 'validated' }, 'validated').length, 0);
  assert.equal(validate({ const: 'validated' }, 'rejected').length, 1);
});

test('minItems and nested item schemas are checked', () => {
  const schema = { type: 'array', minItems: 1, items: { type: 'string' } };
  assert.equal(validate(schema, []).length, 1);
  assert.equal(validate(schema, [1]).length, 1);
  assert.equal(validate(schema, ['ok']).length, 0);
});

test('extra properties are allowed', () => {
  const schema = { type: 'object', properties: { a: { type: 'string' } } };
  assert.deepEqual(validate(schema, { a: 'x', b: 'extra' }), []);
});
