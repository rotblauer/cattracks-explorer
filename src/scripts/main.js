import maplibregl from 'maplibre-gl'; // or "const mapboxgl = require('mapbox-gl');"
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



        map.addSource('cattracks', {
            type: 'vector',
            tiles: ['http://localhost:3001/services/ia.level-23/tiles/{z}/{x}/{y}.pbf'],
            minzoom: 3,
            maxzoom: 18
        });
        // https://maplibre.org/maplibre-style-spec/layers/#paint-circle-circle-color

        let meters = 100; // ["get", "Accuracy"]
        map.addLayer({
            'id': 'my-cattracks',
            'type': 'circle',
            'source': 'cattracks',
            'source-layer': 'ia.level-23',
            'paint': {
                // 'circle-color': '#ff0014',
                // https://docs.mapbox.com/mapbox-gl-js/example/data-driven-circle-colors/
                // Color circles by ethnicity, using a `match` expression.
                'circle-color': [
                    'match',
                    ['get', 'Activity'],
                    'Stationary',
                    '#f32d2d',
                    'Walking',
                    '#e78719',
                    'Running',
                    '#028532',
                    'Bike',
                    '#3112f6',
                    'Automotive',
                    '#d670fa',
                    'Unknown',
                    '#00000000',
                    /* else */ '#00000000',
                ],
                'circle-opacity': ["interpolate", ["linear"], ["get", "Accuracy"], 4, 0.8, 100, 0.1],
                'circle-radius': ["interpolate", ["linear"], ["get", "Accuracy"], 4, 2, 100, 30],
                'circle-blur': ["interpolate", ["linear"], ["get", "Accuracy"], 4, 0, 100, 0.8],
                // 'circle-stroke-width': 1,
                // 'circle-stroke-color': '#444',
                // https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js
                // 'circle-radius': [
                //     'interpolate',
                //     // ['exponential', 2],
                //     ['linear'],
                //     ['get', "Accuracy"],
                //     4, 1.5, // 0, 0,
                //     100, [
                //         '/',
                //         ['/', meters, 0.075],
                //         ['cos', ['*', ['get', 'lat'], ['/', Math.PI, 180]]],
                //     ],
                // ],
                // https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js
                // 'circle-radius': ["interpolate", ["linear"], ["get", "Accuracy"], 4, 1, 100, metersToPixelsAtMaxZoom(100, 53.7654751)],
            }
        });

        function filterBy(min, max) {
            var filters = [
                'all',
                [">=", 'Accuracy', min],
                ["<=", 'Accuracy', max]
            ];
            map.setFilter('my-cattracks', filters);
        }
        filterBy(1, 20);

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
