/**
 * Keeps visual style inside `components/ui/**`.
 *
 * The check is an allow-list of *structural* prefixes, not a deny-list of visual
 * ones. That direction matters: a deny-list lets every tailwind utility nobody
 * thought of through, so the boundary leaks a little with each release. Here a
 * new utility is forbidden until someone decides it is layout.
 *
 * What it looks at: any attribute whose name ends in `className` (there were
 * three — `triggerClassName`, `chartClassName`, `labelClassName` — smuggling
 * looks past a rule that only checked `className`), the arguments of `cn()` and
 * `cva()`, and any `*_CLASS` constant, since an exported class string is a
 * component variant nobody wrote.
 */

const ALLOWED = [
  // display and flow
  'block',
  'inline',
  'inline-block',
  'inline-flex',
  'inline-grid',
  'flex',
  'grid',
  'contents',
  'hidden',
  'table',
  'table-cell',
  'table-row',
  'flow-root',
  'isolate',
  'container',
  '@container',
  // flex and grid
  'flex-row',
  'flex-row-reverse',
  'flex-col',
  'flex-col-reverse',
  'flex-wrap',
  'flex-nowrap',
  'flex-wrap-reverse',
  'flex-1',
  'flex-auto',
  'flex-initial',
  'flex-none',
  'shrink',
  'shrink-0',
  'grow',
  'grow-0',
  // position
  'relative',
  'absolute',
  'fixed',
  'sticky',
  'static',
  // text flow — alignment and wrapping are layout, size and colour are not
  'text-left',
  'text-center',
  'text-right',
  'text-start',
  'text-end',
  'text-balance',
  'text-pretty',
  'text-wrap',
  'text-nowrap',
  'truncate',
  'sr-only',
  'not-sr-only',
  // Not size, weight, or colour: casing and figure style change how existing
  // text is set, not what level it is.
  'capitalize',
  'uppercase',
  'lowercase',
  'normal-case',
  'tabular-nums',
  'proportional-nums',
  'slashed-zero',
  // The app's own motion class (see globals.css) — motion, not style.
  'motion-keep-fade',
];

const ALLOWED_PREFIXES = [
  'grid-cols-',
  'grid-rows-',
  'col-',
  'row-',
  'auto-cols-',
  'auto-rows-',
  'grow-',
  'shrink-',
  'basis-',
  'order-',
  'items-',
  'justify-',
  'self-',
  'place-',
  'content-',
  'gap-',
  'gap-x-',
  'gap-y-',
  'space-x-',
  'space-y-',
  'p-',
  'px-',
  'py-',
  'pt-',
  'pr-',
  'pb-',
  'pl-',
  'ps-',
  'pe-',
  'm-',
  'mx-',
  'my-',
  'mt-',
  'mr-',
  'mb-',
  'ml-',
  'ms-',
  'me-',
  'w-',
  'min-w-',
  'max-w-',
  'h-',
  'min-h-',
  'max-h-',
  'size-',
  'aspect-',
  'overflow-',
  'overscroll-',
  'inset-',
  'top-',
  'right-',
  'bottom-',
  'left-',
  'start-',
  'end-',
  'z-',
  'line-clamp-',
  'whitespace-',
  'break-',
  'cursor-',
  'pointer-events-',
  'select-',
  'touch-',
  'scroll-',
  'snap-',
  'field-sizing-',
  'origin-',
  'translate-',
  'rotate-',
  'scale-',
  'transform-',
  // motion is out of this boundary's scope: it is not colour, type, radius,
  // shadow or border, and the app-wide reduced-motion rule governs it
  'transition-',
  'duration-',
  'delay-',
  'ease-',
  'animate-',
  'will-change-',
  // Enter and exit animations set opacity; it carries no colour of its own.
  'opacity-',
];

/** Advice worth reading, keyed by what the token starts with. */
const HINTS = [
  [
    /^text-(xs|sm|base|lg|[0-9]?xl|caption|body|label|title|heading|display|overline)$/,
    'font size belongs to a level: <Text variant="…">',
  ],
  [/^(font|leading|tracking)-/, 'type belongs to a level: <Text variant="…">'],
  [/^text-/, 'text colour belongs to a tone: <Text tone="…">'],
  [/^bg-/, 'a surface belongs to a variant on the ui/ component'],
  [
    /^(border|divide|ring|outline)-?/,
    'a border or ring belongs inside the ui/ component',
  ],
  [/^rounded/, 'radius belongs inside the ui/ component'],
  [/^shadow/, 'elevation belongs inside the ui/ component'],
  [/^(fill|stroke)-/, 'an icon colour comes from the text colour it inherits'],
];

