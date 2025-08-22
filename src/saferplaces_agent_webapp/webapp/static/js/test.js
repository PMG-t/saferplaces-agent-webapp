import {Deck} from '@deck.gl/core';

// new deck.DeckGL({
//             container: 'map',
//             mapStyle: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
//             initialViewState: { longitude: 12.496, latitude: 41.902, zoom: 10 },
//             controller: true,
//             layers: [
//                 new deck.GeoJsonLayer({
//                     id: 's3-geojson',
//                     data: 'https://s3.us-east-1.amazonaws.com/saferplaces.co/Directed/process_out/SaferBuildingsService/rimini-wd-buildings.geojson',
//                     pickable: true
//                 }),
//                 // new deck.RasterTileLayer({
//                 //     id: 's3-raster-tiles',
//                 //     data: 'https://s3.us-east-1.amazonaws.com/saferplaces.co/Directed/process_out/SaferBuildingsService/rimini-wd.tif',
//                 //     getFillColor: d => {
//                 //         const {band_1} = d.properties;
//                 //         return [10 * (band_1 - 20), 0, 300 - 5 * band_1];
//                 //     }
//                 // })
//                 // new deck.TileLayer({
//                 //     id: 'raster-tiles',
//                 //     data: 'https://s3.us-east-1.amazonaws.com/saferplaces.co/Directed/process_out/SaferBuildingsService/rimini-wd.tif',
//                 //     renderSubLayers: props => {
//                 //         const { boundingBox } = props.tile;
//                 //         return new deck.BitmapLayer(props, {
//                 //             data: null,
//                 //             image: props.data,
//                 //             bounds: [boundingBox[0][0], boundingBox[0][1], boundingBox[1][0], boundingBox[1][1]]
//                 //         });
//                 //     }
//                 // })
//                 // new geolib.CogBitmapLayer({
//                 //     id: 's3-cog',
//                 //     rasterData: 'https://s3.us-east-1.amazonaws.com/saferplaces.co/Directed/process_out/SaferBuildingsService/rimini-wd.tif',
//                 //     isTiled: true,
//                 //     cogBitmapOptions: { type: 'image' }
//                 // })
//             ]
//         });