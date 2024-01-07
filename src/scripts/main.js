import maplibregl from 'maplibre-gl'; // or "const mapboxgl = require('mapbox-gl');"
// import * as $ from 'jquery'
// import 'maplibre-gl/dist/maplibre-gl.css';

(function() {

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

    map.on('load', function () {
        console.log("map loaded");

        // http://ionden.com/a/plugins/ion.rangeSlider/api.html
        $("#accuracySlider").ionRangeSlider({
            type: "double",
            skin: "flat", // "round",
            hide_min_max: false,
            force_edges: true,
            min: 0,
            max: 200,
            grid: false,
            onChange: function (values) {
                const source = map.getSource('cattracks');
                const {from, to} = values;
                if (!source) return;
                filterBy("Accuracy", from, to);
                //const filteredData = filterData(data, from, to);
                //source.setData(filteredData);
            },
        });
        $("#speedSlider").ionRangeSlider({
            type: "double",
            skin: "flat", // "round",
            hide_min_max: false,
            force_edges: true,
            min: 0,
            max: Math.round(200), // -> 200 kmph -> m/s
            grid: false,
            onChange: function (values) {
                const source = map.getSource('cattracks');
                const {from, to} = values;
                if (!source) return;
                filterBy("Speed", from, to);
                //const filteredData = filterData(data, from, to);
                //source.setData(filteredData);
            },
        });

        const tileService = "edge"; // ia.level-23
        const sourceLayer = "catTrackEdge"; // ia.level-23
        const tileSourceName = "cattracks";

        map.addSource( tileSourceName, {
            type: 'vector',
            tiles: [`http://localhost:3001/services/${tileService}/tiles/{z}/{x}/{y}.pbf`],
            minzoom: 3,
            maxzoom: 18
        });
        // https://maplibre.org/maplibre-style-spec/layers/#paint-circle-circle-color

        let meters = 100; // ["get", "Accuracy"]
        map.addLayer({
            'id': 'my-cattracks',
            'type': 'circle',
            'source':  tileSourceName,
            'source-layer': sourceLayer,
            'paint': {
                // https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/
                'circle-color': [
                    'match',
                    ['get', 'Activity'],
                    'Stationary', '#f32d2d',
                    'Walking', '#e78719',
                    'Running', '#028532',
                    'Bike', '#3112f6',
                    'Automotive', '#d670fa',
                    'Unknown', '#00000000',
                    /* else */ '#00000000',
                ],
                'circle-opacity': ["interpolate", ["linear"], ["get", "Accuracy"], 4, 0.8, 100, 0.1],
                'circle-radius': ["interpolate", ["linear"], ["get", "Accuracy"], 4, 2, 100, 30],
                'circle-blur': ["interpolate", ["linear"], ["get", "Accuracy"], 4, 0, 100, 0.8],
                // TODO: get Accuracy to be circle-radius in true-to-zoom meters
                // https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js
            }
        });

        let accuracyD = $("#accuracySlider").data("ionRangeSlider");
        console.log("accuracyD", accuracyD);
        let speedD = $("#speedSlider").data("ionRangeSlider");
        let myFilters = {
            "Accuracy": [accuracyD.old_from || 0, accuracyD.old_to || 200],
            "Speed": [speedD.old_from || 0, speedD.old_to || 100],
        }
        function filterBy(property, min, max) {

            var filters = [
                'all',
                // [">=", property, min],
                // ["<=", property, max]
            ];

            myFilters[property] = [min, max];

            for (var key in myFilters) {
                if (myFilters.hasOwnProperty(key)) {
                    filters.push([">=", key, key == "Speed" ? myFilters[key][0] / 3.6 : myFilters[key][0]]);
                    filters.push(["<=", key, key == "Speed" ? myFilters[key][1] / 3.6 : myFilters[key][1]]);
                }
            }

            map.setFilter('my-cattracks', filters);
        }
        filterBy("Accuracy", accuracyD.old_from, accuracyD.old_to);
        filterBy("Speed", speedD.old_from, speedD.old_to);

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
