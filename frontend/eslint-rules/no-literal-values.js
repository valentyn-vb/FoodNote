/**
 * Bans hardcoded values, not utilities.
 *
 * It replaces `no-visual-classes.js` (ADR 0009), which was an allow-list of
 * structural prefixes: every tailwind utility nobody had classified was
 * forbidden outside `ui/**`, so the boundary had to be widened by hand for each
 * new utility, and the price of styling anything was inventing a component
 * variant for it. That cost is what ADR 0010 walks back.
 *
 * What is left is the part that was actually load-bearing: a value written in
 * markup instead of read from the theme. `text-sm` is fine anywhere;
 * `text-[13px]` is not, anywhere.
 *
 * Two checks, and both are about values:
 *
 * 1. A colour literal — `#hex`, `rgb()`, `hsl()`, `oklch()` — anywhere in the
 *    file. In a class, in a plain string, in `style={{}}`, in a chart config.
 *    Colour comes from `:root`; a literal there is a value the theme cannot
 *    reach, which is how a hue drifts.
 *
 * 2. An arbitrary value in a visual group whose contents reference no token. So
 *    `rounded-[calc(var(--radius)-5px)]` and
 *    `bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` are fine —
 *    they are derived from `@theme` — and `text-[13px]`, `rounded-[32px]`,
 *    `shadow-[0_1px_2px_rgba(0,0,0,.04)]` are not.
 *
 * Layout is untouched: `w-[137px]` and `grid-cols-[1fr_auto]` are geometry a
 * theme has no opinion about. So are variants — `data-[state=open]:`,
 * `has-[…]`, `group-data-[…]` are selectors, not values.
 *
 * `*_CLASS` constants stay banned, for the reason ADR 0009 gave and 0010 keeps:
 * an exported class string is a component variant nobody wrote.
 */

/** Groups where the value should come from `@theme`. */
const TYPE_GROUPS = ['text', 'font', 'leading', 'tracking'];
const SURFACE_GROUPS = [
  'bg',
  'border',
  'divide',
  'outline',
  'ring',
  'shadow',
  'inset-shadow',
  'rounded',
  'fill',
  'stroke',
  'decoration',
  'accent',
  'caret',
  'placeholder',
  'from',
  'via',
  'to',
];

/**
 * `oklch(` and friends need the paren: `color-mix(in oklch, …)` names the space
 * rather than a colour, and that is the form the components derive with.
 */
