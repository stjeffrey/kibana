/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { FunctionComponent, useState, memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { ProcessorInternal, ProcessorSelector } from '../../types';

import './tree.scss';
import { TreeNode } from './tree_node';
import { DropZoneButton } from './drop_zone_button';

export type TreeMode = 'copy' | 'move' | 'idle';

export interface ProcessorInfo {
  id: string;
  selector: ProcessorSelector;
  aboveId?: string;
  belowId?: string;
}

export type PrivateAction =
  | Action
  | {
      type: 'selectToMove';
      payload: ProcessorInfo;
    }
  | {
      type: 'cancelMove';
    };

export type PrivateOnActionHandler = (args: PrivateAction) => void;

export interface PrivateProps {
  processors: ProcessorInternal[];
  selector: ProcessorSelector;
  privateOnAction: PrivateOnActionHandler;
  mode: TreeMode;
  selectedProcessorInfo?: ProcessorInfo;
  level: number;
}

const isDropZoneAboveDisabled = (processor: ProcessorInfo, selectedProcessor: ProcessorInfo) => {
  return Boolean(
    // Is the selected node first in a list?
    !selectedProcessor.aboveId &&
      // Is the selected processor the current processor?
      processor.id === selectedProcessor.id
  );
};

const isDropZoneBelowDisabled = (processor: ProcessorInfo, selectedProcessor: ProcessorInfo) => {
  return processor.id === selectedProcessor.id || processor.belowId === selectedProcessor.id;
};

export const PrivateTree: FunctionComponent<PrivateProps> = ({
  processors,
  selector,
  selectedProcessorInfo,
  privateOnAction,
  mode,
  level,
}) => {
  return (
    <EuiFlexGroup direction="column" responsive={false} gutterSize="none">
      {processors.map((processor, idx) => {
        const above = processors[idx - 1];
        const below = processors[idx + 1];
        const info: ProcessorInfo = {
          id: processor.id,
          selector: selector.concat(String(idx)),
          aboveId: above?.id,
          belowId: below?.id,
        };

        return (
          <React.Fragment key={idx}>
            {idx === 0 ? (
              <DropZoneButton
                onClick={() => {
                  privateOnAction({
                    type: 'move',
                    payload: {
                      source: selector.concat(String(idx)),
                      destination: selectedProcessorInfo!.selector,
                    },
                  });
                }}
                isDisabled={
                  mode !== 'move' || isDropZoneAboveDisabled(info, selectedProcessorInfo!)
                }
              />
            ) : undefined}
            <EuiFlexItem>
              <TreeNode
                level={level}
                mode={mode}
                processor={processor}
                processorInfo={info}
                privateOnAction={privateOnAction}
                selectedProcessorInfo={selectedProcessorInfo}
              />
            </EuiFlexItem>
            <DropZoneButton
              isDisabled={mode !== 'move' || isDropZoneBelowDisabled(info, selectedProcessorInfo!)}
              onClick={() => {
                privateOnAction({
                  type: 'move',
                  payload: {
                    destination: selector.concat(String(idx + 1)),
                    source: selectedProcessorInfo!.selector,
                  },
                });
              }}
            />
          </React.Fragment>
        );
      })}
    </EuiFlexGroup>
  );
};

export type Action =
  | { type: 'move'; payload: { source: ProcessorSelector; destination: ProcessorSelector } }
  | { type: 'edit'; payload: { selector: ProcessorSelector; processor: ProcessorInternal } }
  | { type: 'duplicate'; payload: { source: ProcessorSelector } }
  | { type: 'addOnFailure'; payload: { target: ProcessorSelector } }
  | { type: 'remove'; payload: { selector: ProcessorSelector; processor: ProcessorInternal } };

export type OnActionHandler = (action: Action) => void;

export interface Props {
  processors: ProcessorInternal[];
  baseSelector: ProcessorSelector;
  onAction: OnActionHandler;
}

export const Tree: FunctionComponent<Props> = memo(({ processors, baseSelector, onAction }) => {
  const [treeMode, setTreeMode] = useState<TreeMode>('idle');
  const [selectedProcessorInfo, setSelectedProcessorInfo] = useState<ProcessorInfo | undefined>();
  return (
    <PrivateTree
      level={1}
      privateOnAction={(action) => {
        if (action.type === 'selectToMove') {
          setTreeMode('move');
          setSelectedProcessorInfo(action.payload);
          return;
        }

        if (action.type === 'cancelMove') {
          setTreeMode('idle');
          setSelectedProcessorInfo(undefined);
          return;
        }

        if (
          action.type === 'move' ||
          action.type === 'edit' ||
          action.type === 'remove' ||
          action.type === 'addOnFailure' ||
          action.type === 'duplicate'
        ) {
          setTreeMode('idle');
          onAction(action);
          setSelectedProcessorInfo(undefined);
          return;
        }
      }}
      selectedProcessorInfo={selectedProcessorInfo}
      processors={processors}
      selector={baseSelector}
      mode={treeMode}
    />
  );
});
