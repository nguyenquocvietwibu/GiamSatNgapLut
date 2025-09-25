mapboxgl.accessToken = 'pk.eyJ1Ijoibmd1eWVudmlldDIweHgiLCJhIjoiY21mNTVlNXR2MDIydjJqcHBqZXN4OTNyaCJ9.K7goCVrep9OsVEacfuPqtQ';
const bản_đồ = new mapboxgl.Map({
    container: 'bản-đồ',
    style: 'mapbox://styles/mapbox/standard', // Use the standard style for the map
    projection: 'globe', // display the map as a globe
    zoom: 1, // initial zoom level, 0 is the world view, higher values zoom in
    center: [30, 15] // center the map on this longitude and latitude
});

bản_đồ.addControl(new mapboxgl.NavigationControl());


bản_đồ.on('style.load', () => {
    bản_đồ.setFog({
        "range": [0.5, 10],
        "color": "white",
        "horizon-blend": 0.01,
        "high-color": "blue",
        "space-color": "#000000",
        "star-intensity": 1
    });

});