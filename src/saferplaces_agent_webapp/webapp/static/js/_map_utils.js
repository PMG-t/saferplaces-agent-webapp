const map = L.map("map", { preferCanvas: true }).setView([41.9, 12.5], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

let layerRegistry = []

function add_layer(layer, layer_data) {
    addLayerToRegistry(layer_data);
    map.addLayer(layer);
}

function addLayerToRegistry(layer_data) {
    let layer_type_icon_map = {
        "vector": "diagonal_line",
        "raster": "blur_on",
    }
    // call api to add layer to backendregistry 
    fetch('layers/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            'layers': [ layer_data ]
        })
    })
    .then(response => {
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
    })
}

async function addLayerByUrl(url) {
    url = document.getElementById("layerUrl").value.trim();
    if (!url) {
        alert("Inserisci un URL valido");
        return;
    }
    let ext = justext(url).toLowerCase();
    switch (ext) {
        case 'geojson':
            const layer_data = {
                name: justfilename(url),
                type: 'vector',
                src: url
            };
            await addVectorLayer(layer_data);
            break;
        case 'tif':
        case 'tiff':
            const layer_data_raster = {
                name: justfilename(url),
                type: 'raster',
                src: url
            };
            await addRasterLayer(layer_data_raster);
            break;
        default:
            console.error("Tipo di file non supportato:", ext);
            alert("Tipo di file non supportato: " + ext);
            return;
    }
}

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
    let layer_style = layer_data.styles;
    function getColor(f) {
        if(!layer_style) {
            return "#0061ff"; // colore di default
        }
        let style = layer_style[0]
        if (style.type === 'categoric') {
            return style.colormap[f[style.property]] || "#0061ff";
        }
    }
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
                debugger
                if (f.type === GEOM_TYPES.POINT) return { 
                    radius: 3,
                    color: "#0061ff",
                    weight: 1,
                    fillOpacity: 0.7
                }
                else {
                    return { 
                        color: getColor(f),
                        weight: 1, 
                        fillOpacity: 0.2 
                    };
                }
            }
        }
    })
    .on('click', e => {
        const props = e.layer.properties || {};
        const rows = Object.entries(props).slice(0, 10)
            .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("");
        L.popup().setLatLng(e.latlng).setContent(`<table>${rows}</table>`).openOn(map);
    });
    
    add_layer(vg, layer_data);
}

async function addRasterLayer(layer_data) {
    const response = await fetch(s3uri_to_https(layer_data.src), { headers: { "Range": "bytes=0-" } });
    if (!response.ok) throw new Error("Impossibile caricare GeoTIFF: " + response.status);
    const arrayBuffer = await response.arrayBuffer();

    const georaster = await parseGeoraster(arrayBuffer);
    // georaster.nodata, georaster.mins/maxs, georaster.pixelHeight etc. disponibili qui

    // Funzione colori semplice (da blu a rosso) usando min/max stimati
    const minVal = (georaster.mins && georaster.mins[0] != null) ? georaster.mins[0] : 0;
    const maxVal = (georaster.maxs && georaster.maxs[0] != null) ? georaster.maxs[0] : 1;
    const nodata = Array.isArray(georaster.noDataValue) ? georaster.noDataValue[0] : georaster.noDataValue;
    console.log(`GeoRaster ${layer_data.src} → min: ${minVal}, max: ${maxVal}, nodata: ${nodata}`);

    let layer_style = layer_data.styles? layer_data.styles[0] : null;
    let colormap = layer_style?.colormap || ['black', 'white']
    let scale = chroma.scale(colormap).domain([minVal, maxVal]);

    function lerp(a, b, t) { return a + (b - a) * t; }
    function valueToColor(v) {
        if (v == null || Number.isNaN(v)) return null;
        if (nodata != null && v === nodata) return null;
        
        // DOC: With Lerp
        // const t = Math.max(0, Math.min(1, (v - minVal) / (maxVal - minVal || 1)));
        // // gradiente blu(0,0,255) -> rosso(255,0,0)
        // const r = Math.round(lerp(0, 255, t));
        // const g = Math.round(lerp(0, 255, 1 - t)); // verde va da 255 a 0
        // const b = 0 // Math.round(lerp(255, 0, t));
        // return `rgba(${r},${g},${b},0.9)`;
        
        // DOC: With Chroma.js
        return scale(v).alpha(1).hex()

    }

    const rasterLayer = new GeoRasterLayer({
        georaster,
        opacity: 0.7,
        pixelValuesToColorFn: values => valueToColor(values[0]),
        resolution: 256 // più alto = più veloce (meno dettagli), regola se serve
    });

    add_layer(rasterLayer, layer_data);

    // Prova a fare fit sui bounds del raster (se il vettoriale non ha già fatto fit)
    try { map.fitBounds(rasterLayer.getBounds(), { padding: [20, 20] }); } catch (e) { }

    // Piccola legenda dinamica
    const legend = document.getElementById("legend");
    legend.style.display = "block";
    legend.innerHTML = `
        <div style="margin-bottom:6px;font-weight:600">Raster (valori)</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span>${minVal.toFixed(2)}</span>
          <div style="height:10px;width:160px;background:linear-gradient(to right, #0000ff, #00FF00);border-radius:6px;"></div>
          <span>${maxVal.toFixed(2)}</span>
        </div>
      `;
}