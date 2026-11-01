"""The plaza cat: a rigged, animated model built from code.

Builds a collection `cat` (a mesh skinned to a small armature) and its clips
(idle, walk, trot, sit, groom, nap) as NLA tracks, then exports it to
public/models/cat.glb and lists it in the manifest. Run it again to rebuild
everything from scratch; edit the numbers here rather than the .blend.

Blocky, like the code-built cat and the Blockbench props: white boxes, with
the markings as thin dark boxes.

  In Blender: Scripting -> Open -> tools/blender/cat.py -> Run Script
  From a terminal:
    blender --background --python tools/blender/cat.py

Axes: Blender is z-up and the cat faces +X with its left side at +Y. On export
that becomes Plaza's +x forward, +y up (the code-built cat faces +x too).
Clips are keyed every 2 frames at 24 fps: Plaza plays them on its 12 fps
drawing clock, so each key is one drawing.
"""
import math
import os
import sys
from pathlib import Path

import bpy
import bmesh
from mathutils import Euler, Matrix, Quaternion, Vector

NAME = 'cat'
FPS = 24
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))


def repo_root():
    for c in filter(None, [os.environ.get('PLAZA_REPO'), globals().get('__file__')]):
        for d in [Path(c).resolve(), *Path(c).resolve().parents]:
            if (d / 'public' / 'models').is_dir() and (d / 'package.json').is_file():
                return d
    raise RuntimeError('Plaza: run this from the Plaza repo, or set PLAZA_REPO.')


# ---------------------------------------------------------------- materials
def material(name, rgb):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*rgb, 1)
    bsdf.inputs['Roughness'].default_value = 1
    m.diffuse_color = (*rgb, 1)
    return m


# ---------------------------------------------------------------- the skeleton
# name: (head, tail, parent). Legs point down, the spine and head forward.
BONES = {
    'root': ((0, 0, 0), (0, 0, 0.06), None),
    'hips': ((-0.13, 0, 0.2), (-0.02, 0, 0.2), 'root'),
    'chest': ((-0.02, 0, 0.2), (0.16, 0, 0.21), 'hips'),
    'neck': ((0.16, 0, 0.24), (0.2, 0, 0.29), 'chest'),
    'head': ((0.2, 0, 0.29), (0.38, 0, 0.31), 'neck'),
    'eyes': ((0.382, 0, 0.36), (0.382, 0, 0.39), 'head'),   # points up, so scaling its y closes the eyes
    'tail1': ((-0.23, 0, 0.26), (-0.31, 0, 0.30), 'hips'),
    'tail2': ((-0.31, 0, 0.30), (-0.36, 0, 0.38), 'tail1'),
    'tail3': ((-0.36, 0, 0.38), (-0.38, 0, 0.47), 'tail2'),
    'tail4': ((-0.38, 0, 0.47), (-0.36, 0, 0.55), 'tail3'),
}
for side, y in (('L', 1), ('R', -1)):
    BONES[f'ear.{side}'] = ((0.25, 0.07 * y, 0.43), (0.25, 0.07 * y, 0.5), 'head')
    BONES[f'arm.{side}'] = ((0.13, 0.062 * y, 0.2), (0.13, 0.062 * y, 0.11), 'chest')
    BONES[f'forearm.{side}'] = ((0.13, 0.062 * y, 0.11), (0.13, 0.062 * y, 0.01), f'arm.{side}')
    BONES[f'thigh.{side}'] = ((-0.15, 0.065 * y, 0.2), (-0.15, 0.065 * y, 0.11), 'hips')
    BONES[f'shin.{side}'] = ((-0.15, 0.065 * y, 0.11), (-0.16, 0.065 * y, 0.01), f'thigh.{side}')
TAIL = ['tail1', 'tail2', 'tail3', 'tail4']


# ---------------------------------------------------------------- the body
# Blocks, like the code-built cat and the Blockbench props: white boxes with
# the markings (eyes, nose, inner ears, stripes, tail tip) as thin dark boxes,
# each box bound whole to one bone.
def part(col, name, mat, bone, build):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    build(bm)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    ob.vertex_groups.new(name=bone).add(range(len(me.vertices)), 1.0, 'REPLACE')
    return ob


def box(center, size, rot=(0, 0, 0)):
    def build(bm):
        bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.scale(bm, vec=size, verts=bm.verts)
        bmesh.ops.rotate(bm, matrix=Euler(rot).to_matrix(), verts=bm.verts)
        bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    return build


