
import geopandas as gpd
import re
from pathlib import Path

input_file = Path("sawah_surabaya.geojson")
output_dir = Path("output_sawah")
output_dir.mkdir(exist_ok=True)

if not input_file.exists():
    raise FileNotFoundError(f"File tidak ditemukan: {input_file}")

gdf = gpd.read_file(input_file)

gdf = gdf[
    gdf.geometry.notna()
    & gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])
].head(50).copy()

if gdf.empty:
    raise ValueError("Tidak ditemukan poligon sawah.")

if gdf.crs is None:
    raise ValueError("CRS tidak diketahui pada GeoJSON.")

# Nama kolom maksimal 10 karakter
used_names = set()
columns = []

for column in gdf.columns:
    name = re.sub(r"[^A-Za-z0-9_]", "_", str(column))[:10] or "field"
    original = name
    counter = 1

    while name.lower() in used_names:
        suffix = str(counter)
        name = original[:10 - len(suffix)] + suffix
        counter += 1

    used_names.add(name.lower())
    columns.append(name)

gdf.columns = columns
gdf = gdf.to_crs("EPSG:4326")

output_file = output_dir / "sawah_surabaya.shp"

gdf.to_file(
    output_file,
    driver="ESRI Shapefile",
    encoding="UTF-8",
    index=False
)

print("Konversi berhasil!")
print("Jumlah poligon:", len(gdf))
print("Lokasi:", output_file.resolve())
print("CRS:", gdf.crs)
