# 대표 프로젝트 카드의 커버 아트를 이미지로 합성한다.
#
# 왜 CSS 가 아니라 이미지인가: 기기 목업을 CSS 로 겹쳐 놓으면 카드마다 여백·잘림·그림자가
# 제각각이 되고, 한 카드를 고치면 다른 카드가 틀어진다. 한 장으로 구우면 구도를 고정할 수 있다.
# 라벨(`01 / SERVICE PLANNING`)과 제목은 HTML 에 그대로 두어 읽히게 한다 — 이미지에 굽지 않는다.
#
#   python scripts/build-covers.py
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, "assets", *p)

KR = "C:/Windows/Fonts/NotoSansKR-VF.ttf"
LATIN = "C:/Windows/Fonts/arialbd.ttf"

BEZEL = (28, 31, 36)


def kr(size, weight="Black"):
    f = ImageFont.truetype(KR, size)
    f.set_variation_by_name(weight)
    return f


def device(screen, width, height):
    """스크린샷 위쪽을 잘라 폰 목업 한 대를 만든다. 반환은 RGBA."""
    im = Image.open(A(screen)).convert("RGB")
    inner_w = width
    inner_h = height
    scale = inner_w / im.width
    im = im.resize((inner_w, max(1, int(im.height * scale))), Image.LANCZOS)
    im = im.crop((0, 0, inner_w, min(inner_h, im.height)))
    if im.height < inner_h:                      # 화면이 짧으면 아래를 흰색으로 채운다
        pad = Image.new("RGB", (inner_w, inner_h), (255, 255, 255))
        pad.paste(im, (0, 0))
        im = pad

    b = max(3, int(width * 0.022))               # 베젤 두께
    r = int(width * 0.085)                       # 모서리 반경
    out = Image.new("RGBA", (width + b * 2, inner_h + b * 2), (0, 0, 0, 0))
    shell = Image.new("RGBA", out.size, BEZEL + (255,))
    mask = Image.new("L", out.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, out.size[0] - 1, out.size[1] - 1], radius=r + b, fill=255)
    out.paste(shell, (0, 0), mask)

    inner_mask = Image.new("L", (inner_w, inner_h), 0)
    ImageDraw.Draw(inner_mask).rounded_rectangle([0, 0, inner_w - 1, inner_h - 1], radius=r, fill=255)
    out.paste(im, (b, b), inner_mask)
    return out


def place(canvas, dev, xy, angle=0, shadow=True):
    """회전·그림자와 함께 올린다. xy 는 올릴 좌상단."""
    if angle:
        dev = dev.rotate(angle, resample=Image.BICUBIC, expand=True)
    if shadow:
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        blob = Image.new("RGBA", dev.size, (0, 0, 0, 0))
        blob.paste((0, 0, 0, 90), (0, 0), dev.split()[3])
        sh.paste(blob, (xy[0] + int(dev.width * 0.03), xy[1] + int(dev.height * 0.035)), blob)
        sh = sh.filter(ImageFilter.GaussianBlur(26))
        canvas.alpha_composite(sh)
    canvas.alpha_composite(dev, xy)


def canvas(w, h, bg):
    return Image.new("RGBA", (w, h), bg + (255,))


W, H = 1200, 960          # .visual-cover 의 aspect-ratio 1.25 에 맞춘다
WIDE_W, WIDE_H = 1600, 516  # 가로형(05) 은 aspect-ratio 3.1


def cover_eye():
    c = canvas(W, H, (70, 118, 244))
    # 두 대를 겹쳐 세우고 아래로 흘려보낸다 — 잘린 끝이 카드 밖으로 나가게.
    back = device("eye-chart.webp", 330, 700)
    front = device("eye-home-booked.webp", 390, 760)
    place(c, back, (660, 250), angle=-6)
    place(c, front, (150, 300), angle=4)
    return c, "cover-eye.png"


