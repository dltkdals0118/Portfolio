# 대표 프로젝트 카드의 커버 아트와 사례 상단 스테이지를 이미지로 합성한다.
#
# 왜 CSS 가 아니라 이미지인가: 기기 목업을 CSS 로 겹쳐 놓으면 카드마다 여백·잘림·그림자가
# 제각각이 되고, 한 카드를 고치면 다른 카드가 틀어진다. 한 장으로 구우면 구도를 고정할 수 있다.
# 라벨(`01 / SERVICE PLANNING`)과 제목은 HTML 에 그대로 두어 읽히게 한다 — 이미지에 굽지 않는다.
#
# 바탕은 앱마다의 브랜드색이 아니라 포트폴리오 팔레트(오렌지/잉크/페이퍼) 3색만 쓴다.
# 히어로와 같은 그리드(72px · 8%)와 라벨 아래 헤어라인을 모든 커버에 깔아 한 벌로 묶는다.
#
#   python scripts/build-covers.py
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, "assets", *p)

KR = "C:/Windows/Fonts/NotoSansKR-VF.ttf"
BLACK_LATIN = "C:/Windows/Fonts/ariblk.ttf"

ORANGE = (255, 90, 31)       # --orange
INK = (17, 17, 17)           # --ink
PAPER = (247, 244, 238)      # --paper
BEZEL = INK

GRID_CSS_PX = 72             # 히어로 .hero-grid 와 같은 간격
RULE_Y_CSS = 56              # 라벨 아래 헤어라인 — 모든 커버가 같은 자리

W, H = 1200, 960             # .visual-cover 의 aspect-ratio 1.25
WIDE_W, WIDE_H = 1600, 516   # 가로형(05) 은 aspect-ratio 3.1
DISP, WIDE_DISP = 520, 1076  # 데스크톱에서 카드가 실제로 그려지는 폭


def kr(size, weight="Black"):
    f = ImageFont.truetype(KR, size)
    f.set_variation_by_name(weight)
    return f


def canvas(w, h, bg):
    return Image.new("RGBA", (w, h), bg + (255,))


def ground(w, h, bg, display_w):
    """히어로와 같은 조형의 바탕: 팔레트 3색 + 그리드 + 라벨 아래 헤어라인."""
    c = canvas(w, h, bg)
    line = PAPER if sum(bg) < 300 else INK
    scale = w / display_w                        # CSS px → 아트 px
    pitch = max(8, int(GRID_CSS_PX * scale))
    g = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    for x in range(0, w, pitch):
        gd.line([(x, 0), (x, h)], fill=line + (20,))     # rgba(...,.08)
    for y in range(0, h, pitch):
        gd.line([(0, y), (w, y)], fill=line + (20,))
    c.alpha_composite(g)
    rule(c, w, line, scale)
    return c


def rule(c, w, line, scale):
    m = int(24 * scale)
    y = int(RULE_Y_CSS * scale)
    ImageDraw.Draw(c).line([(m, y), (w - m, y)], fill=line + (255,), width=max(2, int(1.5 * scale)))


def _shell(im, width, inner_h, bezel_ratio, radius_ratio):
    b = max(3, int(width * bezel_ratio))
    r = int(width * radius_ratio)
    out = Image.new("RGBA", (width + b * 2, inner_h + b * 2), (0, 0, 0, 0))
    shell = Image.new("RGBA", out.size, BEZEL + (255,))
    mask = Image.new("L", out.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, out.size[0] - 1, out.size[1] - 1], radius=r + b, fill=255)
    out.paste(shell, (0, 0), mask)
    inner = Image.new("L", (width, inner_h), 0)
    ImageDraw.Draw(inner).rounded_rectangle([0, 0, width - 1, inner_h - 1], radius=r, fill=255)
    out.paste(im, (b, b), inner)
    return out


