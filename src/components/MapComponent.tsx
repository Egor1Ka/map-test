import React, { useCallback, useState, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, MarkerClusterer } from '@react-google-maps/api';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../fireBase/firebaseConfig';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 48.450001,
  lng: 34.983334,
};

interface MarkerData {
  id: string;
  lat: number;
  lng: number;
  element?: google.maps.Marker;
}

export const MapComponent: React.FC = () => {
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    const loadMarkers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'markers'));
        const markersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          lat: doc.data().lat,
          lng: doc.data().lng,
        }));
        setMarkers(markersData);
      } catch (error) {
        console.error('Error loading markers:', error);
      }
    };

    loadMarkers();
  }, []);

  const onMarkerDragEnd = useCallback(
    async (event: google.maps.MapMouseEvent, id: string) => {
      if (event.latLng) {
        const updatedMarkers = markers.map((marker) =>
          marker.id === id
            ? { ...marker, lat: event.latLng!.lat(), lng: event.latLng!.lng() }
            : marker
        );
        setMarkers(updatedMarkers);

        try {
          const markerDoc = doc(db, 'markers', id);
          await setDoc(
            markerDoc,
            {
              lat: event.latLng!.lat(),
              lng: event.latLng!.lng(),
            },
            { merge: true }
          );
          console.log('Updated marker:', id);
        } catch (error) {
          console.error('Error updating marker:', error);
        }
      }
    },
    [markers]
  );

  const deleteMarker = useCallback(
    async (id: string) => {
      const marker = markers.find((marker) => marker.id === id);
      if (marker && marker.element) {
        marker.element.setMap(null);
      }
      setMarkers((current) => current.filter((marker) => marker.id !== id));

      try {
        const markerDoc = doc(db, 'markers', id);
        await deleteDoc(markerDoc);
      } catch (error) {
        console.error('Error deleting marker:', error);
      }
    },
    [markers]
  );

  useEffect(() => {
    if (mapRef.current) {
      markers.forEach((marker) => {
        if (!marker.element) {
          const markerElement = new google.maps.Marker({
            position: new google.maps.LatLng(marker.lat, marker.lng),
            map: mapRef.current!,
            draggable: true,
          });

          markerElement.addListener(
            'dragend',
            (event: google.maps.MapMouseEvent) => {
              onMarkerDragEnd(event, marker.id);
            }
          );

          markerElement.addListener('dblclick', () => {
            deleteMarker(marker.id);
          });

          marker.element = markerElement;
        }
      });
    }
  }, [markers, deleteMarker, onMarkerDragEnd]);

  const onMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newMarker = {
        id: '',
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };

      setMarkers((current) => [...current, newMarker]);

      try {
        const docRef = await addDoc(collection(db, 'markers'), {
          lat: newMarker.lat,
          lng: newMarker.lng,
        });

        console.log(newMarker);
        const createActor = await fetch(
          'https://tt3w13vopy.apigw.corezoid.com/mainrRceiver',
          {
            method: 'POST',
            body: JSON.stringify({
              event: 'createActor',
              newMarker: {
                lat: newMarker.lat,
                lng: newMarker.lng,
              },
            }),
          }
        );

        newMarker.id = docRef.id;
        setMarkers((current) => {
          return current.map((marker) =>
            marker.lat === newMarker.lat && marker.lng === newMarker.lng
              ? newMarker
              : marker
          );
        });
      } catch (error) {
        console.error('Error adding marker:', error);
      }
    }
  }, []);

  const deleteAllMarkers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'markers'));
      const batch = writeBatch(db);
      querySnapshot.forEach((markerDoc) => {
        const markerRef = doc(db, 'markers', markerDoc.id);
        batch.delete(markerRef);
      });
      await batch.commit();

      markers.forEach((marker) => {
        if (marker.element) {
          marker.element.setMap(null);
        }
      });

      setMarkers([]);
    } catch (error) {
      console.error('Error deleting all markers:', error);
    }
  };

  return (
    <LoadScript googleMapsApiKey='AIzaSyDhKtOGdR803kiu30NDWLl1Jm127BiPwOo'>
      <div style={{ position: 'relative', height: '100%' }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={10}
          onClick={onMapClick}
          onLoad={(map) => {
            mapRef.current = map;
          }}
        >
          <MarkerClusterer>
            {(clusterer) => (
              <>
                {markers.map((marker) => (
                  <div key={marker.id}></div>
                ))}
              </>
            )}
          </MarkerClusterer>
        </GoogleMap>
        <button
          onClick={deleteAllMarkers}
          style={{ position: 'absolute', bottom: 30, left: 10, zIndex: 10 }}
        >
          Delete All Markers
        </button>
      </div>
    </LoadScript>
  );
};
