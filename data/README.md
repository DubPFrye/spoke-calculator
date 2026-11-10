# Hub and rim data (draft)

Research data for a future "pick your hub / pick your rim" feature. The calculator page does not
use it yet. Every row cites the page its numbers came from, and no value was estimated: a field
is `null` when no source stated it.

- `hubs.json`: 37 hub motors (16 geared, 21 direct drive)
- `rims.json`: 112 rims

## Confidence

Each row has a `confidence`:

- `high`: read directly from the manufacturer (spec page or drawing).
- `medium`: a retailer spec page, a Grin/ebikes.ca product page, a community ERD database, or a
  forum member's own measurement.
- `low`: seen only in a search-result excerpt, taken from a forum list or quote, or marked
  UNSURE in `notes`. Check these before relying on them.

## hubs.json

| field | meaning |
|---|---|
| `motor_type` | `geared` or `direct_drive` |
| `position` | `front`, `rear`, or `null` if the source didn't say |
| `old_mm` | over-locknut dimension (dropout width) |
| `flange_diameter_left_mm` / `_right_mm` | diameter of the spoke-hole circle (PCD), not the shell |
| `center_to_flange_left_mm` / `_right_mm` | left = non-drive / disc side |
| `spoke_hole_diameter_mm`, `spoke_holes`, `spoke_gauge`, `axle`, `weight_kg` | as stated |
| `has_lacing_geometry` | `true` if at least a flange diameter or centre-to-flange is known |
| `source_type`, `source_url`, `notes` | where it came from; `notes` keeps source wording and disagreements |

When a source gave only one flange diameter, both sides carry it.

### Big gap: centre-to-flange

Only one hub (Cute Q100 CST) has stated centre-to-flange values. The calculator needs them, so as
it stands the hub list can fill in the flange diameter but not the flange offsets. Where a source
gave flange-to-flange spacing or a dish offset instead, the exact wording is in `notes`.

The best sources (Grin's product pages and spec PDFs on ebikes.ca, QS Motor's drawings,
login-only drawing attachments on endless-sphere) couldn't be read from the cloud session.
ebikes.ca serves a bot check, and qs-motor.com and bafang-e.com didn't connect. Measuring hubs
yourself, or reading those pages in a normal browser, is the way to fill this in.

9 hub rows (mostly QS Motor) have no lacing geometry, only OLD, hole size and weight. They're kept
as starting points.

## rims.json

| field | meaning |
|---|---|
| `wheel_size_label` | `20" (406)`, `20" (451)`, `24"`, `26"`, `27.5"`, `29"/700C`, `18" moto`, `19" moto` |
| `iso_bsd_mm` | ISO bead seat diameter |
| `erd_mm` | effective rim diameter (every row has one) |
| `inner_width_mm`, `outer_width_mm`, `depth_mm` | as stated |
| `spoke_holes_available` | e.g. `[28, 32, 36]` |
| `rim_offset_mm` | asymmetric rims only |
| `zigzag_stagger_note` | hole stagger, as text |
| `eyelets`, `tubeless`, `weight_g`, `ebike_rated` | as stated; DT Swiss e-bike limits are in `notes` |

Fat-bike rims say "FAT BIKE RIM" in `notes`.

Coverage is weighted toward 27.5" and 29"/700C. 20", 24" and moto rims are thin, and there are no
16" or 17" moto rows. Alex, Sun Ringle, Velocity, Stan's and Surly's own sites, plus most
retailers, were refused by the session's network settings, so those brands rely on retailer or
community values.

## Not from ebikes.ca's calculator

Grin/ebikes.ca product pages are cited for a few hubs, but nothing was copied from the ebikes.ca
spoke calculator's own database.