def device(screen, width, height):
    """스크린샷 위쪽을 잘라 담은 폰 목업."""
    im = Image.open(A(screen)).convert("RGB")
    im = im.resize((width, max(1, int(im.height * width / im.width))), Image.LANCZOS)
    im = im.crop((0, 0, width, min(height, im.height)))
    if im.height < height:                       # 화면이 짧으면 아래를 흰색으로 채운다
        pad = Image.new("RGB", (width, height), (255, 255, 255))
        pad.paste(im, (0, 0))
        im = pad
    return _shell(im, width, height, 0.022, 0.085)


def device_full(screen, width):
    """화면 전체를 담은 폰 목업. 길이는 원본 비율 그대로 둔다(화면마다 다르다)."""
    im = Image.open(A(screen)).convert("RGB")
    h = max(1, int(im.height * width / im.width))
    im = im.resize((width, h), Image.LANCZOS)
    return _shell(im, width, h, 0.028, 0.085)


def place(c, dev, xy, shadow=True):
    if shadow:
        from PIL import ImageFilter
        sh = Image.new("RGBA", c.size, (0, 0, 0, 0))
        blob = Image.new("RGBA", dev.size, (0, 0, 0, 0))
        blob.paste((0, 0, 0, 80), (0, 0), dev.split()[3])
        sh.paste(blob, (xy[0] + int(dev.width * 0.03), xy[1] + int(dev.height * 0.035)), blob)
        c.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
    c.alpha_composite(dev, xy)


def cover_eye():
    # 히어로 바로 아래 첫 카드 — 오렌지를 이어받는다. 파란 앱 화면이 보색으로 선다.
    c = ground(W, H, ORANGE, DISP)
    place(c, device("eye-chart.webp", 330, 700), (660, 268))
    place(c, device("eye-home-booked.webp", 390, 760), (150, 318))
    return c, "cover-eye.webp"


def cover_skin():
    c = ground(W, H, PAPER, DISP)
    place(c, device("skin-consult-redacted.webp", 320, 690), (700, 282))
    place(c, device("skin-home.webp", 400, 770), (170, 318))
    return c, "cover-skin.webp"


def cover_search():
    # 히어로의 반전 — 잉크 바탕에 오렌지 헤비 타입.
    c = ground(W, H, INK, DISP)
    d = ImageDraw.Draw(c)
    big = ImageFont.truetype(BLACK_LATIN, 190)
    sub = ImageFont.truetype(BLACK_LATIN, 86)
    d.text((56, 180), "15", font=big, fill=ORANGE)
    d.text((56 + big.getlength("15") - 16, 268), "/18", font=sub, fill=PAPER)
    d.text((60, 400), "관리한 네이버 타깃 · 1페이지 노출", font=kr(29, "Bold"), fill=PAPER)
    shot = Image.open(A("search-google-local-v2.webp")).convert("RGB")
    sw = 900
    shot = shot.resize((sw, int(shot.height * sw / shot.width)), Image.LANCZOS)
    shot = shot.crop((0, 0, sw, min(520, shot.height)))
    framed = Image.new("RGBA", (sw + 16, shot.height + 16), PAPER + (255,))
    framed.paste(shot, (8, 8))
    place(c, framed, (180, 500))
    return c, "cover-search.webp"


def cover_agent():
    # 거의 검정인 콘솔은 오렌지 위에 올려야 선다. 베젤도 잉크로 통일.
    c = ground(W, H, ORANGE, DISP)
    shot = Image.open(A("agent-console-demo-poster.webp")).convert("RGB")
    sw = 1120
    shot = shot.resize((sw, int(shot.height * sw / shot.width)), Image.LANCZOS)
    framed = Image.new("RGBA", (sw + 20, shot.height + 20), (0, 0, 0, 0))
    ImageDraw.Draw(framed).rounded_rectangle(
        [0, 0, framed.width - 1, framed.height - 1], radius=22, fill=INK + (255,))
    m = Image.new("L", shot.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, shot.width - 1, shot.height - 1], radius=12, fill=255)
    framed.paste(shot, (10, 10), m)
    place(c, framed, (60, 360))
    return c, "cover-agent.webp"


