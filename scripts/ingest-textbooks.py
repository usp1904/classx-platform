#!/usr/bin/env python3
"""Ingest CBSE Class X NCERT textbook PDFs into an OKF v0.2 knowledge bundle.

Source PDFs live outside the repo (see TEXTBOOK_ROOT). Output is generated data:
  server/data/okf-textbooks/     OKF v0.2 bundle (gitignored, not redistributed)
  source/textbooks/manifest.json  sha256 / page-count manifest (committed)

Run:  python scripts/ingest-textbooks.py [--root D:/Downloads/Syllabus]
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "server" / "data"
CURRICULUM = json.loads((DATA_DIR / "curriculum.json").read_text(encoding="utf-8"))
BUNDLE_DIR = DATA_DIR / "okf-textbooks"
MANIFEST = ROOT / "source" / "textbooks" / "manifest.json"

DEFAULT_TEXTBOOK_ROOT = Path(r"D:\Downloads\Syllabus")
GENERATOR = "process:classx-textbook-ingest"
WATERMARK = re.compile(r"CLICK HERE TO BUY", re.I)
BOOK_NOISE = re.compile(r"^(Reprint \d{4}-\d{2}|NOTES FOR TEACHERS?|NOTES FOR THE TEACHER)$", re.I)
GLYPH_MAP = {
    "\uf0b4": "x", "\uf0d7": "x", "\uf03d": "=", "\uf02b": "+", "\uf02d": "-",
    "\uf0b9": "!=", "\uf0a3": "<=", "\uf0b3": ">=", "\uf0b1": "+-", "\uf070": "pi",
    "\uf06c": "l", "\uf0e5": "Delta", "\uf0b7": "*", "\uf0b0": "deg",
}
PRIVATE_USE = re.compile(r"[\ue000-\uf8ff]")


def subject_chapter_map():
    out = {}
    for subject in CURRICULUM["subjects"]:
        out[subject["id"]] = {c["id"]: c["name"] for c in subject["chapters"]}
    return out


CHAPTERS = subject_chapter_map()

MATHS_ORDER = [
    "real-numbers", "polynomials", "pair-of-linear-equations", "quadratic-equations",
    "arithmetic-progressions", "triangles", "coordinate-geometry", "circles",
    "introduction-to-trigonometry", "constructions", "applications-of-trigonometry",
    "areas-related-to-circles", "surface-areas-and-volumes", "statistics", "probability",
]
SCIENCE_ORDER = [
    "chemical-reactions-and-equations", "acids-bases-and-salts", "metals-and-non-metals",
    "carbon-and-its-compounds", "life-processes", "control-and-coordination",
    "how-do-organisms-reproduce", "heredity-and-evolution", "light-reflection-and-refraction",
    "human-eye-and-colourful-world", "electricity", "magnetic-effects-of-electric-current",
    "our-environment",
]

SOCIAL_BOOKS = {
    "History": {
        "book": "India and the Contemporary World - II",
        "files": {
            "jess301": "the-rise-of-nationalism-in-europe",
            "jess302": "nationalism-in-india",
            "jess303": "the-making-of-a-global-world",
            "jess304": "the-age-of-industrialization",
            "jess305": "print-culture-and-the-modern-world",
        },
    },
    "Geography": {
        "book": "Contemporary India - II",
        "files": {
            "jess101": "resources-and-development",
            "jess102": "forest-and-wildlife-resources",
            "jess103": "water-resources",
            "jess104": "agriculture",
            "jess105": "minerals-and-energy-resources",
            "jess106": "manufacturing-industries",
            "jess107": "lifelines-of-national-economy",
        },
    },
    "Economics": {
        "book": "Understanding Economic Development",
        "files": {
            "jess201": "development",
            "jess202": "sectors-of-the-indian-economy",
            "jess203": "money-and-credit",
            "jess204": "globalisation-and-the-indian-economy",
            "jess205": "consumer-rights",
        },
    },
    "Civics": {
        "book": "Democratic Politics - II",
        "files": {
            "jess401": "power-sharing",
            "jess402": "federalism",
            "jess403": "gender-religion-and-caste",
            "jess404": "political-parties",
            "jess405": "outcomes-of-democracy",
        },
    },
}


def source_timestamp(root):
    stamps = [p.stat().st_mtime for p in root.rglob("*.pdf")]
    if not stamps:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return datetime.fromtimestamp(max(stamps), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def clean_page(raw):
    lines = []
    for line in raw.splitlines():
        for glyph, replacement in GLYPH_MAP.items():
            line = line.replace(glyph, replacement)
        line = PRIVATE_USE.sub("", line).strip()
        if not line or WATERMARK.search(line) or BOOK_NOISE.match(line):
            continue
        if lines and lines[-1] == line:
            continue
        lines.append(line)
    return lines


def detect_book_page(lines):
    for line in lines[:3]:
        for token in re.findall(r"\d{1,3}", line):
            value = int(token)
            if 1 <= value <= 400:
                return value
    return None


SECTION_HEADING = re.compile(r"^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\s+\S")


def page_blocks(lines):
    """Group cleaned lines into paragraphs, promoting numbered section headings."""
    blocks, buf = [], []

    def flush():
        if buf:
            blocks.append(" ".join(buf))
            buf.clear()

    for line in lines:
        if SECTION_HEADING.match(line):
            flush()
            blocks.append(("heading", line))
        elif len(line) < 60 and re.match(r"^(Activity|Figure|Table|Example|Exercise|Do You Know|Try this)\b", line, re.I):
            flush()
            blocks.append(("heading", line))
        else:
            buf.append(line)
    flush()
    return blocks


def render_body(title, pages):
    out = [f"# {title}", ""]
    for page in pages:
        label = f"## Page {page['pdf_page']}"
        if page["book_page"]:
            label += f" (book p. {page['book_page']})"
        out.append(label)
        out.append("")
        for block in page["blocks"]:
            if isinstance(block, tuple):
                out.append(f"### {block[1]}")
            else:
                out.append(block)
            out.append("")
    return "\n".join(out).rstrip() + "\n"


def yaml_str(value):
    text = str(value).replace('"', "'")
    return f'"{text}"'


def concept_frontmatter(meta, source_uri, source_id, page_start, page_end, generated_at):
    tags = [meta["subjectId"], "cbse", "class-x", "ncert", meta["chapterId"]]
    return "\n".join([
        "---",
        "type: Textbook Chapter",
        f"title: {yaml_str(meta['title'])}",
        f"description: {yaml_str(meta['description'])}",
        f"resource: {yaml_str(source_uri)}",
        f"tags: [{', '.join(yaml_str(t) for t in tags)}]",
        "status: stable",
        f"generated: {{ by: {GENERATOR}, at: {generated_at} }}",
        "sources:",
        f"  - id: {source_id}",
        f"    resource: {yaml_str(source_uri)}",
        f"    title: {yaml_str(meta['book'])}",
        f"    author: {yaml_str('organization:ncert')}",
        f"x-classx-subject: {yaml_str(meta['subjectId'])}",
        f"x-classx-chapter: {yaml_str(meta['chapterId'])}",
        f"x-classx-book-code: {yaml_str(meta['bookCode'])}",
        f"x-classx-pdf-page-start: {page_start}",
        f"x-classx-pdf-page-end: {page_end}",
        "---",
        "",
    ])


def write_indexes():
    (BUNDLE_DIR / "index.md").write_text("\n".join([
        "---",
        'okf_version: "0.2"',
        "---",
        "",
        "# CBSE Class X NCERT textbooks",
        "",
        "Chapter-level concepts extracted from NCERT Class X textbooks for grounded retrieval.",
        "Every concept carries `sources` provenance and page anchors.",
        "",
        "* [Mathematics](books/mathematics/) - NCERT Mathematics, Textbook for Class X.",
        "* [Science](books/science/) - NCERT Science, Textbook for Class X.",
        "* [Social Science](books/social-science/) - History, Geography, Economics, Civics.",
        "",
    ]), encoding="utf-8")

    for subject_id, chapters in sorted({k: v for k, v in CHAPTERS.items() if k != "english"}.items()):
        folder = BUNDLE_DIR / "books" / subject_id
        folder.mkdir(parents=True, exist_ok=True)
        entries = []
        for chapter_id, chapter_name in chapters.items():
            path = folder / f"{chapter_id}.md"
            if not path.exists():
                continue
            entries.append(f"* [{chapter_name}]({chapter_id}.md) - Chapter concept.")
        (folder / "index.md").write_text(
            f"# {subject_id.replace('-', ' ').title()}\n\n" + "\n".join(entries) + "\n",
            encoding="utf-8",
        )


def slug_subject(folder_name):
    return "social-science" if folder_name in SOCIAL_BOOKS else None


def build_concept(pdf_path, subject_id, chapter_id, book_title, book_code, generated_at):
    doc = pymupdf.open(pdf_path)
    pages = []
    for index in range(doc.page_count):
        raw = doc[index].get_text()
        lines = clean_page(raw)
        if not lines:
            continue
        pages.append({
            "pdf_page": index + 1,
            "book_page": detect_book_page(lines),
            "blocks": page_blocks(lines),
        })
    doc.close()
    if not pages:
        return None

    chapter_name = CHAPTERS[subject_id][chapter_id]
    first_text = " ".join(b for p in pages[:2] for b in p["blocks"] if isinstance(b, str))
    description = re.sub(r"\s+", " ", first_text).strip()[:220]
    meta = {
        "title": chapter_name,
        "description": description or f"NCERT Class X {chapter_name} chapter.",
        "subjectId": subject_id,
        "chapterId": chapter_id,
        "book": book_title,
        "bookCode": book_code,
    }
    source_uri = Path(pdf_path).as_uri()
    source_id = f"ncert-{book_code}"
    frontmatter = concept_frontmatter(
        meta, source_uri, source_id, pages[0]["pdf_page"], pages[-1]["pdf_page"], generated_at
    )
    body = render_body(chapter_name, pages)
    return frontmatter + "\n" + body, meta


def write_concept(record):
    content, meta = record
    folder = BUNDLE_DIR / "books" / meta["subjectId"]
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{meta['chapterId']}.md"
    path.write_text(content, encoding="utf-8")
    return path


def ingest_single(root, generated_at, manifest):
    count = 0
    maths_book = "Mathematics - Textbook for Class X"
    for number, chapter_id in enumerate(MATHS_ORDER, start=1):
        pdf = root / "Maths" / f"jemh1{number:02d}.pdf"
        if pdf.exists():
            record = build_concept(pdf, "mathematics", chapter_id, maths_book, f"jemh1{number:02d}", generated_at)
            if record:
                write_concept(record)
                manifest.append(entry(pdf, "mathematics", chapter_id, f"jemh1{number:02d}", count))
                count += 1

    for folder_name, cfg in SOCIAL_BOOKS.items():
        for code, chapter_id in cfg["files"].items():
            matches = list(root.glob(f"{folder_name}/**/{code}.pdf"))
            if not matches:
                continue
            pdf = matches[0]
            record = build_concept(pdf, "social-science", chapter_id, cfg["book"], code, generated_at)
            if record:
                write_concept(record)
                manifest.append(entry(pdf, "social-science", chapter_id, code, count))
                count += 1
    return count


def science_page_starts(doc):
    starts = []
    for index in range(doc.page_count):
        text = doc[index].get_text()
        if re.search(r"\bCHAPTER\b", text):
            starts.append(index)
    return starts


def ingest_science(root, generated_at, manifest):
    candidates = list(root.glob("Science/*.pdf"))
    if not candidates:
        return 0
    pdf = candidates[0]
    doc = pymupdf.open(pdf)
    starts = science_page_starts(doc)
    if len(starts) != len(SCIENCE_ORDER):
        print(f"warning: science chapter starts {len(starts)} != expected {len(SCIENCE_ORDER)}", file=sys.stderr)
    count = 0
    for i, chapter_id in enumerate(SCIENCE_ORDER[: len(starts)]):
        start = starts[i]
        end = starts[i + 1] if i + 1 < len(starts) else doc.page_count
        pages = []
        for index in range(start, end):
            lines = clean_page(doc[index].get_text())
            if not lines:
                continue
            pages.append({
                "pdf_page": index + 1,
                "book_page": detect_book_page(lines),
                "blocks": page_blocks(lines),
            })
        if not pages:
            continue
        chapter_name = CHAPTERS["science"][chapter_id]
        first_text = " ".join(b for p in pages[:2] for b in p["blocks"] if isinstance(b, str))
        meta = {
            "title": chapter_name,
            "description": re.sub(r"\s+", " ", first_text).strip()[:220],
            "subjectId": "science",
            "chapterId": chapter_id,
            "book": "Science - Textbook for Class X",
            "bookCode": "jesc1",
        }
        frontmatter = concept_frontmatter(
            meta, Path(pdf).as_uri(), "ncert-jesc1", pages[0]["pdf_page"], pages[-1]["pdf_page"], generated_at
        )
        write_concept((frontmatter + "\n" + render_body(chapter_name, pages), meta))
        manifest.append(entry(pdf, "science", chapter_id, "jesc1", count))
        count += 1
    doc.close()
    return count


def entry(pdf, subject_id, chapter_id, book_code, index):
    doc = pymupdf.open(pdf)
    pages = doc.page_count
    doc.close()
    return {
        "index": index,
        "bookCode": book_code,
        "subjectId": subject_id,
        "chapterId": chapter_id,
        "chapterName": CHAPTERS[subject_id][chapter_id],
        "file": str(pdf),
        "bytes": pdf.stat().st_size,
        "pages": pages,
        "sha256": sha256(pdf),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=os.environ.get("TEXTBOOK_ROOT", str(DEFAULT_TEXTBOOK_ROOT)))
    args = parser.parse_args()
    root = Path(args.root)
    if not root.exists():
        sys.exit(f"textbook root not found: {root}")

    if BUNDLE_DIR.exists():
        shutil.rmtree(BUNDLE_DIR)
    BUNDLE_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)

    generated_at = source_timestamp(root)
    manifest = []
    count = ingest_single(root, generated_at, manifest)
    count += ingest_science(root, generated_at, manifest)
    write_indexes()

    MANIFEST.write_text(json.dumps({
        "okfVersion": "0.2",
        "generatedAt": generated_at,
        "generator": GENERATOR,
        "bundle": str(BUNDLE_DIR.relative_to(ROOT)).replace("\\", "/"),
        "textbookRoot": str(root),
        "chapters": sorted(manifest, key=lambda item: item["index"]),
    }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"OKF v0.2 bundle: {count} concepts -> {BUNDLE_DIR}")
    print(f"manifest: {MANIFEST}")


if __name__ == "__main__":
    main()