def beam(a, b, width, overlap=0.012):
    """A square box from a to b (a tail segment), a little longer so the joints don't gap."""
    a, b = Vector(a), Vector(b)
    d = b - a

    def build(bm):
        bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.scale(bm, vec=(width, width, d.length + overlap), verts=bm.verts)
        bmesh.ops.rotate(bm, matrix=d.to_track_quat('Z', 'X').to_matrix(), verts=bm.verts)
        bmesh.ops.translate(bm, vec=(a + b) / 2, verts=bm.verts)
    return build


def build():
    clear()
    col = bpy.data.collections.new(NAME)
    bpy.context.scene.collection.children.link(col)
    white = material('Plaza white', (1, 1, 1))
    dark = material('Plaza dark', (0.042, 0.042, 0.042))   # #3a3a3a, the folks' hats

    # the armature
    arm = bpy.data.armatures.new('cat_rig')
    rig = bpy.data.objects.new('cat_rig', arm)
    col.objects.link(rig)
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    for name, (h, t, parent) in BONES.items():
        b = arm.edit_bones.new(name)
        b.head, b.tail, b.roll = h, t, 0
    for name, (h, t, parent) in BONES.items():
        if parent:
            b = arm.edit_bones[name]
            b.parent = arm.edit_bones[parent]
            b.use_connect = Vector(arm.edit_bones[parent].tail) == Vector(h)
    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'

    parts = [
        part(col, 'hips', white, 'hips', box((-0.125, 0, 0.2), (0.21, 0.2, 0.18))),
        part(col, 'chest', white, 'chest', box((0.085, 0, 0.205), (0.21, 0.2, 0.18))),
        part(col, 'head', white, 'head', box((0.27, 0, 0.345), (0.22, 0.22, 0.19))),
        part(col, 'muzzle', white, 'head', box((0.395, 0, 0.3), (0.05, 0.1, 0.06))),
        part(col, 'nose', dark, 'head', box((0.421, 0, 0.322), (0.008, 0.036, 0.02))),
        part(col, 'mouth', dark, 'head', box((0.421, 0, 0.292), (0.008, 0.012, 0.03))),
        # tabby stripes over the back and an M on the forehead
        part(col, 'stripe1', dark, 'hips', box((-0.19, 0, 0.292), (0.026, 0.204, 0.008))),
        part(col, 'stripe2', dark, 'hips', box((-0.1, 0, 0.292), (0.026, 0.204, 0.008))),
        part(col, 'stripe3', dark, 'chest', box((0.03, 0, 0.297), (0.026, 0.204, 0.008))),
        part(col, 'brow', dark, 'head', box((0.32, 0, 0.441), (0.06, 0.02, 0.008))),
        part(col, 'tail_tip', dark, 'tail4', beam(BONES['tail4'][1], Vector(BONES['tail4'][1]) + Vector((0.01, 0, 0.05)), 0.05)),
    ]
    for i, b in enumerate(TAIL):
        parts.append(part(col, b, white, b, beam(BONES[b][0], BONES[b][1], 0.048 - 0.003 * i)))
    for side, y in (('L', 1), ('R', -1)):
        parts += [
            part(col, f'eye.{side}', dark, 'eyes', box((0.381, 0.055 * y, 0.36), (0.008, 0.035, 0.045))),
            part(col, f'ear.{side}', white, f'ear.{side}', box((0.25, 0.07 * y, 0.465), (0.045, 0.065, 0.07))),
            part(col, f'inner_ear.{side}', dark, f'ear.{side}', box((0.273, 0.07 * y, 0.46), (0.006, 0.035, 0.045))),
            part(col, f'cheek.{side}', dark, 'head', box((0.37, 0.111 * y, 0.31), (0.03, 0.006, 0.012))),  # a whisker mark
            part(col, f'arm.{side}', white, f'arm.{side}', box((0.13, 0.062 * y, 0.16), (0.065, 0.065, 0.11))),
            part(col, f'forearm.{side}', white, f'forearm.{side}', box((0.13, 0.062 * y, 0.055), (0.058, 0.058, 0.11))),
            part(col, f'paw.f.{side}', white, f'forearm.{side}', box((0.142, 0.062 * y, 0.016), (0.075, 0.066, 0.032))),
            part(col, f'thigh.{side}', white, f'thigh.{side}', box((-0.15, 0.067 * y, 0.16), (0.09, 0.068, 0.12))),
            part(col, f'shin.{side}', white, f'shin.{side}', box((-0.155, 0.065 * y, 0.055), (0.058, 0.058, 0.11))),
            part(col, f'paw.b.{side}', white, f'shin.{side}', box((-0.143, 0.065 * y, 0.016), (0.075, 0.066, 0.032))),
        ]

    # one skinned mesh
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    body = bpy.context.view_layer.objects.active
    body.name = body.data.name = 'cat_body'
    body.parent = rig
    body.modifiers.new('Armature', 'ARMATURE').object = rig
    return rig


