import { marked, Renderer } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: false });

const SVG_TAGS = [
  'svg',
  'g',
  'defs',
  'symbol',
  'use',
  'path',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'rect',
  'text',
  'tspan',
  'title',
  'desc',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'pattern',
  'marker',
  'filter',
  'feGaussianBlur',
  'feOffset',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feMerge',
  'feMergeNode',
  'feDropShadow',
];

const SVG_ATTRS = [
  'xmlns',
  'xmlns:xlink',
  'viewBox',
  'preserveAspectRatio',
  'x',
  'y',
  'width',
  'height',
  'rx',
  'ry',
  'cx',
  'cy',
  'r',
  'd',
  'points',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'stroke-miterlimit',
  'opacity',
  'transform',
  'text-anchor',
  'dominant-baseline',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'word-spacing',
  'offset',
  'stop-color',
  'stop-opacity',
  'marker-start',
  'marker-mid',
  'marker-end',
  'clip-path',
  'clip-rule',
  'mask',
  'filter',
  'vector-effect',
  'class',
  'id',
  'role',
  'aria-label',
  'aria-hidden',
  'tabindex',
  'href',
  'xlink:href',
];

const SVG_SANITIZE_CONFIG = {
  ALLOWED_TAGS: SVG_TAGS,
  ALLOWED_ATTR: SVG_ATTRS,
};

const MARKDOWN_SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'hr',
    'strong',
    'em',
    'del',
    'code',
    'pre',
    'blockquote',
    'ul',
    'ol',
    'li',
    'a',
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'input',
    'span',
    'figure',
    ...SVG_TAGS,
  ],
  ALLOWED_ATTR: [
    'href',
    'src',
    'alt',
    'title',
    'target',
    'rel',
    'type',
    'checked',
    'disabled',
    'data-asset-id',
    ...SVG_ATTRS,
  ],
  ADD_ATTR: ['target', 'rel'],
};

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!(node instanceof SVGElement)) return;

  const href = node.getAttribute('href') ?? node.getAttribute('xlink:href');
  if (href && !href.startsWith('#')) {
    node.removeAttribute('href');
    node.removeAttribute('xlink:href');
  }

  for (const name of ['fill', 'stroke', 'filter', 'clip-path', 'mask', 'marker-start', 'marker-mid', 'marker-end']) {
    const value = node.getAttribute(name);
    if (value && /^url\(/i.test(value) && !/^url\(\s*['"]?#/i.test(value)) {
      node.removeAttribute(name);
    }
  }
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const svgRenderer = new Renderer();
svgRenderer.code = ({ text, lang }) => {
  const language = (lang ?? '').match(/^[^\s]+/)?.[0] ?? '';
  const normalizedLanguage = language.toLowerCase();

  if (normalizedLanguage === 'svg' || normalizedLanguage === 'image/svg+xml') {
    const sanitized = DOMPurify.sanitize(text, SVG_SANITIZE_CONFIG);
    return [
      '<figure class="md-svg">',
      `<pre><code class="language-svg">${escapeHtml(text)}</code></pre>`,
      `<div class="md-svg-preview" role="img" aria-label="SVG 预览">${sanitized}</div>`,
      '</figure>',
    ].join('');
  }

  const languageClass = language ? ` class="language-${escapeHtml(language)}"` : '';
  return `<pre><code${languageClass}>${escapeHtml(text)}</code></pre>`;
};

svgRenderer.image = ({ href, title, text }) => {
  const assetId = href?.match(/^asset:\/\/([^/?#]+)/i)?.[1];
  const alt = escapeHtml(text ?? title ?? '');
  const label = title ? ` title="${escapeHtml(title)}"` : '';

  if (assetId) {
    return `<img src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" alt="${alt}" data-asset-id="${escapeHtml(assetId)}"${label} loading="lazy" />`;
  }

  return `<img src="${escapeHtml(href ?? '')}" alt="${alt}"${label} />`;
};

export function sanitizeSvg(source: string) {
  return DOMPurify.sanitize(source, SVG_SANITIZE_CONFIG);
}

export function renderMarkdown(source: string) {
  const raw = marked.parse(source ?? '', { async: false, renderer: svgRenderer });
  return DOMPurify.sanitize(raw, MARKDOWN_SANITIZE_CONFIG);
}
