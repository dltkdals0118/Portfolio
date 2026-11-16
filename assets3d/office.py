"""오피스 디오라마 빌더 — 히어로 뒤에 서는 작은 사무실.

작성: WACUS

레퍼런스는 파스텔 아이소메트릭 오피스 렌더다. 벽·바닥·책상·파티션·모니터·
키보드·화분처럼 **상자와 원기둥으로 되는 것들**이라, 캐릭터와 달리 스크립트로
짓는 것이 맞다(캐릭터는 이어진 조형이라 그 방식으로 실패했다).

치수는 눈대중하지 않는다. **앉은 캐릭터의 손 높이를 재서** 책상 상판을 그
아래에 놓는다 — 그래야 타자 치는 자세가 책상과 맞는다.

실행:
    import sys, importlib; sys.path.insert(0, r"<이 폴더>")
    import office; importlib.reload(office); office.build(hand_z=0.62)
"""

import bpy
import math
from mathutils import Vector, Matrix

COLL = "Office"

# 레퍼런스의 파스텔 팔레트
PALETTE = {
    "wall":      "#b9b6ea",
    "floor":     "#efeefb",
    "desk_top":  "#6b78c9",
    "desk_leg":  "#4f6ef0",
    "panel":     "#6d7fd8",
    "panel_in":  "#aeb8ee",
    "monitor":   "#e9eaf7",
    "screen":    "#f7f8ff",
    "screen_bar": "#8b7fe8",
    "key":       "#d9dcf2",
    "tray":      "#f2c56b",
    "tray_dark": "#d9a94e",
    "leaf":      "#4fc7bd",
    "pot":       "#7a6fe0",
    "card":      "#8b7fe8",
    "card_lite": "#c7cdf4",
    "metal":     "#9aa0b5",
}


def srgb(hexstr):
    h = hexstr.lstrip("#")
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255.0
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (out[0], out[1], out[2], 1.0)


def material(key):
    name = "off_" + key
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = srgb(PALETTE[key])
    bsdf.inputs["Roughness"].default_value = 0.62
    mat.diffuse_color = srgb(PALETTE[key])
    return mat


def _collection():
    coll = bpy.data.collections.get(COLL)
    if coll is None:
        coll = bpy.data.collections.new(COLL)
        bpy.context.scene.collection.children.link(coll)
    return coll


