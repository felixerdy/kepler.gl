// Imports
import {TileLayer} from '@deck.gl/geo-layers';
import {BitmapLayer} from '@deck.gl/layers';
import AbstractTileLayer, { LayerData } from '../vector-tile/abstract-tile-layer';
import {Field} from 'src/types';
import TileDataset from '../vector-tile/common-tile/tile-dataset';
import WMSLayerIcon from './wms-layer-icon';
import { FindDefaultLayerPropsReturnValue } from '../layer-utils';
import { DatasetType, LAYER_TYPES } from '@kepler.gl/constants';
import {KeplerTable as KeplerDataset} from '@kepler.gl/table';

/**
 * Utility function to convert EPSG:4326 (lat/lon) to EPSG:3857 (Web Mercator)
 */
function lonLatToWebMercator(lon: number, lat: number): [number, number] {
  const R = 6378137; // Earth's radius in meters
  const x = R * (lon * Math.PI / 180);
  const y = R * Math.log(Math.tan((Math.PI / 4) + (lat * Math.PI / 360)));
  return [x, y];
}

// Types
type WMSFeature = {
  id: string;
  url: string;
  layer: string;
};

// Class Definition
export default class WMSLayer extends AbstractTileLayer<WMSFeature> {
  // Constructor
  constructor(props) {
    super(props);
  }

  // Properties
  get type() {
    return LAYER_TYPES.wms;
  }

  get name() {
    return 'WMS Tile';
  }

  get layerIcon() {
    return WMSLayerIcon;
  }

  // Static Methods
  static findDefaultLayerProps(dataset: KeplerDataset): FindDefaultLayerPropsReturnValue {
    if (dataset.type !== DatasetType.WMS_TILE) {
      return {props: []};
    }
    const {label} = dataset.metadata || {};
    const props = {
      label: label || 'WMS Layer',
    };
    return {props: [props]};
  }

  // Instance Methods
  get supportedDatasetTypes(): DatasetType[] {
    return [DatasetType.WMS_TILE];
  }

  protected initTileDataset(): TileDataset<WMSFeature, any> {
    return new TileDataset<WMSFeature, WMSFeature[]>({
      getTileId: (tile) => tile.id,
      getIterable: (tile) => tile.data,
      getRowCount: (tile) => tile.data.length,
      getRowValue: (tile, index) => tile.data[index]
    });
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

      
        const params = new URLSearchParams({
          SERVICE: 'WMS',
          VERSION: '1.3.0',
          REQUEST: 'GetMap',
          FORMAT: 'image/png',
          TRANSPARENT: 'true',
          LAYERS: data.metadata.label,
          STYLES: '',
          CRS: 'EPSG:3857',
          BBOX: `${minX},${minY},${maxX},${maxY}`,
          WIDTH: '256',
          HEIGHT: '256'
        });
        
        return `${base_url}?${params.toString()}`;
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

  // Protected/Private Methods
  accessRowValue(
    field?: Field,
    indexKey?: number | null
  ): (field: Field, datum: never) => string | number | null {
    throw new Error('Method not implemented.');
  }
}
