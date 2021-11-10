import { isFunction, isNumber, isUndefined } from 'lodash';
import React, { useMemo, useEffect, useImperativeHandle } from 'react';
import { useImmer } from 'use-immer';

import { useAsync } from '../../hooks';
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
  afterEnter?: (el: HTMLElement, setCss: CssRecord['setCss']) => void;
  beforeLeave?: (el: HTMLElement) => void;
  leave?: (el: HTMLElement) => void;
  afterLeave?: (el: HTMLElement, setCss: CssRecord['setCss']) => void;
}

export interface DTransitionProps {
  dVisible?: boolean;
  dStateList?: DTransitionStateList | ((el: HTMLElement) => DTransitionStateList | undefined);
  dCallbackList?: DTransitionCallbackList | ((el: HTMLElement) => DTransitionCallbackList | undefined);
  dAutoHidden?: boolean;
  dSkipFirst?: boolean;
  children: React.ReactNode;
}

export interface DTransitionRef {
  el: HTMLElement | null;
  transitionThrottle: (cb: () => void) => void;
}

export const DTransition = React.forwardRef<DTransitionRef, DTransitionProps>((props, ref) => {
  const { dVisible = false, dStateList, dCallbackList, dAutoHidden = true, dSkipFirst = true, children } = props;

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
  const [throttle] = useImmer(new Throttle());
  const [cssRecord] = useImmer(new CssRecord());
  const [el, setEl] = useImmer<HTMLElement | null>(null);
  //#endregion

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
  const transitionThrottle = useMemo(() => throttle.run.bind(throttle), [throttle]);
  //#endregion

  //#region React.cloneElement.
  /*
   * @see https://reactjs.org/docs/react-api.html#cloneelement
   *
   * - Vue: Scoped Slots.
   * @see https://v3.vuejs.org/guide/component-slots.html#scoped-slots
   * - Angular: NgTemplateOutlet.
   * @see https://angular.io/api/common/NgTemplateOutlet
   */
  const child = useMemo(() => {
    const _child = children as React.ReactElement;
    return React.cloneElement(_child, {
      ..._child.props,
      ref: (node: HTMLElement | null) => {
        setEl(node);
      },
    });
  }, [children, setEl]);
  //#endregion

  if (el && isUndefined(el.dataset['dVisible'])) {
    cssRecord.setCss(el, { display: 'none' });
  }

  useEffect(() => {
    return () => {
      asyncCapture.clearAll();
      throttle.clearTids();
    };
  }, [asyncCapture, throttle]);

  useEffect(() => {
    if (el) {
      if (dSkipFirst && isUndefined(el.dataset['dVisible'])) {
        el.dataset['dVisible'] = String(dVisible);
        cssRecord.backCss(el);
        dAutoHidden && cssRecord.setCss(el, { display: dVisible ? '' : 'none' });
      } else if (el.dataset['dVisible'] !== String(dVisible)) {
        el.dataset['dVisible'] = String(dVisible);
        cssRecord.backCss(el);
        asyncCapture.clearAll();
        throttle.clearTids();
        throttle.skipRun();

        const stateList = isUndefined(dStateList) ? {} : isFunction(dStateList) ? dStateList(el) ?? {} : dStateList;
        const callbackList = isUndefined(dCallbackList) ? {} : isFunction(dCallbackList) ? dCallbackList(el) ?? {} : dCallbackList;

        callbackList[dVisible ? 'beforeEnter' : 'beforeLeave']?.(el);
        cssRecord.setCss(el, {
          ...stateList[dVisible ? 'enter-from' : 'leave-from'],
          ...stateList[dVisible ? 'enter-active' : 'leave-active'],
        });

        asyncCapture.setTimeout(() => {
          cssRecord.backCss(el);
          cssRecord.setCss(el, {
            ...stateList[dVisible ? 'enter-to' : 'leave-to'],
            ...stateList[dVisible ? 'enter-active' : 'leave-active'],
          });
          callbackList[dVisible ? 'enter' : 'leave']?.(el);

          const timeout = getMaxTime(
            dVisible
              ? [stateList['enter-from']?.transition, stateList['enter-active']?.transition, stateList['enter-to']?.transition]
              : [stateList['leave-from']?.transition, stateList['leave-active']?.transition, stateList['leave-to']?.transition]
          );
          asyncCapture.setTimeout(() => {
            cssRecord.backCss(el);
            dAutoHidden && cssRecord.setCss(el, { display: dVisible ? '' : 'none' });
            callbackList[dVisible ? 'afterEnter' : 'afterLeave']?.(el, cssRecord.setCss.bind(cssRecord));
            throttle.continueRun();
          }, timeout);
        }, 20);
      }
    }
  }, [dCallbackList, dStateList, el, dVisible, dAutoHidden, dSkipFirst, asyncCapture, cssRecord, throttle]);

  useImperativeHandle(
    ref,
    () => ({
      el,
      transitionThrottle,
    }),
    [el, transitionThrottle]
  );

  return child;
});

export interface DCollapseTransitionProps {
  dVisible?: boolean;
  dCallbackList?: DTransitionCallbackList;
  dSkipFirst?: boolean;
  dDirection?: 'width' | 'height';
  dDuring?: number;
  dSpace?: number | string;
  children: React.ReactNode;
}

export const DCollapseTransition = React.forwardRef<DTransitionRef, DCollapseTransitionProps>((props, ref) => {
  const { dVisible = false, dCallbackList, dSkipFirst = true, dDirection = 'height', dDuring = 300, dSpace = 0, children } = props;

  return (
    <DTransition
      ref={ref}
      dVisible={dVisible}
      dStateList={(el) => {
        const rect = el.getBoundingClientRect();
        return {
          'enter-from': { [dDirection]: isNumber(dSpace) ? dSpace + 'px' : dSpace, opacity: dSpace === 0 ? '0' : '1' },
          'enter-active': { overflow: 'hidden' },
          'enter-to': {
            [dDirection]: rect[dDirection] + 'px',
            transition: `${dDirection} ${dDuring}ms ease-out, opacity ${dDuring}ms ease-out`,
          },
          'leave-from': { [dDirection]: rect[dDirection] + 'px' },
          'leave-active': { overflow: 'hidden' },
          'leave-to': {
            [dDirection]: isNumber(dSpace) ? dSpace + 'px' : dSpace,
            opacity: dSpace === 0 ? '0' : '1',
            transition: `${dDirection} ${dDuring}ms ease-in, opacity ${dDuring}ms ease-in`,
          },
        };
      }}
      dCallbackList={{
        ...dCallbackList,
        afterLeave: (el, setCss) => {
          dCallbackList?.afterLeave?.(el, setCss);
          setCss(el, { [dDirection]: isNumber(dSpace) ? dSpace + 'px' : dSpace });
        },
      }}
      dAutoHidden={dSpace === 0}
      dSkipFirst={dSkipFirst}
    >
      {children}
    </DTransition>
  );
});
