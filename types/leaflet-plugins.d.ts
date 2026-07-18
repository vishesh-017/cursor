import "leaflet";

declare module "leaflet" {
  interface MarkerClusterGroup extends Layer {
    addLayer(layer: Layer): this;
  }

  function markerClusterGroup(): MarkerClusterGroup;

  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number;
      blur?: number;
      maxZoom?: number;
      max?: number;
    }
  ): Layer;
}

declare module "leaflet.markercluster";
declare module "leaflet.heat";
