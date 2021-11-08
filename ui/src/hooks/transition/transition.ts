import { isFunction, isUndefined } from 'lodash';
import { useMemo, useEffect } from 'react';
import { useImmer } from 'use-immer';

import { useAsync } from '../async';
import { getMaxTime, CssRecord, Throttle } from './utils';

export interface DTransitionStateList {
  'enter-from'?: Partial<CSSStyleDeclaration>;
  'enter-active'?: Partial<CSSStyleDeclaration>;
  'enter-to'?: Partial<CSSStyleDeclaration>;
  'leave-from'?: Partial<CSSStyleDeclaration>;
  'leave-active'?: Partial<CSSStyleDeclaration>;
  'leave-to'?: Partial<CSSStyleDeclaration>;
}

export interface DTransitionCallbackList {
  beforeEnter?: (el: HTMLElement) => void;
  enter?: (el: HTMLElement) => void;
  afterEnter?: (el: HTMLElement) => void;
  beforeLeave?: (el: HTMLElement) => void;
  leave?: (el: HTMLElement) => void;
  afterLeave?: (el: HTMLElement) => void;
}

export interface DTransitionProps {
  dTarget: HTMLElement | null;
  dVisible?: boolean;
  dStateList?: DTransitionStateList | ((el: HTMLElement) => DTransitionStateList | undefined);
  dCallbackList?: DTransitionCallbackList | ((el: HTMLElement) => DTransitionCallbackList | undefined);
  dDisabled?: boolean;
}

export function useTransition(props: DTransitionProps) {
  const { dTarget, dVisible = false, dStateList, dCallbackList, dDisabled = false } = props;

  const asyncCapture = useAsync();

  const [throttle] = useImmer(new Throttle());
  const [cssRecord] = useImmer(new CssRecord());

  const transitionThrottle = useMemo(() => throttle.run.bind(throttle), [throttle]);

  if (dTarget && !dDisabled && isUndefined(dTarget.dataset['dVisible'])) {
    cssRecord.setCss(dTarget, { display: 'none' });
  }

  useEffect(() => {
    if (dTarget) {
      if (dDisabled) {
        cssRecord.backCss(dTarget);
      } else {
        if (isUndefined(dTarget.dataset['dVisible'])) {
          dTarget.dataset['dVisible'] = String(dVisible);
          cssRecord.backCss(dTarget);
          cssRecord.setCss(dTarget, { display: dVisible ? '' : 'none' });
        } else if (dTarget.dataset['dVisible'] !== String(dVisible)) {
          dTarget.dataset['dVisible'] = String(dVisible);
          cssRecord.backCss(dTarget);
          asyncCapture.clearAll();
          throttle.skipRun();

          const stateList = isUndefined(dStateList) ? {} : isFunction(dStateList) ? dStateList(dTarget) ?? {} : dStateList;
          const callbackList = isUndefined(dCallbackList) ? {} : isFunction(dCallbackList) ? dCallbackList(dTarget) ?? {} : dCallbackList;

          callbackList[dVisible ? 'beforeEnter' : 'beforeLeave']?.(dTarget);
          cssRecord.setCss(dTarget, {
            ...stateList[dVisible ? 'enter-from' : 'leave-from'],
            ...stateList[dVisible ? 'enter-active' : 'leave-active'],
          });

          asyncCapture.setTimeout(() => {
            cssRecord.backCss(dTarget);
            cssRecord.setCss(dTarget, {
              ...stateList[dVisible ? 'enter-to' : 'leave-to'],
              ...stateList[dVisible ? 'enter-active' : 'leave-active'],
            });
            callbackList[dVisible ? 'enter' : 'leave']?.(dTarget);

            const timeout = getMaxTime(
              dVisible
                ? [stateList['enter-from']?.transition, stateList['enter-active']?.transition, stateList['enter-to']?.transition]
                : [stateList['leave-from']?.transition, stateList['leave-active']?.transition, stateList['leave-to']?.transition]
            );
            asyncCapture.setTimeout(() => {
              cssRecord.backCss(dTarget);
              cssRecord.setCss(dTarget, { display: dVisible ? '' : 'none' });
              callbackList[dVisible ? 'afterEnter' : 'afterLeave']?.(dTarget);
              throttle.continueRun();
            }, timeout);
          }, 20);
        }
      }
    }
  }, [dCallbackList, dStateList, dTarget, dVisible, dDisabled, asyncCapture, cssRecord, throttle]);

  return transitionThrottle;
}

export interface DCollapseTransitionProps {
  dTarget: HTMLElement | null;
  dVisible?: boolean;
  dCallbackList?: DTransitionCallbackList;
  dDirection?: 'width' | 'height';
  dDuring?: number;
  dDisabled?: boolean;
}

export function useCollapseTransition(props: DCollapseTransitionProps) {
  const { dTarget, dVisible = false, dCallbackList, dDirection = 'height', dDuring = 300, dDisabled } = props;

  const transitionThrottle = useTransition({
    dTarget,
    dVisible,
    dStateList: (el) => {
      const rect = el.getBoundingClientRect();
      return {
        'enter-from': { [dDirection]: '0', opacity: '0' },
        'enter-active': { overflow: 'hidden' },
        'enter-to': {
          [dDirection]: rect[dDirection] + 'px',
          transition: `${dDirection} ${dDuring}ms ease-out, opacity ${dDuring}ms ease-out`,
        },
        'leave-from': { [dDirection]: rect[dDirection] + 'px' },
        'leave-active': { overflow: 'hidden' },
        'leave-to': { [dDirection]: '0', opacity: '0', transition: `${dDirection} ${dDuring}ms ease-in, opacity ${dDuring}ms ease-in` },
      };
    },
    dCallbackList,
    dDisabled,
  });

  return transitionThrottle;
}
