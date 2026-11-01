"""Plaza tools for Blender: make a model for Plaza and send it to the game.

One collection = one model. A collection named after a swappable object
(`bench`, `lamp`, `desk`... see public/models/README.md) becomes
public/models/<name>.glb and is listed in public/models/manifest.json, so it
replaces the code-built object everywhere in Plaza.

In Blender (Scripting tab -> Open -> tools/blender/plaza.py -> Run Script),
a "Plaza" tab appears in the 3D view's sidebar (press N):

  - Add starter: a collection blocked out from the shapes Plaza draws in
    code, at the right scale and facing. Start from these.
  - Export to Plaza: exports the active collection (the one holding the
    selected object) and lists it in the manifest. Reload Plaza to see it.

From a terminal, without opening Blender's window:

  blender --background --python tools/blender/plaza.py -- starter all --save starters.blend
  blender --background my-bench.blend --python tools/blender/plaza.py -- export bench

Conventions (the starters follow them):
  - 1 Blender unit = 1 meter.
  - The model's base stands on the ground at the world origin.
  - The front faces Blender's Front view (-Y), which is +z in Plaza.
  - Paint it the Plaza way: white or light gray surfaces with black ink
    detail lines, no shading (Plaza adds its own). Only the base color and
    the base color texture are kept; Plaza inks everything on load.
  - In a lamp, name the object that should light up at night `glow`.
"""
import json
import math
import os
import sys
from pathlib import Path

import bpy

STARTER_MATERIAL = 'Plaza white'


# ---------------------------------------------------------------- the repo
def repo_root():
    """The Plaza checkout this script lives in (or $PLAZA_REPO)."""
    candidates = [os.environ.get('PLAZA_REPO'), globals().get('__file__'), bpy.data.filepath]
    # run from Blender's text editor, __file__ is the text block; its filepath is the real file
    candidates += [bpy.path.abspath(t.filepath) for t in bpy.data.texts if t.filepath]
    for c in filter(None, candidates):
        for d in [Path(c).resolve(), *Path(c).resolve().parents]:
            if (d / 'public' / 'models').is_dir() and (d / 'package.json').is_file():
                return d
    raise RuntimeError('Plaza: can\'t find the Plaza folder. Open this script from the Plaza repo, '
                       'or set PLAZA_REPO to its path.')


def starters():
    return json.loads((repo_root() / 'tools' / 'blender' / 'starters.json').read_text())


# ---------------------------------------------------------------- axes
# Plaza (and glTF) is y-up with the front at +z; Blender is z-up. The glTF
# exporter turns Blender's (x, y, z) into (x, z, -y), so a Plaza point
# (x, y, z) lives at Blender (x, -z, y).
def to_blender(x, y, z):
    return (x, -z, y)


def starter_material():
    mat = bpy.data.materials.get(STARTER_MATERIAL)
    if not mat:
        mat = bpy.data.materials.new(STARTER_MATERIAL)
        mat.diffuse_color = (1, 1, 1, 1)
        if getattr(mat, 'use_nodes', True):
            mat.use_nodes = True
            bsdf = mat.node_tree.nodes.get('Principled BSDF')
            if bsdf:
                bsdf.inputs['Base Color'].default_value = (1, 1, 1, 1)
                bsdf.inputs['Roughness'].default_value = 1.0
    return mat


