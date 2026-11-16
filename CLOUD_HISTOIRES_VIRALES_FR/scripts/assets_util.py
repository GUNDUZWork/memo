"""Petit utilitaire : enregistre la SOURCE de chaque image dans ai_assets/_sources.json."""
import json
import os


def mark(assets_dir, names, source):
    path = os.path.join(assets_dir, "_sources.json")
    try:
        data = json.load(open(path, encoding="utf-8"))
    except Exception:
        data = {}
    for n in names:
        data[n] = source
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1, sort_keys=True)
    os.replace(tmp, path)


if __name__ == "__main__":  # python assets_util.py <assets_dir> <source> <name>...
    import sys
    mark(sys.argv[1], sys.argv[3:], sys.argv[2])
