let map;
let markers = [];

function initMap() {
  
    const hamiltonCenter = { lat: 43.2557, lng: -79.8711 };
    
    map = new google.maps.Map(document.getElementById('map'), {
        center: hamiltonCenter,
        zoom: 12,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });

    
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: {
            strokeColor: '#2c5f7c',
            strokeWeight: 4
        }
    });
    directionsRenderer.setMap(map);
    
    infoWindow = new google.maps.InfoWindow();
    geocoder = new google.maps.Geocoder();

 
    loadSpeedHumps();

  
}