import type { DElementSelector } from '../../hooks/element';
import type { DTransitionStateList, DTransitionCallbackList } from '../../hooks/transition';
import type { DPlacement } from '../../utils/position';

import { isUndefined } from 'lodash';
import React, { useCallback, useEffect, useMemo, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import { Subject } from 'rxjs';
import { useImmer } from 'use-immer';

import { useDPrefixConfig, useCustomRef, useAsync, useThrottle, useTransition, useElement } from '../../hooks';
import { getClassName, globalMaxIndexManager, globalScrollCapture, getPopupPlacementStyle } from '../../utils';
import { useLockOperation } from './utils';

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
  dCustomTransition?: DTransitionStateList;
  dCustomTransitionCallback?: DTransitionCallbackList;
  dCustomPosition?: (popupEl: HTMLDivElement, targetEl: HTMLElement) => { top: number; left: number };
  onTrigger?: (visible: boolean) => void;
  afterVisibleChange?: (visible: boolean) => void;
}

export interface DPopupRef {
  el: HTMLDivElement | null;
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
    dCustomTransition,
    dCustomTransitionCallback,
    dCustomPosition,
    onTrigger,
    afterVisibleChange,
    className,
    style,
    children,
    ...restProps
  } = props;

  const dPrefix = useDPrefixConfig();
  const lockOperation = useLockOperation();
  const asyncCapture = useAsync();
  const { throttleByAnimationFrame } = useThrottle();

  //#region Refs.
  /*
   * @see https://reactjs.org/docs/refs-and-the-dom.html
   *
   * - Vue: ref.
   * @see https://v3.vuejs.org/guide/component-template-refs.html
   * - Angular: ViewChild.
   * @see https://angular.io/api/core/ViewChild
   */
  const [popupEl, popupRef] = useCustomRef<HTMLDivElement>();
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
  const [triggerObserver$] = useImmer(new Subject<[boolean, number?]>());

  const [popupPositionStyle, setPopupPositionStyle] = useImmer<React.CSSProperties>({});

  const [autoVisible, setAutoVisible] = useImmer(false);

  const [autoPlacement, setPrePlacement] = useImmer<DPlacement>(dPlacement);

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

  const updatePosition = useCallback(() => {
    throttleByAnimationFrame(() => {
      if (popupEl && targetEl.current && containerEl.current) {
        let space: [number, number, number, number] = [0, 0, 0, 0];
        if (dAutoPlace && !isUndefined(dContainer)) {
          const containerRect = containerEl.current.getBoundingClientRect();
          space = [
            containerRect.top,
            window.innerWidth - containerRect.left - containerRect.width,
            window.innerHeight - containerRect.top - containerRect.height,
            containerRect.left,
          ];
        }

        if (dCustomPosition) {
          const { top, left } = dCustomPosition(popupEl, targetEl.current);
          setPopupPositionStyle({
            position: isUndefined(dContainer) ? 'fixed' : 'absolute',
            top,
            left,
          });
        } else {
          const { top, left, placement } = getPopupPlacementStyle(
            popupEl,
            targetEl.current,
            dPlacement,
            dDistance,
            isUndefined(dContainer),
            dAutoPlace ? { space, default: autoPlacement } : undefined
          );
          setPrePlacement(placement);
          setPopupPositionStyle({
            position: isUndefined(dContainer) ? 'fixed' : 'absolute',
            top,
            left,
          });
        }
      }
    });
  }, [
    dAutoPlace,
    dContainer,
    dCustomPosition,
    dDistance,
    dPlacement,
    throttleByAnimationFrame,
    popupEl,
    autoPlacement,
    containerEl,
    targetEl,
    setPopupPositionStyle,
    setPrePlacement,
  ]);
  //#endregion

  //#region Mounted & Unmount.
  /*
   * @example
   * // Mounted
   * useEffect(() => {
   *   // code
   * }, []);
   *
   * // Unmount
   * useEffect(() => {
   *   return () => {
   *     // code
   *   }
   * }, [deps]);
   *
   * - Vue: onMounted & onUnmounted.
   * @see https://v3.vuejs.org/guide/composition-api-lifecycle-hooks.html
   * - Angular: ngAfterViewInit & ngOnDestroy.
   * @see https://angular.io/guide/lifecycle-hooks
   */
  useEffect(() => {
    return () => {
      triggerObserver$.complete();
    };
  }, [triggerObserver$]);
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
    if (popupEl) {
      switch (dTrigger) {
        case 'hover':
          asyncGroup.fromEvent(popupEl, 'mouseenter').subscribe(() => {
            triggerObserver$.next([true, dMouseEnterDelay]);
          });
          asyncGroup.fromEvent(popupEl, 'mouseleave').subscribe(() => {
            triggerObserver$.next([false, dMouseLeaveDelay]);
          });
          break;

        case 'focus':
          asyncGroup.fromEvent(popupEl, 'focus').subscribe(() => {
            lockOperation.lock();
            triggerObserver$.next([true]);
          });
          asyncGroup.fromEvent(popupEl, 'blur').subscribe(() => {
            lockOperation.handleOperation(() => {
              triggerObserver$.next([false]);
            });
          });
          break;

        case 'click':
          asyncGroup.fromEvent(popupEl, 'click').subscribe(() => {
            lockOperation.lock();
            triggerObserver$.next([true]);
          });
          break;

        default:
          break;
      }
    }
    return () => {
      asyncCapture.deleteGroup(asyncId);
    };
  }, [dTrigger, dMouseEnterDelay, dMouseLeaveDelay, dTarget, asyncCapture, triggerObserver$, lockOperation, visible, popupEl]);

  useEffect(() => {
    const [asyncGroup, asyncId] = asyncCapture.createGroup();
    if (targetEl.current) {
      switch (dTrigger) {
        case 'hover':
          asyncGroup.fromEvent([targetEl.current], 'mouseenter').subscribe(() => {
            triggerObserver$.next([true, dMouseEnterDelay]);
          });
          asyncGroup.fromEvent([targetEl.current], 'mouseleave').subscribe(() => {
            triggerObserver$.next([false, dMouseLeaveDelay]);
          });
          break;

        case 'focus':
          asyncGroup.fromEvent([targetEl.current], 'focus').subscribe(() => {
            lockOperation.lock();
            triggerObserver$.next([true]);
          });
          asyncGroup.fromEvent([targetEl.current], 'blur').subscribe(() => {
            lockOperation.handleOperation(() => {
              triggerObserver$.next([false]);
            });
          });
          break;

        case 'click':
          asyncGroup.fromEvent(targetEl.current, 'click').subscribe(() => {
            if (!visible) {
              lockOperation.lock();
              triggerObserver$.next([true]);
            }
          });
          asyncGroup.fromEvent(document, 'click').subscribe(() => {
            lockOperation.handleOperation(() => {
              triggerObserver$.next([false]);
            });
          });
          break;

        default:
          break;
      }
    }
    return () => {
      asyncCapture.deleteGroup(asyncId);
    };
  }, [dTrigger, dMouseEnterDelay, dMouseLeaveDelay, asyncCapture, triggerObserver$, lockOperation, targetEl, visible]);

  useEffect(() => {
    const [asyncGroup, asyncId] = asyncCapture.createGroup();
    const ob = triggerObserver$.subscribe({
      next: ([visible, timeout]) => {
        const deal = () => {
          setAutoVisible(visible);
          onTrigger?.(visible);
        };
        asyncGroup.clearAll();
        if (isUndefined(timeout)) {
          deal();
        } else {
          asyncGroup.setTimeout(() => {
            deal();
          }, timeout);
        }
      },
    });
    return () => {
      ob.unsubscribe();
      asyncCapture.deleteGroup(asyncId);
    };
  }, [asyncCapture, triggerObserver$, onTrigger, setAutoVisible]);

  useEffect(() => {
    const [asyncGroup, asyncId] = asyncCapture.createGroup();
    if (visible && popupEl) {
      asyncGroup.onResize(popupEl, updatePosition);
    }
    return () => {
      asyncCapture.deleteGroup(asyncId);
    };
  }, [asyncCapture, visible, popupEl, updatePosition]);

  useEffect(() => {
    const [asyncGroup, asyncId] = asyncCapture.createGroup();
    if (visible && targetEl.current) {
      asyncGroup.onResize(targetEl.current, updatePosition);
    }
    return () => {
      asyncCapture.deleteGroup(asyncId);
    };
  }, [asyncCapture, targetEl, visible, updatePosition]);

  useEffect(() => {
    if (visible) {
      const tid = globalScrollCapture.addTask(() => updatePosition());
      return () => {
        globalScrollCapture.deleteTask(tid);
      };
    }
  }, [visible, updatePosition]);

  useEffect(() => {
    updatePosition();
  }, [updatePosition]);
  //#endregion

  //#region Transition
  const transitionStateList = useMemo<DTransitionStateList>(() => {
    if (dCustomTransition) {
      return dCustomTransition;
    } else {
      let transformOrigin = 'center bottom';
      switch (autoPlacement) {
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
        'enter-from': { transform: 'scale(0)', opacity: 0 },
        'enter-to': { transition: 'transform 0.1s ease-out, opacity 0.1s ease-out', transformOrigin },
        'leave-to': { transform: 'scale(0)', opacity: 0, transition: 'transform 0.1s ease-in, opacity 0.1s ease-in', transformOrigin },
      };
    }
  }, [dCustomTransition, autoPlacement]);
  const transitionCallbackList = useMemo<DTransitionCallbackList>(() => {
    return {
      ...dCustomTransitionCallback,
      beforeEnter: (...args) => {
        dCustomTransitionCallback?.beforeEnter?.(...args);
        updatePosition();
      },
      afterEnter: (...args) => {
        dCustomTransitionCallback?.afterEnter?.(...args);
        afterVisibleChange?.(true);
      },
      afterLeave: (...args) => {
        dCustomTransitionCallback?.afterLeave?.(...args);
        afterVisibleChange?.(false);
      },
    };
  }, [dCustomTransitionCallback, afterVisibleChange, updatePosition]);
  const transitionStyle = useTransition({
    dVisible: visible,
    dStateList: transitionStateList,
    dCallbackList: transitionCallbackList,
    dTarget: popupEl,
  });
  //#endregion

  useImperativeHandle(
    ref,
    () => ({
      el: popupEl,
      target: dTarget,
      updatePosition,
    }),
    [popupEl, dTarget, updatePosition]
  );

  return (
    containerEl.current &&
    ReactDOM.createPortal(
      <div
        ref={popupRef}
        {...restProps}
        className={getClassName(className, `${dPrefix}popup`, `${dPrefix}popup--` + autoPlacement)}
        style={{
          ...style,
          zIndex,
          ...popupPositionStyle,
          ...transitionStyle,
        }}
        tabIndex={-1}
      >
        {dArrow && <div className={`${dPrefix}popup__arrow`}></div>}
        {children}
      </div>,
      containerEl.current
    )
  );
});
