from pathlib import Path
from base64 import b64encode
import re

project = Path(__file__).resolve().parent
assets = project / "assets"
def embed_font(match):
    font = assets / match[1]
    content = b64encode(font.read_bytes()).decode("ascii")
    return f"url(data:font/{font.suffix[1:]};base64,{content})"

fonts = re.sub(r"url\(([\w.-]+\.(?:woff2|ttf))\)", embed_font, (assets / "fonts.css").read_text(encoding="utf-8"))
css = fonts + "\n" + "\n".join((project / path).read_text(encoding="utf-8") for path in ("style.css", "admin.css", "paper.css", "teacher.css", "transfer.css"))
scripts = ["data.js", "model.mjs", "policy.mjs", "teacher-portal.mjs", "transfer-data.mjs", "staff-import.mjs", "attendance-report.mjs", "workbook.js", "core.js", "shared.js", "logos.js", "paper.js", "students.js", "academic.js", "vertical.js", "planning.js", "operations.js", "workflows.js", "reports.js", "teacher.js", "data-transfer.js"]
sources = [(project / path).read_text(encoding="utf-8") for path in scripts]
js = "\n\n".join(re.sub(r"^import .*?\n|^export \{.*?\};\n|^export (?=const|function)", "", source, flags=re.M) for source in sources)

def build_page(mode, connect_src, public_notice=""):
    return f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src {connect_src}; object-src 'none'; form-action 'none'; base-uri 'none'">
<meta name="talaba-data-transfer" content="1">
<meta name="theme-color" content="#2b2e4a">
<title>منظومة الطلبة · عرض تجريبي</title>
<!-- Bundled fonts: Cairo and Tajawal (SIL OFL 1.1), Font Awesome Free 6.7.2 (SIL OFL 1.1 for the font). Full notices follow.
{(assets / 'cairo-OFL.txt').read_text(encoding='utf-8').replace('--', '–')}
{(assets / 'tajawal-OFL.txt').read_text(encoding='utf-8').replace('--', '–')}
{(assets / 'fontawesome-LICENSE.txt').read_text(encoding='utf-8').replace('--', '–')}
-->
<style>{css}</style>
<style id="print-size">@page {{ size: A4; margin: 12mm }}</style>
</head>
<body data-mode="{mode}"{(' data-public-demo="true"' if public_notice else '')}>
{public_notice}
<div id="app"><p class="container gap">جاري فتح منظومة الطلبة…</p></div>
<dialog id="modal"></dialog>
<div id="flash" role="status" aria-live="polite" hidden></div>
<div id="print-area"></div>
<noscript><p class="container gap">افتح الملف في متصفح يدعم تشغيل جافاسكربت.</p></noscript>
<script>
{js}
start();
</script>
</body>
</html>
"""

output = project / "dist"
output.mkdir(exist_ok=True)
(output / "index.html").write_text(build_page("local", "'none'"), encoding="utf-8")
(project / "shared.html").write_text(build_page("shared", "'self'"), encoding="utf-8")
notice = '<aside class="public-demo-notice" aria-label="عن هذه النسخة">نسخة تعليمية مستقلة عن <bdi dir="ltr">edu-libya.com</bdi>. استخدم بيانات وهمية للتجربة. تُحفظ التعديلات في متصفحك.</aside>'
(output / "public.html").write_text(build_page("local", "'none'", notice), encoding="utf-8")
