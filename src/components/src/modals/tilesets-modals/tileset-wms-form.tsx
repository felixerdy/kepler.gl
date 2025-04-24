// SPDX-License-Identifier: MIT
// Copyright contributors to the kepler.gl project

import React, {useCallback, useEffect, useState} from 'react';
import styled from 'styled-components';
import {XMLParser} from 'fast-xml-parser';

import {DatasetType, REMOTE_TILE, RemoteTileFormat} from '@kepler.gl/constants';
import {DatasetCreationAttributes} from './common';
import {InputLight} from '../../common';

const TilesetInputContainer = styled.div`
  display: grid;
  grid-template-rows: repeat(2, 1fr);
  row-gap: 18px;
  font-size: 12px;
`;

const TilesetInputDescription = styled.div`
  text-align: center;
  color: ${props => props.theme.AZURE200};
  font-size: 11px;
`;

type TilesetVectorFormProps = {
  setResponse: (response: {
    metadata: null;
    dataset: DatasetCreationAttributes | null;
    loading: boolean;
    error: string | null;
  }) => void;
};

const TilesetWMSForm: React.FC<TilesetVectorFormProps> = ({setResponse}) => {
  const [layerName, setLayerName] = useState<string>('');
  const [wmsUrl, setWmsUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [availableLayers, setAvailableLayers] = useState<{name: string; title: string}[]>([]);

  const onLayerNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      event.preventDefault();
      setLayerName(event.target.value);
    },
    [setLayerName]
  );

  const onWmsUrlChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      event.preventDefault();
      const newWmsUrl = event.target.value;
      setWmsUrl(newWmsUrl);

      // Fetch WMS GetCapabilities
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${newWmsUrl}?service=WMS&request=GetCapabilities`);
        if (!response.ok) {
          throw new Error(`Failed to fetch GetCapabilities: ${response.statusText}`);
        }
        const text = await response.text();
        const parser = new XMLParser({
          ignoreAttributes: true
        });
        const json = parser.parse(text);

        // Extract name or title from GetCapabilities response
        const serviceTitle = json?.WMS_Capabilities?.Service?.Title;
        if (serviceTitle && !layerName) {
          setLayerName(serviceTitle);
        }

        const layers = json?.WMS_Capabilities?.Capability?.Layer?.Layer;
        if (Array.isArray(layers)) {
          const layerOptions = layers.map((layer: any) => ({
            name: layer.Name,
            title: layer.Title || layer.Name
          }));
          setAvailableLayers(layerOptions);
        } else {
          setAvailableLayers([]);
        }

        setMetadata(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setMetadata(null);
      } finally {
        setLoading(false);
      }
    },
    [layerName]
  );

  useEffect(() => {
    if (layerName && wmsUrl) {
      const dataset = {
        name: layerName,
        type: DatasetType.WMS_TILE,
        metadata: {
          type: REMOTE_TILE,
          remoteTileFormat: RemoteTileFormat.WMS,
          tilesetDataUrl: wmsUrl,
          tilesetMetadataUrl: `${wmsUrl}?service=WMS&request=GetCapabilities`
        }
      };
      setResponse({
        metadata,
        dataset,
        loading,
        error
      });
    } else {
      setResponse({
        metadata: null,
        dataset: null,
        loading,
        error
      });
    }
  }, [setResponse, layerName, wmsUrl, metadata, loading, error]);

  return (
    <TilesetInputContainer>
      <div>
        <label htmlFor="layer-name">Name</label>
        <InputLight
          id="layer-name"
          placeholder="Name your WMS layer"
          value={layerName}
          onChange={onLayerNameChange}
        />
      </div>
      <div>
        <label htmlFor="wms-url">WMS URL</label>
        <InputLight
          id="wms-url"
          placeholder="Enter WMS URL"
          value={wmsUrl}
          onChange={onWmsUrlChange}
        />
        <TilesetInputDescription>Provide a valid WMS service URL.</TilesetInputDescription>
      </div>
      {availableLayers.length > 0 && (
        <div>
          <label htmlFor="layer-select">Select Layer</label>
          <br />
          <select
            id="layer-select"
            value={layerName}
            onChange={e => setLayerName(e.target.value)}
          >
            {availableLayers.map(layer => (
              <option key={layer.name} value={layer.name}>
                {layer.title || layer.name}
              </option>
            ))}
          </select>

           
          <TilesetInputDescription>
            Select a layer from the available options.
          </TilesetInputDescription>
        </div>
      )}
    </TilesetInputContainer>
  );
};

export default TilesetWMSForm;
