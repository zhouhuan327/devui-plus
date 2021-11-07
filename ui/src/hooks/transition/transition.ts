import type React from 'react';
import type { Updater } from 'use-immer';

import { isUndefined } from 'lodash';
import { useMemo, useEffect } from 'react';
import { useImmer } from 'use-immer';

import { useAsync } from '../../hooks/async';
import { getMaxTime } from './utils';

export interface DTransitionStateList {
  'enter-from'?: React.CSSProperties;
  'enter-active'?: React.CSSProperties;
  'enter-to'?: React.CSSProperties;
  'leave-from'?: React.CSSProperties;
  'leave-active'?: React.CSSProperties;
  'leave-to'?: React.CSSProperties;
}

export interface DTransitionCallbackList {
  beforeEnter?: (el: HTMLElement, rect: DOMRect, setStyle: Updater<React.CSSProperties>) => void;
  enter?: (el: HTMLElement, rect: DOMRect, setStyle: Updater<React.CSSProperties>) => void;
  afterEnter?: (el: HTMLElement, rect: DOMRect, setStyle: Updater<React.CSSProperties>) => void;
  beforeLeave?: (el: HTMLElement, rect: DOMRect, setStyle: Updater<React.CSSProperties>) => void;
  leave?: (el: HTMLElement, rect: DOMRect, setStyle: Updater<React.CSSProperties>) => void;
  afterLeave?: (el: HTMLElement, rect: DOMRect, setStyle: Updater<React.CSSProperties>) => void;
}

export interface DTransitionProps {
  dVisible?: boolean;
  dStateList: DTransitionStateList;
  dCallbackList?: DTransitionCallbackList;
  dTarget: HTMLElement | null;
}

export function useTransition(props: DTransitionProps) {
  const { dVisible = false, dStateList, dCallbackList, dTarget } = props;

  const asyncCapture = useAsync();

  //#region States.
  /*
   * @see https://reactjs.org/docs/state-and-lifecycle.html
   *
   * - Vue: data.
   * @see https://v3.vuejs.org/api/options-data.html#data-2
   * - Angular: property on a class.
   * @example
   * export class HeroChildComponent {
   *   public data: 'example';
   * }
   */
  const [style, setStyle] = useImmer<React.CSSProperties>({ display: 'none' });
  //#endregion

  //#region DidUpdate.
  /*
   * We need a service(ReactConvertService) that implement useEffect.
   * @see https://reactjs.org/docs/hooks-effect.html
   *
   * - Vue: onUpdated.
   * @see https://v3.vuejs.org/api/composition-api.html#lifecycle-hooks
   * - Angular: ngDoCheck.
   * @see https://angular.io/api/core/DoCheck
   */
  useEffect(() => {
    const [asyncGroup, asyncId] = asyncCapture.createGroup();
    if (dTarget) {
      if (isUndefined(dTarget.dataset['dVisible'])) {
        if (dVisible) {
          setStyle({});
        }
        dTarget.dataset['dVisible'] = String(dVisible);
      } else if (dTarget.dataset['dVisible'] !== String(dVisible)) {
        dTarget.dataset['dVisible'] = String(dVisible);

        if (dVisible) {
          dTarget.style.display = '';
        }
        const rect = dTarget.getBoundingClientRect();

        setStyle({
          ...(dStateList[dVisible ? 'enter-from' : 'leave-from'] ?? {}),
          ...(dStateList[dVisible ? 'enter-active' : 'leave-active'] ?? {}),
        });
        dCallbackList?.[dVisible ? 'beforeEnter' : 'beforeLeave']?.(dTarget, rect, setStyle);

        asyncGroup.setTimeout(() => {
          setStyle({
            ...(dStateList[dVisible ? 'enter-to' : 'leave-to'] ?? {}),
            ...(dStateList[dVisible ? 'enter-active' : 'leave-active'] ?? {}),
          });
          dCallbackList?.[dVisible ? 'enter' : 'leave']?.(dTarget, rect, setStyle);

          const timeout = getMaxTime(
            dVisible
              ? [dStateList['enter-from']?.transition, dStateList['enter-active']?.transition, dStateList['enter-to']?.transition]
              : [dStateList['leave-from']?.transition, dStateList['leave-active']?.transition, dStateList['leave-to']?.transition]
          );
          asyncGroup.setTimeout(() => {
            setStyle(dVisible ? {} : { display: 'none' });
            dCallbackList?.[dVisible ? 'afterEnter' : 'afterLeave']?.(dTarget, rect, setStyle);
          }, timeout);
        }, 20);
      }
    }
    return () => {
      asyncCapture.deleteGroup(asyncId);
    };
  }, [dVisible, dCallbackList, dStateList, asyncCapture, dTarget, setStyle]);
  //#endregion

  return style;
}

export interface DCollapseTransitionProps {
  dVisible?: boolean;
  dCallbackList?: DTransitionCallbackList;
  dDirection?: 'width' | 'height';
  dDuring?: number;
  dTarget: HTMLElement | null;
}

export function useCollapseTransition(props: DCollapseTransitionProps) {
  const { dVisible = false, dCallbackList, dDirection = 'height', dDuring = 300, dTarget } = props;

  //#region Getters.
  /*
   * When the dependency changes, recalculate the value.
   * In React, usually use `useMemo` to handle this situation.
   * Notice: `useCallback` also as getter that target at function.
   *
   * - Vue: computed.
   * @see https://v3.vuejs.org/guide/computed.html#computed-properties
   * - Angular: get property on a class.
   * @example
   * // ReactConvertService is a service that implement the
   * // methods when need to convert react to angular.
   * export class HeroChildComponent {
   *   public get data():string {
   *     return this.reactConvert.useMemo(factory, [deps]);
   *   }
   *
   *   constructor(private reactConvert: ReactConvertService) {}
   * }
   */
  const stateList = useMemo<DTransitionStateList>(() => {
    return {
      'enter-from': { [dDirection]: 0, opacity: 0 },
      'enter-active': { overflow: 'hidden' },
      'enter-to': { transition: `${dDirection} ${dDuring}ms ease-out, opacity ${dDuring}ms ease-out` },
      'leave-active': { overflow: 'hidden' },
      'leave-to': { [dDirection]: 0, opacity: 0, transition: `${dDirection} ${dDuring}ms ease-in, opacity ${dDuring}ms ease-in` },
    };
  }, [dDirection, dDuring]);
  const callbackList = useMemo<DTransitionCallbackList>(() => {
    return {
      ...dCallbackList,
      enter: (el, rect, setStyle) => {
        dCallbackList?.enter?.(el, rect, setStyle);
        setStyle((draft) => {
          draft[dDirection] = (dDirection === 'width' ? rect.width : rect.height) + 'px';
        });
      },
      beforeLeave: (el, rect, setStyle) => {
        dCallbackList?.beforeLeave?.(el, rect, setStyle);
        setStyle((draft) => {
          draft[dDirection] = (dDirection === 'width' ? rect.width : rect.height) + 'px';
        });
      },
    };
  }, [dCallbackList, dDirection]);
  //#endregion

  const style = useTransition({ dVisible, dStateList: stateList, dCallbackList: callbackList, dTarget });

  return style;
}
