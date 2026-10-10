# Grunn Kart

Kartgame door de binnenstad van Groningen, in Google's fotorealistische 3D-model.

## Spelen

Open de site (GitHub Pages) en vul bij de eerste start je Google API-sleutel in.
De sleutel wordt alleen in je eigen browser bewaard en staat niet in deze code.

De sleutel moet:
- de **Map Tiles API** aan hebben staan;
- beperkt zijn tot het adres van deze site (bijv. `https://silvijn.github.io/*`).

## Wat zit erin

- Vier banen over echte straten: Grote Markt, Spilsluizen, Vismarkt, Rondje Binnenstad.
- Grand Prix (Diepbeker), losse race en tijdrit met ghost.
- 12 coureurs, 4 karts, 3 soorten banden, 50cc t/m 200cc.
- Drift-turbo's, raketstart, trucjes, glider, muntjes en 17 items.

## Bestanden

- `index.html`, `game.js` – het spel
- `vendor.js` – three.js 0.180 + 3d-tiles-renderer 0.5.3 (gebundeld)
- `draco/` – decoder voor gecomprimeerde 3D-tegels
- `groningen.json` – banen, gebouwcontouren en water uit OpenStreetMap
- `tools/build_data.py` – maakt `groningen.json` uit een OpenStreetMap-export

## Bronnen

- 3D-model: Google Map Tiles API (Photorealistic 3D Tiles). Bronvermelding staat in beeld.
- Stratenkaart en gebouwcontouren: © OpenStreetMap-bijdragers (ODbL).

## Proefversie: 3D BAG-stad (`/proef/`)

Scherpe stad zonder Google-sleutel: gebouwen met echte vorm, hoogte en dak uit het 3D BAG,
gevels per bouwjaar en aantal verdiepingen, luchtfoto van PDOK als wegdek, bomen, bankjes en
fietsenrekken uit OpenStreetMap.

- `proef/city.bin`, `proef/city.json` – gebouwen (gemaakt met `tools/build_bag.py`)
- `proef/groningen-bag.json` – banen met straathoogtes en botsingscontouren uit het 3D BAG
- `tools/make_proef.py` – maakt `proef/game.js` uit `game.js`

Bronnen: 3D BAG (3DGI / TU Delft), Luchtfoto PDOK (Beeldmateriaal Nederland), © OpenStreetMap-bijdragers.
