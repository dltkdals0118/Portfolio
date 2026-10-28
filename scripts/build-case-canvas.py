# 사례 페이지의 화면 figure 를 landscape 캔버스로 합성한다.
#
# 왜 필요한가: 세로로 긴 폰 캡처를 세로 figure 로 올리면 둘 중 하나가 된다 —
# fold 에서 잘리거나, 본문이 안 읽힐 만큼 줄어든다. 조사 범위의 좋은 케이스
# 스터디 36 figure 중 세로로 긴 것은 0개였고, 모바일 화면은 예외 없이
# "가로로 눕힌 캔버스 안에 여러 장"으로 들어갔다.
# 근거: C:/Users/owner/Portfolio-research/03-case-study-screens.md §0~§1
#
# 캔버스는 세 종류만 쓴다(불규칙한 높이가 '일관성 없는 크롭'으로 읽히는 것을 막는다):
#   strip 1440×420 · focus 1440×810 · band 1440×260
#
# 이 스크립트는 판정하지 않고 관측값을 낸다 — 다만 둘은 세운다:
#   · focus 캔버스의 화면이 판독 하한(표시폭 360px) 아래면 중단한다.
#     focus 의 존재 이유가 '화면 안 글자를 읽히게' 하는 것이라서다.
#   · 원본보다 크게 늘려 놓는 경우(업스케일)는 중단하지 않고 보고한다.
#     흐려지는 것은 사고가 아니라 재추출이 필요하다는 신호다.
#
#   python scripts/build-case-canvas.py            # 전부 생성
#   python scripts/build-case-canvas.py --report    # 만들지 않고 수치만
#   python scripts/build-case-canvas.py eye-home-hero   # 하나만
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding="utf-8")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, "assets", *p)
MANIFEST = os.path.join(ROOT, "scripts", "case-canvas.json")

KR = "C:/Windows/Fonts/NotoSansKR-VF.ttf"

ORANGE = (255, 90, 31)
INK = (17, 17, 17)
PAPER = (247, 244, 238)
NEUTRAL = (241, 239, 236)

# 캔버스 3종 — 설계 좌표(1배속). 내보내기 배율은 원본 해상도가 허락하는 만큼.
SIZES = {"strip": (1440, 420), "focus": (1440, 810), "band": (1440, 260)}
# 화면 안 글자를 읽혀야 하는 캔버스의 표시폭 하한. 03 §1-B 의 공식
#   표시폭 >= 논리폭 x (12 / 본문 pt) → 390pt·15pt = 312px, 실무 권장 360px
READABLE_MIN = 360

BG = {"neutral": NEUTRAL, "paper": PAPER, "ink": INK, "orange": ORANGE}


def kr(size, weight="Bold"):
    f = ImageFont.truetype(KR, size)
    f.set_variation_by_name(weight)
    return f


def rounded(img, radius):
    """베젤 대신 모서리만 깎는다. 정지 캡처를 기기 프레임에 가두는 조합은
    측정한 상위 사례 6건 중 0건이었다(03 §2)."""
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], radius, fill=255)
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def place(spec, inner_h):
    """원본을 열고 crop·fit 을 적용해, 설계 좌표에서의 (이미지, 폭, 높이)를 낸다."""
    src = Image.open(A(spec["src"])).convert("RGB")
    sw, sh = src.size
    y0, y1 = spec.get("crop", [0, 1])
    box = src.crop((0, round(sh * y0), sw, round(sh * y1)))
    bw, bh = box.size
    if spec.get("fit", "width") == "height":
        h = spec.get("height", inner_h)
        w = round(bw * h / bh)
    else:
        w = spec["width"]
        h = round(bh * w / bw)
    return box, w, h, sw


