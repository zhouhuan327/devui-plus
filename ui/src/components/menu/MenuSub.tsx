import type { DTransitionStateList, DTransitionCallbackList } from '../../hooks/transition';
import type { DPopupRef } from '../_popup';
import type { Updater } from 'use-immer';

import { enableMapSet } from 'immer';
import { isUndefined } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useImmer } from 'use-immer';

import { useDPrefixConfig, useDComponentConfig, useCustomRef, useCustomContext, useCollapseTransition } from '../../hooks';
import { getClassName, getFixedSideStyle, getElement } from '../../utils';
import { DPopup } from '../_popup';
import { DIcon } from '../icon';
import { DMenuContext } from './Menu';
import { generateChildren } from './utils';

enableMapSet();

export type DMenuSubContextData = {
  setPopupIds: Updater<Set<string>>;
  setIds: Updater<Set<string>>;
} | null;
export const DMenuSubContext = React.createContext<DMenuSubContextData>(null);

export interface DMenuSubProps extends React.LiHTMLAttributes<HTMLLIElement> {
  dDefaultExpand?: boolean;
  dDisabled?: boolean;
  dIcon?: React.ReactNode;
  dTitle: React.ReactNode;
  dPopup?: boolean;
  dPopupTrigger?: 'hover' | 'click';
  dLoadChildren?: () => Promise<React.ReactNode>;
  __id?: string;
  __level?: number;
}

