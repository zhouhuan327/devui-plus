import type { DTransitionStateList, DTransitionCallbackList } from '../../hooks/transition';
import type { DElementSelector } from '../../utils/selector';

import { isUndefined, isString } from 'lodash';
import React, { useEffect, useCallback, useMemo, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import { useImmer } from 'use-immer';

import {
  useDPrefixConfig,
  useDComponentConfig,
  useLockScroll,
  useCustomRef,
  useId,
  useThrottle,
  useAsync,
  useTransition,
} from '../../hooks';
import { getClassName, globalMaxIndexManager, globalEscStack, globalScrollCapture, getFillingStyle, toPx, getElement } from '../../utils';
import { DMask } from '../_mask';

export type DDrawerContextData = { id: number; onClose?: () => void } | null;
export const DDrawerContext = React.createContext<DDrawerContextData>(null);

export interface DDrawerProps extends React.HTMLAttributes<HTMLDivElement> {
  dVisible?: boolean;
  dContainer?: DElementSelector | false;
  dPlacement?: 'top' | 'right' | 'bottom' | 'left';
  dWidth?: number | string;
  dHeight?: number | string;
  dZIndex?: number;
  dMask?: boolean;
  dMaskClosable?: boolean;
  dHeader?: React.ReactNode;
  dFooter?: React.ReactNode;
  dChildDrawer?: React.ReactNode;
  onClose?: () => void;
  afterVisibleChange?: (visible: boolean) => void;
  __onVisibleChange?: (distance: { visible: boolean; top: number; right: number; bottom: number; left: number }) => void;
}

export interface DDrawerRef {
  el: HTMLDivElement | null;
  updatePosition: () => void;
}

export const DDrawer = React.forwardRef<DDrawerRef, DDrawerProps>((props, ref) => {
  const {
    dVisible = false,
    dContainer,
    dPlacement = 'right',
    dWidth = 400,
    dHeight = 280,
    dZIndex,
    dMask = true,
    dMaskClosable = true,
    dHeader,
    dFooter,
    dChildDrawer,
    onClose,
    afterVisibleChange,
    __onVisibleChange,
    className,
    style,
    children,
    ...restProps
  } = useDComponentConfig('drawer', props);

  const dPrefix = useDPrefixConfig();
  const { throttleByAnimationFrame } = useThrottle();
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
  const [drawerEl, drawerRef] = useCustomRef<HTMLDivElement>();
  const [contentEl, contentRef] = useCustomRef<HTMLDivElement>();
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
  const id = useId();

  const [drawerPositionStyle, setDrawerPositionStyle] = useImmer<React.CSSProperties>({});

  const [distance, setDistance] = useImmer<{ visible: boolean; top: number; right: number; bottom: number; left: number }>({
    visible: false,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  });

  const [display, setDisplay] = useImmer<'none' | undefined>('none');

  const [containerEl, setContainerEl] = useImmer<HTMLElement | null>(null);

  const [zIndex, setZIndex] = useImmer(1000);
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
  const width = useMemo(() => (isString(dWidth) ? toPx(dWidth, true) : dWidth), [dWidth]);
  const height = useMemo(() => (isString(dHeight) ? toPx(dHeight, true) : dHeight), [dHeight]);

  const handleMaskClick = useCallback(() => {
    if (dMaskClosable) {
      onClose?.();
    }
  }, [dMaskClosable, onClose]);

  const updateContainerEl = useCallback(() => {
    if (isUndefined(dContainer)) {
      let el = document.getElementById('d-drawer-root');
      if (!el) {
        el = document.createElement('div');
        el.id = 'd-drawer-root';
        document.body.appendChild(el);
      }
      setContainerEl(el);
    } else if (dContainer === false) {
      setContainerEl(drawerEl?.parentElement ?? null);
    } else {
      setContainerEl(getElement(dContainer));
    }
  }, [dContainer, drawerEl, setContainerEl]);

  const updatePosition = useCallback(() => {
    throttleByAnimationFrame(() => {
      if (drawerEl) {
        if (isUndefined(dContainer)) {
          setDrawerPositionStyle({
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
          });
        } else if (containerEl) {
          setDrawerPositionStyle({
            position: 'absolute',
            ...getFillingStyle(drawerEl, containerEl, false),
          });
        }
      }
    });
  }, [dContainer, drawerEl, throttleByAnimationFrame, containerEl, setDrawerPositionStyle]);
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
    if (!isUndefined(dChildDrawer)) {
      const _child = React.Children.only(dChildDrawer) as React.ReactElement;
      return React.cloneElement(_child, {
        ..._child.props,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        __onVisibleChange: (distance: any) => {
          setDistance(distance);
        },
      });
    }
    return null;
  }, [dChildDrawer, setDistance]);
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
      setDisplay(undefined);
    }
  }, [dVisible, setDisplay]);

  useEffect(() => {
    updateContainerEl();
  }, [updateContainerEl]);

  useEffect(() => {
    if (dVisible) {
      updateContainerEl();
    }
  }, [dVisible, updateContainerEl]);

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
    if (dVisible) {
      __onVisibleChange?.({
        visible: true,
        top: distance.top + (dPlacement === 'top' ? height : 0),
        right: distance.right + (dPlacement === 'right' ? width : 0),
        bottom: distance.bottom + (dPlacement === 'bottom' ? height : 0),
        left: distance.left + (dPlacement === 'left' ? width : 0),
      });
    } else {
      __onVisibleChange?.({
        ...distance,
        visible: false,
      });
    }
  }, [dVisible, dPlacement, __onVisibleChange, distance, width, height]);

  useEffect(() => {
    const [asyncGroup, asyncId] = asyncCapture.createGroup();
    if (dVisible && containerEl) {
      asyncGroup.onResize(containerEl, updatePosition);
    }
    return () => {
      asyncCapture.deleteGroup(asyncId);
    };
  }, [dVisible, asyncCapture, containerEl, updatePosition]);

  useEffect(() => {
    if (dVisible) {
      const tid = globalScrollCapture.addTask(() => updatePosition());
      return () => {
        globalScrollCapture.deleteTask(tid);
      };
    }
  }, [dVisible, updatePosition]);

  useEffect(() => {
    if (dVisible) {
      globalEscStack.stackPush(id, () => onClose?.());
      return () => {
        globalEscStack.stackDelete(id);
      };
    }
  }, [dVisible, id, onClose]);

  useEffect(() => {
    updatePosition();
  }, [updatePosition]);

  useLockScroll(dVisible && isUndefined(dContainer));
  //#endregion

  //#region Transition
  const transitionStateList = useMemo<DTransitionStateList>(() => {
    const transform =
      dPlacement === 'top'
        ? 'translate(0, -100%)'
        : dPlacement === 'right'
        ? 'translate(100%, 0)'
        : dPlacement === 'bottom'
        ? 'translate(0, 100%)'
        : 'translate(-100%, 0)';
    return {
      'enter-from': { transform },
      'enter-to': { transition: 'transform 0.2s ease-out' },
      'leave-to': { transform, transition: 'transform 0.2s ease-in' },
    };
  }, [dPlacement]);
  const transitionCallbackList = useMemo<DTransitionCallbackList>(() => {
    let cb: () => void;
    return {
      afterEnter: (el) => {
        afterVisibleChange?.(true);
        const activeEl = document.activeElement as HTMLElement | null;
        cb = () => activeEl?.focus({ preventScroll: true });
        el.focus({ preventScroll: true });
      },
      beforeLeave: () => {
        cb?.();
      },
      afterLeave: () => {
        afterVisibleChange?.(false);
        setDisplay('none');
      },
    };
  }, [afterVisibleChange, setDisplay]);
  const transitionStyle = useTransition({
    dVisible: dVisible,
    dStateList: transitionStateList,
    dCallbackList: transitionCallbackList,
    dTarget: contentEl,
  });
  //#endregion

  const contextValue = useMemo(() => ({ id, onClose }), [id, onClose]);

  useImperativeHandle(
    ref,
    () => ({
      el: drawerEl,
      updatePosition,
    }),
    [drawerEl, updatePosition]
  );

  const drawerNode = (
    <DDrawerContext.Provider value={contextValue}>
      <div
        {...restProps}
        ref={drawerRef}
        className={getClassName(className, `${dPrefix}drawer`)}
        style={{
          ...style,
          zIndex,
          display,
          transition: `transform 140ms ${distance.visible ? 'ease-out' : 'ease-in'} 60ms`,
          transform:
            dPlacement === 'top'
              ? `translateY(${(distance[dPlacement] / 3) * 2}px)`
              : dPlacement === 'right'
              ? `translateX(${-(distance[dPlacement] / 3) * 2}px)`
              : dPlacement === 'bottom'
              ? `translateY(${-(distance[dPlacement] / 3) * 2}px)`
              : `translateX(${(distance[dPlacement] / 3) * 2}px)`,
          ...drawerPositionStyle,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dHeader ? `${dPrefix}drawer-content__header-${id}` : undefined}
        aria-describedby={`${dPrefix}drawer-content-${id}`}
      >
        {dMask && <DMask dVisible={dVisible} onClick={handleMaskClick} />}
        <div
          ref={contentRef}
          id={`${dPrefix}drawer-content-${id}`}
          className={getClassName(`${dPrefix}drawer-content`, `${dPrefix}drawer-content--${dPlacement}`)}
          style={{
            width: dPlacement === 'left' || dPlacement === 'right' ? dWidth : undefined,
            height: dPlacement === 'bottom' || dPlacement === 'top' ? dHeight : undefined,
            ...transitionStyle,
          }}
          tabIndex={-1}
        >
          {dHeader}
          <div className={`${dPrefix}drawer-content__body`}>{children}</div>
          {dFooter}
        </div>
      </div>
      {child}
    </DDrawerContext.Provider>
  );

  return dContainer === false ? drawerNode : containerEl && ReactDOM.createPortal(drawerNode, containerEl);
});
