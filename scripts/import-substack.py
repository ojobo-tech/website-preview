"""Import full public Substack articles into the website content catalog.

The original four-article import remains available without arguments. Use
--sync-feed for new, long-form posts published after the configured start date.
"""

from dataclasses import dataclass, field
from datetime import datetime
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "content" / "site-content.json"
BASE = "https://ojoboagboeje.substack.com"
FEED = f"{BASE}/feed"
FIRST_SYNC_DATE = "2026-10-20"
MIN_LONGFORM_WORDS = 1000
ARTICLES = [
    {
        "slug": "the-five-stages-of-ai-maturity-and",
        "id": "five-stages-ai-maturity",
        "category": "AI maturity",
        "image": "assets/editorial-workshop.png",
        "imageAlt": "Illustrative image of an organizational AI workshop",
        "lead": "Awareness, literacy, and task-level adoption are not the same as transformation. The crucial shift is redesigning work, decisions, and accountability around what AI makes possible.",
        "tags": ["AI maturity", "Transformation", "Leadership"],
    },
    {
        "slug": "new-wine-old-wine-skins-ai-transformation",
        "id": "new-wine-old-wineskins",
        "category": "Organizational transformation",
        "image": "assets/editorial-roundtable.png",
        "imageAlt": "Illustrative image of leaders discussing organizational change",
        "lead": "New AI tools will struggle inside old organizational structures. Sustainable value requires changes to decision-making, feedback, accountability, talent, culture, and leadership.",
        "tags": ["Organizational design", "AI adoption", "Culture"],
    },
    {
        "slug": "history-predicted-it-already-ai-investment",
        "id": "history-ai-investment-roi",
        "category": "AI investment",
        "image": "assets/editorial-data-research.png",
        "imageAlt": "Illustrative image of data analysis and research",
        "lead": "The value of a general-purpose technology often arrives after organizations change how they work. AI investment must account for the time needed to redesign processes and develop human capability.",
        "tags": ["AI investment", "ROI", "Transformation"],
    },
    {
        "slug": "the-ai-adoption-paradox-why-95-of",
        "id": "ai-adoption-paradox",
        "category": "AI adoption",
        "image": "assets/editorial-platform-build.png",
        "imageAlt": "Illustrative image of an AI platform and measurement dashboard",
        "lead": "Tool purchases and usage metrics are not business outcomes. Meaningful returns depend on redesigned workflows, workforce trust, data foundations, and sustained leadership attention.",
        "tags": ["AI adoption", "Business value", "Leadership"],
    },
]


@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)