def cover_skin():
    c = canvas(W, H, (231, 222, 213))
    back = device("skin-consult-redacted.webp", 320, 690)
    front = device("skin-home.webp", 400, 770)
    place(c, back, (700, 265), angle=7)
    place(c, front, (170, 300), angle=-5)
    return c, "cover-skin.png"


def cover_search():
    c = canvas(W, H, (255, 90, 31))
    d = ImageDraw.Draw(c)
    f = kr(170, "Black")
    d.text((80, 150), "15", font=f, fill=(17, 17, 17))
    w = f.getlength("15")
    f2 = kr(84, "Bold")
    d.text((80 + w + 6, 232), "/18", font=f2, fill=(17, 17, 17))
    f3 = kr(30, "Bold")
    d.text((84, 356), "관리한 네이버 타깃 · 1페이지 노출", font=f3, fill=(17, 17, 17))
    shot = Image.open(A("search-google-local-v2.webp")).convert("RGB")
    sw = 900
    shot = shot.resize((sw, int(shot.height * sw / shot.width)), Image.LANCZOS)
    shot = shot.crop((0, 0, sw, min(520, shot.height)))
    framed = Image.new("RGBA", (sw + 16, shot.height + 16), (255, 255, 255, 255))
    framed.paste(shot, (8, 8))
    place(c, framed, (170, 470), angle=-3)
    return c, "cover-search.png"


def cover_agent():
    # 콘솔 화면이 거의 검정이라, 배경까지 검정이면 기기가 사라진다.
    # 배경을 한 단계 밝히고 화면 뒤에 옅은 광원을 깔아 윤곽이 보이게 한다.
    c = canvas(W, H, (23, 28, 38))
    glow = Image.new("RGBA", c.size, (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([120, 180, 1080, 820], fill=(90, 120, 190, 95))
    c.alpha_composite(glow.filter(ImageFilter.GaussianBlur(120)))

    shot = Image.open(A("agent-console-demo-poster.webp")).convert("RGB")
    sw = 1010
    shot = shot.resize((sw, int(shot.height * sw / shot.width)), Image.LANCZOS)
    r = 14
    framed = Image.new("RGBA", (sw + 16, shot.height + 16), (0, 0, 0, 0))
    ImageDraw.Draw(framed).rounded_rectangle(
        [0, 0, framed.width - 1, framed.height - 1], radius=r + 8,
        fill=(52, 60, 74, 255), outline=(120, 135, 160, 255), width=2)
    m = Image.new("L", shot.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, shot.width - 1, shot.height - 1], radius=r, fill=255)
    framed.paste(shot, (8, 8), m)
    place(c, framed, (95, 250), angle=-2)
    return c, "cover-agent.png"


def cover_product():
    # 보드 전체를 넣으면 1500px 짜리가 카드 폭에 눌려 아무것도 안 읽힌다.
    # 한 구간을 확대해 양옆으로 흘려보내 '계속 이어지는 보드'로 읽히게 한다.
    # 보드가 흰 종이라 어두운 카드와 싸운다. 카드를 밝게 두고 보드를 그대로 올린다.
    PAPER = (236, 235, 231)
    c = canvas(WIDE_W, WIDE_H, PAPER)
    shot = Image.open(A("evidence-308e9d70c5de.webp")).convert("RGB")
    zoom = 2.45
    shot = shot.resize((int(shot.width * zoom), int(shot.height * zoom)), Image.LANCZOS)
    left = int(shot.width * 0.185)
    view = shot.crop((left, 0, min(left + WIDE_W + 240, shot.width), min(WIDE_H + 150, shot.height)))
    c.alpha_composite(view.convert("RGBA"), (-40, -70))

    # 오른쪽만 종이색으로 흘려 '보드가 계속 이어진다'를 만든다. 왼쪽은 자른 면 그대로 둔다.
    fade = Image.new("RGBA", c.size, (0, 0, 0, 0))
    fd = ImageDraw.Draw(fade)
    for i in range(260):
        a = int(255 * (1 - i / 260) ** 1.5)
        fd.line([(WIDE_W - 1 - i, 0), (WIDE_W - 1 - i, WIDE_H)], fill=PAPER + (a,))
    for i in range(60):
        a = int(255 * (1 - i / 60) ** 1.5)
        fd.line([(0, WIDE_H - 1 - i), (WIDE_W, WIDE_H - 1 - i)], fill=PAPER + (a,))
        fd.line([(i, 0), (i, WIDE_H)], fill=PAPER + (a,))
    # 카드 라벨(05 / SERVICE PLANNING)이 보드 선 위에 얹히지 않도록 윗단을 비운다
    for i in range(96):
        a = int(255 * (1 - i / 96) ** 1.2)
        fd.line([(0, i), (WIDE_W, i)], fill=PAPER + (a,))
    c.alpha_composite(fade)
    return c, "cover-product.png"


def device_full(screen, width):
    """화면 전체를 담은 폰 목업. 길이는 원본 비율 그대로 둔다(화면마다 다르다)."""
    im = Image.open(A(screen)).convert("RGB")
    h = max(1, int(im.height * width / im.width))
    im = im.resize((width, h), Image.LANCZOS)
    b = max(3, int(width * 0.028))
    r = int(width * 0.085)
    out = Image.new("RGBA", (width + b * 2, h + b * 2), (0, 0, 0, 0))
    shell = Image.new("RGBA", out.size, BEZEL + (255,))
    mask = Image.new("L", out.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, out.size[0] - 1, out.size[1] - 1], radius=r + b, fill=255)
    out.paste(shell, (0, 0), mask)
    inner = Image.new("L", (width, h), 0)
    ImageDraw.Draw(inner).rounded_rectangle([0, 0, width - 1, h - 1], radius=r, fill=255)
    out.paste(im, (b, b), inner)
    return out


