/**
 * lib/workflow/validate.mjs — tiny, dependency-free JSON-Schema validator.
 *
 * Why hand-rolled instead of ajv: we control the schemas and only use a small,
 * documented subset of JSON Schema. A ~60-line validator keeps the dependency
 * count at zero (project rule: justify every package) and is easy for a learner
 * to read. Supported keywords:
 *
 *   type (string | array of strings, incl. "integer" and "null"), required,
 *   properties, items, enum, const, minimum, maximum, minItems.
 *
 * Anything else in a schema ($schema, $id, title, description, format, $comment,
 * additionalProperties) is ignored — treated as documentation. Extra properties
 * on objects are allowed.
 *
 * validate(schema, value) returns an array of human-readable error strings.
 * An empty array means valid.
 */

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value; // 'string' | 'number' | 'boolean' | 'object' | 'undefined'
}

function matchesType(type, value) {
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value);
  if (type === 'number') return typeof value === 'number';
  return type === typeOf(value);
}

export function validate(schema, value, path = '$') {
  const errors = [];
  check(schema, value, path, errors);
  return errors;
}

function check(schema, value, path, errors) {
  if (!schema || typeof schema !== 'object') return;

  if ('const' in schema && value !== schema.const) {
    errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
  }

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(t, value))) {
      errors.push(`${path}: expected ${types.join(' | ')}, got ${typeOf(value)}`);
      return; // wrong type — deeper checks would be noise
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${JSON.stringify(schema.enum)}`);
  }

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      errors.push(`${path}: ${value} is below minimum ${schema.minimum}`);
    }
    if (typeof schema.maximum === 'number' && value > schema.maximum) {
      errors.push(`${path}: ${value} is above maximum ${schema.maximum}`);
    }
  }

  if (typeOf(value) === 'object') {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}.${key}: required`);
    }
    for (const [key, subSchema] of Object.entries(schema.properties || {})) {
      if (key in value) check(subSchema, value[key], `${path}.${key}`, errors);
    }
  }

  if (typeOf(value) === 'array') {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
      errors.push(`${path}: needs at least ${schema.minItems} item(s), has ${value.length}`);
    }
    if (schema.items) {
      value.forEach((item, i) => check(schema.items, item, `${path}[${i}]`, errors));
    }
  }
}