function hintFor(token) {
  for (const [pattern, hint] of HINTS) {
    if (pattern.test(token)) return hint;
  }
  return 'only layout and sizing belong outside components/ui/**';
}

/** Strips every variant prefix: `md:`, `hover:`, `data-[state=on]:`, `*:`. */
function baseUtility(token) {
  let rest = token;
  for (;;) {
    // a variant ends at the first `:` that is not inside brackets
    let depth = 0;
    let cut = -1;
    for (let i = 0; i < rest.length; i += 1) {
      const c = rest[i];
      if (c === '[' || c === '(') depth += 1;
      else if (c === ']' || c === ')') depth -= 1;
      else if (c === ':' && depth === 0) {
        cut = i;
        break;
      }
    }
    if (cut === -1) return rest.replace(/^[-!*]+/, '');
    rest = rest.slice(cut + 1);
  }
}

function isAllowed(token) {
  const base = baseUtility(token);
  if (!base) return true;
  // An arbitrary value is never structural enough to be worth the exception:
  // it hardcodes what the theme is for.
  if (base.includes('[') && !base.startsWith('@')) {
    return ALLOWED_PREFIXES.some(
      (p) =>
        base.startsWith(p) &&
        !/(color|#|rgb|oklch|var\(--(color|shadow|text|font|radius))/.test(
          base,
        ),
    );
  }
  if (ALLOWED.includes(base)) return true;
  return ALLOWED_PREFIXES.some((p) => base.startsWith(p));
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'visual style lives in components/ui/**' },
    schema: [],
    messages: {
      visual: "'{{token}}' is a visual class — {{hint}}.",
      exported:
        "'{{name}}' is a class-string constant — that is a component variant nobody wrote. Put the look in a cva variant on the ui/ component instead.",
    },
  },

  create(context) {
    function checkLiteral(node, value) {
      for (const token of String(value).split(/\s+/)) {
        if (!token || isAllowed(token)) continue;
        context.report({
          node,
          messageId: 'visual',
          data: {
            token: baseUtility(token),
            hint: hintFor(baseUtility(token)),
          },
        });
      }
    }

    /** Strings reachable from a className value, including template literals. */
    function checkValue(node) {
      if (!node) return;
      if (node.type === 'Literal' && typeof node.value === 'string') {
        checkLiteral(node, node.value);
      } else if (node.type === 'TemplateLiteral') {
        node.quasis.forEach((q) => checkLiteral(q, q.value.cooked ?? ''));
      } else if (node.type === 'JSXExpressionContainer') {
        checkValue(node.expression);
      } else if (node.type === 'ConditionalExpression') {
        checkValue(node.consequent);
        checkValue(node.alternate);
      } else if (node.type === 'LogicalExpression') {
        checkValue(node.right);
      } else if (node.type === 'ArrayExpression') {
        node.elements.forEach(checkValue);
      } else if (node.type === 'CallExpression') {
        const name = node.callee.name;
        if (name === 'cn' || name === 'cva' || name === 'clsx') {
          node.arguments.forEach(checkValue);
        }
      } else if (node.type === 'ObjectExpression') {
        node.properties.forEach((p) => p.value && checkValue(p.value));
      }
    }

    return {
      JSXAttribute(node) {
        const name = node.name && node.name.name;
        if (typeof name !== 'string' || !/[Cc]lassName$/.test(name)) return;
        checkValue(node.value);
      },

      CallExpression(node) {
        const name = node.callee.name;
        if (name === 'cn' || name === 'cva' || name === 'clsx') {
          node.arguments.forEach(checkValue);
        }
      },

      VariableDeclarator(node) {
        if (
          node.id.type !== 'Identifier' ||
          !/_CLASS(ES)?$/.test(node.id.name)
        ) {
          return;
        }
        context.report({
          node,
          messageId: 'exported',
          data: { name: node.id.name },
        });
      },
    };
  },
};

const plugin = { rules: { 'no-visual-classes': rule } };

export default plugin;