def box(name, centre, size, key, bevel=0.012):
    """모서리를 깎은 상자. 레퍼런스의 장난감 같은 느낌은 둥근 모서리에서 온다."""
    cx, cy, cz = centre
    hx, hy, hz = (s / 2 for s in size)
    v = [(cx - hx, cy - hy, cz - hz), (cx + hx, cy - hy, cz - hz),
         (cx + hx, cy + hy, cz - hz), (cx - hx, cy + hy, cz - hz),
         (cx - hx, cy - hy, cz + hz), (cx + hx, cy - hy, cz + hz),
         (cx + hx, cy + hy, cz + hz), (cx - hx, cy + hy, cz + hz)]
    f = [(0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
         (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(v, [], f)
    me.validate(); me.update()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(material(key))
    _collection().objects.link(ob)
    if bevel:
        m = ob.modifiers.new("Bevel", "BEVEL")
        m.width = min(bevel, min(hx, hy, hz) * 0.6)
        m.segments = 2
        m.limit_method = "ANGLE"
    return ob


def spin(ob, pivot, angle_z, angle_y=0.0):
    """정점을 피벗 기준으로 돌린다.

    `ob.rotation_euler` 를 쓰면 안 된다 — 정점을 월드 좌표로 만들어 두었는데
    오브젝트 원점은 (0,0,0)이라, 회전이 **원점 기준**이 되어 물건이 날아간다.
    실제로 잎과 모니터가 그렇게 날아갔다.
    """
    pv = Vector(pivot)
    m = Matrix.Rotation(angle_z, 4, "Z") @ Matrix.Rotation(angle_y, 4, "Y")
    for v in ob.data.vertices:
        v.co = pv + m @ (v.co - pv)
    ob.data.update()
    return ob


def cyl(name, centre, radius, height, key, axis="Z", seg=16, bevel=0.006):
    cx, cy, cz = centre
    verts, faces = [], []
    for sgn in (-1, 1):
        for i in range(seg):
            a = 2 * math.pi * i / seg
            u, v = radius * math.cos(a), radius * math.sin(a)
            h = sgn * height / 2
            if axis == "Z":
                verts.append((cx + u, cy + v, cz + h))
            elif axis == "Y":
                verts.append((cx + u, cy + h, cz + v))
            else:
                verts.append((cx + h, cy + u, cz + v))
    for i in range(seg):
        j = (i + 1) % seg
        faces.append((i, j, seg + j, seg + i))
    faces.append(tuple(range(seg - 1, -1, -1)))
    faces.append(tuple(range(seg, seg * 2)))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.validate(); me.update()
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(material(key))
    _collection().objects.link(ob)
    if bevel:
        m = ob.modifiers.new("Bevel", "BEVEL")
        m.width = bevel
        m.segments = 2
        m.limit_method = "ANGLE"
    return ob


# ── 디오라마 ────────────────────────────────────────────────────────────
def clear():
    coll = bpy.data.collections.get(COLL)
    if coll is not None:
        for ob in list(coll.objects):
            bpy.data.objects.remove(ob, do_unlink=True)
    for me in list(bpy.data.meshes):
        if me.users == 0:
            bpy.data.meshes.remove(me)


def build(hand_z=0.396, hand_y=-0.28, figure_h=1.10):
    """앉은 캐릭터를 원점에 두고 그 둘레에 사무실을 짓는다.

    `hand_z` 는 **측정값**이다(손 아랫면 높이). 책상 상판을 그 바로 아래에 놓아야
    타자 치는 자세가 책상과 맞는다 — 눈대중하면 손이 상판을 뚫거나 공중에 뜬다.

    캐릭터는 -Y(앞)를 본다. 카메라도 앞쪽에서 살짝 내려다본다. 그래서 책상은
    캐릭터와 카메라 사이에 있고, 모니터는 옆으로 틀어 얼굴을 가리지 않게 한다.
    """
    clear()
    top_z = hand_z - 0.012            # 상판 윗면. 키보드 두께만큼 내린다
    desk_t = 0.030
    desk_y0, desk_y1 = -0.80, -0.10   # 앞 모서리 ~ 캐릭터 쪽 모서리
    desk_w = 1.52                     # 좁혀야 캐릭터가 주인공으로 보인다

    # 바닥과 뒷벽 — 배경이 있어야 떠 있지 않다
    box("floor", (0, -0.1, -0.02), (3.6, 3.0, 0.04), "floor", bevel=0)
    box("wall", (0, 1.30, 0.70), (3.6, 0.06, 1.44), "wall", bevel=0)

    # 파티션 — 캐릭터 뒤
    box("panel", (0, 0.50, 0.40), (1.86, 0.05, 0.80), "panel", bevel=0.01)
    box("panel_in", (0, 0.47, 0.44), (1.66, 0.02, 0.58), "panel_in", bevel=0.008)

    # 책상
    cy = (desk_y0 + desk_y1) / 2
    dy = desk_y1 - desk_y0
    box("desk_top", (0, cy, top_z - desk_t / 2), (desk_w, dy, desk_t), "desk_top")
    # 다리 넷. 통짜 앞판을 대면 캐비닛처럼 보이고, 아래가 트여야 의자가 보인다.
    leg_h = top_z - desk_t
    for sx in (-1, 1):
        for sy, py in ((-1, desk_y0 + 0.07), (1, desk_y1 - 0.07)):
            box("desk_leg_%d_%d" % (sx, sy),
                (sx * (desk_w / 2 - 0.06), py, leg_h / 2),
                (0.055, 0.055, leg_h), "desk_leg", bevel=0.008)
    # 가로대 — 다리를 묶어 준다
    for sx in (-1, 1):
        box("desk_rail_%d" % sx, (sx * (desk_w / 2 - 0.06), cy, leg_h * 0.30),
            (0.04, dy * 0.80, 0.035), "desk_leg", bevel=0.006)

    # 키보드와 마우스 — 손 바로 아래
    box("keyboard", (0, hand_y, top_z + 0.008), (0.46, 0.17, 0.016), "key", bevel=0.005)
    for i in range(4):
        box("key_row_%d" % i, (0, hand_y - 0.06 + i * 0.04, top_z + 0.018),
            (0.42, 0.025, 0.004), "monitor", bevel=0)
    cyl("mouse", (0.34, hand_y + 0.01, top_z + 0.012), 0.035, 0.024, "key", axis="Z")

    # 모니터 — 얼굴을 가리지 않게 옆으로 튼다
    mon = []
    mon.append(box("mon_base", (-0.60, -0.42, top_z + 0.012), (0.20, 0.13, 0.024), "metal"))
    mon.append(box("mon_stem", (-0.60, -0.40, top_z + 0.10), (0.04, 0.04, 0.18), "metal"))
    mon.append(box("mon_body", (-0.60, -0.38, top_z + 0.30), (0.52, 0.035, 0.34), "monitor"))
    mon.append(box("mon_screen", (-0.60, -0.40, top_z + 0.31), (0.47, 0.006, 0.29), "screen"))
    mon.append(box("mon_bar1", (-0.70, -0.41, top_z + 0.40), (0.22, 0.004, 0.035), "screen_bar"))
    mon.append(box("mon_bar2", (-0.72, -0.41, top_z + 0.33), (0.18, 0.004, 0.025), "card_lite"))
    mon.append(box("mon_bar3", (-0.74, -0.41, top_z + 0.27), (0.14, 0.004, 0.025), "card_lite"))
    for ob in mon:
        spin(ob, (-0.60, -0.40, 0), math.radians(26))

    # 서류함
    box("tray", (0.70, -0.30, top_z + 0.05), (0.30, 0.22, 0.10), "tray")
    box("tray_lip", (0.70, -0.41, top_z + 0.11), (0.30, 0.012, 0.06), "tray_dark", bevel=0.004)

    # 화분 — 바닥, 책상 옆
    cyl("pot", (1.16, -0.40, 0.09), 0.10, 0.18, "pot", axis="Z")
    cyl("stem", (1.16, -0.40, 0.30), 0.012, 0.26, "leaf", axis="Z", bevel=0)
    for i, (a, h, r) in enumerate([(20, 0.30, 0.10), (140, 0.34, 0.09), (260, 0.38, 0.08),
                                   (80, 0.42, 0.07), (200, 0.45, 0.06)]):
        ar = math.radians(a)
        cx, cy = 1.16 + math.cos(ar) * r, -0.40 + math.sin(ar) * r
        leaf = box("leaf_%d" % i, (cx, cy, h), (0.13, 0.07, 0.016), "leaf", bevel=0.006)
        spin(leaf, (cx, cy, h), ar, math.radians(-18))

    # 떠 있는 말풍선 카드 — 레퍼런스의 'Intelligent office' 자리
    card = box("card_a", (-0.72, 0.30, 1.16), (0.54, 0.03, 0.22), "card")
    spin(card, (-0.72, 0.30, 1.16), math.radians(-6))
    box("card_a_l1", (-0.80, 0.27, 1.21), (0.30, 0.004, 0.035), "screen")
    box("card_a_l2", (-0.84, 0.27, 1.13), (0.22, 0.004, 0.028), "card_lite")
    card_b = box("card_b", (0.66, 0.26, 1.02), (0.40, 0.03, 0.17), "card_lite")
    spin(card_b, (0.66, 0.26, 1.02), math.radians(7))
    for i, (dx, h) in enumerate([(-0.10, 0.05), (-0.03, 0.09), (0.04, 0.07), (0.11, 0.11)]):
        box("card_b_bar_%d" % i, (0.66 + dx, 0.24, 0.975 + h / 2),
            (0.035, 0.004, h), "card", bevel=0)

    n = len(_collection().objects)
    print("office: %d objects, desk top z=%.3f" % (n, top_z))
    return top_z
