const map = L.map("map", { preferCanvas: true }).setView([41.9, 12.5], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let layerRegistry = []

function addLayerToRegistry(layer_data) {
    let layer_type_icon_map = {
        "vector": "diagonal_line",
        "raster": "blur_on",
    }
    let layer_item = createEl("li",
        { draggable: "true", class: "layer-item", dataset: layer_data },
        [
            createEl("span", { class: "material-symbols-outlined icon", text: layer_type_icon_map[layer_data.type] || "star" }),
            createEl("span", { class: "name", text: layer_data.name }),
            createEl("div", { class: "actions" }, [
                createEl("button", { class: "btn eye", "aria-label": "Visibilità", text: "👁" }),
                createEl("button", { class: "btn menu", "aria-label": "Menu", text: "⋮" }),
                createEl("div", { class: "dropdown hidden" }, [
                    createEl("div", { class: "dropdown-item", text: "Zoom al layer" }),
                    createEl("div", { class: "dropdown-item", text: "Elimina" })
                ])
            ])
        ]
    );
    document.getElementById("layerList").appendChild(layer_item);
    layerRegistry.push(layer_data)
}


// function addVectorLayer(layer_data) {
//     let layer_src = layer_data.src;
//     fetch(s3uri_to_https(layer_src))
//         .then(r => r.json())
//         .then(data => {
//             const vg = L.vectorGrid.slicer(data, {
//                 rendererFactory: L.canvas.tile,
//                 maxZoom: 19,
//                 interactive: true,
//                 // parametri di semplificazione (più alto = più veloce, meno preciso)
//                 tolerance: 3,       // default 3; alza a 5–8 per geometrie complesse
//                 extent: 4096,       // risoluzione interna
//                 indexMaxZoom: 5,    // livello max per indicizzazione
//                 indexMaxPoints: 100000, // batch di indicizzazione

//                 vectorTileLayerStyles: {
//                     sliced: f => {
//                         // stile unico per tutte le feature (nome layer = 'sliced')
//                         if (f.type === 1) return { radius: 3, color: "#0061ff", weight: 1, fillOpacity: 0.7 };
//                         return { color: "#0061ff", weight: 1, fillOpacity: 0.2 };
//                     }
//                 }
//             })
//                 .on('click', e => {
//                     // popup minimale con prime proprietà
//                     const props = e.layer.properties || {};
//                     const rows = Object.entries(props).slice(0, 10)
//                         .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("");
//                     L.popup().setLatLng(e.latlng).setContent(`<table>${rows}</table>`).openOn(map);
//                 })

//             addLayerToRegistry(layer_data);
//             map.addLayer(vg);
//         });

// }
async function addVectorLayer(layer_data) {
    const layer_src = s3uri_to_https(layer_data.src);
    const cacheName = "geojson-cache";

    // apri la cache
    const cache = await caches.open(cacheName);

    // prova a leggere dalla cache
    let response = await cache.match(layer_src);

    if (!response) {
        // se non è in cache, fai fetch e metti in cache
        response = await fetch(layer_src);
        cache.put(layer_src, response.clone());
        console.log("Scaricato e memorizzato in cache:", layer_src);
    } else {
        console.log("Caricato dalla cache:", layer_src);
    }

    const data = await response.json();
    buildVectorLayer(data, layer_data);
}

// funzione separata per costruire il layer Leaflet
function buildVectorLayer(data, layer_data) {
    const vg = L.vectorGrid.slicer(data, {
        rendererFactory: L.canvas.tile,
        maxZoom: 19,
        interactive: true,
        tolerance: 3,
        extent: 4096,
        indexMaxZoom: 5,
        indexMaxPoints: 100000,
        vectorTileLayerStyles: {
            sliced: f => {
                if (f.type === 1) return { radius: 3, color: "#0061ff", weight: 1, fillOpacity: 0.7 };
                return { color: "#0061ff", weight: 1, fillOpacity: 0.2 };
            }
        }
    })
    .on('click', e => {
        const props = e.layer.properties || {};
        const rows = Object.entries(props).slice(0, 10)
            .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("");
        L.popup().setLatLng(e.latlng).setContent(`<table>${rows}</table>`).openOn(map);
    });

    addLayerToRegistry(layer_data);
    map.addLayer(vg);
}

async function addRasterLayer(layer_data) {
    const response = await fetch(s3uri_to_https(layer_data.src), { headers: { "Range": "bytes=0-" } });
    if (!response.ok) throw new Error("Impossibile caricare GeoTIFF: " + response.status);
    const arrayBuffer = await response.arrayBuffer();

    const georaster = await parseGeoraster(arrayBuffer);
    // georaster.nodata, georaster.mins/maxs, georaster.pixelHeight etc. disponibili qui

    // Funzione colori semplice (da blu a rosso) usando min/max stimati
    const min = (georaster.mins && georaster.mins[0] != null) ? georaster.mins[0] : 0;
    const max = (georaster.maxs && georaster.maxs[0] != null) ? georaster.maxs[0] : 1;
    const nodata = Array.isArray(georaster.noDataValue) ? georaster.noDataValue[0] : georaster.noDataValue;

    function lerp(a, b, t) { return a + (b - a) * t; }
    function valueToColor(v) {
        if (v == null || Number.isNaN(v)) return null;
        if (nodata != null && v === nodata) return null;
        const t = Math.max(0, Math.min(1, (v - min) / (max - min || 1)));
        // gradiente blu(0,0,255) -> rosso(255,0,0)
        const r = Math.round(lerp(0, 255, t));
        const g = 0;
        const b = Math.round(lerp(255, 0, t));
        return `rgba(${r},${g},${b},0.7)`;
    }

    const rasterLayer = new GeoRasterLayer({
        georaster,
        opacity: 0.7,
        pixelValuesToColorFn: values => valueToColor(values[0]),
        resolution: 256 // più alto = più veloce (meno dettagli), regola se serve
    });

    // rasterLayer.addTo(map);
    addLayerToRegistry(layer_data)
    map.addLayer(rasterLayer);

    // Prova a fare fit sui bounds del raster (se il vettoriale non ha già fatto fit)
    try { map.fitBounds(rasterLayer.getBounds(), { padding: [20, 20] }); } catch (e) { }

    // Piccola legenda dinamica
    const legend = document.getElementById("legend");
    legend.style.display = "block";
    legend.innerHTML = `
        <div style="margin-bottom:6px;font-weight:600">Raster (valori)</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span>${min.toFixed(2)}</span>
          <div style="height:10px;width:160px;background:linear-gradient(to right, #0000ff, #ff0000);border-radius:6px;"></div>
          <span>${max.toFixed(2)}</span>
        </div>
      `;
}