import {
  aiParseRequestSchema,
  aiParseResponseSchema,
  authResponseSchema,
  authUserSchema,
  createGoalRequestSchema,
  createMealRequestSchema,
  createWeightRequestSchema,
  errorResponseSchema,
  goalResponseSchema,
  healthResponseSchema,
  createSavedMealRequestSchema,
  listMealsQuerySchema,
  listMealsResponseSchema,
  listSavedMealsResponseSchema,
  savedMealResponseSchema,
  listWeightsQuerySchema,
  listWeightsResponseSchema,
  loginRequestSchema,
  mealResponseSchema,
  refreshResponseSchema,
  registerRequestSchema,
  updateAccountRequestSchema,
  updateGoalRequestSchema,
  updateMealRequestSchema,
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
 * Scope: auth, the weight journal, meals, goals, and health. Profile and
 * dashboard join as their modules are documented.
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
    UpdateAccountRequest: schemaObject(updateAccountRequestSchema, 'input'),
    AuthResponse: schemaObject(authResponseSchema, 'output'),
    AuthUser: schemaObject(authUserSchema, 'output'),
    RefreshResponse: schemaObject(refreshResponseSchema, 'output'),
    CreateWeightRequest: schemaObject(createWeightRequestSchema, 'input'),
    UpdateWeightRequest: schemaObject(updateWeightRequestSchema, 'input'),
    WeightEntryResponse: schemaObject(weightEntryResponseSchema, 'output'),
    ListWeightsResponse: schemaObject(listWeightsResponseSchema, 'output'),
    CreateMealRequest: schemaObject(createMealRequestSchema, 'input'),
    UpdateMealRequest: schemaObject(updateMealRequestSchema, 'input'),
    MealResponse: schemaObject(mealResponseSchema, 'output'),
    ListMealsResponse: schemaObject(listMealsResponseSchema, 'output'),
    AiParseRequest: schemaObject(aiParseRequestSchema, 'input'),
    AiParseResponse: schemaObject(aiParseResponseSchema, 'output'),
    CreateSavedMealRequest: schemaObject(createSavedMealRequestSchema, 'input'),
    SavedMealResponse: schemaObject(savedMealResponseSchema, 'output'),
    ListSavedMealsResponse: schemaObject(
      listSavedMealsResponseSchema,
      'output',
    ),
    CreateGoalRequest: schemaObject(createGoalRequestSchema, 'input'),
    UpdateGoalRequest: schemaObject(updateGoalRequestSchema, 'input'),
    GoalResponse: schemaObject(goalResponseSchema, 'output'),
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

  // GET /meals shares the same from/to day-range shape, derived from its own
  // schema so the param list can't drift from the handler's validation.
  const mealsListQuery = schemaObject(listMealsQuerySchema, 'input') as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  const mealsQueryParams = Object.entries(mealsListQuery.properties ?? {}).map(
    ([name, schema]) => ({
      name,
      in: 'query',
      required: mealsListQuery.required?.includes(name) ?? false,
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
        'Bearer access token.\n\n' +
        'Rate limiting: every route except `/health` is limited to 100 requests ' +
        'per minute per client IP, so any route may answer `429` with the ' +
        'standard error envelope and a `Retry-After` header. `/auth/register` ' +
        'and `/auth/login` are limited to 5 per minute per IP.',
    },
    servers: [{ url: '/api' }],
    tags: [
      { name: 'auth', description: 'Registration, login, and session tokens' },
      {
        name: 'weights',
        description: 'The weight journal — an append-only list',
      },
      {
        name: 'meals',
        description: 'Logged meals with their macro totals and optional items',
      },
      {
        name: 'saved-meals',
        description:
          'Meals kept by name to log again. Logging one copies it into a ' +
          'meal — the two records are never linked, so editing or deleting ' +
          'either leaves the other untouched.',
      },
      {
        name: 'goals',
        description:
          'The active weight plan — at most one per user. Its Pace drives the ' +
          'derived calorie target and projected date.',
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
            429: errorResponse('Rate limit exceeded (5/min per IP)'),
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
            429: errorResponse('Rate limit exceeded (5/min per IP)'),
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
        patch: {
          tags: ['auth'],
          summary: "Update the authenticated user's name",
          requestBody: jsonBody('UpdateAccountRequest'),
          responses: {
            200: {
              description: 'The updated user',
              ...jsonContent('AuthUser'),
            },
            400: errorResponse('Validation failed'),
            401: unauthorized,
          },
        },
      },
      '/goals': {
        post: {
          tags: ['goals'],
          summary: 'Create a goal, replacing any active one',
          description:
            'Always creates a new active goal, never 409s. The outgoing active ' +
            'goal is marked `completed` if its target had been reached and ' +
            '`replaced` if it had not (ADR-0003). `startWeightKg` and ' +
            '`startDate` are captured server-side from the weight journal, so ' +
            'the journal must not be empty.\n\n' +
            '`preferredWeeklyChangeKg` accepts any rate from 0 to 1.0 kg/week, ' +
            'not only the presets the picker offers: a manual plan derives its ' +
            'rate from a calorie budget the user names (ADR-0013). `0` is a ' +
            'maintenance plan, which parks the target and has no projected date.',
          requestBody: jsonBody('CreateGoalRequest'),
          responses: {
            201: {
              description: 'Goal created and now active',
              ...jsonContent('GoalResponse'),
            },
            400: errorResponse(
              'Validation failed, or no weight entry to start from',
            ),
            401: unauthorized,
          },
        },
      },
      '/goals/current': {
        get: {
          tags: ['goals'],
          summary: "Read the caller's active goal",
          description:
            'The `404` is contractual, not exceptional: it is the signal that ' +
            'onboarding is not complete, and the client redirects on it. ' +
            '`projectedGoalDate`, `reachedTarget` and the calorie numbers are ' +
            'all derived on read, never stored.',
          responses: {
            200: {
              description: 'The active goal, with its derived fields',
              ...jsonContent('GoalResponse'),
            },
            401: unauthorized,
            404: errorResponse('No active goal — onboarding is not complete'),
          },
        },
        patch: {
          tags: ['goals'],
          summary: 'Edit the active goal in place',
          description:
            'Mutates the existing row, so the goal id and the `startWeightKg` / ' +
            '`startDate` baseline survive — that is what separates a plan tweak ' +
            'from `POST /goals` (ADR-0003). Only the target weight and the pace ' +
            'can change; switching to or from maintenance is a pace change here, ' +
            'not a new goal (ADR-0006).',
          requestBody: jsonBody('UpdateGoalRequest'),
          responses: {
            200: {
              description: 'Goal updated',
              ...jsonContent('GoalResponse'),
            },
            400: errorResponse('Validation failed'),
            401: unauthorized,
            404: errorResponse('No active goal to update'),
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
      '/meals': {
        post: {
          tags: ['meals'],
          summary: 'Log a meal with its totals and optional items',
          description:
            'Totals are the source of truth; `items` are an optional ' +
            'breakdown the server never sums. `source` (manual | ai) is stored ' +
            'as given — a confirmed AI parse posts here with source: ai.',
          requestBody: jsonBody('CreateMealRequest'),
          responses: {
            201: {
              description: 'Meal created',
              ...jsonContent('MealResponse'),
            },
            400: errorResponse('Validation failed'),
            401: unauthorized,
          },
        },
        get: {
          tags: ['meals'],
          summary: 'List meals in a UTC-day range (inclusive), oldest first',
          description:
            'Without `from`/`to`, returns all the meals owned by the caller. ' +
            'Each bound is a UTC calendar day, widened to the whole day ' +
            'inclusively.',
          parameters: mealsQueryParams,
          responses: {
            200: {
              description: "The caller's meals in range",
              ...jsonContent('ListMealsResponse'),
            },
            401: unauthorized,
          },
        },
      },
      '/meals/ai-parse': {
        post: {
          tags: ['meals'],
          summary: 'Estimate a meal from a free-text description',
          description:
            'Stores nothing: the response is a preview the client confirms by ' +
            'posting to `/meals` with source: ai. `200` covers **both** ' +
            'outcomes — a Parsed Meal (`parsed: true`) and "not food" ' +
            '(`parsed: false`), which is a successful recognition rather than ' +
            'a client error (ADR-0006). `502` means the model failed or ' +
            'returned output the contract rejects; it is terminal, not ' +
            'retried server-side.',
          requestBody: jsonBody('AiParseRequest'),
          responses: {
            200: {
              description: 'A Parsed Meal, or a "not food" verdict',
              ...jsonContent('AiParseResponse'),
            },
            400: errorResponse('Description missing, too short or too long'),
            401: unauthorized,
            429: errorResponse(
              'Rate limit exceeded (10/min per user, and 10/min per IP)',
            ),
            502: errorResponse('The model failed or returned invalid output'),
          },
        },
      },
      '/meals/{id}': {
        patch: {
          tags: ['meals'],
          summary: 'Edit an owned meal',
          description:
            'Any subset of the create fields. When `items` is present it ' +
            'replaces the whole list (an empty array clears it); omit `items` ' +
            'to leave the breakdown untouched.',
          parameters: [idParam],
          requestBody: jsonBody('UpdateMealRequest'),
          responses: {
            200: {
              description: 'Meal updated',
              ...jsonContent('MealResponse'),
            },
            400: errorResponse('Validation failed or malformed id'),
            401: unauthorized,
            404: errorResponse('No such meal owned by the caller'),
          },
        },
        delete: {
          tags: ['meals'],
          summary: 'Delete an owned meal (its items cascade)',
          parameters: [idParam],
          responses: {
            204: { description: 'Deleted' },
            401: unauthorized,
            404: errorResponse('No such meal owned by the caller'),
          },
        },
      },
      '/saved-meals': {
        post: {
          tags: ['saved-meals'],
          summary: 'Keep a meal to log again',
          description:
            'The same body as `POST /meals` without `mealType` and ' +
            '`recordedAt`: those describe an occasion, and the user chooses ' +
            'them when logging. `source` records how the kept figures were ' +
            'produced and is copied onto each meal logged from this one.',
          requestBody: jsonBody('CreateSavedMealRequest'),
          responses: {
            201: {
              description: 'Saved meal created',
              ...jsonContent('SavedMealResponse'),
            },
            400: errorResponse('Validation failed'),
            401: unauthorized,
          },
        },
        get: {
          tags: ['saved-meals'],
          summary: "The caller's saved meals, by name",
          description:
            'Ordered by name rather than recency: the list is searched, so a ' +
            'stable order beats a moving one.',
          responses: {
            200: {
              description: "The caller's saved meals",
              ...jsonContent('ListSavedMealsResponse'),
            },
            401: unauthorized,
          },
        },
      },
      '/saved-meals/{id}': {
        delete: {
          tags: ['saved-meals'],
          summary: 'Delete an owned saved meal (its items cascade)',
          description:
            'Meals already logged from it are untouched — nothing links them ' +
            'to it, so deleting what you keep never rewrites a day already ' +
            'counted.',
          parameters: [idParam],
          responses: {
            204: { description: 'Deleted' },
            401: unauthorized,
            404: errorResponse('No such saved meal owned by the caller'),
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