def box_mesh(name, w, h, d):
    """A box mesh w x h x d (Plaza's width, height, depth) centered on its origin."""
    sx, sy, sz = w / 2, d / 2, h / 2  # Plaza's depth runs along Blender's y, height along z
    verts = [(x * sx, y * sy, z * sz) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    return me


def add_starter(name):
    """Build the starter for `name` as a new collection, and return it."""
    parts = starters().get(name)
    if parts is None:
        raise ValueError(f'Plaza: no starter called "{name}". Known: {", ".join(sorted(starters()))}')
    if name in bpy.data.collections:
        raise ValueError(f'Plaza: there is already a collection called "{name}". Rename or delete it first.')
    col = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(col)
    mat = starter_material()
    for p in parts:
        me = box_mesh(p['name'], p['w'], p['h'], p['d'])
        me.materials.append(mat)
        ob = bpy.data.objects.new(p['name'], me)
        ob.location = to_blender(p['x'], p['y'], p['z'])
        rx, ry, rz = (math.radians(a) for a in (p.get('rot') or (0, 0, 0)))
        # a turn about Plaza's x stays about x, about y (up) is about Blender's z,
        # about z (front) is about Blender's -y
        ob.rotation_euler = (rx, -rz, ry)
        col.objects.link(ob)
    return col


# ---------------------------------------------------------------- export
def collection_objects(col):
    seen = []
    for ob in col.all_objects:
        if ob not in seen:
            seen.append(ob)
    return seen


def update_manifest(name, file):
    path = repo_root() / 'public' / 'models' / 'manifest.json'
    manifest = json.loads(path.read_text()) if path.exists() else {}
    models = manifest.setdefault('models', {})
    entry = models.get(name)
    if isinstance(entry, dict):
        entry['file'] = file      # keep its scale and rotateY
    else:
        models[name] = file
    path.write_text(json.dumps(manifest, indent=2) + '\n')


def export_collection(col, name=None):
    """Export `col` as public/models/<name>.glb and list it in the manifest."""
    name = name or col.name
    objects = collection_objects(col)
    if not objects:
        raise ValueError(f'Plaza: the collection "{col.name}" is empty.')
    out = repo_root() / 'public' / 'models' / f'{name}.glb'
    if bpy.context.object and bpy.context.object.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')
    previous = [o for o in bpy.context.view_layer.objects if o.select_get()]
    for o in previous:
        o.select_set(False)
    for o in objects:
        if o.name in bpy.context.view_layer.objects:
            o.select_set(True)
    try:
        bpy.ops.export_scene.gltf(
            filepath=str(out),
            export_format='GLB',
            use_selection=True,
            export_apply=True,     # modifiers applied, as you see them
            export_yup=True,       # Plaza is y-up
            export_cameras=False,
            export_lights=False,
            export_animations=False,
        )
    finally:
        for o in objects:
            if o.name in bpy.context.view_layer.objects:
                o.select_set(False)
        for o in previous:
            o.select_set(True)
    update_manifest(name, f'{name}.glb')
    return out


def active_collection():
    """The collection of the selected object, else the one active in the outliner."""
    ob = bpy.context.object
    if ob and ob.users_collection and ob.users_collection[0] is not bpy.context.scene.collection:
        return ob.users_collection[0]
    col = bpy.context.view_layer.active_layer_collection.collection
    return None if col is bpy.context.scene.collection else col


# ---------------------------------------------------------------- the sidebar
_items = []  # Blender needs these strings kept alive while the menu shows them


def starter_items(self, context):
    try:
        _items[:] = [(n, n, f'Add the {n} starter') for n in sorted(starters())]
    except Exception:  # noqa: BLE001 - no repo found: show nothing to pick
        _items[:] = []
    return _items


class PLAZA_OT_add_starter(bpy.types.Operator):
    """Add a starter model, blocked out from the shapes Plaza draws in code"""
    bl_idname = 'plaza.add_starter'
    bl_label = 'Add starter'
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        name = context.scene.plaza_starter
        try:
            add_starter(name)
        except (ValueError, RuntimeError) as e:
            self.report({'ERROR'}, str(e))
            return {'CANCELLED'}
        self.report({'INFO'}, f'Plaza: added the {name} starter')
        return {'FINISHED'}


class PLAZA_OT_export(bpy.types.Operator):
    """Export the selected object's collection to Plaza (public/models) and list it in the manifest"""
    bl_idname = 'plaza.export'
    bl_label = 'Export to Plaza'

    def execute(self, context):
        col = active_collection()
        if not col:
            self.report({'ERROR'}, 'Plaza: select an object in the collection to export')
            return {'CANCELLED'}
        try:
            out = export_collection(col)
        except (ValueError, RuntimeError) as e:
            self.report({'ERROR'}, str(e))
            return {'CANCELLED'}
        self.report({'INFO'}, f'Plaza: exported {col.name} to {out}. Reload Plaza to see it.')
        return {'FINISHED'}


class PLAZA_PT_panel(bpy.types.Panel):
    bl_label = 'Plaza'
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Plaza'

    def draw(self, context):
        layout = self.layout
        layout.prop(context.scene, 'plaza_starter', text='')
        layout.operator(PLAZA_OT_add_starter.bl_idname, icon='MESH_CUBE')
        layout.separator()
        col = active_collection()
        layout.label(text=f'Model: {col.name}' if col else 'Select a model\'s object')
        row = layout.row()
        row.enabled = bool(col)
        row.operator(PLAZA_OT_export.bl_idname, icon='EXPORT')


CLASSES = (PLAZA_OT_add_starter, PLAZA_OT_export, PLAZA_PT_panel)


def register():
    bpy.types.Scene.plaza_starter = bpy.props.EnumProperty(name='Starter', items=starter_items)
    for c in CLASSES:
        bpy.utils.register_class(c)


def unregister():
    for c in reversed(CLASSES):
        bpy.utils.unregister_class(c)
    del bpy.types.Scene.plaza_starter


# ---------------------------------------------------------------- command line
def cli(args):
    """`starter <name>... [--save file.blend]`, `starter all`, or `export [<name>...]`."""
    if not args:
        print(__doc__)
        return
    save = None
    if '--save' in args:
        i = args.index('--save')
        save, args = args[i + 1], args[:i] + args[i + 2:]
    cmd, names = args[0], args[1:]
    if cmd == 'starter':
        for n in (sorted(starters()) if names == ['all'] else names):
            add_starter(n)
            print(f'Plaza: added the {n} starter')
        if save or bpy.data.filepath:
            bpy.ops.wm.save_as_mainfile(filepath=str(Path(save).resolve())) if save else bpy.ops.wm.save_mainfile()
            print(f'Plaza: saved {bpy.data.filepath}')
    elif cmd == 'export':
        for n in names or [c.name for c in bpy.data.collections if c.name in starters()]:
            col = bpy.data.collections.get(n)
            if not col:
                raise SystemExit(f'Plaza: no collection called "{n}"')
            print(f'Plaza: exported {n} to {export_collection(col)}')
    else:
        raise SystemExit(f'Plaza: unknown command "{cmd}". Use starter or export.')


if __name__ == '__main__':
    if '--' in sys.argv:
        cli(sys.argv[sys.argv.index('--') + 1:])
    else:
        try:
            unregister()  # running it again in the same session replaces the old panel
        except Exception:  # noqa: BLE001 - nothing registered yet
            pass
        register()