def clear():
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    col = bpy.data.collections.get(NAME)
    if col:
        for o in list(col.all_objects):
            bpy.data.objects.remove(o, do_unlink=True)
        bpy.data.collections.remove(col)
    for a in [a for a in bpy.data.actions if a.name.startswith('cat_')]:
        bpy.data.actions.remove(a)
    for coll in (bpy.data.meshes, bpy.data.armatures):
        for d in [d for d in coll if d.users == 0]:
            coll.remove(d)


# ---------------------------------------------------------------- previews
def preview(path, views=('side', 'front', 'top3'), size=420):
    """Render the cat as it stands now from a few angles, side by side files
    named <path>-<view>.png (Workbench, so it's quick)."""
    scene = bpy.context.scene
    cam = bpy.data.objects.get('cat_cam')
    if not cam:
        cam = bpy.data.objects.new('cat_cam', bpy.data.cameras.new('cat_cam'))
        scene.collection.objects.link(cam)
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = 0.95
    scene.camera = cam
    scene.render.engine = 'BLENDER_WORKBENCH'
    shading = scene.display.shading
    shading.light, shading.color_type = 'STUDIO', 'MATERIAL'
    shading.show_object_outline = True
    shading.show_cavity = False
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.film_transparent = False
    target = Vector((0, 0, 0.25))
    spots = {
        'side': Vector((0, -3, 0.25)),            # from the cat's right
        'front': Vector((3, 0, 0.3)),
        'top3': Vector((1.6, -2.2, 1.6)),
        'top': Vector((0.001, 0, 3)),
    }
    out = []
    for v in views:
        cam.location = spots[v]
        cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()
        scene.render.filepath = f'{path}-{v}.png'
        bpy.ops.render.render(write_still=True)
        out.append(scene.render.filepath)
    return out


# ---------------------------------------------------------------- posing
# A pose maps bone names to rotations about the rest pose's axes (relative to
# the parent, like any FK rig), plus an optional location and scale.
#   pitch: about Y. Positive tips a forward bone's front down, swings a
#          down-pointing leg's foot back and lifts a backward-pointing tail.
#   yaw:   about Z. Positive turns toward the cat's left (+Y).
#   roll:  about X. Positive tilts the left side down.
class Pose(dict):
    def rot(self, b, axis, a):
        self.setdefault(b, {}).setdefault('r', []).append((axis, a))
        return self

    def pitch(self, b, a): return self.rot(b, Y, a)
    def yaw(self, b, a): return self.rot(b, Z, a)
    def roll(self, b, a): return self.rot(b, X, a)
    def side(self, b, a): return self.rot(b, 'side', a)   # bend toward the left (+Y) whichever way the bone points

    def loc(self, b, v):
        self.setdefault(b, {})['l'] = v
        return self

    def scale(self, b, s):
        self.setdefault(b, {})['s'] = s
        return self

    def both(self, fn, *args):
        for side in 'LR':
            fn(side, *args)
        return self


def apply_pose(rig, pose):
    for pb in rig.pose.bones:
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
    for name, spec in pose.items():
        pb = rig.pose.bones[name]
        rest = pb.bone.matrix_local.to_3x3().inverted()
        q = Quaternion()
        for axis, a in spec.get('r', ()):
            if axis == 'side':
                axis = (pb.bone.tail_local - pb.bone.head_local).normalized().cross(Y)
            q = q @ Quaternion((rest @ axis).normalized(), a)
        pb.rotation_quaternion = q
        if 'l' in spec:
            pb.location = rest @ Vector(spec['l'])
        if 's' in spec:
            pb.scale = spec['s']


def smooth(s):
    return s * s * (3 - 2 * s)


