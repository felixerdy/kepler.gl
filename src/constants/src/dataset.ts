// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

export enum DatasetType {
  LOCAL = 'local',
  VECTOR_TILE = 'vector-tile',
  WMS_TILE = 'wms-tile'
}

export enum RemoteTileFormat {
  MVT = 'mvt',
  PMTILES = 'pmtiles',
  WMS = 'wms'
}

export const REMOTE_TILE = 'remote';

export type VectorTileDatasetMetadata = {
  type: typeof REMOTE_TILE;
  remoteTileFormat: RemoteTileFormat;
  tilesetDataUrl: string;
  tilesetMetadataUrl?: string;
};
