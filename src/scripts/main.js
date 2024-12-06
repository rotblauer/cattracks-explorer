/*


http://localhost:8080/public/?vector=http://localhost:3001/services/ia/valid/tiles/{z}/{x}/{y}.pbf,http://localhost:3001/services/ia/naps/tiles/{z}/{x}/{y}.pbf,http://localhost:3001/services/ia/laps/tiles/{z}/{x}/{y}.pbf,http://localhost:3001/services/ia/tripdetected/tiles/{z}/{x}/{y}.pbf


 */

import maplibregl from 'maplibre-gl'; // or "const mapboxgl = require('mapbox-gl');"
// import * as $ from 'jquery'
// import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import {secondsToHms} from "./utils";

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

        // 'https://api.maptiler.com/maps/dataviz/style.json?key=XrsT3wNTcIE6gABWxyV5',
            'https://api.maptiler.com/maps/topo-v2/style.json?key=XrsT3wNTcIE6gABWxyV5',
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
        console.debug("zoomend", map.getZoom());
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
            ['<', ['get', 'Duration'], 60 * 10], 0.1,
            ['<', ['get', 'Duration'], 60 * 60], 0.2,
            ['<', ['get', 'Duration'], 60 * 60 * 8], 0.4,
            ['<', ['get', 'Duration'], 60 * 60 * 24], 0.5,
            ['<', ['get', 'Duration'], 60 * 60 * 72], 0.66,
            0.25,
        ],
        'circle-radius': [
            'case',
            ['<', ['get', 'Duration'], 60 * 10], 4,
            ['<', ['get', 'Duration'], 60 * 60], 6,
            ['<', ['get', 'Duration'], 60 * 60 * 8], 8,
            ['<', ['get', 'Duration'], 60 * 60 * 24], 10,
            ['<', ['get', 'Duration'], 60 * 60 * 72], 12,
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

    //
    const paintLine = {
        'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            '#000000',
            // [
            //     'match',
            //     ['get', 'Activity'],
            //     'Stationary', '#f45656',
            //     'Walking', '#e89d46',
            //     'Running', '#1f8144',
            //     'Bike', '#634bfa',
            //     'Automotive', '#e2a0fa',
            //     'Unknown', '#777777',
            //     '#fbfbfb',
            // ],
            [
                'match',
                ['get', 'Activity'],
                'Stationary', '#f32d2d',
                'Walking', '#e78719',
                'Running', '#028532',
                'Bike', '#3112f6',
                'Automotive', '#d670fa',
                'Fly', '#9200c3',
                'Unknown', '#444444',
                '#888888',
            ],
        ],
        // Watch out for line-width because it can interact with the cursor
        // and can obscure adjacent features.
        'line-width': 3,
        // 'line-width': [
        //     'case',
        //     ['boolean', ['feature-state', 'hover'], false], 2,
        //     2,
        // ],
        'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 1,
            // 0.33,
            0.5,
        ],
        // 'line-gap-width': [
        //     'case',
        //     ['boolean', ['feature-state', 'hover'], false], 2,
        //     0,
        // ],
        // 'line-pattern': 'pattern-dot'

        // 'line-gap-width': 2,
        // 'line-cap': 'round',
    };

    const paintFill = {
        'fill-color': [
            // 'case',
            // ['boolean', ['feature-state', 'hover'], false], '#000000',
            // [
                'match',
                ['get', 'Activity'],
                'Stationary', '#f32d2d',
                'Walking', '#e78719',
                'Running', '#028532',
                'Bike', '#3112f6',
                'Automotive', '#d670fa',
                'Fly', '#9200c3',
                'Unknown', '#444444',
                '#888888',
            // ],
        ],
        'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false], 1,
            // 0.33,
            0.42,
        ],
        'fill-outline-color': '#ffffff00',
    }

    function paintFor(layerType) {
        switch (layerType) {
            case 'circle':
                return paintCircle;
            case 'line':
                return paintLine;
            case 'fill':
                return paintFill;
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

    // let hoveredRegistry = [];

    function setFeatureHoverState(sourceId, sourceLayer, targetLayer, feature) {
        // hoveredRegistry.push(feature.id);
        map.setFeatureState({
            source: sourceId,
            sourceLayer: sourceLayer,
            id: feature.id,
        }, {hover: true});
    }

    function clearHoveredRegistry(sourceId, sourceLayer, featureID) {

        // Using the pattern from https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/
        // yields spuriously sticky hover states on tightly overlapping and dense features.
        // My 'hoveredRegistry' was a v2 attempt to fix this, but it was not successful.
        // It attempted to improve on the global hoverStateID pattern by keeping track of
        // the hovered features in an array. This was not successful.
        // So now as a working solution we clear the entire feature state for the source/sourceLayer (
        //   which is vector-friendly, but I'm not sure about GeoJSON type).
        // This is brute force, and may have unintended consequences if feature states
        // get used in other ways.
        if (typeof featureID === "undefined" || featureID === null) {
            // Vector does this.
            map.removeFeatureState({
                source: sourceId,
                sourceLayer: sourceLayer,
            })
            return;
        }
        // GeoJSON does this.
        map.removeFeatureState({
            source: sourceId,
            sourceLayer: sourceLayer,
            id: featureID,
        }, 'hover');
    }

    function addHoverState(sourceId, sourceLayer, targetLayer) {
        map.on('mousemove', targetLayer, (e) => {
            if (typeof e === "undefined") return;

            // for each feature in e.features
            for (let feature of e.features) {
                // clearHoveredRegistry(sourceId, sourceLayer);
                setFeatureHoverState(sourceId, sourceLayer, targetLayer, feature);
            }

            map.getCanvas().style.cursor = 'pointer';

        });
        map.on('mouseout', sourceId, (e) => {
            if (typeof e === "undefined") return;
            for (let feature of e.features) {
                clearHoveredRegistry(sourceId, sourceLayer, feature.id);
            }
            console.debug("mouseout", e);
        })
        map.on('mouseleave', targetLayer, () => {
            // Vector.
            clearHoveredRegistry(sourceId, sourceLayer);
            // clearHoveredRegistry(sourceId, sourceLayer, e.features[0] ? e.features[0].id : null);
            map.getCanvas().style.cursor = '';
        });
    }

    let $featureDebugWindow = $(".infoContainer")
        // .css("display", "none")
        .addClass("feature-debug-window");

    $("#map").append($featureDebugWindow);

    // https://maplibre.org/maplibre-gl-js/docs/examples/popup-on-hover/
    function addInspectPopup(sourceLayerID) {
        map.on('mousemove', sourceLayerID, (e) => {
            // // https://maplibre.org/maplibre-gl-js/docs/examples/hover-styles/
            // Change the cursor style as a UI indicator.
            // map.getCanvas().style.cursor = 'pointer';
            let myHTML = `<h2>${sourceLayerID}</h2><h3>${e.features.length} features</h3>`;

            let dedupeFeatures = [];
            e.features.sort((a, b) => {
                return b.properties.Time_Start_Unix - a.properties.Time_Start_Unix;
            });
            for (let feature of e.features) {
                if (dedupeFeatures.includes(feature.id)) {
                    continue;
                }
                dedupeFeatures.push(feature.id);
                let props = feature.properties;
                props.id = feature.id; // amend for debug

                const description = JSON.stringify(props, null, '<br>');
                myHTML += `<code>
${description}
</code>
<p style="font-size: larger;">${secondsToHms(feature.properties.Duration)}</p>
`;
            }
            // const appendedHTML = $featureDebugWindow.html() + myHTML;
            const appendedHTML = myHTML;
            $featureDebugWindow.html(appendedHTML);
            $featureDebugWindow.show();
        });

        map.on('mouseleave', sourceLayerID, () => {
            map.getCanvas().style.cursor = '';
            $featureDebugWindow.html('');

            setTimeout(() => {
                // popup.remove(); // from map
            }, 100);
        });
    }

    function renderGeoJSON(map, target, data) {
        let sourceID = /\/services\/(.*)\/tiles\//.exec(target);
        if (sourceID === null) {
            sourceID = /\/(.*)$/.exec(target)[0];
        } else {
            sourceID = sourceID[0];
        }
        // sourceID = sourceID.replace("/services/", "").replace("/tiles/", "");

        const sourceLayer = sourceID.split("/").pop().replace(/_edge$/, "");

        map.addSource(sourceID, {
            'type': 'geojson',
            'data': data
        });
        let layerType = "";
        // switch data.features[0].geometry.type === 'Point' ? 'circle' : 'line';
        console.debug("data.features[0].geometry.type", data.features[0].geometry.type);
        switch (data.features[0].geometry.type) {
            case 'Point':
                layerType = 'circle';
                break;
            case 'LineString':
                layerType = 'line';
                break;
            case 'Polygon':
                layerType = 'fill';
                break;
        }
        map.addLayer({
            'id': `layer-${sourceID}`,
            'source': sourceID,
            // 'sourceLayer': "",
            'type': layerType,
            'paint': paintFor(layerType)
        });
        /*
                addHoverState(sourceID, sourceLayer, addLayerObject.id);
            addInspectPopup(addLayerObject.id);
         */
        addHoverState(sourceID, null, `layer-${sourceID}`);
        addInspectPopup(`layer-${sourceID}`);
    }

    map.on('load', async () => {
        console.log("map loaded");

        let params = new URLSearchParams(window.location.search);
        console.debug("params", params);

        // First we iterate the 'geojson=' targets, splitting on commas.
        let geojsonDataTargets = [];
        if (params.get("geojson")) {
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
                // map.fitBounds(turf.bbox(data), {padding: 20});
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
            if (target === "") {
                continue;
            }
            // Get a source layer name from target URL, eg. 'naps' or 'laps', as in 'http://localhost:3001/services/rye/{naps,laps}/tiles/...'.
            // Deriving this name from the target ASSUMES a conventional URI scheme from TIPPECANOE.
            // It is index=5 in the URL path, splitting on '/'s.
            // For example:
            //   http://localhost:3001/services/ia/naps/tiles/{z}/{x}/{y}.pbf => 'naps'
            //   http://localhost:3001/services/ia/valid/tiles/{z}/{x}/{y}.pbf => 'valid'
            //   services/rye/s2_cells/level-13-polygons_edge
            // const sourceID = target.split("/")[4] + '-' + target.split("/")[5]; // => 'rye-naps'
            let sourceID = /\/services\/(.*)\/tiles\//.exec(target)[0];
            sourceID = sourceID.replace("/services/", "").replace("/tiles/", "");

            const sourceLayer = sourceID.split("/").pop().replace(/_edge$/, "");

            // Regex for extracting the string between /services/ and /tiles/


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
                    // [">", "Count", 100],
                ];

            } else if (false) /*(/(valid)/.test(target))*/ {

                addLayerObject.type = 'circle';
                addLayerObject.paint = paintFor('circle');

                // if (/valid/.test(target)) {
                addLayerObject.paint["circle-color"] = "#888888";
                addLayerObject.paint["circle-opacity"] = 0.8;
                addLayerObject.paint["circle-radius"] = 2;
                addLayerObject.filter = [
                    'all',
                ];

            } else if (/(tracks)/.test(target)) {
                addLayerObject.type = 'circle';
                addLayerObject.paint = paintFor('circle');
                // addLayerObject.paint["circle-color"] = "#5a5a5a";
                addLayerObject.paint["circle-color"] = [
                    'match',
                    ['get', 'Activity'],
                    'Stationary', '#f32d2d',
                    'Walking', '#e78719',
                    'Running', '#028532',
                    'Bike', '#3112f6',
                    'Automotive', '#d670fa',
                    'Unknown', '#444444',
                    '#888888',
                ];

                // if (/valid/.test(target)) {
                // addLayerObject.paint["circle-color"] = {
                //     'property': 'Name',
                //     'type': 'categorical',
                //     'stops': [
                //         ["Rye16", '#0000FF'],
                //         ["false", '#FF0000'],
                //     ]
                // };

                addLayerObject.paint["circle-opacity"] = 0.8;
                addLayerObject.paint["circle-radius"] = 2;

                addLayerObject.filter = [
                    'all',
                ];

            } else if (/(cells)/.test(target)) {
                console.debug("target test CELLS");

                addLayerObject.type = 'fill';
                addLayerObject.paint = paintFor('fill');

                addLayerObject.filter = [
                    'all',
                ];

            } else if (/tripdetected/.test(target)) {
                addLayerObject.type = 'circle';
                addLayerObject.paint = paintFor('circle');
                addLayerObject.paint["circle-color"] = {
                    'property': 'IsTrip',
                    'type': 'categorical',
                    'stops': [
                        [true, '#0000FF'],
                        [false, '#FF0000'],
                    ]
                };
                addLayerObject.paint["circle-opacity"] = 0.8;
                addLayerObject.paint["circle-radius"] = 2;
                addLayerObject.filter = [
                    'all',
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
                    ['>', 'RawPointCount', 30],
                    ['<', 'Duration', 86000],
                    // ['>', 'Duration', 120],
                    [
                        'any',
                        ['!=', 'Activity', 'Walking'],
                        ['>', 'Duration', 120],
                    ],
                    ['<', 'Accuracy_Mean', 25],
                    [
                        'any',
                        ['!=', 'Activity', 'Stationary'],
                        ['>=', 'Distance_Absolute', 100],
                        ['>=', 'Distance_Traversed', 250],
                    ],

                    // ['==', 'Activity', 'Bike'],

                    // ['>=', 'Speed', 1],
                    // ['>', 'Duration', 60],
                    // ['!=', 'Activity', 'Stationary'],
                    // ['!=', 'Activity', 'Unknown'],
                    // ['<', 'AverageAccuracy', 35],
                ];
                addLayerObject.filter = ['all'];
            }

            map.addLayer(addLayerObject);
            console.debug("DEBUG: Add vector target layer.", "addLayerObject", addLayerObject);

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
