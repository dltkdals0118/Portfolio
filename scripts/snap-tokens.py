# 소스 CSS 의 흩어진 값을 토큰으로 몰아넣는다.
#
# Why: 실측(2026-10-28) 홈 한 페이지에 font-size 16종 · weight 8종 · 색 8종 ·
# letter-spacing 22종 · line-height 27종이 있었다. 토큰이 없어서 요소마다 값을
# 따로 적은 결과다. 눈에 띄는 곳만 손으로 고치면 임의값이 하나 더 늘 뿐이라,
# 매핑표를 명시해 두고 기계로 몰아넣는다.
#
#   python scripts/snap-tokens.py --dry   # 무엇이 바뀌는지만 집계
#   python scripts/snap-tokens.py         # 적용
#
# 손대지 않는 것: 레이아웃 수치(width·padding·margin·gap·top/left 등),
# 애니메이션, 그림자. 이 스크립트는 '타이포와 색'만 본다.
import argparse
import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FILES = ["base", "refinement", "motion", "entry-motion", "prototype", "depth",
         "work-motion", "overview-ux", "cinema", "reading-focus", "unified-design",
         "single-page", "recruiter-polish", "responsive-motion", "review-polish",
         "focus", "case-studies", "editorial", "project-pages"]

# ── font-weight: 가변 중간값은 위계를 만들지 못한다. 3종으로.
WEIGHT = {"500": "400", "550": "600", "650": "600", "750": "700",
          "800": "700", "900": "700", "950": "700"}
# 900 을 남길 곳 — 라틴 대문자 라벨·숫자. Inter 가변 한 벌(100–900)이 덮으므로 비용이 없다.
# 한글이 들어가는 요소는 Pretendard 가 400/600/700 만 있어 900 이면 가짜 볼드가 된다 → 내린다.
WEIGHT_KEEP = re.compile(
    r"\.(hero h1|hero-kicker|hero-name|brand|scroll-cue|section-label|chapter-label"
    r"|visual-cover-label|timeline-tag|eyebrow|entry-meta|entry-wordmark|entry-disciplines"
    r"|figma-tab|figma-kpis|project-no|skills-band|time|text-link"
    r"|search-cover-number|agent-numbers|seo-metrics|case-strip|process-row"
    r"|agent-step|agent-flow|agent-stage-bottom|practice-mask-label|figma-showcase-head)")

# ── 색: 구분되지 않는 회색 5종 → --muted, 대비 미달 색 교체
COLOR = {
    "#77746f": "var(--muted)", "#777777": "var(--muted)", "#777": "var(--muted)",
    "#686b6d": "var(--muted)", "#686058": "var(--muted)", "#655e57": "var(--muted)",
    "#666666": "var(--muted)", "#666": "var(--muted)",
    "#7e776e": "var(--muted)", "#79726b": "var(--muted)",
    "#222222": "var(--ink)", "#222": "var(--ink)",
    "#111111": "var(--ink)", "#111": "var(--ink)",
    "#ff5a1f": "var(--orange)",
    "#f7f4ee": "var(--paper)",
}

# ── font-size: px 값을 가장 가까운 토큰으로. 레이아웃에 영향이 큰
#    아주 작은 값(<10)과 아이콘 크기는 건드리지 않는다.
SIZE_TOKENS = [(12, "var(--fs-overline)"), (14, "var(--fs-caption)"),
               (17, "var(--fs-body)"), (21, "var(--fs-h3)"),
               (28, "var(--fs-h2)"), (38, "var(--fs-h1)"), (52, "var(--fs-display)")]


def snap_size(px):
    if px < 10 or px > 60:
        return None                      # 오버라인 하한 미만·hero 급은 개별 처리
    best = min(SIZE_TOKENS, key=lambda t: (abs(t[0] - px), -t[0]))   # 동률이면 큰 쪽
    if abs(best[0] - px) > max(2.0, px * 0.14):
        return None                      # 너무 멀면 두지 않는다 (사람이 보게)
    return best[1]


def process(text, stats, path):
    out, pos = [], 0
    for m in re.finditer(r"([^{}]*)\{([^{}]*)\}", text):
        head, body = m.group(1), m.group(2)
        out.append(text[pos:m.start()])
        pos = m.end()
        # 토큰 정의 블록은 절대 건드리지 않는다.
        # 한 번 놓쳐서 `--ink:var(--ink)` 라는 순환 참조를 만들었고,
        # 순환 참조는 무효가 되어 글자색이 통째로 검정으로 떨어졌다.
        if ":root" in head or head.strip().startswith("@property"):
            out.append(head + "{" + body + "}")
            continue
        nb = body

        def w_sub(mm):
            v = mm.group(1)
            if v in WEIGHT and not (v in ("900", "950") and WEIGHT_KEEP.search(head)):
                stats["weight"][f"{v}->{WEIGHT[v]}"] += 1
                return "font-weight:" + WEIGHT[v]
            return mm.group(0)
        nb = re.sub(r"font-weight:\s*(\d{3})", w_sub, nb)

        def c_sub(mm):
            v = mm.group(0).lower()
            if v in COLOR:
                stats["color"][f"{v}->{COLOR[v]}"] += 1
                return COLOR[v]
            return mm.group(0)
        nb = re.sub(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b", c_sub, nb)

        def s_sub(mm):
            px = float(mm.group(1))
            tok = snap_size(px)
            if tok:
                stats["size"][f"{px:g}px->{tok}"] += 1
                return "font-size:" + tok
            stats["size_kept"][f"{px:g}px"] += 1
            return mm.group(0)
        nb = re.sub(r"font-size:\s*([\d.]+)px", s_sub, nb)

        out.append(head + "{" + nb + "}")
    out.append(text[pos:])
    return "".join(out)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    a = ap.parse_args()
    stats = {"weight": Counter(), "color": Counter(), "size": Counter(), "size_kept": Counter()}
    changed = 0
    for name in FILES:
        p = os.path.join(ROOT, "assets", name + ".css")
        if not os.path.exists(p):
            continue
        src = open(p, encoding="utf-8").read()
        new = process(src, stats, p)
        if new != src:
            changed += 1
            if not a.dry:
                open(p, "w", encoding="utf-8", newline="").write(new)
    for k in ("weight", "color", "size"):
        print(f"── {k}  (총 {sum(stats[k].values())}건)")
        for v, n in stats[k].most_common(14):
            print(f"   {n:>4}  {v}")
    print(f"── 토큰으로 안 옮긴 font-size (사람이 볼 것): {len(stats['size_kept'])}종")
    print("   " + "  ".join(f"{v}({n})" for v, n in stats["size_kept"].most_common(20)))
    print(f"\n파일 {changed}개 {'변경 예정' if a.dry else '변경됨'}")
