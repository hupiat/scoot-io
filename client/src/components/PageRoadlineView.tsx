import {Modal, View} from '@ant-design/react-native';
import React, {useDeferredValue, useEffect, useState} from 'react';
import {Dimensions, StyleSheet} from 'react-native';
import MapView, {Marker, MapPolyline} from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import SearchInputLocations from './SearchInputLocations';
import {
  Marker as MarkerBusinessObject,
  MarkerType,
  Place,
} from '../commons/types';
import {useRideContext} from '../commons/rides/context';
import {FloatingAction} from 'react-native-floating-action';
import {
  useStoreDataMarkers,
  useStoreDataRides,
} from '../commons/middleware/hooks';
import {areCoordinatesEqual, displayErrorToast} from '../commons/tools';
import Icon from 'react-native-vector-icons/FontAwesome';
import {fetchGeocodeRouting} from '../commons/middleware/tools';
import Toast from 'react-native-toast-message';

export default function PageRoadlineView() {
  const [markersData, setMarkersData] = useState<MarkerBusinessObject[]>();
  const {
    position,
    setPosition,
    destination,
    setDestination,
    rideGeometry,
    setRideGeometry,
    destinationName,
    setDestinationName,
  } = useRideContext();
  const [, storeDataRides] = useStoreDataRides();
  const [, storeDataMarkers] = useStoreDataMarkers();

  const deferredPosition = useDeferredValue(position);

  useEffect(() => {
    storeDataMarkers
      .fetchAll()
      .then(() => setMarkersData(Array.from(storeDataMarkers.data!)));
  }, []);

  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      location =>
        setPosition({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      () =>
        displayErrorToast({
          name: 'Error',
          message: 'Could not get location',
        }),
      {
        enableHighAccuracy: true,
        accuracy: {
          android: 'high',
        },
      },
    );
    return () => Geolocation.clearWatch(watchId);
  }, []);

  const handlePlaceSelect = async (place: Place) => {
    const coords = await fetchGeocodeRouting(
      position!.longitude,
      position!.latitude,
      place.geometry.longitude,
      place.geometry.latitude,
    );
    setDestinationName(place.name);
    setDestination({
      latitude: place.geometry.latitude,
      longitude: place.geometry.longitude,
    });
    setRideGeometry(coords);
  };

  const plotholesMarkers = markersData?.filter(
    marker => marker.type === 'plothole',
  );
  const denseTrafficMarkers = markersData?.filter(
    marker => marker.type === 'dense_traffic',
  );

  const handleDeleteMarker = (marker: MarkerBusinessObject) => {
    Modal.alert('Confirmation', 'Delete this marker ?', [
      {text: 'Cancel', onPress: () => {}, style: 'cancel'},
      {
        text: 'OK',
        onPress: () => {
          storeDataMarkers.delete(marker.id).then(() => {
            setMarkersData(markersData?.filter(m => m.id !== marker.id));
            Toast.show({
              type: 'success',
              text1: 'DELETE',
              text2: 'Marker has been deleted !',
            });
          });
        },
      },
    ]);
  };

  const handleAddMarker = (type: MarkerType) => {
    if (
      markersData?.some(markerData =>
        areCoordinatesEqual(markerData.geometry, position!),
      )
    ) {
      displayErrorToast({
        name: 'Error',
        message: 'Already declared',
      });
      return;
    }
    const obj = {
      type: type,
      geometry: position!,
    };
    storeDataMarkers
      .add(obj as any)
      .then(() => {
        setMarkersData([...markersData!, obj as any]);
        Toast.show({
          type: 'success',
          text1: 'ADD',
          text2: 'Marker has been added !',
        });
      })
      .catch(() =>
        displayErrorToast({
          name: 'Error',
          message: 'Already declared',
        }),
      );
  };

  const resetRide = () => {
    setDestination(null);
    setDestinationName(null);
    setRideGeometry(null);
  };

  useEffect(() => {
    if (position && destination && areCoordinatesEqual(position, destination)) {
      resetRide();
      Toast.show({
        type: 'info',
        text1: 'Ride',
        text2: 'You are arrived !',
        autoHide: false,
      });
    }
  }, [position]);

  return (
    <>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.mapStyle}
          showsTraffic
          showsScale
          showsBuildings
          showsCompass
          showsIndoorLevelPicker
          showsIndoors
          showsPointsOfInterest
          showsMyLocationButton
          region={
            position
              ? {
                  latitude: position.latitude,
                  longitude: position.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }
              : undefined
          }>
          {deferredPosition && (
            <Marker
              coordinate={{
                latitude: deferredPosition.latitude,
                longitude: deferredPosition.longitude,
              }}
              image={require('../assets/marker.png')}
              style={{width: 50, height: 50}}
            />
          )}
          {deferredPosition && destination && rideGeometry && (
            <MapPolyline strokeWidth={5} coordinates={rideGeometry} />
          )}
          {plotholesMarkers &&
            plotholesMarkers.map(marker => (
              <Marker
                key={marker.id}
                coordinate={{
                  latitude: marker.geometry.latitude,
                  longitude: marker.geometry.longitude,
                }}
                image={require('../assets/marker_plothole.png')}
                style={{width: 50, height: 50}}
                onSelect={() => handleDeleteMarker(marker)}
              />
            ))}
          {denseTrafficMarkers &&
            denseTrafficMarkers.map(marker => (
              <Marker
                key={marker.id}
                coordinate={{
                  latitude: marker.geometry.latitude,
                  longitude: marker.geometry.longitude,
                }}
                image={require('../assets/marker_dense_traffic.png')}
                style={{width: 50, height: 50}}
                onSelect={() => handleDeleteMarker(marker)}
              />
            ))}
        </MapView>
      </View>
      <View style={styles.searchContainer}>
        <SearchInputLocations
          hideResults={!!destination}
          onSelectPlace={handlePlaceSelect}
          forceDisplay={destinationName || undefined}
        />
      </View>
      {!!destination && (
        <View>
          <FloatingAction
            actions={[
              {
                name: 'ride_cancel',
                text: 'Cancel ride',
                icon: <Icon name="power-off" color={'white'} size={15} />,
              },
              {
                name: 'ride_save',
                text: 'Save ride',
                icon: <Icon name="save" color={'white'} size={15} />,
              },
              {
                name: 'ride_plothole',
                text: 'Mark plothole as a danger',
                icon: <Icon name="warning" color={'white'} size={15} />,
              },
              {
                name: 'ride_dense_traffic',
                text: 'Mark dense traffic',
                icon: <Icon name="car" color={'white'} size={15} />,
              },
            ]}
            onPressItem={name => {
              switch (name) {
                case 'ride_cancel':
                  Modal.alert('Confirmation', 'Cancel the current ride ?', [
                    {text: 'Cancel', onPress: () => {}, style: 'cancel'},
                    {
                      text: 'OK',
                      onPress: resetRide,
                    },
                  ]);
                  break;
                case 'ride_save':
                  Modal.alert('Confirmation', 'Save the current ride ?', [
                    {text: 'Cancel', onPress: () => {}, style: 'cancel'},
                    {
                      text: 'OK',
                      onPress: () =>
                        storeDataRides
                          .add({
                            name: destinationName!,
                            destination: destination,
                          })
                          .then(() => {
                            Toast.show({
                              type: 'success',
                              text1: 'ADD',
                              text2: 'Ride has been saved !',
                            });
                          })
                          .catch(() =>
                            displayErrorToast({
                              name: 'Error',
                              message: 'This ride is already in base',
                            }),
                          ),
                    },
                  ]);
                  break;
                case 'ride_plothole':
                  handleAddMarker('plothole');
                  break;
                case 'ride_dense_traffic':
                  handleAddMarker('dense_traffic');
                  break;
              }
            }}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    position: 'absolute',
    width: '100%',
    top: 0,
  },
  mapStyle: {
    flex: 1,
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    bottom: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  mapContainer: {
    flex: 1,
  },
});
