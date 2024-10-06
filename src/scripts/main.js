import maplibregl from 'maplibre-gl'; // or "const mapboxgl = require('mapbox-gl');"
// import * as $ from 'jquery'
// import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';

// const {gzip, ungzip} = require('node-gzip');
// import {ungzip} from "node-gzip";

(function () {

    let data = {
        defaultCenter: [-8.3226655, 53.7654751],
        defaultZoom: 10,
    };

    function getCenterOfMap() {
        try {
            data.savedCenter = JSON.parse(localStorage.getItem('center'));
        } catch (exception) {
            console.log('Exception: ', exception);
        }
        if (data.savedCenter) {
            return data.savedCenter;
        } else {
            return data.defaultCenter;
        }
    }

    function getZoom() {
        try {
            data.savedZoom = JSON.parse(localStorage.getItem('zoom'));
        } catch (exception) {
            console.log('Exception: ', exception);
        }
        if (data.savedZoom) {
            return data.savedZoom;
        } else {
            return data.defaultZoom;
        }
    }

    const map = new maplibregl.Map({
        container: 'map',
        style:
            'https://api.maptiler.com/maps/dataviz/style.json?key=XrsT3wNTcIE6gABWxyV5',
        center: getCenterOfMap(),
        zoom: getZoom(),
    });

    function setCenterOfMap() {
        localStorage.setItem('center', JSON.stringify(map.getCenter()));
    }

    function setZoom() {
        localStorage.setItem('zoom', JSON.stringify(map.getZoom()));
    }

    map.on('moveend', function () {
        setCenterOfMap();
        setZoom();
    });
    map.on('zoomend', function () {
        setZoom();
    });

    const metersToPixelsAtMaxZoom = (meters, latitude) =>
        meters / 0.075 / Math.cos(latitude * Math.PI / 180)

    const colors = [
        '#0000FF',
        '#FF0000',
        '#00FF00',
        '#d06700',
        '#FF00FF',
        '#00FFFF',
        '#000000',
    ];
    let lastColorIndex = 0;
    function getNextColor() {
        const color = colors[lastColorIndex];
        lastColorIndex++;
        if (lastColorIndex >= colors.length) {
            lastColorIndex = 0;
        }
        return color;
    }

    const paintCircle = {
        // https://maplibre.org/maplibre-style-spec/layers/#paint-circle-circle-color
        // https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/
        // 'circle-color': "#000000",
        'circle-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], '#000000',
            ['==', ['get', 'IsTrip'], true], '#0000FF',
            ['==', ['get', 'IsTrip'], false], '#FF0000',
            '#880000',
        ],
        'circle-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 1,
            ['<', ['get', 'Duration'], 60 * 10], 0.02,
            ['<', ['get', 'Duration'], 60 * 60], 0.04,
            ['<', ['get', 'Duration'], 60 * 60 * 8], 0.08,
            ['<', ['get', 'Duration'], 60 * 60 * 24], 0.16,
            ['<', ['get', 'Duration'], 60 * 60 * 72], 0.32,
            0.25,
        ],
        'circle-radius': [
            'case',
            ['<', ['get', 'Duration'], 60 * 10], 2,
            ['<', ['get', 'Duration'], 60 * 60], 4,
            ['<', ['get', 'Duration'], 60 * 60 * 8], 6,
            ['<', ['get', 'Duration'], 60 * 60 * 24], 8,
            ['<', ['get', 'Duration'], 60 * 60 * 72], 10,
            4,
        ],
        // 'circle-radius': [
        //     "interpolate",
        //     ["exponential", 0.9999],
        //     // ["get", "Count"],
        //     ["get", "Duration"],
        //     1, 2,
        //     60 * 60 * 8, 20,
        // ],
        // 'circle-radius': [
        //     'case',
        //     ['==', ['get', 'IsTrip'], true], 2,
        //     ['==', ['get', 'IsTrip'], false], 6,
        //     2,
        // ],
        // 'line-color': getNextColor,
        // 'line-width': 2,
    };

    const paintLine = {
        'line-color': [
            'match',
            ['get', 'Activity'],
            'Stationary', '#f32d2d',
            'Walking', '#e78719',
            'Running', '#028532',
            'Bike', '#3112f6',
            'Automotive', '#d670fa',
            'Unknown', '#444444',
            '#888888',
        ],
        // 'line-width': 4,
        'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 4,
            4,
        ],
        'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 1,
            0.33,
        ]

        // 'line-gap-width': 2,
        // 'line-cap': 'round',
    };

    function paintFor(layerType) {
        switch (layerType) {
            case 'circle':
                return paintCircle;
            case 'line':
                return paintLine;
        }
        return {};
    }

    // Create a popup, but don't add it to the map yet.
    const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false
    });
    popup.on("close", (e) => console.debug("popup closed", e));
    popup.on("click", (e) => {
      popup.remove();
    });

    let hoveredStateId = null;

    function addHoverState(sourceId, sourceLayer, targetLayer) {

        console.debug("addHoverState", sourceId, sourceLayer, targetLayer);

        if (typeof sourceId === 'undefined' || sourceId === null ) {
            console.error('the sourceId parameter is required');
            return;
        }

        if (typeof targetLayer === 'undefined' || targetLayer === null ) {
            console.error('the sourceLayer parameter is required');
            return;
        }

        // sourceLayer: sourceLayer ? sourceLayer : null
        // map.on('mousemove', sourceLayer, (e) => {
        map.on('mousemove', targetLayer, (e) => {
            console.debug("hoverState mouse ENTER", e, hoveredStateId);
            if (e.features.length > 0) {
                console.debug("hoverState mouse ENTER", "feature.0", e.features[0]);
                // hoverStateId is an externally-scoped variable which is
                // also accessed by the mouseleave event, which sets it to null
                // when a feature is unhovered.
                if (hoveredStateId) {
                    console.debug("unsetting existing hover");
                    map.setFeatureState(
                        {
                            source: sourceId,
                            sourceLayer: sourceLayer,
                            id: hoveredStateId,
                        },
                        {hover: false}
                    );
                    console.debug("setFeatureState [hover: false]", sourceId, targetLayer, hoveredStateId);
                }
                hoveredStateId = e.features[0].id;
                if (hoveredStateId) {
                    // only set hover if the id is well defined
                    // ... but is it UNIQUE? across tiles? https://gis.stackexchange.com/a/331256 (see HOVER DOES NOT WORK)
                    let gotFeatureState = map.getFeatureState({
                        source: sourceId,
                        sourceLayer: sourceLayer,
                        id: hoveredStateId,
                    });
                    console.debug('gotFeatureState', sourceId, targetLayer, hoveredStateId, e.features[0].id, gotFeatureState);

                    map.setFeatureState(
                        {
                            source: sourceId,
                            sourceLayer: sourceLayer,
                            id: hoveredStateId,
                        },
                        {hover: true}
                    );
                    console.debug("setFeatureState [hover: true]", sourceId, targetLayer, hoveredStateId);
                    gotFeatureState = map.getFeatureState({
                        source: sourceId,
                        sourceLayer: sourceLayer,
                        id: hoveredStateId,
                    });
                    console.debug('gotFeatureState', sourceId, targetLayer, hoveredStateId, e.features[0].id, gotFeatureState);
                }


            }
            map.getCanvas().style.cursor = 'pointer';
        });
        // map.on('mouseout', sourceId, (e) => {
        //     console.debug("mouseout", e);
        // })
        map.on('mouseleave', targetLayer, () => {
            console.debug('mouseleave', targetLayer);
            if (hoveredStateId) {
                let gotFeatureState = map.getFeatureState({
                    source: sourceId,
                    sourceLayer: sourceLayer,
                    id: hoveredStateId,
                });
                console.debug('gotFeatureState', sourceId, sourceLayer, targetLayer, hoveredStateId, gotFeatureState);

                map.setFeatureState(
                    {
                        source: sourceId,
                        sourceLayer: sourceLayer,
                        id: hoveredStateId,
                    },
                    {hover: false}
                );
                console.debug("setFeatureState [hover: false]", sourceId, targetLayer, hoveredStateId);
            }
            hoveredStateId = null;
            console.debug("hoveredStateId = null", sourceId, targetLayer, hoveredStateId);
            map.getCanvas().style.cursor = '';
        });
    }

    let $featureDebugWindow = $(".infoContainer")
        // .css("display", "none")
        .addClass("feature-debug-window");

    $("#map").append($featureDebugWindow);

    // https://maplibre.org/maplibre-gl-js/docs/examples/popup-on-hover/
    function addInspectPopup(sourceLayerID) {
        map.on('mouseenter', sourceLayerID, (e) => {

            // // https://maplibre.org/maplibre-gl-js/docs/examples/hover-styles/
            // if (e.features.length > 0) {
            //     if (hoveredStateId) {
            //         map.setFeatureState(
            //             {source: layerId, id: hoveredStateId},
            //             {hover: false}
            //         );
            //     }
            //     console.debug("e.features[0]", e.features[0]);
            //     hoveredStateId = e.features[0].properties.Time + e.features[0].properties.UUID;
            //     map.setFeatureState(
            //         {source: layerId, id: hoveredStateId},
            //         {hover: true}
            //     );
            // }

            /*

             */
            // Change the cursor style as a UI indicator.
            map.getCanvas().style.cursor = 'pointer';

            // Is it a line or a point?
            console.debug("e.features[0].geometry", e.features[0].geometry);
            let coordinates = [0,0];
            const feat = e.features[0];
            if (feat.geometry.type === "MultiLineString") {
                // Get LAST-LAST coordinates from the list.
                const lastLine = feat.geometry.coordinates[feat.geometry.coordinates.length -1];
                coordinates = lastLine[lastLine.length-1].slice();
            } else if (feat.geometry.type === "LineString") {
                // Get LAST coordinates from the list.
                coordinates = feat.geometry.coordinates[feat.geometry.coordinates.length -1].slice();
            } else if (feat.geometry.type === "Point") {
                coordinates = feat.geometry.coordinates.slice();
            }
            console.debug(feat.geometry.type, coordinates);
            let props = e.features[0].properties;
            props.id = e.features[0].id;
            const description = JSON.stringify(props, null, '<br>');

            // Ensure that if the map is zoomed out such that multiple
            // copies of the feature are visible, the popup appears
            // over the copy being pointed to.
            while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
            }

            // Populate the popup and set its coordinates
            // based on the feature found.
            // popup.setLngLat(coordinates).setHTML(description).addTo(map);
            // popup.setHTML(description).addTo(map);
            $featureDebugWindow.show();
            $featureDebugWindow.html(`<code>${description}</code>`);
        });

        map.on('mouseleave', sourceLayerID, () => {
            map.getCanvas().style.cursor = '';
            setTimeout(() => {
                // popup.remove(); // from map

            }, 500);
            // $featureDebugWindow.hide();

            // if (hoveredStateId) {
            //     map.setFeatureState(
            //         {source: layerId, id: hoveredStateId},
            //         {hover: false}
            //     );
            // }
            // hoveredStateId = null;
        });
    }

    function renderGeoJSON(map, sourceName, data) {
        map.addSource(sourceName, {
            'type': 'geojson',
            'data': data
        });
        const layerType = data.features[0].geometry.type === 'Point' ? 'circle' : 'line';
        map.addLayer({
            'id': `layer-${sourceName}`,
            'source': sourceName,
            'type': layerType,
            'paint': paintFor(layerType)
        });
        addHoverState(sourceName, `layer-${sourceName}`);
        addInspectPopup(`layer-${sourceName}`);
    }

    map.on('load', async () => {
        console.log("map loaded");

        let params = new URLSearchParams(window.location.search);
        console.debug("params", params);

        // First we iterate the 'geojson=' targets, splitting on commas.
        let geojsonDataTargets = [];
        if (params.get("geojson"))  {
            geojsonDataTargets = params.get("geojson").split(",");
        }
        if (geojsonDataTargets.length === 0) {
            console.debug("WARN: No geojson data sources found in URL. Use like: localhost:8080/public/?geojson=http://localhost:3001/cattraks.json");
        }
        for (let target of geojsonDataTargets) {
            console.debug("geojson target", target);

            // await causes the data to be rendered in the order
            // they were defined in the URL.
            await fetch(target).then(async res => {
                // if (/.gz$/.test(target)) {
                //     res = await ungzip(res);
                // }
                console.debug("res", res);
                return res.json();
            }).then(data => {
                console.debug("data", data);
                renderGeoJSON(map, target, data);
                map.fitBounds(turf.bbox(data), {padding: 20});
                // map.setCenter(turf.center(data).geometry.coordinates);
            }).catch(err => {
                console.error(err);
            });
        }

        // Then we iterate the 'vector=' targets, splitting on commas.
        let vectorTargets = [];
        if (params.get("vector")) {
            vectorTargets = params.get("vector").split(",");
        }
        if (vectorTargets.length === 0) {
            console.debug("WARN: No vector data sources found in URL. Use like: http://localhost:8080/public/?vector=http://localhost:3001/services/ia/naps/tiles/{z}/{x}/{y}.pbf,http://localhost:3001/services/ia/laps/tiles/{z}/{x}/{y}.pbf");
        }
        for (let target of vectorTargets) {
            console.debug("DEBUG: Vector target.", target);
            // Get a source layer name from target URL, eg. 'naps' or 'laps', as in 'http://localhost:3001/services/rye/{naps,laps}/tiles/...'.
            // Deriving this name from the target ASSUMES a conventional URI scheme from TIPPECANOE.
            // It is index=5 in the URL path, splitting on '/'s.
            // For example:
            //   http://localhost:3001/services/ia/naps/tiles/{z}/{x}/{y}.pbf => 'naps'
            //   http://localhost:3001/services/ia/valid/tiles/{z}/{x}/{y}.pbf => 'valid'
            const sourceID = target.split("/")[4] + '-' + target.split("/")[5]; // => 'rye-naps'
            const sourceLayer = target.split("/")[5];

            // Vector source.
            map.addSource(sourceID, {
                'type': 'vector',
                'tiles': [target],
                'minzoom': 1,
                'maxzoom': 18,
                // 'promoteId': 'Time',
            });

            console.debug(`DEBUG: Add vector target source. '${target}' `, 'sourceLayerID=', sourceID);

            let addLayerObject = {
                id: `layer-${sourceID}`,
                source: sourceID,
                // 'source-layer' is the NAME of the layer in the source tiles.
                // By my own convention, these are also the NAMEs of the SERVICEs.
                // Eg. 'naps', 'laps', 'valid'.
                'source-layer': sourceLayer,
                // 'type': 'TODO',
                // 'paint': paintFor('line'),
                // 'filter': [
                //     'all',
                //     ['>', 'PointCount', 30],
                //     ['<', 'Duration', 86000],
                //     ['<', 'AverageAccuracy', 200],
                // ]
            };

            // Static points (naps, valid) should be represented as circles.
            if (/naps/.test(target)) {
                console.debug("DEBUG: Vector target is naps.");

                addLayerObject.type = 'circle';
                addLayerObject.paint = paintFor('circle');
                addLayerObject.filter = [
                    'all',
                    [">", "Count", 100],
                ];

            } else if (/valid/.test(target)) {

                addLayerObject.type = 'circle';
                addLayerObject.paint = paintFor('circle');
                addLayerObject.paint["circle-color"] = "#888888";
                addLayerObject.paint["circle-opacity"] = 0.8;
                addLayerObject.paint["circle-radius"] = 2;
                addLayerObject.filter = [
                    'all',
                    // [ 'has', 'point_count'],
                    // [ '>', 'point_count', 30],
                    // ["has", "Count"],
                    // [">", "Count", 1],
                    // [">", "Duration", 60],
                ];

            } else if (/laps/.test(target)) {

                // Note: that it might be useful to also represent the comprising points
                // on the line as individual points in order to visualize the outcome
                // of any simplification logic.
                // TODO: add circle layer too?

                addLayerObject.type = 'line';
                addLayerObject.paint = paintFor('line');
                addLayerObject.filter = [
                    'all',
                    ['>', 'PointCount', 30],
                    ['<', 'Duration', 86000],
                    ['<', 'AverageAccuracy', 25],
                    [
                        'any',
                        ['!=', 'Activity', 'Stationary'],
                        ['>=', 'DistanceAbsolute', 100],
                    ],
                    // ['>=', 'Speed', 1],
                    // ['>', 'Duration', 60],
                    // ['!=', 'Activity', 'Stationary'],
                    // ['!=', 'Activity', 'Unknown'],
                    // ['<', 'AverageAccuracy', 35],
                ];
            }

            map.addLayer(addLayerObject);

            // For vector sources, sourceLayer is required.
            addHoverState(sourceID, sourceLayer, addLayerObject.id);
            addInspectPopup(addLayerObject.id);
        }


        // async function addGeoJSON_Points() {
        //     // http://ionden.com/a/plugins/ion.rangeSlider/api.html
        //     $("#accuracySlider").ionRangeSlider({
        //         type: "double",
        //         skin: "flat", // "round",
        //         hide_min_max: false,
        //         force_edges: true,
        //         min: 0,
        //         max: 200,
        //         grid: false,
        //         onChange: function (values) {
        //             const source = map.getSource('cattracks-points');
        //             const {from, to} = values;
        //             if (!source) return;
        //             filterBy("Accuracy", from, to);
        //             //const filteredData = filterData(data, from, to);
        //             //source.setData(filteredData);
        //         },
        //     });
        //     $("#speedSlider").ionRangeSlider({
        //         type: "double",
        //         skin: "flat", // "round",
        //         hide_min_max: false,
        //         force_edges: true,
        //         min: 0,
        //         max: Math.round(200), // -> 200 kmph -> m/s
        //         grid: false,
        //         onChange: function (values) {
        //             const source = map.getSource('cattracks-points');
        //             const {from, to} = values;
        //             if (!source) return;
        //             filterBy("Speed", from, to);
        //             //const filteredData = filterData(data, from, to);
        //             //source.setData(filteredData);
        //         },
        //     });

        //     const sourceName = "cattracks-points";
        //     const tileService = "edge"; // ia.level-23
        //     const tileSourceLayer = "catTrackEdge"; // ia.level-23

        //     // map.addSource( sourceName, {
        //     //     type: 'vector',
        //     //     tiles: [`http://localhost:3001/services/${tileService}/tiles/{z}/{x}/{y}.pbf`],
        //     //     minzoom: 3,
        //     //     maxzoom: 18
        //     // });

        //     const dataRes = await fetch('./assets/geojson/mypoints.geojson');
        //     const geoJSONcontent = await dataRes.json();
        //     console.log("geoJSONcontent", geoJSONcontent);

        //     map.addSource(sourceName, {
        //         'type': 'geojson',
        //         'data': geoJSONcontent
        //     });

        //     let meters = 100; // ["get", "Accuracy"]
        //     map.addLayer({
        //         'id': 'my-cattracks-points',
        //         'type': 'circle',
        //         'source':  sourceName,
        //         // 'source-layer': tileSourceLayer,
        //         'paint': {
        //             // https://maplibre.org/maplibre-style-spec/layers/#paint-circle-circle-color
        //             // https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/
        //             // 'circle-color': [
        //             //     'match',
        //             //     ['get', 'Activity'],
        //             //     'Stationary', '#f32d2d',
        //             //     'Walking', '#e78719',
        //             //     'Running', '#028532',
        //             //     'Bike', '#3112f6',
        //             //     'Automotive', '#d670fa',
        //             //     'Unknown', '#00000000',
        //             //     /* else */ '#00000000',
        //             // ],
        //             // 'circle-color': ['interpolate', ['linear'], ['get', 'Speed'], -1, ['to-color', '#014FE7'], 42, ['to-color', '#E74500']],
        //             'circle-color': ['interpolate', ['exponential', 0.9], ['get', 'Speed'], -1, ['to-color', '#014FE7'], 42, ['to-color', '#E74500']],
        //             // 'circle-color': [
        //             //     'match',
        //             //     ['get', 'Speeed'],
        //             //     ["<=", ['get', 'Speed'], 0], "#000",
        //             //     ['interpolate', ['linear'], ['get', 'Speed'], 0, ['to-color', '#014FE7'], 42, ['to-color', '#E74500']],
        //             // ],

        //             'circle-opacity': 0.5, // ["interpolate", ["linear"], ["get", "Accuracy"], 4, 0.8, 100, 0.1],
        //             'circle-radius': ["interpolate", ["exponential", 0.9], ["get", "Accuracy"], 4, 2, 100, 30],
        //             // 'circle-blur': ["interpolate", ["linear"], ["get", "Accuracy"], 4, 0, 100, 0.8],
        //             // TODO: get Accuracy to be circle-radius in true-to-zoom meters
        //             // https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js
        //         }
        //     });

        //     let accuracyD = $("#accuracySlider").data("ionRangeSlider");
        //     console.log("accuracyD", accuracyD);
        //     let speedD = $("#speedSlider").data("ionRangeSlider");
        //     let myFilters = {
        //         "Accuracy": [accuracyD.old_from || 0, accuracyD.old_to || 200],
        //         "Speed": [speedD.old_from || 0, speedD.old_to || 100],
        //     }
        //     function filterBy(property, min, max) {

        //         var filters = [
        //             'all',
        //             // [">=", property, min],
        //             // ["<=", property, max]
        //         ];

        //         myFilters[property] = [min, max];

        //         for (var key in myFilters) {
        //             if (myFilters.hasOwnProperty(key)) {
        //                 filters.push([">=", key, key == "Speed" ? myFilters[key][0] / 3.6 : myFilters[key][0]]);
        //                 filters.push(["<=", key, key == "Speed" ? myFilters[key][1] / 3.6 : myFilters[key][1]]);
        //             }
        //         }

        //         map.setFilter('my-cattracks-points', filters);
        //     }
        //     filterBy("Accuracy", accuracyD.old_from, accuracyD.old_to);
        //     filterBy("Speed", speedD.old_from, speedD.old_to);
        // }

        // await addGeoJSON_Points();

        // async function addGeoJSONLines() {
        //     const sourceName = "cattracks-lines";

        //     const dataRes = await fetch('./assets/geojson/mylinestrings.geojson');
        //     const geoJSONcontent = await dataRes.json();
        //     console.log("geoJSONcontent", geoJSONcontent);

        //     map.addSource(sourceName, {
        //         'type': 'geojson',
        //         'data': geoJSONcontent
        //     });

        //     map.addLayer({
        //         'id': 'my-cattracks-lines',
        //         'type': 'line',
        //         'source':  sourceName,
        //         // 'source-layer': tileSourceLayer,
        //         'paint': {
        //             'line-width': 2,
        //             'line-opacity': 0.75,
        //             'line-color': [
        //                 'match',
        //                 ['get', 'Activity'],
        //                 'Stationary', '#f32d2d',
        //                 'Walking', '#e78719',
        //                 'Running', '#028532',
        //                 'Bike', '#3112f6',
        //                 'Automotive', '#d670fa',
        //                 'Unknown', '#00000000',
        //                 /* else */ '#00000000',
        //             ]
        //         }
        //     });
        // }
        // await addGeoJSONLines();


        // map.addSource('uploaded-source', {
        //     'type': 'geojson',
        //     'data': geoJSONcontent
        // });
        //
        // map.addLayer({
        //     'id': 'uploaded-points',
        //     'type': 'fill',
        //     'source': 'uploaded-source',
        //     'paint': {
        //         'fill-color': '#888888',
        //         'fill-outline-color': 'red',
        //         'fill-opacity': 0.4
        //     },
        //     // filter for (multi)polygons; for also displaying linestrings
        //     // or points add more layers with different filters
        //     'filter': ['==', '$type', 'Point']
        // });

    });
})();