def wave(t, cycles=1, offset=0.0):
    return math.sin(2 * math.pi * (t * cycles + offset))


def leg(P, upper, lower, phase, reach, lift, duty):
    """One leg's step: planted and sliding back for `duty` of the cycle, then
    lifted and swung forward."""
    phase %= 1
    if phase < duty:
        swing, up = reach * (1 - 2 * phase / duty), 0
    else:
        s = (phase - duty) / (1 - duty)
        swing, up = reach * (-1 + 2 * smooth(s)), math.sin(math.pi * s)
    P.pitch(upper, -swing)
    P.pitch(lower, up * lift)


def tail_sway(P, t, amount, cycles=1, lag=0.12):
    for i, b in enumerate(TAIL):
        P.side(b, amount * (0.7 + 0.15 * i) * wave(t, cycles, -lag * i))


# ---------------------------------------------------------------- the clips
# Each is (frames at 24 fps, fn(t, k)) where t runs 0..1 over the clip and k
# counts drawings. Looping clips end where they start.
def sit_base(P):
    # upright on the haunches, front legs straight, the tail wrapped round to the right
    P.loc('hips', (0, 0, -0.13)).pitch('hips', -0.75)
    P.pitch('chest', 0.1).pitch('neck', 0.25).pitch('head', 0.4)
    P.both(lambda s: P.pitch(f'arm.{s}', 0.68).pitch(f'forearm.{s}', -0.03))
    P.both(lambda s: P.pitch(f'thigh.{s}', -0.7).pitch(f'shin.{s}', 1.75))
    P.pitch('tail1', -1.0).side('tail1', -0.5).side('tail2', -1.0).side('tail3', -1.0).side('tail4', -0.8)
    P.pitch('tail2', -0.3).pitch('tail3', -0.4).pitch('tail4', -0.3)
    return P


def blink(P, k, at):
    if k in at:
        P.scale('eyes', (1, 0.15, 1))


def idle(t, k):
    P = Pose()
    P.loc('chest', (0, 0, 0.004 * wave(t)))
    tail_sway(P, t, 0.22)
    turn = 0.35 if 9 <= k <= 17 else 0
    P.yaw('head', turn).yaw('neck', turn * 0.4)
    if k in (5, 6):
        P.roll('ear.L', -0.45)
    blink(P, k, (20,))
    return P


def walk(t, k):
    # a lateral walk: left hind, left fore, right hind, right fore
    P = Pose()
    for side, off in (('L', 0), ('R', 0.5)):
        leg(P, f'thigh.{side}', f'shin.{side}', t + off, 0.42, 0.75, 0.6)
        leg(P, f'arm.{side}', f'forearm.{side}', t + off + 0.25, 0.42, 0.85, 0.6)
    P.loc('hips', (0, 0, 0.006 * wave(t, 2)))
    P.roll('hips', 0.05 * wave(t)).roll('chest', -0.08 * wave(t))
    P.pitch('head', 0.04 * wave(t, 2, 0.25))
    P.pitch('tail1', -0.1)
    tail_sway(P, t, 0.1)
    return P


def trot(t, k):
    # diagonal pairs: left fore with right hind, then right fore with left hind
    P = Pose()
    for side, off in (('L', 0), ('R', 0.5)):
        other = 'R' if side == 'L' else 'L'
        leg(P, f'arm.{side}', f'forearm.{side}', t + off, 0.55, 1.1, 0.45)
        leg(P, f'thigh.{other}', f'shin.{other}', t + off, 0.55, 1.0, 0.45)
    P.loc('hips', (0, 0, 0.012 * wave(t, 2, 0.25)))
    P.pitch('chest', 0.04 * wave(t, 2))
    P.pitch('head', -0.06 * wave(t, 2))
    P.pitch('tail1', 0.15)
    tail_sway(P, t, 0.12, lag=0.2)
    return P


def sit(t, k):
    P = sit_base(Pose())
    P.loc('chest', (0, 0, 0.004 * wave(t)))
    if k in (7, 8, 9):
        P.yaw('tail4', 0.5 if k == 8 else 0.25)           # the tip of the tail flicks
    turn = -0.4 if 13 <= k <= 19 else 0
    P.yaw('head', turn)
    if k in (16, 17):
        P.roll('ear.R', 0.45)
    blink(P, k, (3, 21))
    return P


