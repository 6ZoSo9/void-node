#!/usr/bin/env python3
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src" / "index.ts"
FEED = ROOT / "ops" / "mainnet0" / "participant-news-feed.current.json"

START = "    <!-- VOID_HOME_NEWS_FEED_V1 -->"
END = "    <!-- VOID_PARTICIPANT_HOME_ACTIONS_V1 -->"

def esc(x):
    return html.escape(str(x or ""), quote=True)

data = json.loads(FEED.read_text())
items = data.get("items") or []
if not items:
    raise SystemExit("[ERR] news feed has no items")

cards = []
for item in items:
    cards.append(f'''        <div class="home-news-item">
          <div class="k">{esc(item.get("kind", "update"))}</div>
          <div class="v">{esc(item.get("title", "Untitled update"))}</div>
          <div class="s">{esc(item.get("summary", ""))}</div>
        </div>''')

block = f'''{START}
    <!-- VOID_HOME_NEWS_FEED_GENERATED_V1 -->
    <section class="home-news-feed" id="homeNewsFeed" aria-label="VOID news and updates">
      <div class="home-news-head">
        <div>
          <h2>{esc(data.get("title", "News & Updates"))}</h2>
          <div class="home-news-sub">{esc(data.get("subtitle", "What changed recently."))}</div>
        </div>
        <span class="pill">{esc(data.get("window", "recent"))}</span>
      </div>
      <div class="home-news-list">
{chr(10).join(cards)}
      </div>
    </section>

'''

src = SRC.read_text()
a = src.find(START)
b = src.find(END)
if a < 0:
    raise SystemExit("[ERR] start marker not found")
if b < 0 or b <= a:
    raise SystemExit("[ERR] end marker not found after start marker")

SRC.write_text(src[:a] + block + src[b:])
print(f"[ok] rendered {len(items)} news items")