export function DMenuSub(props: DMenuSubProps) {
  const {
    dDefaultExpand = false,
    dDisabled = false,
    dIcon,
    dTitle,
    dPopup,
    dPopupTrigger,
    dLoadChildren,
    __id,
    __level = 0,
    className,
    style,
    tabIndex,
    children,
    onClick,
    ...restProps
  } = useDComponentConfig('menu-sub', props);

  const dPrefix = useDPrefixConfig();
  const { dPopup: _dPopup, dPopupTrigger: _dPopupTrigger, activeId: _activeId } = useCustomContext(DMenuContext);
  const { setPopupIds: _setPopupIds, setIds: _setIds } = useCustomContext(DMenuSubContext);

  //#region Refs.
  /*
   * @see https://reactjs.org/docs/refs-and-the-dom.html
   *
   * - Vue: ref.
   * @see https://v3.vuejs.org/guide/component-template-refs.html
   * - Angular: ViewChild.
   * @see https://angular.io/api/core/ViewChild
   */
  const [liEl, liRef] = useCustomRef<HTMLLIElement>();
  const [menuEl, menuRef] = useCustomRef<HTMLUListElement>();
  const [popupRefContent, popupRef] = useCustomRef<DPopupRef>();
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
  const [expand, setExpand] = useImmer(dDefaultExpand);
  const [visible, setVisible] = useImmer(dDefaultExpand);

  const [popupIds, setPopupIds] = useImmer(new Set<string>());

  const [ids, setIds] = useImmer(new Set<string>());
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
  const popup = useMemo(() => dPopup ?? _dPopup ?? false, [_dPopup, dPopup]);
  const popupTrigger = useMemo(() => dPopupTrigger ?? _dPopupTrigger ?? 'hover', [_dPopupTrigger, dPopupTrigger]);

  const customPosition = useCallback((popupEl, targetEl) => {
    return getFixedSideStyle(popupEl, targetEl, 'right', targetEl.dataset['popup'] === 'true' ? 18 : 10);
  }, []);

  const handleClick = useCallback(
    (e) => {
      if (!dDisabled) {
        onClick?.(e);
        if (!popup) {
          setExpand(!expand);
        }
      }
    },
    [dDisabled, expand, popup, onClick, setExpand]
  );

  const handleTrigger = useCallback(
    (visible) => {
      if (!dDisabled) {
        if (visible) {
          setExpand(true);
        }
        setVisible(visible);
        setPopupIds((draft) => {
          visible ? draft.add(__id as string) : draft.delete(__id as string);
        });
      }
    },
    [__id, dDisabled, setVisible, setPopupIds, setExpand]
  );

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
    if (!visible && popupIds.size === 0) {
      setExpand(false);
    }
  }, [popupIds, visible, setExpand]);

  useEffect(() => {
    _setIds?.((draft) => {
      for (const id of ids.values()) {
        draft.add(id);
      }
    });
    return () => {
      _setIds?.((draft) => {
        for (const id of ids.values()) {
          draft.delete(id);
        }
      });
    };
  }, [_setIds, ids]);

  useEffect(() => {
    _setPopupIds?.((draft) => {
      for (const id of popupIds.values()) {
        draft.add(id);
      }
    });
    return () => {
      _setPopupIds?.((draft) => {
        for (const id of popupIds.values()) {
          draft.delete(id);
        }
      });
    };
  }, [_setPopupIds, popupIds]);
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
  const childs = useMemo(() => {
    return generateChildren(children, !popup).map((child) => {
      return React.cloneElement(child, {
        ...child.props,
        'data-popup': popup,
        __level: popup ? 0 : __level + 1,
      });
    });
  }, [__level, popup, children]);
  //#endregion

  //#region transition
  const transitionStateList = useMemo<DTransitionStateList>(() => {
    return {
      'enter-from': { transform: 'scale(0)', opacity: 0 },
      'enter-to': { transition: 'transform 133ms ease-out, opacity 133ms ease-out' },
      'leave-to': { transform: 'scale(0)', opacity: 0, transition: 'transform 133ms ease-in, opacity 133ms ease-in' },
    };
  }, []);
  const transitionCallbackList = useMemo<DTransitionCallbackList>(() => {
    let transformOrigin: string;
    return {
      beforeEnter: () => {
        const popupEl = popupRefContent?.el;
        const targetEl = getElement(popupRefContent?.target ?? null);
        if (popupEl && targetEl) {
          transformOrigin = getFixedSideStyle(popupEl, targetEl, 'right', targetEl.dataset['popup'] === 'true' ? 18 : 10).transformOrigin;
        }
      },
      enter: (el, rect, setStyle) => {
        setStyle((draft) => {
          draft.transformOrigin = transformOrigin;
        });
      },
      leave: (el, rect, setStyle) => {
        const popupEl = popupRefContent?.el;
        const targetEl = getElement(popupRefContent?.target ?? null);
        if (popupEl && targetEl) {
          setStyle((draft) => {
            draft.transformOrigin = getFixedSideStyle(
              popupEl,
              targetEl,
              'right',
              targetEl.dataset['popup'] === 'true' ? 18 : 10
            ).transformOrigin;
          });
        }
      },
    };
  }, [popupRefContent]);
  const transitionStyle = useCollapseTransition({ dVisible: expand, dDirection: 'height', dDuring: 200, dTarget: menuEl });
  //#endregion

  const contextValue = useMemo(() => ({ setPopupIds, setIds }), [setPopupIds, setIds]);

  const menu = (
    <ul
      ref={menuRef}
      className={`${dPrefix}menu-list`}
      style={popup ? undefined : transitionStyle}
      role="menu"
      tabIndex={-1}
      aria-labelledby={`menu-sub-${__id}`}
      aria-orientation="vertical"
      aria-hidden={!expand}
    >
      {childs}
    </ul>
  );

  return (
    <DMenuSubContext.Provider value={contextValue}>
      <li
        {...restProps}
        ref={liRef}
        id={`menu-sub-${__id}`}
        className={getClassName(className, `${dPrefix}menu-sub`, {
          'is-active': !expand && ids.has(_activeId as string),
          'is-disabled': dDisabled,
        })}
        style={{ ...style, paddingLeft: 16 + __level * 20 }}
        role="menuitem"
        tabIndex={isUndefined(tabIndex) ? -1 : tabIndex}
        aria-disabled={dDisabled}
        aria-haspopup={true}
        aria-expanded={expand}
        onClick={handleClick}
      >
        <div className={`${dPrefix}menu-sub__indicator`}>
          <div style={{ backgroundColor: __level === 0 ? 'transparent' : undefined }}></div>
        </div>
        {dIcon && <div className={`${dPrefix}menu-sub__icon`}>{dIcon}</div>}
        <div className={`${dPrefix}menu-sub__title`}>{dTitle}</div>
        <DIcon className={`${dPrefix}menu-sub__arrow`} dSize={14} dRotate={popup ? -90 : expand ? 180 : undefined}>
          <path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path>
        </DIcon>
      </li>
      {!dDisabled &&
        (popup ? (
          <DPopup
            ref={popupRef}
            className={`${dPrefix}menu-sub__popup`}
            dVisible={expand}
            dTrigger={popupTrigger}
            dTarget={liEl}
            dArrow={false}
            dCustomPosition={customPosition}
            dCustomTransition={transitionStateList}
            dCustomTransitionCallback={transitionCallbackList}
            onTrigger={handleTrigger}
          >
            {menu}
          </DPopup>
        ) : (
          menu
        ))}
    </DMenuSubContext.Provider>
  );
}
