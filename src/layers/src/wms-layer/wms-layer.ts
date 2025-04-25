// Imports
import {TileLayer} from '@deck.gl/geo-layers';
import {BitmapLayer} from '@deck.gl/layers';
import AbstractTileLayer, {
  AbstractTileLayerConfig,
  AbstractTileLayerVisConfigSettings,
  LayerData as CommonLayerData
} from '../vector-tile/abstract-tile-layer';
import {Field, Merge, VisConfigNumber, VisConfigSelection} from 'src/types';
import TileDataset from '../vector-tile/common-tile/tile-dataset';
import WMSLayerIcon from './wms-layer-icon';
import {FindDefaultLayerPropsReturnValue} from '../layer-utils';
import {DatasetType, LAYER_TYPES} from '@kepler.gl/constants';
import {KeplerTable as KeplerDataset} from '@kepler.gl/table';
import {notNullorUndefined} from '@kepler.gl/common-utils';

/**
 * Utility function to convert EPSG:4326 (lat/lon) to EPSG:3857 (Web Mercator)
 */
function lonLatToWebMercator(lon: number, lat: number): [number, number] {
  const R = 6378137; // Earth's radius in meters
  const x = R * ((lon * Math.PI) / 180);
  const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [x, y];
}

// Types
type WMSFeature = {
  id: string;
  url: string;
  layer: string;
};

export const wmsTileVisConfigs = {
  opacity: 'opacity' as const
};

export type WMSLayerVisConfig = {
  opacity: number;
  wmsLayer: {
    name: string;
    title: string;
  };
};

export type WMSLayerConfig = Merge<
  AbstractTileLayerConfig,
  {
    visConfig: WMSLayerVisConfig;
  }
>;

export type WMSLayerVisConfigSettings = Merge<
  AbstractTileLayerVisConfigSettings,
  {
    opacity: VisConfigNumber;
    wmsLayer: VisConfigSelection;
  }
>;

type LayerData = CommonLayerData & {
  tilesetDataUrl?: string | null;
  metadata?: any;
};

// Class Definition
export default class WMSLayer extends AbstractTileLayer<WMSFeature> {
  declare config: WMSLayerConfig;
  declare visConfigSettings: WMSLayerVisConfigSettings;

  // Constructor
  constructor(
    props: ConstructorParameters<typeof AbstractTileLayer>[0] & {
      layers?: {name: string; title: string}[];
    }
  ) {
    super(props);

    const defaultWmsLayer = props.layers?.[0] || {
      name: 'defaultLayer',
      title: 'Default Layer'
    };

    this.registerVisConfig(wmsTileVisConfigs);

    this.updateLayerVisConfig({
      opacity: 0.8, // Default opacity
      wmsLayer: defaultWmsLayer
    });
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
      layers: dataset.metadata?.layers || []
    };

    return {props: [props]};
  }

  // Instance Methods
  get supportedDatasetTypes(): DatasetType[] {
    return [DatasetType.WMS_TILE];
  }

  protected initTileDataset(): TileDataset<WMSFeature, never> {
    return new TileDataset<WMSFeature, never>({
      getTileId: tile => tile.id,
      getIterable: () => null as never, // Return null to match the 'never' type
      getRowCount: () => 0, // Return 0 row count for 'never' type
      getRowValue: () => {
        return () => null; // Return null for 'never' type
      }
    });
  }

  formatLayerData(datasets, oldLayerData, animationConfig): LayerData {
    const {dataId} = this.config;

    if (!notNullorUndefined(dataId)) {
      return {tilesetDataUrl: null};
    }

    const dataset = datasets[dataId];
    const metadata = dataset.metadata;

    // Use metadata to configure your layer
    const tilesetDataUrl = metadata?.tilesetDataUrl || null;

    return {
      ...super.formatLayerData(datasets, oldLayerData, animationConfig),
      tilesetDataUrl,
      metadata
    };
  }

  renderLayer(opts) {
    const {visConfig} = this.config;
    const {data} = opts;

    const wmsLayer = visConfig.wmsLayer.name ?? data.metadata.layers[0].name;

    return [
      new TileLayer({
        id: `${this.id}-wms-layer`,
        getTileData: async tile => {
          const {west, north, east, south} = tile.bbox;

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
            LAYERS: wmsLayer,
            STYLES: '',
            CRS: 'EPSG:3857',
            BBOX: `${minX},${minY},${maxX},${maxY}`,
            WIDTH: '256',
            HEIGHT: '256'
          });

          const url = `${base_url}?${params.toString()}`;
          return [url]; // Return as an array
        },

        updateTriggers: {
          getTileData: [visConfig.wmsLayer],
          renderSubLayers: [visConfig.opacity]
        },

        renderSubLayers: props => {
          const {
            bbox: {west, south, east, north}
          } = props.tile;

          const url = props.data[0]; // Assuming the first URL is the one we want

          return new BitmapLayer({
            id: `${props.id}-bitmap`,
            image: url,
            bounds: [west, south, east, north],
            opacity: visConfig.opacity,
          });
        }
      })
    ];
  }

  // Protected/Private Methods
  accessRowValue(
    field?: Field,
    indexKey?: number | null
  ): (field: Field, datum: never) => string | number | null {
    throw new Error('Method not implemented.');
  }
}
