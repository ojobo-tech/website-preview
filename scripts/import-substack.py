"""One-time import of Ojobo's four public Substack articles into the content catalog.

Run only when intentionally refreshing these articles. Images are not downloaded.
"""

from dataclasses import dataclass, field
from datetime import datetime
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "content" / "site-content.json"
BASE = "https://ojoboagboeje.substack.com"
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
    if node.tag in {"script", "style", "svg", "figure", "form", "button", "input"}:
        return []
    if any(part in classes for part in ("subscription-widget", "subscribe-widget", "button-wrapper", "paywall")):
        return []
    if node.tag in {"h2", "h3", "h4", "h5"}:
        return ["## " + re.sub(r"\s+", " ", plain(node)).strip()]
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
    main()