class Tree(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in self.VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def plain(node):
    if isinstance(node, str):
        return node
    return "".join(plain(child) for child in node.children)


def inline(node):
    if isinstance(node, str):
        return re.sub(r"\s+", " ", node)
    content = "".join(inline(child) for child in node.children)
    if node.tag in {"strong", "b"}:
        return f"**{content.strip()}**"
    if node.tag in {"em", "i"}:
        return f"*{content.strip()}*"
    if node.tag == "a":
        href = node.attrs.get("href", "")
        if href.startswith("https://") and ")" not in href:
            return f"[{content.strip()}]({href})"
    if node.tag == "br":
        return " "
    if node.tag == "p":
        return content + " "
    return content


def blocks(node):
    if isinstance(node, str):
        return []
    classes = node.attrs.get("class", "")
    if node.tag in {"script", "style", "svg", "form", "button", "input"}:
        return []
    if any(part in classes for part in ("subscription-widget", "subscribe-widget", "button-wrapper", "paywall")):
        return []
    if node.tag in {"h2", "h3", "h4", "h5"}:
        level = "##" if node.tag == "h2" else "###"
        return [level + " " + re.sub(r"\s+", " ", plain(node)).strip()]
    if node.tag == "img":
        src = node.attrs.get("src", "")
        host = urlparse(src).hostname or ""
        if src.startswith("https://") and (host == "substackcdn.com" or host.endswith(".substackcdn.com") or host == "substack-post-media.s3.amazonaws.com") and ")" not in src:
            alt = re.sub(r"[\[\]]", "", node.attrs.get("alt", "") or "Article illustration")
            return [f"![{alt}]({src})"]
        return []
    if node.tag == "p":
        value = inline(node).strip()
        if value.startswith("Thanks for reading The AI Catalyst Report"):
            return []
        return [value] if value else []
    if node.tag in {"ol", "ul"}:
        result = []
        for index, item in enumerate((child for child in node.children if isinstance(child, Node) and child.tag == "li"), 1):
            value = re.sub(r"\s+", " ", inline(item)).strip()
            if value:
                result.append(f"{index}. {value}" if node.tag == "ol" else f"- {value}")
        return ["\n".join(result)] if result else []
    if node.tag == "blockquote":
        text = re.sub(r"\s+", " ", plain(node)).strip()
        return ["> " + text] if text else []
    result = []
    for child in node.children:
        result.extend(blocks(child))
    return result


def feed_text(item, tag):
    return (item.findtext(tag) or "").strip()


def article_from_feed(item):
    source = feed_text(item, "link")
    parsed = urlparse(source)
    if parsed.scheme != "https" or parsed.hostname != "ojoboagboeje.substack.com" or not parsed.path.startswith("/p/"):
        return None
    slug = parsed.path.removeprefix("/p/").strip("/")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        return None
    published = datetime.strptime(feed_text(item, "pubDate"), "%a, %d %b %Y %H:%M:%S %Z").date().isoformat()
    if published < FIRST_SYNC_DATE:
        return None
    html = feed_text(item, "{http://purl.org/rss/1.0/modules/content/}encoded")
    tree = Tree()
    tree.feed(html)
    body = "\n\n".join(blocks(tree.root)).strip()
    words = len(re.findall(r"\b[\w’'-]+\b", re.sub(r"!\[[^\]]*\]\([^)]*\)", "", body)))
    if words < MIN_LONGFORM_WORDS:
        return None
    title = feed_text(item, "title")
    summary = re.sub(r"\s+", " ", feed_text(item, "description"))[:300]
    if not title or not summary or len(body) < 4000:
        raise ValueError(f"Incomplete long-form feed item: {source}")
    return {
        "id": slug,
        "title": title,
        "category": "The AI Catalyst Report",
        "summary": summary,
        "lead": summary,
        "image": "assets/editorial-ai-literacy.png",
        "imageAlt": f"Illustration for {title}",
        "audio": "",
        "readMinutes": str(max(1, round(words / 200))),
        "publishedAt": published,
        "sourceUrl": source,
        "canonicalPreference": "website",
        "tags": ["AI", "Transformation"],
        "body": body,
        "status": "published",
        "featured": True,
        "syncSource": "substack",
    }


def save_cover(item, article):
    enclosure = item.find("enclosure")
    url = enclosure.get("url", "") if enclosure is not None else ""
    if urlparse(url).hostname != "substackcdn.com" or not url.startswith("https://"):
        return
    try:
        request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(request, timeout=30) as response:
            image = response.read(5_000_001)
        if len(image) > 5_000_000:
            raise ValueError("image exceeds 5 MB")
        if image.startswith(b"\xff\xd8\xff"):
            extension = "jpg"
        elif image.startswith(b"\x89PNG\r\n\x1a\n"):
            extension = "png"
        elif image[:4] == b"RIFF" and image[8:12] == b"WEBP":
            extension = "webp"
        else:
            raise ValueError("unsupported image format")
        path = ROOT / "assets" / f"substack-{article['id']}.{extension}"
        path.write_bytes(image)
        article["image"] = f"assets/{path.name}"
        article["imageAlt"] = f"Cover image for {article['title']}"
    except (OSError, ValueError) as error:
        print(f"Cover image unavailable for {article['id']}: {error}; using the editorial fallback.")


def sync_feed():
    request = Request(FEED, headers={"User-Agent": "OjoboWebsiteSync/1.0", "Accept": "application/rss+xml, application/xml"})
    with urlopen(request, timeout=30) as response:
        feed = ET.fromstring(response.read(5_000_000))
    items = feed.findall("./channel/item")
    if not items:
        raise ValueError("Substack feed had no posts; refusing to change the catalog.")
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    known_urls = {item.get("sourceUrl", "") for item in catalog["essays"]}
    known_ids = {item["id"] for item in catalog["essays"]}
    imported = []
    for item in items:
        article = article_from_feed(item)
        if not article or article["sourceUrl"] in known_urls or article["id"] in known_ids:
            continue
        save_cover(item, article)
        known_urls.add(article["sourceUrl"])
        known_ids.add(article["id"])
        imported.append(article)
    if not imported:
        print("No new long-form articles to publish.")
        return
    imported.sort(key=lambda item: item["publishedAt"], reverse=True)
    catalog["essays"] = imported + catalog["essays"]
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for article in imported:
        print(f"Added full article: {article['title']} ({article['publishedAt']})")


def import_one(spec):
    url = f"{BASE}/api/v1/posts/{spec['slug']}"
    request = Request(url, headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json"})
    with urlopen(request, timeout=30) as response:
        post = json.load(response)
    if post.get("slug") != spec["slug"] or not post.get("is_published"):
        raise ValueError(f"Unexpected or unpublished Substack response for {spec['slug']}")
    tree = Tree()
    tree.feed(post["body_html"])
    body = "\n\n".join(blocks(tree.root)).strip()
    if len(body.split()) < 1200:
        raise ValueError(f"Article body appears incomplete: {spec['slug']}")
    date = datetime.fromisoformat(post["post_date"].replace("Z", "+00:00")).date().isoformat()
    return {
        "id": spec["id"],
        "title": post["title"],
        "category": spec["category"],
        "summary": post["subtitle"],
        "lead": spec["lead"],
        "image": spec["image"],
        "imageAlt": spec["imageAlt"],
        "audio": "",
        "readMinutes": str(round(post["wordcount"] / 200)),
        "publishedAt": date,
        "sourceUrl": post["canonical_url"],
        "tags": spec["tags"],
        "body": body,
        "status": "published",
        "featured": True,
    }


def main():
    imported = [import_one(spec) for spec in ARTICLES]
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    imported_ids = {article["id"] for article in imported}
    remaining = [article for article in catalog["essays"] if article["id"] not in imported_ids]
    for article in remaining:
        if article["id"] == "how-ai-actually-works":
            article["featured"] = False
    catalog["essays"] = imported + remaining
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for article in imported:
        print(f"Imported {article['title']} ({article['publishedAt']}, {len(article['body'].split())} words)")


if __name__ == "__main__":
    if sys.argv[1:] == ["--sync-feed"]:
        sync_feed()
    elif not sys.argv[1:]:
        main()
    else:
        raise SystemExit("Usage: python scripts/import-substack.py [--sync-feed]")
