import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  GoogleMap,
  LoadScript,
  MarkerClusterer,
  DirectionsService,
  DirectionsRenderer,
} from '@react-google-maps/api';
import { v4 as uuidv4 } from 'uuid';

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
  const [directions, setDirections] = useState<google.maps.DirectionsResult[]>(
    []
  );
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMarkerDragEnd = useCallback(
    (event: google.maps.MapMouseEvent, id: string) => {
      if (event.latLng) {
        const updatedMarkers = markers.map((marker) =>
          marker.id === id
            ? { ...marker, lat: event.latLng!.lat(), lng: event.latLng!.lng() }
            : marker
        );
        setMarkers(updatedMarkers);
      }
    },
    [markers]
  );

  const deleteMarker = useCallback(
    (id: string) => {
      const marker = markers.find((marker) => marker.id === id);
      if (marker && marker.element) {
        marker.element.setMap(null);
      }
      setMarkers((current) => current.filter((marker) => marker.id !== id));
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

  const onMapClick = async (e: google.maps.MapMouseEvent) => {
    console.log('e', e);
    if (e.latLng) {
      const newMarker: MarkerData = {
        id: uuidv4(),
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };

      console.log('newMarker', newMarker);
      setMarkers((current) => [...current, newMarker]);

      const createActor = await fetch(
        'https://tt3w13vopy.apigw.corezoid.com/mainrRceiver',
        {
          method: 'POST',
          body: JSON.stringify({
            event: 'createActor',
            newMarker: {
              id: newMarker.id, // Отправка уникального ID
              lat: newMarker.lat,
              lng: newMarker.lng,
            },
          }),
        }
      );
    }
  };

  const deleteAllMarkers = () => {
    markers.forEach((marker) => {
      if (marker.element) {
        marker.element.setMap(null);
      }
    });

    setMarkers([]);
    setDirections([]);
  };

  const calculateRoute = async () => {
    if (markers.length < 2) {
      alert('You need at least two markers to calculate a route');
      return;
    }

    let origin: google.maps.LatLng;
    const lastMarker = markers[markers.length - 1];

    if (directions.length > 0) {
      // Если есть уже проложенные маршруты, берем последнюю точку маршрута
      const previousRouteEnd =
        directions[directions.length - 1].routes[0].legs[
          directions[directions.length - 1].routes[0].legs.length - 1
        ].end_location;
      origin = new google.maps.LatLng(
        previousRouteEnd.lat(),
        previousRouteEnd.lng()
      );
    } else {
      // Если маршрутов нет, точка отправления — предпоследняя точка
      origin = new google.maps.LatLng(
        markers[markers.length - 2].lat,
        markers[markers.length - 2].lng
      );
    }

    const destination = new google.maps.LatLng(lastMarker.lat, lastMarker.lng);

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: origin,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections((prev) => [...prev, result]);

          // Вывод маршрута в консоль
          const route = {
            from: { lat: origin.lat(), lng: origin.lng() },
            to: { lat: destination.lat(), lng: destination.lng() },
          };
          console.log('New route added:', route);
        } else {
          console.error(`Error fetching directions ${result}`);
        }
      }
    );

    const createLink = await fetch(
      'https://tt3w13vopy.apigw.corezoid.com/mainrRceiver',
      {
        method: 'POST',
        body: JSON.stringify({
          event: 'createLink',
          from: {
            id:
              directions.length > 0
                ? markers[markers.length - 2].id
                : markers[markers.length - 2].id, // ID точки отправления
            lat: origin.lat(),
            lng: origin.lng(),
          },
          to: {
            id: lastMarker.id, // ID точки прибытия
            lat: destination.lat(),
            lng: destination.lng(),
          },
        }),
      }
    );
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

          {directions.map((dir, index) => (
            <DirectionsRenderer key={index} directions={dir} />
          ))}
        </GoogleMap>
        <button
          onClick={deleteAllMarkers}
          style={{ position: 'absolute', bottom: 30, left: 10, zIndex: 10 }}
        >
          Delete All Markers
        </button>
        <button
          onClick={calculateRoute}
          style={{ position: 'absolute', bottom: 30, left: 150, zIndex: 10 }}
        >
          Calculate Route
        </button>
      </div>
    </LoadScript>
  );
};
