"use client";

import React, { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Parcel } from "@/types";

// Configure default Leaflet marker assets if needed
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface ParcelMapInnerProps {
  parcels: Parcel[];
  selectedParcelId?: string | null;
  onSelectParcel?: (parcel: Parcel) => void;
  className?: string;
}

// Controller component to manage bounds and viewport adjustments
function MapController({
  parcels,
  selectedParcelId,
}: {
  parcels: Parcel[];
  selectedParcelId?: string | null;
}) {
  const map = useMap();

  // Function to fit map to all valid parcel geometries
  const fitToAllParcels = useCallback(() => {
    const validParcels = parcels.filter(
      (p) => p.geometry && Array.isArray((p.geometry as { coordinates?: unknown }).coordinates)
    );
    if (validParcels.length === 0) return;

    try {
      const geoJsonLayers = validParcels.map((p) => L.geoJSON(p.geometry as GeoJSON.GeoJsonObject));
      const group = L.featureGroup(geoJsonLayers);
      const bounds = group.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: true });
      }
    } catch {
      // Ignore geometry parse errors
    }
  }, [map, parcels]);

  // Fit on parcels change or initial load
  useEffect(() => {
    fitToAllParcels();
  }, [fitToAllParcels]);

  // Focus on selected parcel when selectedParcelId changes
  useEffect(() => {
    if (!selectedParcelId) return;
    const selected = parcels.find((p) => p.id === selectedParcelId);
    if (selected?.geometry) {
      try {
        const layer = L.geoJSON(selected.geometry as GeoJSON.GeoJsonObject);
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 18, animate: true });
        }
      } catch {
        // Ignore geometry parse errors
      }
    }
  }, [map, selectedParcelId, parcels]);

  return (
    <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
      <button
        type="button"
        onClick={fitToAllParcels}
        className="flex items-center gap-1.5 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-md ring-1 ring-slate-900/10 hover:bg-slate-50 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-700"
        title="Fit map viewport to all displayed parcels"
        aria-label="Fit view to all parcels"
      >
        <svg
          className="h-3.5 w-3.5 text-emerald-800"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
        <span>Fit to Parcels</span>
      </button>
    </div>
  );
}

// Layer renderer component managing PostGIS GeoJSON polygons and interactive popups
function ParcelLayers({
  parcels,
  selectedParcelId,
  onSelectParcel,
}: {
  parcels: Parcel[];
  selectedParcelId?: string | null;
  onSelectParcel?: (parcel: Parcel) => void;
}) {
  const map = useMap();
  const layersRef = useRef<{ [parcelId: string]: L.Layer }>({});

  useEffect(() => {
    const layerGroup = L.layerGroup().addTo(map);
    layersRef.current = {};

    parcels.forEach((parcel) => {
      if (!parcel.geometry || !Array.isArray((parcel.geometry as { coordinates?: unknown }).coordinates)) {
        return;
      }

      const isSelected = parcel.id === selectedParcelId;

      const layer = L.geoJSON(parcel.geometry as GeoJSON.GeoJsonObject, {
        style: {
          color: isSelected ? "#064e3b" : "#047857",
          weight: isSelected ? 3.5 : 2,
          opacity: isSelected ? 1 : 0.85,
          fillColor: isSelected ? "#10b981" : "#34d399",
          fillOpacity: isSelected ? 0.55 : 0.25,
        },
        onEachFeature: (_, l) => {
          // Hover interactions
          l.on({
            mouseover: () => {
              if (parcel.id !== selectedParcelId) {
                (l as L.Path).setStyle({
                  color: "#065f46",
                  fillOpacity: 0.45,
                  weight: 2.5,
                });
              }
            },
            mouseout: () => {
              if (parcel.id !== selectedParcelId) {
                (l as L.Path).setStyle({
                  color: "#047857",
                  fillOpacity: 0.25,
                  weight: 2,
                });
              }
            },
            click: (e) => {
              L.DomEvent.stopPropagation(e);
              onSelectParcel?.(parcel);
            },
          });

          // Build Civic Popup Content
          const popupContainer = document.createElement("div");
          popupContainer.className = "p-3 font-sans max-w-[260px]";

          const formattedArea =
            typeof parcel.area === "number"
              ? new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(parcel.area)
              : parcel.area;

          popupContainer.innerHTML = `
            <div class="space-y-2 text-xs">
              <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5">
                <span class="font-mono font-bold text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ${parcel.ulpin}
                </span>
                <span class="text-[11px] text-slate-500 font-medium">
                  Survey ${parcel.surveyNumber || "—"}
                </span>
              </div>
              <div class="space-y-1 text-slate-600">
                <div class="flex justify-between">
                  <span class="text-slate-400">Village:</span>
                  <span class="font-medium text-slate-800">${parcel.village}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">District:</span>
                  <span class="font-medium text-slate-800">${parcel.district}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Area:</span>
                  <span class="font-semibold text-slate-900">${formattedArea} sq m</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Classification:</span>
                  <span class="font-medium text-slate-700">${parcel.landUse || "General"} (${parcel.zoning || "—"})</span>
                </div>
              </div>
              <div class="pt-2 border-t border-slate-100">
                <a
                  href="/properties/${parcel.id}"
                  class="inline-flex w-full items-center justify-center font-medium text-xs py-1.5 px-3 rounded bg-emerald-900 text-white hover:bg-emerald-800 transition-colors shadow-xs text-center"
                >
                  View Parcel Details →
                </a>
              </div>
            </div>
          `;

          l.bindPopup(popupContainer, {
            className: "civic-leaflet-popup",
            closeButton: true,
          });
        },
      });

      layer.addTo(layerGroup);
      layersRef.current[parcel.id] = layer;

      if (isSelected) {
        layer.openPopup();
      }
    });

    return () => {
      layerGroup.clearLayers();
      map.removeLayer(layerGroup);
    };
  }, [map, parcels, selectedParcelId, onSelectParcel]);

  return null;
}

export default function ParcelMapInner({
  parcels,
  selectedParcelId,
  onSelectParcel,
  className = "",
}: ParcelMapInnerProps) {
  // Default coordinate center (Maharashtra / Western India)
  const defaultCenter: [number, number] = [19.2183, 72.9781];

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-lg border border-slate-200 ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={8}
        scrollWheelZoom={true}
        className="h-full w-full"
        attributionControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

        <ParcelLayers
          parcels={parcels}
          selectedParcelId={selectedParcelId}
          onSelectParcel={onSelectParcel}
        />

        <MapController
          parcels={parcels}
          selectedParcelId={selectedParcelId}
        />
      </MapContainer>
    </div>
  );
}
