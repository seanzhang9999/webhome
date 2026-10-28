import { marked } from 'marked';
import createDOMPurify from 'dompurify';

const purifier = createDOMPurify(window);
window.TokenAIMarkdown = {
  render(text) {
    const html = marked.parse(String(text || ''), { gfm: true, breaks: true, async: false });
    return purifier.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 's', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'a'],
      ALLOWED_ATTR: ['href', 'title', 'align', 'start'],
      FORBID_ATTR: ['style', 'class', 'id', 'name'],
    });
  },
};
