import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useState } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
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

    return (
        <View style={styles.container}>
            <MapView
                style={styles.map}
                region={{
                    latitude: location?.latitude || 37.78825,
                    longitude: location?.longitude || -122.4324,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
            >
                {location && <Marker
                    coordinate={{
                        latitude: location?.latitude,
                        longitude: location?.longitude
                    }}
                />}

                {otherLocation && <Marker
                    coordinate={{
                        latitude: otherLocation.latitude,
                        longitude: otherLocation.longitude
                    }}
                    pinColor='blue'
                />}
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: '100%', height: '100%' },
});