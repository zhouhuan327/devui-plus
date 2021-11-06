import { enableMapSet } from 'immer';
import { isUndefined } from 'lodash';
import React, { useCallback, useMemo } from 'react';
import { useImmer } from 'use-immer';

import { useDPrefixConfig, useDComponentConfig } from '../../hooks';
import { getClassName } from '../../utils';
import { generateChildren } from './utils';

enableMapSet();

export type DMenuContextData = {
  dPopup: boolean;
  dPopupTrigger: 'hover' | 'click';
  activeId: string | null;
  onActiveChange: (id: string) => void;
} | null;
export const DMenuContext = React.createContext<DMenuContextData>(null);

export interface DMenuProps extends React.HTMLAttributes<HTMLElement> {
  dActive?: string;
  dDefaultActive?: string;
  dDefaultExpands?: string[];
  dHorizontal?: boolean;
  dPopup?: boolean;
  dPopupTrigger?: 'hover' | 'click';
  onActiveChange?: (id: string) => void;
}

export function DMenu(props: DMenuProps) {
  const {
    dActive,
    dDefaultActive,
    dDefaultExpands,
    dHorizontal = false,
    dPopup = false,
    dPopupTrigger = 'hover',
    onActiveChange,
    className,
    children,
    ...restProps
  } = useDComponentConfig('menu', props);

  const dPrefix = useDPrefixConfig();

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
  const [autoActiveId, setAutoActiveId] = useImmer<string | null>(dDefaultActive ?? null);
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
  const activeId = useMemo(() => (isUndefined(dActive) ? autoActiveId : dActive), [dActive, autoActiveId]);

  const _onActiveChange = useCallback(
    (id) => {
      onActiveChange?.(id);
      setAutoActiveId(id);
    },
    [onActiveChange, setAutoActiveId]
  );
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
    return generateChildren(children).map((child, index) => {
      let tabIndex = (child as React.ReactElement).props.tabIndex;
      if (index === 0) {
        tabIndex = 0;
      }

      return React.cloneElement(child as React.ReactElement, {
        ...(child as React.ReactElement).props,
        tabIndex,
      });
    });
  }, [children]);
  //#endregion

  const contextValue = useMemo(
    () => ({ dPopup, dPopupTrigger, activeId, onActiveChange: _onActiveChange }),
    [dPopup, dPopupTrigger, activeId, _onActiveChange]
  );

  return (
    <DMenuContext.Provider value={contextValue}>
      <nav
        {...restProps}
        className={getClassName(className, `${dPrefix}menu`, {
          'is-horizontal': dHorizontal,
        })}
        role="menubar"
        aria-orientation={dHorizontal ? 'horizontal' : 'vertical'}
      >
        {childs}
      </nav>
    </DMenuContext.Provider>
  );
}