def groom(t, k):
    # sitting, licking the raised right paw
    P = sit_base(Pose())
    lick = k % 2
    P.rot('arm.R', Y, -1.9).rot('forearm.R', Y, 0.9 + 0.15 * lick).roll('arm.R', 0.25)
    P.pitch('head', 0.55 + 0.14 * lick).yaw('head', -0.35).roll('head', -0.2)
    P.pitch('neck', 0.2)
    blink(P, k, (0, 1, 2, 3, 12, 13, 14, 15))   # eyes half shut while licking
    return P


def nap(t, k):
    # curled up asleep, breathing slowly
    P = Pose()
    P.loc('root', (0, 0, -0.115))
    P.both(lambda s: P.pitch(f'arm.{s}', 1.4).pitch(f'forearm.{s}', -2.6))
    P.both(lambda s: P.pitch(f'thigh.{s}', -1.2).pitch(f'shin.{s}', 2.4))
    # curled into a C: head round to the right, chin down on the paws, the
    # tail round the same way to meet it
    P.yaw('chest', -0.2).pitch('neck', 0.75).yaw('neck', -0.35).pitch('head', -0.3).roll('head', -0.15)
    P.pitch('tail1', -1.1).side('tail1', -0.5).side('tail2', -1.1).side('tail3', -1.1).side('tail4', -0.9)
    P.pitch('tail2', -0.5).pitch('tail3', -0.5).pitch('tail4', -0.3)
    P.loc('chest', (0, 0, 0.006 * wave(t)))
    P.scale('eyes', (1, 0.12, 1))
    if k in (20, 21):
        P.roll('ear.L', -0.4)
    return P


CLIPS = {
    'idle': (48, idle),
    'walk': (18, walk),
    'trot': (12, trot),
    'sit': (48, sit),
    'groom': (48, groom),
    'nap': (72, nap),
}


def bake(rig, name, frames, fn, step=2):
    """Key a clip every `step` frames into its own action, on an NLA track."""
    ad = rig.animation_data or rig.animation_data_create()
    ad.action = None
    for f in range(0, frames + 1, step):
        apply_pose(rig, fn(f / frames, f // step))
        for pb in rig.pose.bones:
            for path in ('rotation_quaternion', 'location', 'scale'):
                pb.keyframe_insert(path, frame=f, group=pb.name)
    act = ad.action
    act.name = f'cat_{name}'
    act.use_fake_user = True
    ad.action = None
    track = ad.nla_tracks.new()
    track.name = name
    track.strips.new(name, 0, act)
    track.mute = True


def animate(rig=None):
    rig = rig or bpy.data.objects['cat_rig']
    bpy.context.scene.render.fps = FPS
    for name, (frames, fn) in CLIPS.items():
        bake(rig, name, frames, fn)
    apply_pose(rig, {})


def show(clip, t=0.0):
    """Pose the rig at one moment of a clip (for looking at it)."""
    frames, fn = CLIPS[clip]
    apply_pose(bpy.data.objects['cat_rig'], fn(t, int(t * frames) // 2))


# ---------------------------------------------------------------- export
def update_manifest(name, file):
    import json
    path = repo_root() / 'public' / 'models' / 'manifest.json'
    manifest = json.loads(path.read_text()) if path.exists() else {}
    models = manifest.setdefault('models', {})
    entry = models.get(name)
    if isinstance(entry, dict):
        entry['file'] = file
    else:
        models[name] = file
    path.write_text(json.dumps(manifest, indent=2) + '\n')


def export():
    rig, body = bpy.data.objects['cat_rig'], bpy.data.objects['cat_body']
    apply_pose(rig, {})
    for o in bpy.context.view_layer.objects:
        o.select_set(False)
    rig.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = rig
    out = repo_root() / 'public' / 'models' / f'{NAME}.glb'
    bpy.ops.export_scene.gltf(
        filepath=str(out),
        export_format='GLB',
        use_selection=True,
        export_apply=False,
        export_yup=True,
        export_cameras=False,
        export_lights=False,
        export_animations=True,
        export_animation_mode='NLA_TRACKS',
        export_force_sampling=True,
        export_frame_step=2,
        export_def_bones=False,
        export_reset_pose_bones=True,
    )
    update_manifest(NAME, f'{NAME}.glb')
    return out


if __name__ == '__main__':
    build()
    animate()
    export()
