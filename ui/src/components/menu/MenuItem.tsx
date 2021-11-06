import { isUndefined } from 'lodash';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';

import { useDPrefixConfig, useDComponentConfig, useCustomContext } from '../../hooks';
import { getClassName } from '../../utils';
import { DMenuContext } from './Menu';
import { DMenuSubContext } from './MenuSub';

export interface DMenuItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  dDisabled?: boolean;
  dIcon?: React.ReactNode;
  __id?: string;
  __level?: number;
}

export function DMenuItem(props: DMenuItemProps) {
  const {
    dDisabled = false,
    dIcon,
    __id,
    __level = 0,
    className,
    style,
    tabIndex,
    children,
    onClick,
    ...restProps
  } = useDComponentConfig('menu-item', props);

  const dPrefix = useDPrefixConfig();
  const { activeId: _activeId, onActiveChange: _onActiveChange } = useCustomContext(DMenuContext);
  const { setIds: _setIds } = useCustomContext(DMenuSubContext);

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
  const handleClick = useCallback(
    (e) => {
      if (!dDisabled) {
        onClick?.(e);
        _onActiveChange?.(__id as string);
      }
    },
    [_onActiveChange, dDisabled, __id, onClick]
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
    _setIds?.((draft) => {
      draft.add(__id as string);
    });
    return () => {
      _setIds?.((draft) => {
        draft.delete(__id as string);
      });
    };
  }, [_setIds, __id]);
  //#endregion

  return (
    <li
      {...restProps}
      className={getClassName(className, `${dPrefix}menu-item`, {
        'is-active': _activeId === __id,
        'is-disabled': dDisabled,
      })}
      style={{ ...style, paddingLeft: 16 + __level * 20 }}
      role="menuitem"
      tabIndex={isUndefined(tabIndex) ? -1 : tabIndex}
      aria-disabled={dDisabled}
      onClick={handleClick}
    >
      <div className={`${dPrefix}menu-item__indicator`}>
        <div style={{ backgroundColor: __level === 0 ? 'transparent' : undefined }}></div>
      </div>
      <div className={`${dPrefix}menu-item__title`}>{children}</div>
    </li>
  );
}
