# 사례별 OG 이미지(1200x630) 생성기.
# 홈 og-image.png 의 조형을 그대로 따른다 — 오렌지 바탕 · 검정 활자 · 상하 괘선 · 옅은 그리드.
# CI 에 붙이지 않는다. 문구가 바뀌었을 때 사람이 직접 돌리고, 결과 PNG 를 저장소에 둔다.
#   python scripts/build-og-images.py
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

W, H = 1200, 630
MARGIN = 72
CONTENT = W - MARGIN * 2
ORANGE = (255, 90, 31)
GRID = (240, 84, 27)
INK = (17, 17, 17)

KR = "C:/Windows/Fonts/NotoSansKR-VF.ttf"
LATIN = "C:/Windows/Fonts/arialbd.ttf"

CASES = [
    dict(slug="eye-app", label="01 / SERVICE PLANNING",
         headline="와커스 안과 앱",
         sub="예약 · 마이차트 · 안약 알림을 잇는 환자 경험"),
    dict(slug="skin-app", label="02 / SERVICE PLANNING",
         headline="피부과 고객 앱",
         sub="시술 탐색과 예약 · 회원 혜택을 하나의 흐름으로"),
    dict(slug="seo", label="03 / SEARCH PERFORMANCE",
         headline="병·의원 검색 노출 개선",
         sub="관리 타깃 15/18 · 네이버 1페이지 노출"),
    dict(slug="product", label="05 / SERVICE PLANNING",
         headline="운영자·관리자 화면 기획",
         sub="Flow와 Wireframe으로 개발 가능한 단위까지"),
    dict(slug="automation", label="04 / AI AUTOMATION",
         headline="마케팅 업무 자동화",
         sub="검수 절차를 갖춘 Agent 워크플로"),
]


def kr(size, weight="Black"):
    f = ImageFont.truetype(KR, size)
    f.set_variation_by_name(weight)
    return f


def tracked(draw, xy, text, font, fill, tracking=0):
    """자간을 준 한 줄 그리기. PIL 에는 자간 개념이 없어 글자마다 옮겨 그린다."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + tracking
    return x - xy[0] - tracking


def tracked_width(text, font, tracking=0):
    return sum(font.getlength(c) for c in text) + tracking * max(len(text) - 1, 0)


def fit(text, maker, start, tracking, limit=CONTENT, floor=56):
    """한 줄로 담길 때까지 글자 크기를 줄인다. 줄바꿈으로 도망치지 않는다."""
    size = start
    while size > floor:
        font = maker(size)
        if tracked_width(text, font, tracking) <= limit:
            return font, size
        size -= 2
    return maker(floor), floor


def build(case):
    img = Image.new("RGB", (W, H), ORANGE)
    d = ImageDraw.Draw(img)

    for x in range(0, W, 100):
        d.line([(x, 0), (x, H)], fill=GRID, width=1)
    for y in range(0, H, 100):
        d.line([(0, y), (W, y)], fill=GRID, width=1)

    d.line([(MARGIN, 78), (W - MARGIN, 78)], fill=INK, width=4)
    d.line([(MARGIN, 552), (W - MARGIN, 552)], fill=INK, width=4)

    f_kicker = ImageFont.truetype(LATIN, 26)
    tracked(d, (MARGIN, 96), "SANGMIN LEE / PORTFOLIO 2026", f_kicker, INK, 4)

    f_head, size = fit(case["headline"], lambda s: kr(s, "Black"), 104, -4)
    d.text((MARGIN - 4, 196), case["headline"], font=f_head, fill=INK)

    f_sub, _ = fit(case["sub"], lambda s: kr(s, "Bold"), 34, 0)
    d.text((MARGIN, 196 + size + 56), case["sub"], font=f_sub, fill=INK)

    f_label = ImageFont.truetype(LATIN, 22)
    tracked(d, (MARGIN, 500), case["label"], f_label, INK, 5)

    f_foot = ImageFont.truetype(LATIN, 22)
    w = tracked_width("SEARCH / BUILD / AUTOMATE", f_foot, 5)
    tracked(d, (W - MARGIN - w, 500), "SEARCH / BUILD / AUTOMATE", f_foot, INK, 5)

    out = os.path.join(ROOT, "assets", f"og-{case['slug']}.png")
    img.save(out, "PNG", optimize=True)
    return out, os.path.getsize(out), size


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    for c in CASES:
        path, size, head = build(c)
        print(f"  {os.path.relpath(path, ROOT):<32}{size:>9,} bytes   헤드라인 {head}px")
