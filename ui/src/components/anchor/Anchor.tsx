import type { DElementSelector } from '../../utils/selector';
import type { Updater } from 'use-immer';

import { enableMapSet } from 'immer';
import { isUndefined } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import { useImmer } from 'use-immer';

import { useDPrefixConfig, useDComponentConfig, useCustomRef } from '../../hooks';
import { getClassName, globalScrollCapture, getElement, CustomScroll } from '../../utils';

enableMapSet();

export type DAnchorContextData = {
  activeHref: string | null;
  onClick: (href: string) => void;
  setLinkMap: Updater<Map<string, HTMLElement>>;
} | null;
export const DAnchorContext = React.createContext<DAnchorContextData>(null);

export interface DAnchorProps extends React.HTMLAttributes<HTMLUListElement> {
  dDistance?: number;
  dPage?: DElementSelector;
  dScrollBehavior?: 'instant' | 'smooth';
  dIndicator?: React.ReactNode;
  onHrefChange?: (href: string | null) => void;
}

export function DAnchor(props: DAnchorProps) {
  const {
    dDistance = 0,
    dPage,
    dScrollBehavior = 'instant',
    dIndicator = 'dot',
    onHrefChange,
    className,
    children,
    ...restProps
  } = useDComponentConfig('anchor', props);

  const dPrefix = useDPrefixConfig();

  //#region Refs.
  /*
   * @see https://reactjs.org/docs/refs-and-the-dom.html
   *
   * - Vue: ref.
   * @see https://v3.vuejs.org/guide/component-template-refs.html
   * - Angular: ViewChild.
   * @see https://angular.io/api/core/ViewChild
   */
  const [anchorEl, anchorRef] = useCustomRef<HTMLUListElement>();
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
  const [customScroll] = useImmer(new CustomScroll());

  const [dotStyle, setDotStyle] = useImmer<React.CSSProperties>({});

  const [linkMap, setLinkMap] = useImmer(new Map<string, HTMLElement>());
  const [activeHref, setActiveHref] = useImmer<string | null>(null);
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
  const updateAnchor = useCallback(() => {
    if (anchorEl) {
      let pageTop = 0;
      if (!isUndefined(dPage)) {
        const pageEl = getElement(dPage);
        if (pageEl) {
          pageTop = pageEl.getBoundingClientRect().top;
        } else {
          return;
        }
      }

      let nearestEl: [string, number] | null = null;
      for (const [href] of linkMap.entries()) {
        if (href) {
          const el = document.getElementById(href.slice(1));
          if (el) {
            const top = el.getBoundingClientRect().top;
            // Add 1 because `getBoundingClientRect` return decimal
            if (top - pageTop <= dDistance + 1) {
              if (nearestEl === null) {
                nearestEl = [href, top];
              } else if (top > nearestEl[1]) {
                nearestEl = [href, top];
              }
            }
          }
        }
      }

      let activeHref = null;
      setDotStyle((draft) => {
        draft.opacity = nearestEl ? 1 : 0;
        if (anchorEl && nearestEl) {
          const href = nearestEl[0];
          activeHref = href;
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const rect = linkMap.get(href)!.getBoundingClientRect();
          draft.top = rect.top + rect.height / 2 - anchorEl.getBoundingClientRect().top;
        }
      });
      setActiveHref(activeHref);
    }
  }, [dDistance, dPage, anchorEl, linkMap, setActiveHref, setDotStyle]);

  const onClick = useCallback(
    (href: string) => {
      let pageTop = 0;
      let pageEl: HTMLElement = document.documentElement;
      if (!isUndefined(dPage)) {
        const el = getElement(dPage);
        if (el) {
          pageTop = el.getBoundingClientRect().top;
          pageEl = el;
        } else {
          return;
        }
      }

      const scrollTop = pageEl.scrollTop;
      window.location.hash = href;
      pageEl.scrollTop = scrollTop;

      const el = document.getElementById(href.slice(1));
      if (el) {
        const top = el.getBoundingClientRect().top;
        const scrollTop = top - pageTop + pageEl.scrollTop - dDistance;
        customScroll.scrollTo(pageEl, {
          top: scrollTop,
          behavior: dScrollBehavior,
        });
      }
    },
    [dPage, dScrollBehavior, dDistance, customScroll]
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
    onHrefChange?.(activeHref);
  }, [onHrefChange, activeHref]);

  useEffect(() => {
    updateAnchor();
  }, [updateAnchor]);

  useEffect(() => {
    const tid = globalScrollCapture.addTask(() => updateAnchor());
    return () => {
      globalScrollCapture.deleteTask(tid);
    };
  }, [updateAnchor]);
  //#endregion

  const contextValue = useMemo(() => ({ activeHref, onClick, setLinkMap }), [activeHref, onClick, setLinkMap]);

  return (
    <DAnchorContext.Provider value={contextValue}>
      <ul {...restProps} ref={anchorRef} className={getClassName(className, `${dPrefix}anchor`)}>
        <div className={`${dPrefix}anchor__indicator`}>
          {dIndicator === 'dot' ? (
            <span className={`${dPrefix}anchor__dot-indicator`} style={dotStyle}></span>
          ) : dIndicator === 'line' ? (
            <span className={`${dPrefix}anchor__line-indicator`} style={dotStyle}></span>
          ) : (
            dIndicator
          )}
        </div>
        {children}
      </ul>
    </DAnchorContext.Provider>
  );
}