const COLOUR_FUNCTION = /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([^)]*\)?/;
/** 3, 4, 6 or 8 digits, and not part of a longer word — `#faq` is a link. */
const COLOUR_HEX =
  /(^|[\s(['":=,_])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-zA-Z])/;

/** Values that name no measurement: nothing for a token to hold. */
const KEYWORDS = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'auto',
  'none',
  'currentColor',
  'currentcolor',
  'transparent',
  'full',
  'fit-content',
  'min-content',
  'max-content',
]);

function hasColourLiteral(text) {
  return COLOUR_FUNCTION.test(text) || COLOUR_HEX.test(text);
}

/**
 * Strips every variant prefix — `md:`, `hover:`, `data-[state=on]:`, `*:` —
 * counting brackets, since a variant's own `[…]` may contain a colon.
 */
function baseUtility(token) {
  let rest = token;
  for (;;) {
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

/** `text-[13px]` → `{ group: 'text', value: '13px' }`; anything else → null. */
function arbitraryValue(base) {
  const match = /^(-?[a-z][a-z-]*?)-\[(.+)\]!?$/.exec(base);
  if (!match) return null;
  return { group: match[1].replace(/^-/, ''), value: match[2] };
}

/**
 * A value is tokenised when it reads at least one custom property, or names no
 * measurement at all. `calc(var(--radius) - 5px)` qualifies: the literal there
 * adjusts a token rather than replacing it, which is the difference between
 * deriving a value and inventing one.
 */
function isTokenised(value) {
  const text = value.replace(/_/g, ' ').trim();
  if (text.includes('var(--')) return true;
  if (KEYWORDS.has(text)) return true;
  // A bare percentage or a ratio is relative to something the theme already
  // set — `w-[calc(100%-2rem)]` is layout, `opacity-[0.04]` is not a colour.
  if (/^-?[\d.]+%$/.test(text)) return true;
  return false;
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'values come from the theme, not from markup' },
    schema: [
      {
        type: 'object',
        properties: {
          // `ui/**` only. Upstream shadcn writes `ring-[3px]` and the tooltip
          // arrow's `rounded-[2px]`, and these files are meant to survive a
          // `shadcn diff` — so an untokenised *length* is allowed there. A
          // colour literal and a hardcoded type value are not: those are the
          // two the registry never writes and this project kept re-inventing.
          allowUntokenisedLengths: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      colour:
        "'{{value}}' is a colour literal — colour comes from a token in globals.css, or from color-mix() on one.",
      type: "'{{token}}' hardcodes type — use the tailwind row (text-xs/sm/base/lg/…) with a weight beside it.",
      value:
        "'{{token}}' hardcodes a value the theme owns — read it as var(--…), or derive it with calc() or color-mix().",
      exported:
        "'{{name}}' is a class-string constant — that is a component variant nobody wrote. Put the look in a cva variant on the ui/ component instead.",
    },
  },

  create(context) {
    const allowLengths = context.options[0]?.allowUntokenisedLengths === true;

    /** Every string in the file, wherever it sits: check 1 has no scope. */
    function checkColour(node, text) {
      if (!hasColourLiteral(text)) return;
      const match =
        COLOUR_FUNCTION.exec(text) ?? COLOUR_HEX.exec(text.replace(/^\s+/, ''));
      context.report({
        node,
        messageId: 'colour',
        data: {
          value: (match?.[0] ?? text).trim().replace(/^[\s(['":=,_]/, ''),
        },
      });
    }

    /** Class strings: check 2. */
    function checkClasses(node, text) {
      for (const token of String(text).split(/\s+/)) {
        if (!token) continue;
        const base = baseUtility(token);
        const arbitrary = arbitraryValue(base);
        if (!arbitrary || isTokenised(arbitrary.value)) continue;

        if (TYPE_GROUPS.includes(arbitrary.group)) {
          context.report({ node, messageId: 'type', data: { token: base } });
          continue;
        }
        if (SURFACE_GROUPS.includes(arbitrary.group) && !allowLengths) {
          context.report({ node, messageId: 'value', data: { token: base } });
        }
      }
    }

    /**
     * Strings reachable from a className value, including template literals.
     * `cn()` / `cva()` / `clsx()` calls are deliberately not followed here —
     * the CallExpression visitor below sees every one of them, nested or not,
     * and following both paths reported the same token twice.
     */
    function checkClassValue(node) {
      if (!node) return;
      if (node.type === 'Literal' && typeof node.value === 'string') {
        checkClasses(node, node.value);
      } else if (node.type === 'TemplateLiteral') {
        node.quasis.forEach((q) => checkClasses(q, q.value.cooked ?? ''));
      } else if (node.type === 'JSXExpressionContainer') {
        checkClassValue(node.expression);
      } else if (node.type === 'ConditionalExpression') {
        checkClassValue(node.consequent);
        checkClassValue(node.alternate);
      } else if (node.type === 'LogicalExpression') {
        checkClassValue(node.right);
      } else if (node.type === 'ArrayExpression') {
        node.elements.forEach(checkClassValue);
      } else if (node.type === 'ObjectExpression') {
        node.properties.forEach((p) => p.value && checkClassValue(p.value));
      }
    }

    return {
      // Check 1 needs no idea of where a colour was written, which is the whole
      // advantage over the old rule: a hex in a chart's `stroke=` prop or in a
      // style object was invisible to a check that only read classNames.
      Literal(node) {
        if (typeof node.value === 'string') checkColour(node, node.value);
      },

      TemplateElement(node) {
        checkColour(node, node.value.cooked ?? '');
      },

      JSXAttribute(node) {
        const name = node.name && node.name.name;
        if (typeof name !== 'string' || !/[Cc]lassName$/.test(name)) return;
        checkClassValue(node.value);
      },

      CallExpression(node) {
        const name = node.callee.name;
        if (name === 'cn' || name === 'cva' || name === 'clsx') {
          node.arguments.forEach(checkClassValue);
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

const plugin = { rules: { 'no-literal-values': rule } };

export default plugin;
