"""Check local references and publication constraints without dependencies."""
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
errors = []
class SiteParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                errors.append('Duplicate id: ' + attrs['id'])
            self.ids.add(attrs['id'])
        for key in ['src', 'poster', 'data-src', 'href']:
            value = attrs.get(key, '')
            if value:
                self.links.append(value)

parser = SiteParser()
html = (ROOT / 'index.html').read_text()
parser.feed(html)
for ref in parser.links:
    if ref.startswith('#'):
        if ref[1:] not in parser.ids:
            errors.append('Missing anchor: ' + ref)
    elif not re.match(r'^(https?:|mailto:|data:)', ref):
        if not (ROOT / ref.split('?')[0]).exists():
            errors.append('Missing local asset: ' + ref)
js = (ROOT / 'script.js').read_text()
for folder, pattern in [('videos', r"video:\s*'([^']+)'"), ('images', r"poster:\s*'([^']+)'"), ('papers', r"image:\s*'([^']+)'")]:
    for filename in re.findall(pattern, js):
        if not (ROOT / 'assets' / folder / filename).is_file():
            errors.append('Missing dynamic asset: ' + filename)
for filename in ['index.html', 'script.js', 'styles.css']:
    data = (ROOT / filename).read_text()
    for forbidden in ['AI-CDR', '研究院', 'Center for Artificial Intelligence']:
        if forbidden in data:
            errors.append('Obsolete brand in ' + filename)
for path in (ROOT / 'assets').rglob('*'):
    if path.is_file() and path.stat().st_size > 95 * 1024 * 1024:
        errors.append('Oversized GitHub asset: ' + str(path.relative_to(ROOT)))
if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(parser.ids)} unique IDs, local/dynamic assets, anchors, branding and asset sizes.')
