import type { DElementSelector } from '../../hooks/element';
import type { DTransitionStateList } from '../../hooks/transition';
import type { DPlacement } from '../../utils/position';
import type { DTransitionRef } from '../_transition';

import { isUndefined } from 'lodash';
import React, { useCallback, useEffect, useMemo, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import { useImmer } from 'use-immer';

import { useDPrefixConfig, useCustomRef, useAsync, useElement } from '../../hooks';
import { getClassName, globalMaxIndexManager, globalScrollCapture, getPopupPlacementStyle } from '../../utils';
import { DTransition } from '../_transition';

export interface DPopupProps extends React.HTMLAttributes<HTMLDivElement> {
  dVisible?: boolean;
  dContainer?: DElementSelector | false;
  dPlacement?: DPlacement;
  dAutoPlace?: boolean;
  dTarget: DElementSelector;
  dTrigger?: 'hover' | 'focus' | 'click' | null;
  dDistance?: number;
  dArrow?: boolean;
  dZIndex?: number;
  dMouseEnterDelay?: number;
  dMouseLeaveDelay?: number;
  dCustomPopup?: (popupEl: HTMLElement, targetEl: HTMLElement) => { top: number; left: number; stateList: DTransitionStateList };
  onTrigger?: (visible: boolean) => void;
  afterVisibleChange?: (visible: boolean) => void;
}

export interface DPopupRef {
  el: HTMLElement | null;
  target: DElementSelector;
  updatePosition: () => void;
}

export const DPopup = React.forwardRef<DPopupRef, DPopupProps>((props, ref) => {
  const {
    dVisible,
    dContainer,
    dPlacement = 'top',
    dAutoPlace = true,
    dTarget,
    dTrigger = 'hover',
    dDistance = 10,
    dArrow = true,
    dZIndex,
    dMouseEnterDelay = 150,
    dMouseLeaveDelay = 200,
    dCustomPopup,
    onTrigger,
    afterVisibleChange,
    className,
    style,
    children,
    ...restProps
  } = props;

  const dPrefix = useDPrefixConfig();
  const asyncCapture = useAsync();

  //#region Refs.
  /*
   * @see https://reactjs.org/docs/refs-and-the-dom.html
   *
   * - Vue: ref.
   * @see https://v3.vuejs.org/guide/component-template-refs.html
   * - Angular: ViewChild.
   * @see https://angular.io/api/core/ViewChild
   */
  const [popupRefContent, popupRef] = useCustomRef<DTransitionRef>();
  //#endregion

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
  const [popupPositionStyle, setPopupPositionStyle] = useImmer<React.CSSProperties>({});

  const [autoVisible, setAutoVisible] = useImmer(false);

  const [autoPlacement, setAutoPlacement] = useImmer<DPlacement>(dPlacement);

  const [zIndex, setZIndex] = useImmer(1000);
  //#endregion

  //#region Element
  const targetEl = useElement(dTarget);
  const handleContainer = useCallback(() => {
    if (isUndefined(dContainer)) {
      let el = document.getElementById('d-popup-root');
      if (!el) {
        el = document.createElement('div');
        el.id = 'd-popup-root';
        document.body.appendChild(el);
      }
      return el;
    } else if (dContainer === false) {
      return targetEl.current?.parentElement ?? null;
    }
    return null;
  }, [dContainer, targetEl]);
  const containerEl = useElement(dContainer, handleContainer);
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
  const visible = useMemo(() => (isUndefined(dVisible) ? autoVisible : dVisible), [dVisible, autoVisible]);

  const placement = useMemo(() => (dAutoPlace ? autoPlacement : dPlacement), [dAutoPlace, autoPlacement, dPlacement]);

  const updatePosition = useCallback(() => {
    if (popupRefContent && popupRefContent.el && targetEl.current && containerEl.current) {
      const popupEl = popupRefContent.el;
      const fixed = isUndefined(dContainer);

      if (isUndefined(dCustomPopup)) {
        let currentPlacement = dAutoPlace ? dPlacement : autoPlacement;

        if (dAutoPlace) {
          let space: [number, number, number, number] = [0, 0, 0, 0];
          if (!fixed) {
            const containerRect = containerEl.current.getBoundingClientRect();
            space = [
              containerRect.top,
              window.innerWidth - containerRect.left - containerRect.width,
              window.innerHeight - containerRect.top - containerRect.height,
              containerRect.left,
            ];
          }
          const position = getPopupPlacementStyle(popupEl, targetEl.current, dPlacement, dDistance, fixed, space);
          if (position) {
            currentPlacement = position.placement;
            setAutoPlacement(position.placement);
            setPopupPositionStyle({
              position: fixed ? 'fixed' : 'absolute',
              top: position.top,
              left: position.left,
            });
          } else {
            const position = getPopupPlacementStyle(popupEl, targetEl.current, autoPlacement, dDistance, fixed);
            setPopupPositionStyle({
              position: fixed ? 'fixed' : 'absolute',
              top: position.top,
              left: position.left,
            });
          }
        } else {
          const position = getPopupPlacementStyle(popupEl, targetEl.current, dPlacement, dDistance, fixed);
          setPopupPositionStyle({
            position: fixed ? 'fixed' : 'absolute',
            top: position.top,
            left: position.left,
          });
        }

        let transformOrigin = 'center bottom';
        switch (currentPlacement) {
          case 'top':
            transformOrigin = 'center bottom';
            break;

          case 'top-left':
            transformOrigin = '20px bottom';
            break;

          case 'top-right':
            transformOrigin = 'calc(100% - 20px) bottom';
            break;

          case 'right':
            transformOrigin = 'left center';
            break;

          case 'right-top':
            transformOrigin = 'left 12px';
            break;

          case 'right-bottom':
            transformOrigin = 'left calc(100% - 12px)';
            break;

          case 'bottom':
            transformOrigin = 'center top';
            break;

          case 'bottom-left':
            transformOrigin = '20px top';
            break;

          case 'bottom-right':
            transformOrigin = 'calc(100% - 20px) top';
            break;

          case 'left':
            transformOrigin = 'right center';
            break;

          case 'left-top':
            transformOrigin = 'right 12px';
            break;

          case 'left-bottom':
            transformOrigin = 'right calc(100% - 12px)';
            break;

          default:
            break;
        }
        return {
          'enter-from': { transform: 'scale(0)', opacity: '0' },
          'enter-to': { transition: 'transform 0.1s ease-out, opacity 0.1s ease-out', transformOrigin },
          'leave-to': { transform: 'scale(0)', opacity: '0', transition: 'transform 0.1s ease-in, opacity 0.1s ease-in', transformOrigin },
        };
      } else {
        const { top, left, stateList } = dCustomPopup(popupRefContent.el, targetEl.current);
        setPopupPositionStyle({
          position: fixed ? 'fixed' : 'absolute',
          top,
          left,
        });
        return stateList;
      }
    }
  }, [
    dAutoPlace,
    dContainer,
    dCustomPopup,
    dDistance,
    dPlacement,
    popupRefContent,
    autoPlacement,
    containerEl,
    targetEl,
    setPopupPositionStyle,
    setAutoPlacement,
  ]);
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
    if (dVisible) {
      if (isUndefined(dZIndex)) {
        if (isUndefined(dContainer)) {
          const [key, maxZIndex] = globalMaxIndexManager.getMaxIndex();
          setZIndex(maxZIndex);
          return () => {
            globalMaxIndexManager.deleteRecord(key);
          };
        } else {
          setZIndex(10);
        }
      } else {
        setZIndex(dZIndex);
      }
    }
  }, [dVisible, dContainer, dZIndex, setZIndex]);

  useEffect(() => {
    const [asyncGroup, asyncId] = asyncCapture.createGroup();
    const popupEl = popupRefContent?.el ?? null;
    let hoverTid: number | null = null;
    let blurTid: number | null = null;
    let documentTid: number | null = null;
    const getEventEls = (...args: Array<HTMLElement | null>) => {
      const arr = [];
      for (const el of args) {
        if (el) {
          arr.push(el);
        }
      }
      return arr;
    };
    const setVisible = (visible: boolean) => {
      setAutoVisible(visible);
      if (autoVisible !== visible) {
        onTrigger?.(visible);
      }
    };

    switch (dTrigger) {
      case 'hover':
        asyncGroup.fromEvent(getEventEls(targetEl.current, popupEl), 'mouseenter').subscribe({
          next: () => {
            hoverTid && asyncGroup.clearTimeout(hoverTid);
            hoverTid = asyncGroup.setTimeout(() => {
              hoverTid = null;
              setVisible(true);
            }, dMouseEnterDelay);
          },
        });
        asyncGroup.fromEvent(getEventEls(targetEl.current, popupEl), 'mouseleave').subscribe({
          next: () => {
            hoverTid && asyncGroup.clearTimeout(hoverTid);
            hoverTid = asyncGroup.setTimeout(() => {
              hoverTid = null;
              setVisible(false);
            }, dMouseLeaveDelay);
          },
        });
        break;

      case 'focus':
        asyncGroup.fromEvent(getEventEls(targetEl.current, popupEl), 'focus').subscribe({
          next: () => {
            blurTid && asyncGroup.cancelAnimationFrame(blurTid);
            setVisible(true);
          },
        });
        asyncGroup.fromEvent(getEventEls(targetEl.current, popupEl), 'blur').subscribe({
          next: () => {
            blurTid = asyncGroup.requestAnimationFrame(() => {
              setVisible(false);
            });
          },
        });
        break;

      case 'click':
        asyncGroup.fromEvent(getEventEls(popupEl), 'click').subscribe({
          next: () => {
            documentTid && asyncGroup.cancelAnimationFrame(documentTid);
            setVisible(true);
          },
        });
        asyncGroup.fromEvent(getEventEls(targetEl.current), 'click').subscribe({
          next: () => {
            documentTid && asyncGroup.cancelAnimationFrame(documentTid);
            setVisible(!autoVisible);
          },
        });
        asyncGroup.fromEvent(document, 'click', { capture: true }).subscribe({
          next: () => {
            documentTid = asyncGroup.requestAnimationFrame(() => {
              setVisible(false);
            });
          },
        });
        break;

      default:
        break;
    }

    return () => {
      asyncCapture.deleteGroup(asyncId);
    };
  }, [dMouseEnterDelay, dMouseLeaveDelay, dTrigger, onTrigger, asyncCapture, popupRefContent, targetEl, autoVisible, setAutoVisible]);

  useEffect(() => {
    const [asyncGroup, asyncId] = asyncCapture.createGroup();
    if (visible && popupRefContent && popupRefContent.el) {
      asyncGroup.onResize(popupRefContent.el, () => popupRefContent.transitionThrottle(updatePosition));
    }
    return () => {
      asyncCapture.deleteGroup(asyncId);
    };
  }, [asyncCapture, visible, popupRefContent, updatePosition]);

  useEffect(() => {
    const [asyncGroup, asyncId] = asyncCapture.createGroup();
    if (visible && targetEl.current && popupRefContent) {
      asyncGroup.onResize(targetEl.current, () => popupRefContent.transitionThrottle(updatePosition));
    }
    return () => {
      asyncCapture.deleteGroup(asyncId);
    };
  }, [asyncCapture, popupRefContent, targetEl, visible, updatePosition]);

  useEffect(() => {
    if (visible && popupRefContent) {
      const tid = globalScrollCapture.addTask(() => popupRefContent.transitionThrottle(updatePosition));
      return () => {
        globalScrollCapture.deleteTask(tid);
      };
    }
  }, [visible, popupRefContent, updatePosition]);

  useEffect(() => {
    if (popupRefContent) {
      popupRefContent.transitionThrottle(updatePosition);
    }
  }, [popupRefContent, updatePosition]);
  //#endregion

  useImperativeHandle(
    ref,
    () => ({
      el: popupRefContent?.el ?? null,
      target: dTarget,
      updatePosition,
    }),
    [popupRefContent, dTarget, updatePosition]
  );

  return (
    containerEl.current &&
    ReactDOM.createPortal(
      <DTransition
        ref={popupRef}
        dVisible={visible}
        dStateList={updatePosition}
        dCallbackList={{
          afterEnter: () => {
            afterVisibleChange?.(true);
          },
          afterLeave: () => {
            afterVisibleChange?.(false);
          },
        }}
      >
        <div
          {...restProps}
          className={getClassName(className, `${dPrefix}popup`, `${dPrefix}popup--` + placement)}
          style={{
            ...style,
            zIndex,
            ...popupPositionStyle,
          }}
          tabIndex={-1}
        >
          {dArrow && <div className={`${dPrefix}popup__arrow`}></div>}
          {children}
        </div>
      </DTransition>,
      containerEl.current
    )
  );
});
