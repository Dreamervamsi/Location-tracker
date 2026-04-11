import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Alert, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { io, Socket } from 'socket.io-client';

const LOCATION_TASK_NAME = 'background-location-task';
const SOCKET_URL = "https://location-tracker-uz7h.onrender.com";

let socket: Socket | null = null;

const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket"],
        });
    }
    return socket;
};

// HTML for Leaflet Map
const mapHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; width: 100vw; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map').setView([0, 0], 2);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OSM'
        }).addTo(map);

        // Explicitly define icons using CDN links to avoid "missing icon" issue
        var DefaultIcon = L.Icon.extend({
            options: {
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            }
        });
        var greenIcon = new DefaultIcon();
        var blueIcon = new DefaultIcon();

        var userMarker = null;
        var otherMarker = null;
        var hasCentered = false;

        function handleMessage(message) {
            try {
                var data = JSON.parse(message);
                
                if (data.userLocation) {
                    var lat = data.userLocation.latitude;
                    var lng = data.userLocation.longitude;
                    if (!userMarker) {
                        userMarker = L.marker([lat, lng], {icon: greenIcon}).addTo(map);
                        userMarker.getElement().style.filter = "hue-rotate(120deg)";
                        if (!hasCentered) {
                            map.setView([lat, lng], 15);
                            hasCentered = true;
                        }
                    } else {
                        userMarker.setLatLng([lat, lng]);
                    }
                }

                if (data.otherLocation) {
                    var lat = data.otherLocation.latitude;
                    var lng = data.otherLocation.longitude;
                    if (!otherMarker) {
                        otherMarker = L.marker([lat, lng], {icon: blueIcon}).addTo(map);
                        otherMarker.getElement().style.filter = "hue-rotate(240deg)";
                    } else {
                        otherMarker.setLatLng([lat, lng]);
                    }
                }
            } catch (e) {
                // Silently handle JSON parse errors
            }
        }

        window.addEventListener('message', function(event) {
            handleMessage(event.data);
        });
        document.addEventListener('message', function(event) {
            handleMessage(event.data);
        });
    </script>
</body>
</html>
`;

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
    if (error) {
        console.error("Background task error:", error);
        return;
    }
    if (data) {
        const { locations } = data;
        const location = locations[0];
        if (location) {
            getSocket().emit('my-location', location.coords);
        }
    }
});

export default function App() {
    const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [otherLocation, setOtherLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const webViewRef = useRef<WebView>(null);

    useEffect(() => {
        const s = getSocket();

        s.on('location-update', (data) => {
            setOtherLocation(data);
        });

        async function startTracking() {

            // foreground permission
            const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
            if (foregroundStatus !== 'granted') {
                Alert.alert("Permission denied", "Foreground location permission is required.");
                return;
            }
            // background permission
            const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
            if (backgroundStatus !== 'granted') {
                Alert.alert("Permission denied", "Background location permission is required for tracking while the app is closed.");
                return;
            }

            // background task
            await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.High,
                timeInterval: 2000,
                distanceInterval: 1,
            });

            // foreground task
            await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 2000,
                    distanceInterval: 1,
                },
                (loc) => {
                    setLocation(loc.coords);
                }
            );
        }

        startTracking();

        return () => {
            s.disconnect();
            socket = null;
        };
    }, []);

    // Sync state to WebView
    useEffect(() => {
        if (webViewRef.current && (location || otherLocation)) {
            const data = {
                userLocation: location,
                otherLocation: otherLocation
            };
            webViewRef.current.postMessage(JSON.stringify(data));
        }
    }, [location, otherLocation]);

    return (
        <View style={styles.container}>
            <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: mapHtml }}
                style={styles.map}
                scrollEnabled={false}
                onMessage={(event) => {}}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: '100%', height: '100%' },
});