import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { io, Socket } from 'socket.io-client';

export default function App() {
    const [location, setLocation] = useState<Location.LocationObjectCoords | null>(null);
    const socket = useRef<Socket | null>(null);

    useEffect(() => {

        socket.current = io("http://192.168.194.136:3000", {
            transports: ["websocket"],
        });
        let subscription: Location.LocationSubscription;

        async function trackPos() {
            let { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                console.log("permission denied");
                return;
            }
            subscription = await Location.watchPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 2000,
                distanceInterval: 1
            },
                (loc) => {
                    setLocation(loc.coords);
                    socket.current?.emit('my-location', loc.coords);
                });
        }

        trackPos();

        return () => {
            socket.current?.disconnect();
            subscription?.remove();
        }
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
                <Marker
                    coordinate={{
                        latitude: location?.latitude || 37.78825,
                        longitude: location?.longitude || -122.4324
                    }}
                />
            </MapView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: '100%', height: '100%' },
});