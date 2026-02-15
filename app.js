// Global variables
let map;
let markers = [];
let userMarker = null;
let directionsService;
let directionsRenderer;
let speedHumpsData = [];
let infoWindow;
let geocoder;

// Initialize the map
function initMap() {
    // Center on Hamilton, ON
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

    // Initialize services
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

    // Load speed hump data
    loadSpeedHumps();

    // Setup form submission
    document.getElementById('addLocationForm').addEventListener('submit', handleFormSubmit);
}

// Load speed hump data (from embedded script when opening file://, or fetch when on a server)
async function loadSpeedHumps() {
    try {
        if (typeof window.speedHumpsData !== 'undefined' && Array.isArray(window.speedHumpsData)) {
            speedHumpsData = window.speedHumpsData;
        } else {
            const response = await fetch('speedHumps.json');
            speedHumpsData = await response.json();
        }

        // Create markers for all speed humps
        createMarkers();

        // Update statistics
        updateStats();

        // Populate destination dropdown
        populateDestinationDropdown();
    } catch (error) {
        console.error('Error loading speed humps data:', error);
        alert('Error loading speed hump data. Please refresh the page.');
    }
}

// Create markers on the map
function createMarkers() {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    speedHumpsData.forEach(hump => {
        const position = { lat: hump.lat, lng: hump.lng };
        
        // Create custom marker based on type
        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: hump.location,
            icon: getMarkerIcon(hump.type),
            humpData: hump
        });

        // Add click listener for info window
        marker.addListener('click', function() {
            showInfoWindow(marker, hump);
        });

        markers.push(marker);
    });

    updateStats();
}

