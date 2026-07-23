import {
  authResponseSchema,
  authUserSchema,
  createWeightRequestSchema,
  errorResponseSchema,
  healthResponseSchema,
  listWeightsQuerySchema,
  listWeightsResponseSchema,
  loginRequestSchema,
  refreshResponseSchema,
  registerRequestSchema,
  updateWeightRequestSchema,
  weightEntryResponseSchema,
} from '@foodnote/shared';
import type { OpenAPIObject } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * The OpenAPI document is generated from the frozen `@foodnote/shared` Zod
 * schemas — the single source of truth (CONTRACT.md, ADR-0001). Nothing here
 * re-declares a request/response shape; the paths below only wire the existing
 * schemas to routes, so the docs cannot drift from validation.
 *
 * Scope: the endpoints live on `main` today — auth, the weight journal, and
 * health. Profile/goals/meals/dashboard join as their modules land.
 */

type Io = 'input' | 'output';

// A shared schema rendered as an OpenAPI 3.0 schema object. `io` selects the
// request (`input`) vs response (`output`) view — the contract has no
// transforms today, but keeping the distinction is correct and future-proof.
function schemaObject(schema: z.ZodType, io: Io): Record<string, unknown> {
  return z.toJSONSchema(schema, {
    target: 'openapi-3.0',
    io,
    unrepresentable: 'any',
    reused: 'inline',
  });
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const jsonContent = (name: string) => ({
  content: { 'application/json': { schema: ref(name) } },
});

const jsonBody = (name: string) => ({ required: true, ...jsonContent(name) });

const errorResponse = (description: string) => ({
  description,
  ...jsonContent('ErrorResponse'),
});

const unauthorized = errorResponse('Missing or invalid access token');

export function buildOpenApiDocument(): OpenAPIObject {
  const schemas: Record<string, unknown> = {
    RegisterRequest: schemaObject(registerRequestSchema, 'input'),
    LoginRequest: schemaObject(loginRequestSchema, 'input'),
    AuthResponse: schemaObject(authResponseSchema, 'output'),
    AuthUser: schemaObject(authUserSchema, 'output'),
    RefreshResponse: schemaObject(refreshResponseSchema, 'output'),
    CreateWeightRequest: schemaObject(createWeightRequestSchema, 'input'),
    UpdateWeightRequest: schemaObject(updateWeightRequestSchema, 'input'),
    WeightEntryResponse: schemaObject(weightEntryResponseSchema, 'output'),
    ListWeightsResponse: schemaObject(listWeightsResponseSchema, 'output'),
    HealthResponse: schemaObject(healthResponseSchema, 'output'),
    ErrorResponse: schemaObject(errorResponseSchema, 'output'),
  };

  // GET /weights query params, derived from the shared schema so the param
  // list can't drift from what the handler actually validates.
  const listQuery = schemaObject(listWeightsQuerySchema, 'input') as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  const weightsQueryParams = Object.entries(listQuery.properties ?? {}).map(
    ([name, schema]) => ({
      name,
      in: 'query',
      required: listQuery.required?.includes(name) ?? false,
      schema,
    }),
  );

  const idParam = {
    name: 'id',
    in: 'path',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  };

  const document = {
    openapi: '3.0.3',
    info: {
      title: 'FoodNote API',
      version: '1.0.0',
      description:
        'Calorie-tracking API. Every request/response shape is generated from ' +
        'the frozen `@foodnote/shared` Zod schemas (see CONTRACT.md). All routes ' +
        'are under `/api`; everything except `/auth/*` and `/health` requires a ' +
        'Bearer access token.',
    },
    servers: [{ url: '/api' }],
    tags: [
      { name: 'auth', description: 'Registration, login, and session tokens' },
      {
        name: 'weights',
        description: 'The weight journal — an append-only list',
      },
      { name: 'health', description: 'Liveness probe' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas,
    },
    // Bearer auth by default; public routes opt out with `security: []`.
    security: [{ bearerAuth: [] }],
    paths: {
      '/auth/register': {
        post: {
          tags: ['auth'],
          summary: 'Register a new account',
          security: [],
          requestBody: jsonBody('RegisterRequest'),
          responses: {
            201: {
              description: 'Created; sets the refresh-token cookie',
              ...jsonContent('AuthResponse'),
            },
            409: errorResponse('Email already registered'),
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['auth'],
          summary: 'Log in with email and password',
          security: [],
          requestBody: jsonBody('LoginRequest'),
          responses: {
            200: {
              description: 'Authenticated; sets the refresh-token cookie',
              ...jsonContent('AuthResponse'),
            },
            401: errorResponse('Invalid credentials'),
          },
        },
      },
      '/auth/refresh': {
        post: {
          tags: ['auth'],
          summary: 'Exchange the refresh-token cookie for a new access token',
          description:
            'Reads the httpOnly `refreshToken` cookie; takes no body.',
          security: [],
          responses: {
            200: {
              description: 'A fresh access token',
              ...jsonContent('RefreshResponse'),
            },
            401: errorResponse('Missing or invalid refresh token'),
          },
        },
      },
      '/auth/logout': {
        post: {
          tags: ['auth'],
          summary: 'Clear the refresh-token cookie',
          security: [],
          responses: { 204: { description: 'Logged out' } },
        },
      },
      '/auth/me': {
        get: {
          tags: ['auth'],
          summary: 'The authenticated user',
          responses: {
            200: {
              description: 'The current user',
              ...jsonContent('AuthUser'),
            },
            401: unauthorized,
          },
        },
      },
      '/weights': {
        post: {
          tags: ['weights'],
          summary: 'Append a weight entry to the journal',
          requestBody: jsonBody('CreateWeightRequest'),
          responses: {
            201: {
              description: 'Entry created',
              ...jsonContent('WeightEntryResponse'),
            },
            400: errorResponse('Validation failed'),
            401: unauthorized,
          },
        },
        get: {
          tags: ['weights'],
          summary:
            'List weight entries in a UTC-day range (inclusive), oldest first',
          parameters: weightsQueryParams,
          responses: {
            200: {
              description: "The caller's entries in range",
              ...jsonContent('ListWeightsResponse'),
            },
            401: unauthorized,
          },
        },
      },
      '/weights/{id}': {
        patch: {
          tags: ['weights'],
          summary: 'Edit an owned weight entry',
          parameters: [idParam],
          requestBody: jsonBody('UpdateWeightRequest'),
          responses: {
            200: {
              description: 'Entry updated',
              ...jsonContent('WeightEntryResponse'),
            },
            400: errorResponse('Validation failed or malformed id'),
            401: unauthorized,
            404: errorResponse('No such entry owned by the caller'),
          },
        },
        delete: {
          tags: ['weights'],
          summary: 'Delete an owned weight entry',
          parameters: [idParam],
          responses: {
            204: { description: 'Deleted' },
            401: unauthorized,
            404: errorResponse('No such entry owned by the caller'),
          },
        },
      },
      '/health': {
        get: {
          tags: ['health'],
          summary: 'Liveness probe',
          security: [],
          responses: {
            200: {
              description: 'Service is up',
              ...jsonContent('HealthResponse'),
            },
          },
        },
      },
    },
  };

  return document as unknown as OpenAPIObject;
}
