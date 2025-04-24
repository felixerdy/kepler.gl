import {TileLayer} from '@deck.gl/geo-layers';
import {BitmapLayer, GeoJsonLayer} from '@deck.gl/layers';

import {getLoaderOptions} from '@loaders.gl/core';
import AbstractTileLayer, { LayerData } from '../vector-tile/abstract-tile-layer';
import {Field} from 'src/types';
import TileDataset from '../vector-tile/common-tile/tile-dataset';
import WMSLayerIcon from './wms-layer-icon';
import { FindDefaultLayerPropsReturnValue } from '../layer-utils';
import { DatasetType, LAYER_TYPES } from '@kepler.gl/constants';
import {KeplerTable as KeplerDataset} from '@kepler.gl/table';

// Define the WMSFeature type to represent the structure of WMS tile data
export type WMSFeature = {
  id: string;
  url: string; // URL to fetch the raster tile
  layer: string; // Layer name or identifier
};

// Utility function to convert EPSG:4326 (lat/lon) to EPSG:3857 (Web Mercator)
function lonLatToWebMercator(lon: number, lat: number): [number, number] {
  const R = 6378137; // Earth's radius in meters
  const x = R * (lon * Math.PI / 180);
  const y = R * Math.log(Math.tan((Math.PI / 4) + (lat * Math.PI / 360)));
  return [x, y];
}

export default class WMSLayer extends AbstractTileLayer<WMSFeature> {
    
  protected initTileDataset(): TileDataset<WMSFeature, never> {
    return new TileDataset(
        {
            getTileId: (tile) => tile.id,
            getIterable: (tile) => tile.data,
            getRowCount: (tile) => tile.data.length,
            getRowValue: (tile, index) => tile.data[index]
        }
    );
  }
  accessRowValue(
    field?: Field,
    indexKey?: number | null
  ): (field: Field, datum: never) => string | number | null {
    throw new Error('Method not implemented.');
  }

  static findDefaultLayerProps(dataset: KeplerDataset): FindDefaultLayerPropsReturnValue {
    if (dataset.type !== DatasetType.WMS_TILE) {
      return {props: []};
    }
    return super.findDefaultLayerProps(dataset);
  }

  static layerName = 'WMSLayer';
  static layerIcon = null; // Placeholder for WMS Layer icon
  static layerTypeIcon = null; // Placeholder for WMS Layer type icon
  static layerTypeLabel = 'WMS Tile Layer';
  static layerTypeLabelPlural = 'WMS Tile Layers';
  static layerTypeLabelSingular = 'WMS Tile Layer';

  constructor(props) {
    super(props);
  }

  get type() {
    return LAYER_TYPES.wms;
  }

  get name() {
    return 'WMS Tile';
  }

  get layerIcon() {
    return WMSLayerIcon;
  }

  formatLayerData(datasets, oldLayerData, animationConfig): LayerData {
    const {dataId} = this.config;

    if (!dataId || !datasets[dataId]) {
      return {tileSource: null};
    }

    const dataset = datasets[dataId];
    const metadata = dataset.metadata;

    // Example: Log metadata or use it in your layer
    console.log('Dataset Metadata:', metadata);

    // Use metadata to configure your layer
    const tilesetDataUrl = metadata?.tilesetDataUrl || null;

    return {
      ...super.formatLayerData(datasets, oldLayerData, animationConfig),
      tilesetDataUrl,
      metadata
    };
  }

  renderLayer(opts) {
    const {mapState, data} = opts;

    return new TileLayer({
      id: `${this.id}-wms-layer`,
      getTileData: (tile) => {
        const { west, north, east, south } = tile.bbox;

        // Transform coordinates from EPSG:4326 to EPSG:3857
        const [minX, minY] = lonLatToWebMercator(west, south);
        const [maxX, maxY] = lonLatToWebMercator(east, north);

        const base_url = data.tilesetDataUrl;

        // Adjusted URL parameters with transformed BBOX
        const base_url_params = `?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=${data.metadata.label}&STYLES=&CRS=EPSG:3857&BBOX=${minX},${minY},${maxX},${maxY}&WIDTH=256&HEIGHT=256`;

        return base_url + base_url_params;
      },

      renderSubLayers: props => {
        const {
          bbox: { west, south, east, north }
        } = props.tile;

        return new BitmapLayer({
          id: `${props.id}-bitmap`,
          image: props.data,
          opacity: 0.8,
          bounds: [west, south, east, north]
        });
      }
    });
  }
}