def board(screens, bg, phone_w, gap, offsets, size=(2560, 1280), top=120):
    """사례 상단 스테이지에 깔 '화면 벽'. 폭만 맞추고 길이는 원본대로 — 길이가 제각각인 것이 사실이다."""
    c = canvas(size[0], size[1], bg)
    devs = [device_full(s, phone_w) for s in screens]
    total = sum(d.width for d in devs) + gap * (len(devs) - 1)
    x = (size[0] - total) // 2
    for d, off in zip(devs, offsets):
        place(c, d, (x, top + off))
        x += d.width + gap
    return c


BOARDS = [
    (["eye-home.webp", "eye-chart.webp", "eye-drops.webp",
      "eye-home-booked.webp", "eye-home-none.webp", "eye-home-postop.webp"],
     (70, 118, 244), 300, 58, [0, 150, 90, 20, 170, 60], "board-eye.webp"),
    (["skin-home.webp", "skin-consult-redacted.webp", "skin-chatbot.webp", "skin-guest.webp"],
     (231, 222, 213), 400, 76, [190, 0, 120, 40], "board-skin.webp"),
]


def build_boards():
    for screens, bg, w, gap, offs, name in BOARDS:
        img = board(screens, bg, w, gap, offs)
        out = A(name)
        img.convert("RGB").save(out, "WEBP", quality=90, method=6)
        print(f"  {name:<22}{img.size}  {os.path.getsize(out):>9,} bytes")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    # 커버는 라이트박스로 확대하지 않는 장식 이미지라 손실 압축으로 둔다.
    # (확대해서 읽는 화면들은 무손실로 따로 둔다 — assets/eye-*.webp 등)
    for fn in [cover_eye, cover_skin, cover_search, cover_agent, cover_product]:
        img, name = fn()
        out = A(name.replace(".png", ".webp"))
        img.convert("RGB").save(out, "WEBP", quality=90, method=6)
        print(f"  {os.path.basename(out):<22}{img.size}  {os.path.getsize(out):>9,} bytes")
    build_boards()
