"""BLACKOUT land-dot preprocessing.

Fetches world-atlas land 110m TopoJSON (derived from Natural Earth, public
domain; world-atlas is ISC licensed) and samples a deterministic set of
surface dots for the dotted-globe render. Falls back to a procedural
graticule-only file when offline.

Output: src/data/landDots.json -> {"dots": [[lon, lat], ...], "source": ...}
Manifest entry belongs in docs/DATA_SOURCES.md.
"""
from __future__ import annotations

import json
import math
import random
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "data" / "landDots.json"
URLS = [
    "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json",
    "https://unpkg.com/world-atlas@2/land-110m.json",
]


def fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "BLACKOUT-data-build/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def ring_area(ring) -> float:
    s = 0.0
    for i in range(len(ring) - 1):
        s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][0]
    return abs(s) / 2.0


def sample_geom(geoms: list, count: int, seed: int) -> list:
    rnd = random.Random(seed)
    # Weight rings by planar area so big landmasses get proportional dots.
    weighted: list[tuple[float, list]] = []
    for g in geoms:
        if g["type"] == "Polygon":
            for ring in g["coordinates"]:
                weighted.append((ring_area(ring), ring))
        elif g["type"] == "MultiPolygon":
            for poly in g["coordinates"]:
                for ring in poly:
                    weighted.append((ring_area(ring), ring))
    total = sum(w for w, _ in weighted) or 1.0
    dots: list[list[float]] = []
    for w, ring in weighted:
        n = max(1, round(count * w / total))
        for _ in range(n):
            i = rnd.randrange(len(ring) - 1)
            a = ring[i]
            b = ring[(i + 1) % (len(ring) - 1)]
            f = rnd.random()
            lon = a[0] + (b[0] - a[0]) * f
            lat = a[1] + (b[1] - a[1]) * f
            lat = max(-84.0, min(84.0, lat))
            dots.append([round(lon, 2), round(lat, 2)])
    rnd.shuffle(dots)
    return dots[:count]


def topo_to_geoms(topo: dict) -> list:
    # Minimal TopoJSON decoder: transform + arcs, no quantization surprises.
    tf = topo.get("transform")
    scale = tf["scale"] if tf else [1.0, 1.0]
    trans = tf["translate"] if tf else [0.0, 0.0]
    arcs = topo["arcs"]

    def point(p):
        return [p[0] * scale[0] + trans[0], p[1] * scale[1] + trans[1]]

    def arc(i: int):
        idx = i if i >= 0 else ~i
        pts = []
        x = y = 0
        for dx, dy in arcs[idx]:
            x += dx
            y += dy
            pts.append(point([x, y]))
        return pts if i >= 0 else pts[::-1]

    geoms = []
    for obj in topo["objects"].values():
        for geom in obj["geometries"]:
            t = geom["type"]
            a = geom["arcs"]
            if t == "Polygon":
                geoms.append({"type": t, "coordinates": [[p for j in ring for p in arc(j)] for ring in a]})
            elif t == "MultiPolygon":
                geoms.append(
                    {
                        "type": t,
                        "coordinates": [
                            [[p for j in ring for p in arc(j)] for ring in poly] for poly in a
                        ],
                    }
                )
    return geoms


def main() -> int:
    topo = None
    used = None
    for url in URLS:
        try:
            topo = fetch(url)
            used = url
            break
        except Exception as e:  # noqa: BLE001 - offline fallback below
            print(f"fetch failed ({url}): {e}")
    if topo is None:
        print("OFFLINE: writing empty dot set (graticule-only fallback).")
        OUT.parent.mkdir(parents=True, exist_ok=True)
        OUT.write_text(json.dumps({"dots": [], "source": "offline-fallback-graticule", "count": 0}))
        return 0
    geoms = topo_to_geoms(topo)
    dots = sample_geom(geoms, 5200, seed=20261006)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "dots": dots,
                "count": len(dots),
                "source": used,
                "license": "Natural Earth (public domain) via world-atlas@2 (ISC). See docs/DATA_SOURCES.md.",
            }
        )
    )
    print(f"wrote {OUT} with {len(dots)} dots from {used}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
