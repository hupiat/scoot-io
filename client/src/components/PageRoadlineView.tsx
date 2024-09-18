import {Modal, View} from '@ant-design/react-native';
import React, {useDeferredValue, useEffect, useState} from 'react';
import {Dimensions, StyleSheet} from 'react-native';
import MapView, {Marker, MapPolyline} from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import SearchInputLocations from './SearchInputLocations';
import {GeoCode, Place} from '../commons/types';
import {useRideContext} from '../commons/rides/context';
import {FloatingAction} from 'react-native-floating-action';
import {useStoreDataRides} from '../commons/middleware/hooks';
import {displayErrorToast} from '../commons/tools';
import Icon from 'react-native-vector-icons/FontAwesome';
import {fetchGeocodeRouting} from '../commons/middleware/tools';

export default function PageRoadlineView() {
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

  const deferredPosition = useDeferredValue(position);

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
        interval: 2000,
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
        </MapView>
      </View>
      <View style={styles.searchContainer}>
        <SearchInputLocations
          hideResults={!!destination}
          onSelectPlace={handlePlaceSelect}
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
                      onPress: () => {
                        setDestination(null);
                        setDestinationName(null);
                        setRideGeometry(null);
                      },
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
                          .catch(() =>
                            displayErrorToast({
                              name: 'Error',
                              message: 'This ride is already in base',
                            }),
                          ),
                    },
                  ]);
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