def cover_product():
    # 보드가 거의 흰 종이라 페이퍼 위에선 묻힌다. 잉크 바탕에 올려 대비를 준다.
    scale = WIDE_W / WIDE_DISP
    c = ground(WIDE_W, WIDE_H, INK, WIDE_DISP)
    shot = Image.open(A("evidence-308e9d70c5de.webp")).convert("RGB")
    zoom = 2.45
    shot = shot.resize((int(shot.width * zoom), int(shot.height * zoom)), Image.LANCZOS)
    left = int(shot.width * 0.185)
    view = shot.crop((left, 0, min(left + WIDE_W + 240, shot.width),
                      min(WIDE_H + 150, shot.height)))
    c.alpha_composite(view.convert("RGBA"), (-40, 108))
    fade = Image.new("RGBA", c.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(fade)
    for i in range(260):                          # 오른쪽: 보드가 계속 이어지는 느낌
        a = int(255 * (1 - i / 260) ** 1.5)
        fd.line([(WIDE_W - 1 - i, 0), (WIDE_W - 1 - i, WIDE_H)], fill=INK + (a,))
    for i in range(80):
        a = int(255 * (1 - i / 80) ** 1.5)
        fd.line([(0, WIDE_H - 1 - i), (WIDE_W, WIDE_H - 1 - i)], fill=INK + (a,))
        fd.line([(i, 0), (i, WIDE_H)], fill=INK + (a,))
    for i in range(46):                           # 위: 보드가 시작되는 경계만 살짝 녹인다
        a = int(255 * (1 - i / 46) ** 1.1)
        fd.line([(0, i), (WIDE_W, i)], fill=INK + (a,))
    c.alpha_composite(fade)
    rule(c, WIDE_W, PAPER, scale)                 # 페이드 위에 다시 그어 준다
    return c, "cover-product.webp"


def board(screens, bg, phone_w, gap, offsets, size=(2560, 1280), top=120):
    """사례 상단 스테이지의 '화면 벽'. 커버와 같은 바탕·그리드를 쓴다."""
    c = ground(size[0], size[1], bg, 1280)
    devs = [device_full(s, phone_w) for s in screens]
    total = sum(d.width for d in devs) + gap * (len(devs) - 1)
    x = (size[0] - total) // 2
    for d, off in zip(devs, offsets):
        place(c, d, (x, top + off))
        x += d.width + gap
    return c


COVERS = [cover_eye, cover_skin, cover_search, cover_agent, cover_product]

BOARDS = [
    # 카드 바탕과 같은 색을 써서, 카드를 누르면 같은 바탕의 페이지로 이어지게 한다.
    (["eye-home.webp", "eye-chart.webp", "eye-drops.webp",
      "eye-home-booked.webp", "eye-home-none.webp", "eye-home-postop.webp"],
     ORANGE, 300, 58, [0, 150, 90, 20, 170, 60], "board-eye.webp"),
    (["skin-home.webp", "skin-consult-redacted.webp", "skin-chatbot.webp", "skin-guest.webp"],
     PAPER, 400, 76, [190, 0, 120, 40], "board-skin.webp"),
]


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    # 커버·보드는 라이트박스로 확대하지 않는 장식 이미지라 손실 압축으로 둔다.
    # (확대해서 읽는 화면들은 무손실로 따로 있다 — assets/eye-*.webp 등)
    for fn in COVERS:
        img, name = fn()
        out = A(name)
        img.convert("RGB").save(out, "WEBP", quality=90, method=6)
        print(f"  {name:<22}{img.size}  {os.path.getsize(out):>9,} bytes")
    for screens, bg, w, gap, offs, name in BOARDS:
        img = board(screens, bg, w, gap, offs)
        out = A(name)
        img.convert("RGB").save(out, "WEBP", quality=90, method=6)
        print(f"  {name:<22}{img.size}  {os.path.getsize(out):>9,} bytes")