def compose(name, cv, scale):
    cw, ch = SIZES[cv["type"]]
    pad_x = cv.get("pad_x", 80)
    pad_y = cv.get("pad_y", 60)
    inner_h = ch - pad_y * 2
    bg = BG[cv.get("bg", "neutral")]
    img = Image.new("RGB", (cw * scale, ch * scale), bg)
    draw = ImageDraw.Draw(img, "RGBA")

    placed = []
    for spec in cv["screens"]:
        box, w, h, _ = place(spec, inner_h)
        placed.append((spec, box, w, h))

    gap = cv.get("gap", 32)
    total = sum(p[2] for p in placed) + gap * (len(placed) - 1)
    align = cv.get("align", "center")
    if align == "left":
        x = pad_x
    elif align == "right":
        x = cw - pad_x - total
    else:
        x = round((cw - total) / 2)

    for spec, box, w, h in placed:
        y = round((ch - h) / 2) if cv.get("valign", "middle") == "middle" else pad_y
        shot = box.resize((w * scale, h * scale), Image.LANCZOS)
        shot = rounded(shot, round(spec.get("radius", 14) * scale))
        # 바닥 그림자 — 면을 띄우되 기기처럼 보이지 않게 아주 약하게
        sh_pad = round(18 * scale)
        shadow = Image.new("RGBA", (shot.width + sh_pad * 2, shot.height + sh_pad * 2), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle(
            [sh_pad, sh_pad + round(6 * scale), sh_pad + shot.width, sh_pad + shot.height + round(6 * scale)],
            round(spec.get("radius", 14) * scale), fill=(17, 17, 17, 28))
        img.paste(Image.alpha_composite(
            Image.new("RGB", shadow.size, bg).convert("RGBA"), shadow).convert("RGB"),
            (x * scale - sh_pad, y * scale - sh_pad))
        img.paste(shot, (x * scale, y * scale), shot)

        for b in spec.get("badges", []):
            bx = x + round(w * b["at"][0])
            by = y + round(h * b["at"][1])
            r = round(cv.get("badge_r", 19) * scale)
            cxy = (bx * scale, by * scale)
            draw.ellipse([cxy[0] - r, cxy[1] - r, cxy[0] + r, cxy[1] + r], fill=INK + (255,))
            label = str(b["n"])
            f = kr(round(21 * scale), "Bold")
            tw = draw.textlength(label, font=f)
            draw.text((cxy[0] - tw / 2, cxy[1] - round(14 * scale)), label, font=f, fill=(255, 255, 255))
        x += w + gap

    out = A(cv.get("out", "case-%s.webp" % name))
    img.save(out, "WEBP", quality=88, method=6)
    return out, placed, os.path.getsize(out)


def feasible_scale(cv):
    """원본을 늘리지 않고 쓸 수 있는 최대 배율. 2배 내보내기를 기본으로 하되,
    원본이 모자라면 1배로 내리고 보고한다 — 모자란 채로 2배로 늘리면
    파일만 커지고 선명해지지 않는다."""
    cw, ch = SIZES[cv["type"]]
    inner_h = ch - cv.get("pad_y", 60) * 2
    ratios = []
    for spec in cv["screens"]:
        _, w, _, sw = place(spec, inner_h)
        ratios.append(sw / w)
    return min(2.0, min(ratios)), min(ratios)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    report_only = "--report" in sys.argv
    manifest = json.load(open(MANIFEST, encoding="utf-8"))

    rows, blocking = [], []
    for name, cv in manifest["canvases"].items():
        if args and name not in args:
            continue
        cap, raw = feasible_scale(cv)
        scale = 2 if cap >= 2 else 1
        cw, ch = SIZES[cv["type"]]
        inner_h = ch - cv.get("pad_y", 60) * 2
        for spec in cv["screens"]:
            _, w, h, sw = place(spec, inner_h)
            upscale = (sw / w) < 1
            readable = w >= READABLE_MIN
            rows.append((name, cv["type"], spec["src"], w, scale, sw, readable, upscale, raw))
            if cv["type"] == "focus" and not readable:
                blocking.append("%s / %s — 표시폭 %dpx, 하한 %dpx" % (name, spec["src"], w, READABLE_MIN))
            if upscale:
                blocking.append("%s / %s — 원본 %dpx 를 %dpx 로 늘림" % (name, spec["src"], sw, w))
        if not report_only:
            out, _, size = compose(name, cv, scale)
            print("  %-22s %-6s %d배  %s (%d KB)" % (name, cv["type"], scale, os.path.basename(out), size // 1024))

    print("\n화면별 표시폭 — 판독 하한 %dpx (03 §1-B)" % READABLE_MIN)
    for name, typ, src, w, scale, sw, readable, upscale, raw in rows:
        flag = "OK " if readable else "작음"
        crisp = "원본 %dpx / %d배 내보내기" % (sw, scale)
        if scale < 2:
            crisp += " — 피그마에서 2배로 재추출하면 선명해진다"
        print("  %-22s %-6s %-26s 표시 %4dpx  %s  %s" % (name, typ, src, w, flag, crisp))

    if blocking:
        print("\n막는 것:")
        for b in dict.fromkeys(blocking):
            print("  · " + b)
        sys.exit(1)
    print("\n막는 것 없음.")


if __name__ == "__main__":
    main()