// Get custom marker icon based on type
function getMarkerIcon(type) {
    const color = type === 'Cushion' ? '#FFC107' : '#DC3545';
    const label = type === 'Cushion' ? 'C' : 'P';
    
    // Create SVG marker icon instead of using Google Charts API
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="48" viewBox="0 0 32 48">
            <path fill="${color}" stroke="#000" stroke-width="1.5" 
                d="M16,0 C7.2,0 0,7.2 0,16 C0,28 16,48 16,48 S32,28 32,16 C32,7.2 24.8,0 16,0 Z"/>
            <circle cx="16" cy="16" r="10" fill="white"/>
            <text x="16" y="21" font-size="14" font-weight="bold" text-anchor="middle" fill="${color}">${label}</text>
        </svg>
    `;
    
    return {
        url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(32, 48),
        anchor: new google.maps.Point(16, 48)
    };
}

// Show info window for a marker
function showInfoWindow(marker, hump) {
    const content = `
        <div style="max-width: 300px;">
            <h6 style="color: #2c5f7c; margin-bottom: 10px;">
                <i class="bi bi-geo-alt-fill"></i> Speed Hump Location
            </h6>
            <p style="margin-bottom: 8px;"><strong>Location:</strong> ${hump.location}</p>
            <p style="margin-bottom: 8px;"><strong>Type:</strong> 
                <span class="badge bg-${hump.type === 'Cushion' ? 'warning' : 'danger'}">
                    ${hump.type}
                </span>
            </p>
            <p style="margin-bottom: 8px;"><strong>ID:</strong> ${hump.id}</p>
            <div style="margin-top: 10px;">
                <button class="btn btn-sm btn-primary" onclick="directionsToMarker('${hump.id}')">
                    <i class="bi bi-arrow-right"></i> Directions Here
                </button>
            </div>
        </div>
    `;
    
    infoWindow.setContent(content);
    infoWindow.open(map, marker);
}

// Filter markers by type
function filterMarkers(filterType) {
    // Update button active state
    document.querySelectorAll('.filter-buttons .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the correct button based on filter type
    const buttons = document.querySelectorAll('.filter-buttons .btn');
    buttons.forEach(btn => {
        const btnText = btn.textContent.trim();
        if ((filterType === 'all' && btnText.includes('Show All')) ||
            (filterType === 'Cushion' && btnText.includes('Cushion')) ||
            (filterType === 'Permanent' && btnText.includes('Permanent')) ||
            (filterType === 'user' && btnText.includes('My Locations'))) {
            btn.classList.add('active');
        }
    });

    markers.forEach(marker => {
        const humpData = marker.humpData;
        
        if (filterType === 'all') {
            marker.setVisible(true);
        } else if (filterType === 'user') {
            // Show only user-added markers
            marker.setVisible(humpData.userAdded === true);
        } else {
            // Show markers matching the selected type
            marker.setVisible(humpData.type === filterType);
        }
    });

    updateStats();
}

// Show user location
function showUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Remove existing user marker
                if (userMarker) {
                    userMarker.setMap(null);
                }

                // Create user location marker with custom icon
                userMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: 'Your Location',
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#4285F4',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 3
                    },
                    animation: google.maps.Animation.DROP
                });

                // Add info window to user marker
                userMarker.addListener('click', function() {
                    infoWindow.setContent(`
                        <div style="padding: 10px;">
                            <h6 style="color: #2c5f7c;">Your Current Location</h6>
                            <p>Latitude: ${userLocation.lat.toFixed(6)}</p>
                            <p>Longitude: ${userLocation.lng.toFixed(6)}</p>
                        </div>
                    `);
                    infoWindow.open(map, userMarker);
                });

                // Center map on user location
                map.setCenter(userLocation);
                map.setZoom(14);

                // Find nearby speed humps
                findNearbyHumps(userLocation);
            },
            error => {
                alert('Error getting your location. Please enable location services.');
                console.error('Geolocation error:', error);
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}

// Find nearby speed humps
function findNearbyHumps(userLocation) {
    const nearbyHumps = speedHumpsData.filter(hump => {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(userLocation.lat, userLocation.lng),
            new google.maps.LatLng(hump.lat, hump.lng)
        );
        return distance <= 1000; // Within 1km
    });

    if (nearbyHumps.length > 0) {
        const message = `Found ${nearbyHumps.length} speed hump${nearbyHumps.length > 1 ? 's' : ''} within 1km of your location.`;
        infoWindow.setContent(`
            <div style="padding: 10px;">
                <h6 style="color: #2c5f7c;">Nearby Speed Humps</h6>
                <p>${message}</p>
            </div>
        `);
        infoWindow.setPosition(userLocation);
        infoWindow.open(map);
    }
}

// Handle form submission to add new location
function handleFormSubmit(e) {
    e.preventDefault();

    const locationName = document.getElementById('locationName').value;
    const humpType = document.getElementById('humpType').value;
    const address = document.getElementById('address').value;
    const description = document.getElementById('description').value;

    // Geocode the address
    geocoder.geocode({ address: address + ', Hamilton, ON, Canada' }, (results, status) => {
        if (status === 'OK') {
            const location = results[0].geometry.location;
            
            // Create new speed hump data
            const newHump = {
                id: 'user-' + Date.now(),
                type: humpType,
                location: locationName,
                lat: location.lat(),
                lng: location.lng(),
                description: description,
                userAdded: true
            };

            // Add to data array
            speedHumpsData.push(newHump);

            // Create marker
            const marker = new google.maps.Marker({
                position: { lat: newHump.lat, lng: newHump.lng },
                map: map,
                title: newHump.location,
                icon: getMarkerIcon(newHump.type),
                humpData: newHump,
                animation: google.maps.Animation.DROP
            });

            // Add click listener
            marker.addListener('click', function() {
                const content = `
                    <div style="max-width: 300px;">
                        <h6 style="color: #2c5f7c;">
                            <i class="bi bi-pin-map-fill"></i> User-Reported Location
                        </h6>
                        <p style="margin-bottom: 8px;"><strong>Location:</strong> ${newHump.location}</p>
                        <p style="margin-bottom: 8px;"><strong>Type:</strong> 
                            <span class="badge bg-${newHump.type === 'Cushion' ? 'warning' : 'danger'}">
                                ${newHump.type}
                            </span>
                        </p>
                        ${newHump.description ? `<p style="margin-bottom: 8px;"><strong>Notes:</strong> ${newHump.description}</p>` : ''}
                        <p style="margin-bottom: 8px;"><small class="text-muted">User-reported location</small></p>
                        <div style="margin-top: 10px;">
                            <button class="btn btn-sm btn-primary" onclick="directionsToMarker('${newHump.id}')">
                                <i class="bi bi-arrow-right"></i> Directions Here
                            </button>
                        </div>
                    </div>
                `;
                infoWindow.setContent(content);
                infoWindow.open(map, marker);
            });

            markers.push(marker);

            // Center map on new marker
            map.setCenter({ lat: newHump.lat, lng: newHump.lng });
            map.setZoom(15);

            // Update stats and dropdown
            updateStats();
            populateDestinationDropdown();

            // Show success message
            infoWindow.setContent(`
                <div style="padding: 10px;">
                    <h6 style="color: #28a745;">Success!</h6>
                    <p>Speed hump location added to the map.</p>
                </div>
            `);
            infoWindow.setPosition({ lat: newHump.lat, lng: newHump.lng });
            infoWindow.open(map);

            // Reset form
            document.getElementById('addLocationForm').reset();
        } else {
            alert('Geocoding failed: ' + status + '\nPlease check the address and try again.');
        }
    });
}

// Populate destination dropdown
function populateDestinationDropdown() {
    const select = document.getElementById('destinationSelect');
    
    // Keep only the first option
    select.innerHTML = '<option value="">Select destination...</option>';
    
    // Add options for visible markers (limit to first 50 for performance)
    const visibleMarkers = markers.filter(m => m.getVisible()).slice(0, 50);
    
    visibleMarkers.forEach(marker => {
        const humpData = marker.humpData;
        const option = document.createElement('option');
        option.value = humpData.id;
        option.textContent = humpData.location.substring(0, 50) + (humpData.location.length > 50 ? '...' : '');
        select.appendChild(option);
    });
}

// Get directions between two locations
function getDirections() {
    const originValue = document.getElementById('originSelect').value;
    const destinationId = document.getElementById('destinationSelect').value;

    if (!originValue || !destinationId) {
        alert('Please select both origin and destination.');
        return;
    }

    let origin;
    
    if (originValue === 'user') {
        if (!userMarker) {
            alert('Please set your location first by clicking "Show My Location".');
            return;
        }
        origin = userMarker.getPosition();
    } else {
        const originMarker = markers.find(m => m.humpData.id === originValue);
        if (!originMarker) return;
        origin = originMarker.getPosition();
    }

    const destinationMarker = markers.find(m => m.humpData.id === destinationId);
    if (!destinationMarker) return;
    
    const destination = destinationMarker.getPosition();

    const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            const route = result.routes[0].legs[0];
            infoWindow.setContent(`
                <div style="padding: 10px;">
                    <h6 style="color: #2c5f7c;">Route Information</h6>
                    <p><strong>Distance:</strong> ${route.distance.text}</p>
                    <p><strong>Duration:</strong> ${route.duration.text}</p>
                </div>
            `);
            infoWindow.setPosition(destination);
            infoWindow.open(map);
        } else {
            alert('Directions request failed: ' + status);
        }
    });
}

// Get directions to a specific marker (called from info window)
function directionsToMarker(humpId) {
    if (!userMarker) {
        alert('Please set your location first by clicking "Show My Location".');
        return;
    }

    const destinationMarker = markers.find(m => m.humpData.id === humpId);
    if (!destinationMarker) return;

    const origin = userMarker.getPosition();
    const destination = destinationMarker.getPosition();

    const request = {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
            
            const route = result.routes[0].legs[0];
            infoWindow.setContent(`
                <div style="padding: 10px;">
                    <h6 style="color: #2c5f7c;">Route from Your Location</h6>
                    <p><strong>Distance:</strong> ${route.distance.text}</p>
                    <p><strong>Duration:</strong> ${route.duration.text}</p>
                    <p><strong>Destination:</strong> ${destinationMarker.humpData.location}</p>
                </div>
            `);
            infoWindow.setPosition(destination);
            infoWindow.open(map);
        } else {
            alert('Directions request failed: ' + status);
        }
    });
}

// Update statistics
function updateStats() {
    const totalCount = speedHumpsData.length;
    const visibleCount = markers.filter(m => m.getVisible()).length;
    
    document.getElementById('totalCount').textContent = totalCount;
    document.getElementById('visibleCount').textContent = visibleCount;
}

// Make functions globally accessible
window.initMap = initMap;
window.filterMarkers = filterMarkers;
window.showUserLocation = showUserLocation;
window.getDirections = getDirections;
window.directionsToMarker = directionsToMarker;