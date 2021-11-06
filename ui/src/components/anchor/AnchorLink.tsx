import React, { useCallback, useEffect } from 'react';

import { useDPrefixConfig, useDComponentConfig, useCustomRef, useCustomContext } from '../../hooks';
import { getClassName } from '../../utils';
import { DAnchorContext } from './Anchor';

export interface DAnchorLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  dLevel?: number;
}

export function DAnchorLink(props: DAnchorLinkProps) {
  const { dLevel = 0, href, style, children, onClick, ...restProps } = useDComponentConfig('anchor-link', props);

  const dPrefix = useDPrefixConfig();
  const { activeHref: _activeHref, onClick: _onClick, setLinkMap: _setLinkMap } = useCustomContext(DAnchorContext);

  //#region Refs.
  /*
   * @see https://reactjs.org/docs/refs-and-the-dom.html
   *
   * - Vue: ref.
   * @see https://v3.vuejs.org/guide/component-template-refs.html
   * - Angular: ViewChild.
   * @see https://angular.io/api/core/ViewChild
   */
  const [linkEl, linkRef] = useCustomRef<HTMLLIElement>();
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
  const handelClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.(e);

      e.preventDefault();
      if (href) {
        _onClick?.(href);
      }
    },
    [_onClick, href, onClick]
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
    if (linkEl && href) {
      _setLinkMap?.((draft) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        draft.set(href, linkEl as any);
      });
      return () => {
        _setLinkMap?.((draft) => {
          draft.delete(href);
        });
      };
    }
  }, [_setLinkMap, href, linkEl]);
  //#endregion

  return (
    <li
      ref={linkRef}
      className={getClassName(`${dPrefix}anchor-link`, {
        'is-active': href && _activeHref === href,
      })}
    >
      <a {...restProps} style={{ ...style, paddingLeft: 12 + dLevel * 16 }} href={href} onClick={handelClick}>
        {children}
      </a>
    </li>
  );
}
