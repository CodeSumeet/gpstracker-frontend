import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import L from "leaflet"; // Import Leaflet for custom icons
import mark from "../assets/leopard.png";

const MapComponent = () => {
  const [leopards, setLeopards] = useState([]);

  useEffect(() => {
    // Fetch initial leopards' locations
    const fetchLeopardData = async () => {
      try {
        const response = await axios.get("http://localhost:8080/api/leopards");
        setLeopards(response.data);
      } catch (error) {
        console.error("Error fetching leopard data:", error);
      }
    };

    fetchLeopardData();

    // WebSocket connection for real-time tracking
    const socket = new SockJS("http://localhost:8080/leopard-tracker");
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        stompClient.subscribe("/topic/leopardLocation", (message) => {
          const updatedLeopard = JSON.parse(message.body);
          setLeopards((prevLeopards) =>
            prevLeopards.map((l) =>
              l.callerId === updatedLeopard.callerId ? updatedLeopard : l
            )
          );
        });
      },
      debug: (str) => {
        console.log(str);
      },
    });

    stompClient.activate();

    return () => {
      stompClient.deactivate(); // Clean up WebSocket on component unmount
    };
  }, []);

  // Define custom icon for leopards
  const leopardIcon = L.icon({
    iconUrl: mark, // Path to your custom marker image
    iconSize: [38, 38], // Size of the icon
    iconAnchor: [19, 38], // Point of the icon which will correspond to marker's location
    popupAnchor: [0, -38], // Point from which the popup should open relative to the iconAnchor
  });

  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />
      {leopards.map((leopard) => (
        <Marker
          key={leopard.callerId}
          position={[leopard.latitude, leopard.longitude]}
          icon={leopardIcon} // Use custom icon
        >
          <Popup>
            <b>{leopard.name}</b>
            <br />
            Caller ID: {leopard.callerId}
            <br />
            Location: ({leopard.latitude.toFixed(4)},{" "}
            {leopard.longitude.toFixed(4)})
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapComponent;
