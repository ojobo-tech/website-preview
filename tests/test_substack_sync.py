"""Offline checks for long-form-only Substack synchronization."""

from io import BytesIO
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
import xml.etree.ElementTree as ET


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "import-substack.py"
spec = importlib.util.spec_from_file_location("substack_import", SCRIPT)
substack = importlib.util.module_from_spec(spec)
import sys
sys.modules[spec.name] = substack
spec.loader.exec_module(substack)


def item(slug, title, words, date="Wed, 21 Oct 2026 12:00:00 GMT"):
    post = ET.Element("item")
    for tag, value in {
        "title": title,
        "description": f"A full explanation of {title}.",
        "link": f"https://ojoboagboeje.substack.com/p/{slug}",
        "pubDate": date,
        "{http://purl.org/rss/1.0/modules/content/}encoded": "<h2>Why it matters</h2><p>" + ("useful transformation " * words) + "</p>",
    }.items():
        ET.SubElement(post, tag).text = value
    return post


class SubstackSyncTests(unittest.TestCase):
    def test_reader_fallback_preserves_full_rss(self):
        root = ET.Element("rss")
        channel = ET.SubElement(root, "channel")
        channel.append(item("long-essay", "Long essay", 1100))
        payload = {"code": 200, "data": {"url": substack.FEED, "html": ET.tostring(root, encoding="unicode")}}
        def open_feed(request, timeout):
            if request.full_url == substack.FEED:
                raise HTTPError(substack.FEED, 403, "Forbidden", {}, None)
            self.assertEqual(request.full_url, substack.FEED_READER)
            self.assertEqual(request.get_header("X-respond-with"), "html")
            return BytesIO(json.dumps(payload).encode())
        with patch.object(substack, "urlopen", side_effect=open_feed):
            feed = substack.fetch_feed()
        self.assertEqual(substack.article_from_feed(feed.find("./channel/item"))["id"], "long-essay")

    def test_longform_only_and_date_cutoff(self):
        longform = substack.article_from_feed(item("long-essay", "Long essay", 1100))
        self.assertEqual(longform["id"], "long-essay")
        self.assertGreater(len(longform["body"].split()), 1000)
        self.assertEqual(longform["canonicalPreference"], "website")
        self.assertIsNone(substack.article_from_feed(item("short-update", "Short update", 200)))
        self.assertIsNone(substack.article_from_feed(item("older-essay", "Older essay", 1100, "Mon, 19 Oct 2026 12:00:00 GMT")))

    def test_sync_adds_once_without_changing_existing_articles(self):
        root = ET.Element("rss")
        channel = ET.SubElement(root, "channel")
        channel.append(item("long-essay", "Long essay", 1100))
        channel.append(item("short-update", "Short update", 200))
        feed = ET.tostring(root)
        existing = {"version": 1, "essays": [{"id": "existing", "title": "Keep me", "body": "Original wording"}]}
        stored = {"json": json.dumps(existing)}
        def save(value, encoding="utf-8"):
            stored["json"] = value
        with patch.object(Path, "read_text", side_effect=lambda *args, **kwargs: stored["json"]), patch.object(Path, "write_text", side_effect=save), patch.object(substack, "urlopen", side_effect=lambda *args, **kwargs: BytesIO(feed)):
            substack.sync_feed()
            substack.sync_feed()
        result = json.loads(stored["json"])
        self.assertEqual([article["id"] for article in result["essays"]], ["long-essay", "existing"])
        self.assertEqual(result["essays"][1]["body"], "Original wording")


if __name__ == "__main__":
    unittest.main()
